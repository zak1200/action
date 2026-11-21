<?php
declare(strict_types=1);
require_once __DIR__.'/mail.php';

function requestLogin(): array {
    rate('login-ip:'.($_SERVER['REMOTE_ADDR']??''),10,3600);
    rate('login-account',6,3600);
    $email=settings()['admin_email'];
    $code=(string)random_int(10000000,99999999);
    query('INSERT OR REPLACE INTO login_codes(email,digest,expires_at,attempts) VALUES(?,?,?,0)',[$email,digest(session_id().'|'.$code),time()+600]);
    try { sendMail($email,'Connexion à votre espace administrateur',"Votre code de connexion : $code\n\nValable 10 minutes, uniquement dans le navigateur qui a demandé ce code. Ne le communiquez à personne. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email."); }
    catch(Throwable){query('DELETE FROM login_codes WHERE email=?',[$email]);throw new HttpError(503,'Le code n’a pas pu être envoyé. Contactez le responsable du site.');}
    return ['sent'=>true];
}
function verifyLogin(string $code): array {
    rate('verify-ip:'.($_SERVER['REMOTE_ADDR']??''),30,900);
    $ok=atomic(function()use($code){
        $email=settings()['admin_email'];$row=query('SELECT * FROM login_codes WHERE email=?',[$email])->fetch();
        if(!$row || (int)$row['expires_at']<time() || (int)$row['attempts']>=5)return false;
        query('UPDATE login_codes SET attempts=attempts+1 WHERE email=?',[$email]);
        if(!preg_match('/^[0-9]{8}$/D',$code)||!hash_equals($row['digest'],digest(session_id().'|'.$code)))return false;
        query('DELETE FROM login_codes WHERE email=?',[$email]);return true;
    });
    if(!$ok)throw new HttpError(401,'Code incorrect ou expiré. Après cinq essais, demandez un nouveau code.');
    session_regenerate_id(true);$_SESSION['admin_until']=time()+7200;$_SESSION['csrf']=opaque();
    query('INSERT INTO audit(action,at) VALUES(?,?)',['admin_login',time()]);
    return ['authenticated'=>true,'csrf'=>$_SESSION['csrf']];
}
function adminBookings(array $input): array {
    admin();
    $from=dateValue((string)($input['from']??date('Y-m-d')));
    $to=dateValue((string)($input['to']??$from->modify('+30 days')->format('Y-m-d')));
    if($to<$from||$to>$from->modify('+366 days'))throw new HttpError(422,'Choisissez une période de moins d’un an.');
    $offset=max(0,min(100000,(int)($input['offset']??0)));
    $start=$from->getTimestamp();$end=$to->modify('+1 day')->getTimestamp();
    $items=query('SELECT id,name,email,phone,service,description,starts_at,ends_at,status,payment_status,payment_id,checkout_id,created_at FROM bookings WHERE starts_at>=? AND starts_at<? ORDER BY starts_at LIMIT 100 OFFSET ?',[$start,$end,$offset])->fetchAll();
    foreach($items as &$item){
        $item['notifications']=query('SELECT kind,recipient,sent_at,attempts,last_error FROM notifications WHERE booking_id=?',[$item['id']])->fetchAll();
        $item['stripe_url']=$item['payment_id']?'https://dashboard.stripe.com/'.(settings()['mode']==='test'?'test/':'').'payments/'.rawurlencode($item['payment_id']):null;
    }
    return ['items'=>$items,'total'=>(int)query('SELECT count(*) FROM bookings WHERE starts_at>=? AND starts_at<?',[$start,$end])->fetchColumn(),'closures'=>query('SELECT day FROM closures ORDER BY day')->fetchAll(PDO::FETCH_COLUMN),'mode'=>settings()['mode']];
}
function cancelBooking(string $id): array {
    admin();
    atomic(function()use($id){
        $b=booking($id);if($b['status']==='cancelled')return;
        if($b['status']!=='confirmed')throw new HttpError(409,'Seul un rendez-vous confirmé peut être annulé ici.');
        query("UPDATE bookings SET status='cancelled' WHERE id=?",[$id]);
        query('DELETE FROM slots WHERE booking_id=?',[$id]);queueMail($b,'cancelled');
        query('INSERT INTO audit(action,booking_id,at) VALUES(?,?,?)',['cancelled',$id,time()]);
    });return ['cancelled'=>true];
}
function closure(string $day,bool $closed): array {
    admin();$d=dateValue($day);
    atomic(function()use($day,$closed,$d){
        if($closed){
            if(query('SELECT 1 FROM slots WHERE starts_at>=? AND starts_at<?',[$d->getTimestamp(),$d->modify('+1 day')->getTimestamp()])->fetchColumn())throw new HttpError(409,'Des créneaux sont déjà réservés ou en attente ce jour. Traitez-les avant de fermer la journée.');
            query('INSERT OR IGNORE INTO closures VALUES(?)',[$day]);
        }else query('DELETE FROM closures WHERE day=?',[$day]);
        query('INSERT INTO audit(action,at) VALUES(?,?)',[($closed?'close:':'open:').$day,time()]);
    });return ['saved'=>true];
}
