<?php
declare(strict_types=1);
require __DIR__.'/vendor/autoload.php';
final class HttpError extends RuntimeException { public function __construct(public int $status, string $message) { parent::__construct($message); } }
function settings(): array {
    static $config;
    if ($config !== null) return $config;
    $directory = getenv('ACTION_PRIVATE_DIR') ?: dirname(__DIR__, 3).'/action-booking-preview';
    $path = $directory.'/config.php';
    if (!is_file($path)) throw new HttpError(503, 'Les réservations ouvrent prochainement. Contactez-nous par téléphone.');
    $config = require $path;
    $config['directory'] = $directory;
    $real = realpath($directory); $public = realpath(dirname(__DIR__));
    if (!$real || str_starts_with(str_replace('\\','/',$real).'/', str_replace('\\','/',$public).'/')) throw new RuntimeException('Private storage must be outside the document root');
    if (strlen($config['app_secret'] ?? '') < 32) throw new RuntimeException('Application secret missing');
    return $config;
}
function db(): PDO {
    static $db;
    if ($db) return $db;
    $db = new PDO('sqlite:'.settings()['directory'].'/bookings.sqlite', null, null, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    $db->exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
    $db->exec(file_get_contents(__DIR__.'/schema.sql'));
    return $db;
}
function query(string $sql, array $params=[]): PDOStatement { $q=db()->prepare($sql); $q->execute($params); return $q; }
function atomic(callable $fn): mixed {
    db()->exec('BEGIN IMMEDIATE');
    try { $result=$fn(); db()->exec('COMMIT'); return $result; }
    catch(Throwable $e) { db()->exec('ROLLBACK'); throw $e; }
}
function opaque(): string { return bin2hex(random_bytes(32)); }
function digest(string $value): string { return hash_hmac('sha256',$value,settings()['app_secret']); }
function rate(string $name,int $maximum,int $window): void {
    $allowed=atomic(function()use($name,$maximum,$window){
        query('DELETE FROM limits WHERE expires_at < ?', [time()]);
        $key=digest($name); query('INSERT OR IGNORE INTO limits VALUES (?,0,?)',[$key,time()+$window]);
        query('UPDATE limits SET count=count+1 WHERE key=?',[$key]);
        return (int)query('SELECT count FROM limits WHERE key=?',[$key])->fetchColumn() <= $maximum;
    });
    if(!$allowed) throw new HttpError(429,'Trop de tentatives. Réessayez un peu plus tard.');
}
function sessionStart(): void {
    if(session_status()===PHP_SESSION_ACTIVE)return;
    $secure=str_starts_with(settings()['base_url'],'https://');
    if(!$secure && !in_array(parse_url(settings()['base_url'],PHP_URL_HOST),['127.0.0.1','localhost'],true))throw new RuntimeException('HTTPS required');
    ini_set('session.use_strict_mode','1'); ini_set('session.use_only_cookies','1');
    session_save_path(settings()['directory']); session_name('action_booking');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>$secure,'httponly'=>true,'samesite'=>'Lax']);
    session_start(); $_SESSION['csrf'] ??= opaque();
}
function csrf(): void {
    if(($_SERVER['HTTP_ORIGIN']??'')!==settings()['base_url'] || !hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??''))throw new HttpError(403,'Rechargez la page puis réessayez.');
}
function admin(): void {
    if(($_SESSION['admin_until']??0)<time())throw new HttpError(401,'Connectez-vous à votre espace administrateur.');
}
function stripe(): Stripe\StripeClient {
    static $client;
    if($client)return $client;
    $c=settings(); $mode=$c['mode']==='live'?'live':'test';
    if(!preg_match('/^[sr]k_'.$mode.'_/', $c['stripe_secret']??''))throw new HttpError(503,'Le paiement est temporairement indisponible.');
    $client=new Stripe\StripeClient(['api_key'=>$c['stripe_secret'],'stripe_version'=>'2026-11-18.endive']);
    Stripe\Stripe::setMaxNetworkRetries(2);
    return $client;
}
function services(): array { return ['Titre de séjour','Naturalisation','Regroupement familial','DCEM','Permis de conduire','OQTF et orientation','Autre demande']; }
function dateValue(string $day): DateTimeImmutable {
    $d=DateTimeImmutable::createFromFormat('!Y-m-d',$day,new DateTimeZone('Europe/Paris'));
    if(!$d || $d->format('Y-m-d')!==$day)throw new HttpError(422,'Date invalide.');
    return $d;
}
function validStart(string $day,string $hour): int {
    $d=dateValue($day); $today=new DateTimeImmutable('today',new DateTimeZone('Europe/Paris'));
    if($d<$today || $d>$today->modify('+60 days') || (int)$d->format('N')>5 || !preg_match('/^(09|1[0-6]):(00|30)$/D',$hour))throw new HttpError(422,'Choisissez un créneau du lundi au vendredi entre 9 h et 17 h.');
    $t=$d->setTime((int)substr($hour,0,2),(int)substr($hour,3))->getTimestamp();
    if($t<time()+60*(int)settings()['lead_minutes'])throw new HttpError(422,'Ce créneau est trop proche. Choisissez un autre horaire.');
    if(query('SELECT 1 FROM closures WHERE day=?',[$day])->fetchColumn())throw new HttpError(409,'Cette date est fermée aux réservations.');
    return $t;
}
function booking(string $id): array { $b=query('SELECT * FROM bookings WHERE id=?',[$id])->fetch(); if(!$b)throw new HttpError(404,'Réservation introuvable.');return $b; }
function queueMail(array $b,string $kind): void {
    foreach(array_unique([$b['email'],settings()['notification_email']])as $to)query('INSERT OR IGNORE INTO notifications(booking_id,kind,recipient,available_at) VALUES(?,?,?,?)',[$b['id'],$kind,$to,time()]);
}
function applySession(object $s): void {
    $id=(string)($s->client_reference_id??'');
    if(!$id)return;
    atomic(function()use($s,$id){
        $b=booking($id);
        if(($s->livemode??false)!==(settings()['mode']==='live') || (string)($s->metadata->booking_id??'')!==$id)throw new RuntimeException('Stripe session identity mismatch');
        if($b['checkout_id'] && $b['checkout_id']!==$s->id)throw new RuntimeException('Stripe session mismatch');
        query('UPDATE bookings SET checkout_id=? WHERE id=?',[$s->id,$id]);
        if($s->payment_status==='paid') {
            if($s->currency!=='eur' || $s->amount_total!==1000 || $s->mode!=='payment')throw new RuntimeException('Stripe amount mismatch');
            if($b['status']==='pending'){
                if(query('SELECT booking_id FROM slots WHERE starts_at=?',[$b['starts_at']])->fetchColumn()!==$id)throw new RuntimeException('Slot reconciliation required');
                query("UPDATE bookings SET status='confirmed',payment_status='paid',payment_id=? WHERE id=?",[(string)$s->payment_intent,$id]);
                queueMail($b,'confirmed');
            }
        } elseif($s->status==='expired' && $b['status']==='pending'){
            query("UPDATE bookings SET status='expired' WHERE id=?",[$id]);query('DELETE FROM slots WHERE booking_id=?',[$id]);
        }
    });
}
