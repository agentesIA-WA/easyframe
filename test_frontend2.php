<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$payload = [
    'name' => 'LOJA TESTE',
    'company_name' => 'LOJA TESTE',
    'is_wholesale' => true
];

$request = Illuminate\Http\Request::create('/api/v1/core/stores/2', 'PUT', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], json_encode($payload));
$response = $kernel->handle($request);
echo "Result:\n" . $response->getContent() . "\n";
