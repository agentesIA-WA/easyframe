<?php

use Illuminate\Support\Facades\Route;
use App\Modules\HR\Controllers\EmployeeController;

Route::prefix('hr')->middleware('module.permission:employees,view')->group(function () {
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::post('/employees', [EmployeeController::class, 'store'])->middleware('module.permission:employees,create');
    Route::get('/employees/{employee}', [EmployeeController::class, 'show']);
    Route::put('/employees/{employee}', [EmployeeController::class, 'update'])->middleware('module.permission:employees,update');
    Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->middleware('module.permission:employees,delete');
});
