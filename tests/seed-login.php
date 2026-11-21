<?php
// Local automated-test helper. Requires a loopback config and caller-supplied session ID.
declare(strict_types=1);
require dirname(__DIR__).'/server/bootstrap.php';
if(PHP_SAPI!=='cli'||!str_starts_with(settings()['base_url'],'http://127.0.0.1:'))exit(1);
query('INSERT OR REPLACE INTO login_codes VALUES(?,?,?,0)',[settings()['admin_email'],digest(($argv[1]??'').'|12345678'),time()+600]);
