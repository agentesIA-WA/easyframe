<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$payload = [
    'name' => 'LOJA 1',
    'code' => 'MATRIZ',
    'company_name' => 'LOJA 1',
    'corporate_name' => 'BSB MOLDURAS LTDA',
    'cnpj' => '03572464000158',
    'address' => 'SQS 110',
    'city' => 'Asa Sul',
    'cep' => '',
    'phone' => '6135636333',
    'email' => '',
    'is_wholesale' => false
];

$request = Illuminate\Http\Request::create('/api/v1/core/stores/1', 'PUT', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], json_encode($payload));
$response = $kernel->handle($request);
echo "Result:\n" . $response->getContent() . "\n";
