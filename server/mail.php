<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
function sendMail(string $to,string $subject,string $body,?string $ics=null): void {
    $c=settings();$mail=new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();$mail->Host=$c['smtp_host'];$mail->Port=(int)$c['smtp_port'];
    $mail->SMTPAuth=true;$mail->Username=$c['smtp_user'];$mail->Password=$c['smtp_password'];
    $mail->SMTPSecure=$mail->Port===465?PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS:PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Timeout=8;$mail->CharSet='UTF-8';$mail->setFrom($c['sender_email'],'Action Étranger');$mail->addAddress($to);
    $mail->Subject=($c['mode']==='test'?'[TEST] ':'').$subject;$mail->Body=$body;
    if($ics)$mail->addStringAttachment($ics,'rendez-vous.ics','base64','text/calendar');
    $mail->send();
}
function invitation(array $b,string $kind): string {
    $cancel=$kind==='cancelled';
    return "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Action Etranger//Rendez-vous//FR\r\nMETHOD:".($cancel?'CANCEL':'PUBLISH')."\r\nBEGIN:VEVENT\r\nUID:".$b['id']."@action-etranger.fr\r\nDTSTAMP:".gmdate('Ymd\THis\Z')."\r\nDTSTART:".gmdate('Ymd\THis\Z',(int)$b['starts_at'])."\r\nDTEND:".gmdate('Ymd\THis\Z',(int)$b['ends_at'])."\r\nSUMMARY:Rendez-vous Action Etranger\r\nLOCATION:14 boulevard Charles Nedelec 13001 Marseille\r\nSTATUS:".($cancel?'CANCELLED':'CONFIRMED')."\r\nSEQUENCE:".($cancel?'1':'0')."\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
}
function deliver(int $maximum=10): int {
    $sent=0;
    for($i=0;$i<$maximum;$i++){
        $n=atomic(function(){
            $row=query('SELECT * FROM notifications WHERE sent_at IS NULL AND attempts<8 AND available_at<=? ORDER BY id LIMIT 1',[time()])->fetch();
            if($row)query('UPDATE notifications SET attempts=attempts+1, available_at=? WHERE id=?',[time()+120,$row['id']]);return $row;
        });if(!$n)break;
        try{
            $b=booking($n['booking_id']);$date=(new DateTimeImmutable('@'.$b['starts_at']))->setTimezone(new DateTimeZone('Europe/Paris'))->format('d/m/Y à H:i');
            $cancel=$n['kind']==='cancelled';$title=$cancel?'Rendez-vous annulé':'Rendez-vous confirmé';
            $body=$title."\n\nRéférence : ".$b['id']."\nDate : ".$date." (heure de Paris)\nDurée : 30 minutes\nDémarche : ".$b['service']."\nNom : ".$b['name']."\nEmail : ".$b['email']."\nTéléphone : ".$b['phone']."\nAdresse : 14 boulevard Charles Nédélec, 13001 Marseille\n\nPaiement : 10,00 EUR\nRéférence Stripe : ".($b['payment_id']??'')."\n";
            if($cancel)$body.="Cette annulation ne déclenche pas automatiquement un remboursement. Contactez l’équipe pour votre situation.\n";
            $body.="\nContact : contact@action-etranger.fr / +33 6 10 10 25 91\n";
            // Free-text descriptions stay in the authenticated admin, not email.
            sendMail($n['recipient'],$title.' • '.$date,$body,invitation($b,$n['kind']));
            query('UPDATE notifications SET sent_at=?,last_error=NULL WHERE id=?',[time(),$n['id']]);$sent++;
        }catch(Throwable){query('UPDATE notifications SET last_error=? WHERE id=?',['Échec de livraison. Vérifier la configuration SMTP.',$n['id']]);}
    }return $sent;
}
