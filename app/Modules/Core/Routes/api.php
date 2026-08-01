<?php

use App\Modules\Core\Controllers\SettingController;
use App\Modules\Core\Controllers\PaymentMethodController;
use Illuminate\Support\Facades\Route;

Route::prefix('core')->group(function () {
    Route::get('settings', [SettingController::class, 'index']);
    Route::post('settings', [SettingController::class, 'update'])->middleware('module.permission:settings,update');
    
    // Leitura das formas de pagamento é pública para usuários autenticados (usada em orçamentos, vendas e caixa)
    Route::get('payment-methods', [PaymentMethodController::class, 'index']);
    Route::get('payment-methods/{payment_method}', [PaymentMethodController::class, 'show']);
    
    // Gerenciamento (CRUD) de formas de pagamento requer permissão de modificação
    Route::post('payment-methods', [PaymentMethodController::class, 'store'])->middleware('module.permission:payment_methods,create');
    Route::put('payment-methods/{payment_method}', [PaymentMethodController::class, 'update'])->middleware('module.permission:payment_methods,update');
    Route::delete('payment-methods/{payment_method}', [PaymentMethodController::class, 'destroy'])->middleware('module.permission:payment_methods,delete');
});
