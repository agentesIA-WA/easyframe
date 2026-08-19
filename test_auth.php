<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::create('/api/v1/auth/me', 'GET', [], [], [], ['HTTP_X_STORE_ID' => '1', 'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json']);
// Mock auth
$user = App\Models\User::find(1);
$request->setUserResolver(function () use ($user) { return $user; });
$response = $kernel->handle($request);
echo $response->getContent();
