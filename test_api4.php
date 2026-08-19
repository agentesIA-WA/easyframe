<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$request = Illuminate\Http\Request::create('/api/v1/core/stores/2', 'PUT', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], json_encode([
    'name' => 'ASA SUL',
    'company_name' => 'BSB MOLDURAS',
    'is_wholesale' => true
]));
$response = $kernel->handle($request);
echo $response->getContent();
