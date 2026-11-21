<?php
// Run manually from the host CLI before changing enabled to true. No credentials printed.
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/booking.php';require __DIR__.'/mail.php';
try {
    $c=settings();db();
    $account=stripe()->accounts->retrieve();
    echo 'Stripe account: '.$account->id.PHP_EOL.'Mode: '.$c['mode'].PHP_EOL;
    if(!str_starts_with($c['stripe_webhook_secret']??'','whsec_'))throw new RuntimeException('Webhook signing secret missing');
    $smtp=new PHPMailer\PHPMailer\PHPMailer(true);$smtp->isSMTP();$smtp->Host=$c['smtp_host'];$smtp->Port=(int)$c['smtp_port'];
    $smtp->SMTPAuth=true;$smtp->Username=$c['smtp_user'];$smtp->Password=$c['smtp_password'];$smtp->Timeout=10;
    $smtp->SMTPSecure=$smtp->Port===465?PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS:PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    if(!$smtp->smtpConnect())throw new RuntimeException('SMTP authentication failed');$smtp->smtpClose();
    echo 'Database, Stripe access and SMTP authentication passed. Still run a sandbox checkout, signed webhook and email delivery check before activation.'.PHP_EOL;
}catch(Throwable $e){fwrite(STDERR,'Preflight failed: '.get_class($e).'. Check private configuration and server logs; no credentials printed.'.PHP_EOL);exit(1);}
