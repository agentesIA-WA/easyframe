<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$o = \App\Modules\Sales\Models\Order::latest('id')->first();
$o->mergeCasts(['delivery_date' => 'datetime:Y-m-d\TH:i:s']);
echo json_encode($o->toArray());
