<?php
// Install as /home/u916077829/domains/action-etranger.fr/action-booking-preview/config.php.
// This directory MUST be outside public_html. Never commit the completed file.
return [
    'enabled' => false,
    'mode' => 'test',
    'base_url' => 'https://prev.action-etranger.fr',
    'app_secret' => '', // At least 32 random bytes, encoded as hex.
    'stripe_secret' => '',
    'stripe_webhook_secret' => '',
    'admin_email' => 'agenceassistance3@gmail.com',
    'notification_email' => 'agenceassistance3@gmail.com',
    'sender_email' => 'contact@action-etranger.fr',
    'smtp_host' => 'smtp.hostinger.com',
    'smtp_port' => 465,
    'smtp_user' => 'contact@action-etranger.fr',
    'smtp_password' => '',
    'lead_minutes' => 60,
    'terms_version' => 'booking-2026-11-18',
];
