<?php
// Loaded only by PHP's test server auto_prepend_file option. Never packaged/deployed.
declare(strict_types=1);
require_once dirname(__DIR__).'/server/bootstrap.php';
if(!in_array(PHP_SAPI,['cli','cli-server'],true)||!str_starts_with(settings()['base_url'],'http://127.0.0.1:'))exit;
class FixtureStripeHttp implements Stripe\HttpClient\ClientInterface {
    public function request($method,$absUrl,$headers,$params,$hasFile,$apiMode='v1',$maxNetworkRetries=null){
        $path=settings()['directory'].'/stripe-fixture.json';$all=is_file($path)?json_decode(file_get_contents($path),true):[];
        if($method==='post'){
            $id='cs_test_'.$params['client_reference_id'];
            $s=['id'=>$id,'object'=>'checkout.session','client_reference_id'=>$params['client_reference_id'],'metadata'=>$params['metadata'],'livemode'=>false,'payment_status'=>'unpaid','status'=>'open','mode'=>'payment','amount_total'=>1000,'currency'=>'eur','url'=>'https://checkout.stripe.com/c/pay/'.$id,'payment_intent'=>'pi_test_'.$params['client_reference_id']];
            $all[$id]=$s;file_put_contents($path,json_encode($all));
        }else{$id=basename(parse_url($absUrl,PHP_URL_PATH));$s=$all[$id];}
        return [json_encode($s),200,[]];
    }
}
Stripe\ApiRequestor::setHttpClient(new FixtureStripeHttp);
