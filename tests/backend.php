<?php
// Isolated tests: synthetic Stripe responses; never calls Stripe or sends mail.
declare(strict_types=1);
$private=sys_get_temp_dir().'/action-booking-tests-'.bin2hex(random_bytes(6));mkdir($private,0700,true);
putenv('ACTION_PRIVATE_DIR='.$private);
$config=require dirname(__DIR__).'/server/config.example.php';
$config=array_replace($config,['enabled'=>true,'base_url'=>'http://127.0.0.1:4180','app_secret'=>bin2hex(random_bytes(32)),'stripe_secret'=>'rk_test_'.str_repeat('x',24)]);
file_put_contents($private.'/config.php','<?php return '.var_export($config,true).';');
require dirname(__DIR__).'/server/booking.php';require dirname(__DIR__).'/server/admin.php';
sessionStart();
class TestStripeHttp implements Stripe\HttpClient\ClientInterface {
    public array $sessions=[];public array $params=[];public bool $fail=false;
    public function request($method,$absUrl,$headers,$params,$hasFile,$apiMode='v1',$maxNetworkRetries=null){
        if($this->fail)throw new Stripe\Exception\ApiConnectionException('Test connection interrupted');
        if($method==='post'){
            $this->params=$params;$id='cs_test_'.$params['client_reference_id'];
            $s=['id'=>$id,'object'=>'checkout.session','client_reference_id'=>$params['client_reference_id'],'metadata'=>$params['metadata'],'livemode'=>false,'payment_status'=>'unpaid','status'=>'open','mode'=>'payment','amount_total'=>1000,'currency'=>'eur','url'=>'https://checkout.stripe.com/c/pay/'.$id,'payment_intent'=>'pi_test_'.$params['client_reference_id']];
            $this->sessions[$id]=$s;
        }else{$id=basename(parse_url($absUrl,PHP_URL_PATH));$s=$this->sessions[$id];}
        return [json_encode($s),200,[]];
    }
}
$http=new TestStripeHttp;Stripe\ApiRequestor::setHttpClient($http);
$checks=[];
function ok(bool $condition,string $label):void{global $checks;if(!$condition)throw new RuntimeException($label);$checks[]=$label;}
function rejects(callable $fn,int $status,string $label):void{try{$fn();}catch(HttpError $e){ok($e->status===$status,$label);return;}throw new RuntimeException('Expected failure: '.$label);}
$day=(new DateTimeImmutable('next monday',new DateTimeZone('Europe/Paris')))->format('Y-m-d');
$input=['name'=>'Camille Test','email'=>'camille@example.com','phone'=>'+33 6 12 34 56 78','service'=>'Titre de séjour','description'=>'Test <script>alert(1)</script>','date'=>$day,'time'=>'10:00','consent'=>true,'request_key'=>bin2hex(random_bytes(20))];
rejects(fn()=>checkout(array_replace($input,['phone'=>'bad'])),422,'Phone validated on server');
$first=checkout($input);$b=booking($first['booking_id']);
ok($b['status']==='pending' && $b['phone']==='+33612345678','Pending slot and normalized required phone persisted');
ok($http->params['line_items'][0]['price_data']['unit_amount']===1000,'Price fixed server-side');
ok(!isset($http->params['payment_method_types']),'Dynamic payment methods supported');
ok(checkout($input)['booking_id']===$first['booking_id'],'Double submission is idempotent');
rejects(fn()=>checkout(array_replace($input,['request_key'=>bin2hex(random_bytes(20))])),409,'Second request cannot take held slot');
ok(!in_array('10:00',availability($day),true),'Held slot excluded from availability');
ok(!isset(publicBooking($b)['email']),'Public status excludes personal details');
$s=$http->sessions[$b['checkout_id']];$s['payment_status']='paid';$s['status']='complete';
$bad=$s;$bad['amount_total']=999;try{applySession((object)array_replace($bad,['metadata'=>(object)$bad['metadata']]));throw new LogicException('Bad amount accepted');}catch(RuntimeException $e){ok(booking($b['id'])['status']==='pending','Wrong amount cannot confirm booking');}
$bad=$s;$bad['livemode']=true;try{applySession((object)array_replace($bad,['metadata'=>(object)$bad['metadata']]));throw new LogicException('Bad mode accepted');}catch(RuntimeException $e){ok(booking($b['id'])['status']==='pending','Wrong mode cannot confirm booking');}
$http->sessions[$b['checkout_id']]=$s;
$event=Stripe\Event::constructFrom(['id'=>'evt_unit_confirm','object'=>'event','livemode'=>false,'type'=>'checkout.session.completed','data'=>['object'=>$s]]);
handleEvent($event);handleEvent($event);
ok(booking($b['id'])['status']==='confirmed','Verified paid session confirms booking');
ok((int)query('SELECT count(*) FROM notifications')->fetchColumn()===2,'Duplicate webhook queues only customer and agency once');
ok((int)query('SELECT count(*) FROM events')->fetchColumn()===1,'Duplicate event recorded once');
ok(!in_array('10:00',availability($day),true),'Confirmed slot remains unavailable');
rejects(fn()=>adminBookings([]),401,'Admin data protected');
$_SERVER['HTTP_ORIGIN']='https://attacker.invalid';$_SERVER['HTTP_X_CSRF_TOKEN']=$_SESSION['csrf'];rejects(fn()=>csrf(),403,'Foreign origin rejected');
$_SERVER['HTTP_ORIGIN']=$config['base_url'];csrf();ok(true,'Same origin valid CSRF accepted');
$email=$config['admin_email'];query('INSERT OR REPLACE INTO login_codes VALUES(?,?,?,0)',[$email,digest(session_id().'|12345678'),time()+600]);
for($i=0;$i<5;$i++)rejects(fn()=>verifyLogin('00000000'),401,'Incorrect admin code rejected '.($i+1));
rejects(fn()=>verifyLogin('12345678'),401,'Correct code blocked after five failed attempts');
query('UPDATE login_codes SET attempts=0 WHERE email=?',[$email]);$old=session_id();$result=verifyLogin('12345678');ok($result['authenticated']&&session_id()!==$old,'Login rotates session ID');
rejects(fn()=>verifyLogin('12345678'),401,'One-time code cannot be replayed');
rejects(fn()=>closure($day,true),409,'Cannot close occupied day');
$listed=adminBookings(['from'=>$day,'to'=>$day]);ok(count($listed['items'])===1&&$listed['items'][0]['phone']==='+33612345678','Authenticated admin sees appointment and phone');
cancelBooking($b['id']);cancelBooking($b['id']);
ok(booking($b['id'])['status']==='cancelled'&&booking($b['id'])['payment_status']==='paid','Cancellation does not silently refund');
ok(in_array('10:00',availability($day),true),'Cancellation releases slot');
ok((int)query('SELECT count(*) FROM notifications')->fetchColumn()===4,'Cancellation emails queued once');
closure($day,true);ok(availability($day)===[],'Closure blocks availability');closure($day,false);
$next=checkout(array_replace($input,['request_key'=>bin2hex(random_bytes(20)),'time'=>'11:00']));$n=booking($next['booking_id']);
$http->sessions[$n['checkout_id']]['status']='expired';applySession(Stripe\Checkout\Session::constructFrom($http->sessions[$n['checkout_id']]));
ok(booking($n['id'])['status']==='expired'&&in_array('11:00',availability($day),true),'Stripe-confirmed expiry releases hold');
$http->fail=true;rejects(fn()=>checkout(array_replace($input,['request_key'=>bin2hex(random_bytes(20)),'time'=>'12:00'])),503,'Network failure handled');
ok(!in_array('12:00',availability($day),true),'Ambiguous network failure retains slot safely');$http->fail=false;
$ics=invitation($b,'confirmed');ok(str_contains($ics,'DTSTART:'.gmdate('Ymd\THis\Z',(int)$b['starts_at']))&&str_contains($ics,'UID:'.$b['id']),'Calendar attachment uses stable ID and UTC time');
ok(!str_contains($ics,$b['description']),'Calendar excludes private description');
ok(dateValue('2027-03-29')->getOffset()===7200&&dateValue('2027-03-26')->getOffset()===3600,'Paris DST handled');
$raw=json_encode(['id'=>'evt_signed','object'=>'event','livemode'=>false,'type'=>'checkout.session.completed','data'=>['object'=>$s]]);$secret='whsec_unit_only';$timestamp=time();$signature='t='.$timestamp.',v1='.hash_hmac('sha256',$timestamp.'.'.$raw,$secret);
ok(Stripe\Webhook::constructEvent($raw,$signature,$secret)->id==='evt_signed','Valid webhook signature accepted');
try{Stripe\Webhook::constructEvent($raw.' ',$signature,$secret);throw new RuntimeException('Invalid signature accepted');}catch(Stripe\Exception\SignatureVerificationException){ok(true,'Tampered webhook rejected');}
try{Stripe\Webhook::constructEvent($raw,'t=1,v1='.hash_hmac('sha256','1.'.$raw,$secret),$secret);throw new RuntimeException('Old signature accepted');}catch(Stripe\Exception\SignatureVerificationException){ok(true,'Stale webhook rejected');}
$children=[];$barrier=microtime(true)+.6;
for($i=0;$i<2;$i++){
    $process=proc_open([PHP_BINARY,__DIR__.'/concurrency-worker.php',$day,(string)$barrier],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
    fclose($pipes[0]);$children[]=[$process,$pipes];
}
$statuses=[];foreach($children as [$process,$pipes]){$statuses[]=stream_get_contents($pipes[1]);$stderr=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);ok(proc_close($process)===0&&!$stderr,'Concurrent worker completed cleanly');}
sort($statuses);ok($statuses===['201','409'],'Two simultaneous processes produce exactly one winning reservation');
session_write_close();
echo json_encode(['passed'=>count($checks),'checks'=>$checks],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE).PHP_EOL;
