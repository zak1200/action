<?php
declare(strict_types=1);
require __DIR__.'/http-fixture.php';
require dirname(__DIR__).'/server/booking.php';
sessionStart();
$wait=(float)($argv[2]??0)-microtime(true);if($wait>0)usleep((int)($wait*1000000));
try{checkout(['name'=>'Concurrent Test','email'=>'test@example.com','phone'=>'0612345678','service'=>'Titre de séjour','description'=>'','date'=>$argv[1],'time'=>'14:00','consent'=>true,'request_key'=>bin2hex(random_bytes(20))]);echo '201';}
catch(HttpError $e){echo $e->status;}
