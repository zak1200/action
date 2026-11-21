<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
function checkout(array $input): array {
    if(!settings()['enabled'])throw new HttpError(503,'Les réservations ouvrent prochainement.');
    $name=trim((string)($input['name']??'')); $email=trim((string)($input['email']??''));
    $phone=preg_replace('/[\s().-]/','',(string)($input['phone']??''));
    $description=trim((string)($input['description']??''));$service=(string)($input['service']??'');
    if(mb_strlen($name)<2||mb_strlen($name)>80||!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($email)>150||!preg_match('/^\+?[0-9]{8,15}$/D',$phone)||mb_strlen($description)>1000||!in_array($service,services(),true)||($input['consent']??false)!==true)throw new HttpError(422,'Vérifiez votre nom, votre email, votre téléphone et les conditions.');
    $key=(string)($input['request_key']??'');if(!preg_match('/^[a-f0-9-]{32,64}$/D',$key))throw new HttpError(422,'Rechargez le formulaire.');
    $start=validStart((string)($input['date']??''),(string)($input['time']??''));
    $requestKey=digest(session_id().'|'.$key);
    $b=atomic(function()use($name,$email,$phone,$description,$service,$start,$requestKey){
        $existing=query('SELECT * FROM bookings WHERE request_key=?',[$requestKey])->fetch();
        if($existing){if($existing['email']!==$email || (int)$existing['starts_at']!==$start || $existing['phone']!==$phone || $existing['service']!==$service)throw new HttpError(409,'Cette demande a déjà été envoyée. Rechargez le formulaire pour une nouvelle réservation.');return $existing;}
        // Check again inside the write transaction, including closures.
        $day=(new DateTimeImmutable('@'.$start))->setTimezone(new DateTimeZone('Europe/Paris'))->format('Y-m-d');
        if(query('SELECT 1 FROM closures WHERE day=?',[$day])->fetchColumn()||query('SELECT 1 FROM slots WHERE starts_at=?',[$start])->fetchColumn())throw new HttpError(409,'Ce créneau vient d’être réservé. Choisissez-en un autre.');
        $id=bin2hex(random_bytes(16));$token=digest(session_id().'|'.$id);
        query('INSERT INTO bookings(id,token_hash,request_key,name,email,phone,service,description,starts_at,ends_at,created_at,expires_at,terms_version,terms_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[$id,digest($token),$requestKey,$name,$email,$phone,$service,$description,$start,$start+1800,time(),time()+1860,settings()['terms_version'],time()]);
        query('INSERT INTO slots VALUES(?,?)',[$start,$id]);return booking($id);
    });
    $token=digest(session_id().'|'.$b['id']);
    if($b['status']!=='pending')return ['booking_id'=>$b['id'],'token'=>$token,'status'=>$b['status']];
    if($b['checkout_id']){
        $s=stripe()->checkout->sessions->retrieve($b['checkout_id']);applySession($s);
        return ['booking_id'=>$b['id'],'token'=>$token,'url'=>$s->status==='open'?$s->url:null,'status'=>booking($b['id'])['status']];
    }
    try {
        $s=stripe()->checkout->sessions->create([
            'mode'=>'payment','locale'=>'fr','submit_type'=>'book',
            'integration_identifier'=>'action-appointments-'.substr(strtr($b['id'],'0123456789','abcdefghij'),0,8),
            'adaptive_pricing'=>['enabled'=>false],
            'client_reference_id'=>$b['id'],'metadata'=>['booking_id'=>$b['id']],
            'customer_email'=>$b['email'],'expires_at'=>(int)$b['expires_at'],
            'line_items'=>[['price_data'=>['currency'=>'eur','unit_amount'=>1000,'product_data'=>['name'=>'Rendez-vous Action Étranger • 30 minutes']],'quantity'=>1]],
            'payment_intent_data'=>['metadata'=>['booking_id'=>$b['id']],'receipt_email'=>$b['email']],
            'success_url'=>settings()['base_url'].'/?booking='.$b['id'].'#reservation',
            'cancel_url'=>settings()['base_url'].'/?booking='.$b['id'].'&payment=cancelled#reservation',
        ],['idempotency_key'=>'booking-'.$b['id']]);
    } catch(Stripe\Exception\ApiErrorException $e) {
        // Retain the hold on every uncertain outcome. A previous request may have
        // succeeded even when a retry returns an error. Never free a paid slot.
        query('INSERT INTO audit(action,booking_id,at) VALUES(?,?,?)',['checkout_reconciliation_required',$b['id'],time()]);
        throw new HttpError(503,'Le paiement n’a pas pu être préparé. Réessayez plus tard.');
    }
    query('UPDATE bookings SET checkout_id=?,checkout_url=? WHERE id=?',[$s->id,$s->url,$b['id']]);
    return ['booking_id'=>$b['id'],'token'=>$token,'url'=>$s->url,'status'=>'pending'];
}
function reconcile(int $limit=10): void {
    // Recover the session after a response was lost, using the immutable booking metadata.
    $unknown=query("SELECT * FROM bookings WHERE status='pending' AND checkout_id IS NULL ORDER BY created_at LIMIT ?",[$limit])->fetchAll();
    foreach($unknown as $b){
        $checked=0;
        foreach(stripe()->checkout->sessions->all(['created'=>['gte'=>(int)$b['created_at']-60],'limit'=>100])->autoPagingIterator() as $s){
            if((string)($s->metadata->booking_id??'')===$b['id']){applySession($s);break;}
            if(++$checked>=500)break;
        }
    }
    $items=query("SELECT * FROM bookings WHERE status='pending' AND checkout_id IS NOT NULL AND expires_at<? LIMIT ?",[time(),$limit])->fetchAll();
    foreach($items as $b)applySession(stripe()->checkout->sessions->retrieve($b['checkout_id']));
}
function availability(string $day): array {
    $d=dateValue($day);$result=[];
    for($h=9;$h<17;$h++)foreach(['00','30']as $m){$hour=sprintf('%02d:%s',$h,$m);try{$start=validStart($day,$hour);}catch(HttpError){continue;}
        if(!query('SELECT 1 FROM slots WHERE starts_at=?',[$start])->fetchColumn())$result[]=$hour;
    }return $result;
}
function publicBooking(array $b): array {
    $start=(new DateTimeImmutable('@'.$b['starts_at']))->setTimezone(new DateTimeZone('Europe/Paris'));
    return ['id'=>$b['id'],'status'=>$b['status'],'payment_status'=>$b['payment_status'],'date'=>$start->format('Y-m-d'),'time'=>$start->format('H:i'),'service'=>$b['service'],'amount'=>1000,'currency'=>'eur','mode'=>settings()['mode']];
}
function handleEvent(Stripe\Event $event): void {
    if($event->livemode!==(settings()['mode']==='live'))throw new HttpError(400,'Wrong payment mode');
    if(query('SELECT 1 FROM events WHERE id=?',[$event->id])->fetchColumn())return;
    if(in_array($event->type,['checkout.session.completed','checkout.session.expired','checkout.session.async_payment_succeeded'],true)){
        $session=stripe()->checkout->sessions->retrieve($event->data->object->id);
        // Ignore unrelated purchases in the same Stripe account.
        if(isset($session->metadata->booking_id)&&query('SELECT 1 FROM bookings WHERE id=?',[(string)$session->metadata->booking_id])->fetchColumn())applySession($session);
    }elseif($event->type==='checkout.session.async_payment_failed'){
        $s=stripe()->checkout->sessions->retrieve($event->data->object->id);
        $id=(string)($s->metadata->booking_id??'');
        if($id && query('SELECT 1 FROM bookings WHERE id=? AND checkout_id=?',[$id,$s->id])->fetchColumn()){
            atomic(function()use($id,$s){
                if($s->payment_status!=='unpaid'||$s->status!=='complete')return;
                query("UPDATE bookings SET status='failed' WHERE id=? AND status='pending'",[$id]);
                query("DELETE FROM slots WHERE booking_id=? AND EXISTS(SELECT 1 FROM bookings WHERE id=? AND status='failed')",[$id,$id]);
            });
        }
    }elseif($event->type==='charge.refunded'){
        $charge=$event->data->object;
        query('UPDATE bookings SET payment_status=? WHERE payment_id=?',[$charge->refunded?'refunded':'partially_refunded',(string)$charge->payment_intent]);
    }
    query('INSERT OR IGNORE INTO events VALUES(?,?)',[$event->id,time()]);
}
