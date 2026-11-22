<?php
declare(strict_types=1);
ini_set('display_errors','0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
require_once dirname(__DIR__).'/server/booking.php';
require_once dirname(__DIR__).'/server/admin.php';
try {
    $action=(string)($_GET['action']??'session');
    $method=$_SERVER['REQUEST_METHOD']??'GET';
    $maximum=$action==='webhook'?262144:16000;
    if((int)($_SERVER['CONTENT_LENGTH']??0)>$maximum)throw new HttpError(413,'Demande trop volumineuse.');
    $raw=file_get_contents('php://input',false,null,0,$maximum+1);
    if(strlen($raw)>$maximum)throw new HttpError(413,'Demande trop volumineuse.');
    if($action==='webhook'){
        if($method!=='POST')throw new HttpError(405,'Méthode incorrecte.');
        $secret=settings()['stripe_webhook_secret']??'';
        if(!str_starts_with($secret,'whsec_'))throw new HttpError(503,'Webhook non configuré.');
        try{$event=Stripe\Webhook::constructEvent($raw,$_SERVER['HTTP_STRIPE_SIGNATURE']??'',$secret,300);}
        catch(UnexpectedValueException|Stripe\Exception\SignatureVerificationException){throw new HttpError(400,'Signature invalide.');}
        handleEvent($event);$result=['received'=>true];
    }else{
        sessionStart();
        if($method==='POST'){
            csrf();
            if(!str_starts_with($_SERVER['CONTENT_TYPE']??'','application/json'))throw new HttpError(415,'Format incorrect.');
            try{$input=json_decode($raw,true,16,JSON_THROW_ON_ERROR);}catch(JsonException){throw new HttpError(400,'Demande invalide.');}
            if(!is_array($input))throw new HttpError(400,'Demande invalide.');
        }elseif($method==='GET')$input=$_GET;
        else throw new HttpError(405,'Méthode incorrecte.');
        $reads=['session','availability','booking','admin-bookings'];
        if(($method==='GET')!==in_array($action,$reads,true))throw new HttpError(405,'Méthode incorrecte.');
        switch($action){
            case 'session': $result=['csrf'=>$_SESSION['csrf'],'mode'=>settings()['mode'],'enabled'=>(bool)settings()['enabled'],'email_ready'=>!empty(settings()['smtp_password']),'authenticated'=>($_SESSION['admin_until']??0)>time()];break;
            case 'availability': rate('availability:'.($_SERVER['REMOTE_ADDR']??''),120,60);$result=['times'=>settings()['enabled']?availability((string)($input['date']??'')):[]];break;
            case 'checkout': rate('checkout:'.($_SERVER['REMOTE_ADDR']??''),12,3600);$result=checkout($input);break;
            case 'booking':
                rate('status:'.($_SERVER['REMOTE_ADDR']??''),120,60);
                $b=booking((string)($input['id']??''));
                if(!hash_equals($b['token_hash'],digest($_SERVER['HTTP_X_BOOKING_TOKEN']??'')))throw new HttpError(404,'Réservation introuvable.');
                $result=publicBooking($b);break;
            case 'login-request': $result=requestLogin();break;
            case 'login-verify': $result=verifyLogin((string)($input['code']??''));break;
            case 'logout': $_SESSION=[];session_regenerate_id(true);$_SESSION['csrf']=opaque();$result=['csrf'=>$_SESSION['csrf']];break;
            case 'admin-bookings': $result=adminBookings($input);break;
            case 'cancel': $result=cancelBooking((string)($input['id']??''));break;
            case 'closure': $result=closure((string)($input['date']??''),($input['closed']??false)===true);break;
            case 'retry-mail': admin();rate('retry-mail',5,60);query('UPDATE notifications SET attempts=0,available_at=? WHERE booking_id=? AND sent_at IS NULL',[time(),(string)($input['id']??'')]);$result=['queued'=>true];break;
            default: throw new HttpError(404,'Page introuvable.');
        }
    }
    echo json_encode($result,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
}catch(HttpError $e){http_response_code($e->status);echo json_encode(['error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);}
catch(Throwable $e){error_log('Action booking: '.get_class($e));http_response_code(503);echo json_encode(['error'=>'Le service est temporairement indisponible. Réessayez ou contactez-nous au 06 10 10 25 91.']);}
