<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once __DIR__.'/booking.php';
require_once __DIR__.'/mail.php';
$lock=fopen(settings()['directory'].'/worker.lock','c');
if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))exit;
try{reconcile(50);}catch(Throwable $e){error_log('Booking reconciliation failed: '.get_class($e));}
echo 'Notifications delivered: '.(!empty(settings()['smtp_password'])?deliver(25):0).PHP_EOL;
flock($lock,LOCK_UN);fclose($lock);
