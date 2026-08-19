<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::create('/api/v1/bi/reports/daily-movement', 'GET', ['date' => 'all']);
$user = App\Models\User::find(1);
$request->setUserResolver(function () use ($user) { return $user; });
$response = $kernel->handle($request);
echo substr($response->getContent(), 0, 1000);
