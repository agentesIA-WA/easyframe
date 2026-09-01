<?php

use Illuminate\Support\Facades\Route;
use App\Modules\HR\Controllers\EmployeeController;

Route::prefix('hr')->group(function () {
    // Leitura da lista de funcionários/vendedores é pública para seleção em orçamentos e pedidos
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::get('/employees/{employee}', [EmployeeController::class, 'show']);
    
    // Gerenciamento (CRUD) de funcionários requer permissões específicas
    Route::post('/employees', [EmployeeController::class, 'store'])->middleware('module.permission:employees,create');
    Route::put('/employees/{employee}', [EmployeeController::class, 'update'])->middleware('module.permission:employees,update');
    Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->middleware('module.permission:employees,delete');
    Route::put('/employees/{employee}/restore', [EmployeeController::class, 'restore'])->withTrashed()->middleware('module.permission:employees,update');
});
