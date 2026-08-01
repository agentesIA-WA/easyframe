<?php

use App\Modules\Core\Controllers\SettingController;
use App\Modules\Core\Controllers\PaymentMethodController;
use Illuminate\Support\Facades\Route;

Route::prefix('core')->group(function () {
    Route::get('settings', [SettingController::class, 'index']);
    Route::post('settings', [SettingController::class, 'update'])->middleware('module.permission:settings,update');
    
    Route::middleware('module.permission:payment_methods,view')->group(function () {
        Route::apiResource('payment-methods', PaymentMethodController::class);
    });
});
