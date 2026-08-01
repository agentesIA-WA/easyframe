<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Identity\Controllers\AuthController;
use App\Modules\Identity\Controllers\UserController;
use App\Modules\Identity\Controllers\ModuleController;

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:api');
    Route::get('me', [AuthController::class, 'me'])->middleware('auth:api');
});

Route::prefix('identity')->group(function () {
    Route::get('users', [UserController::class, 'index']);
    Route::post('users/create-account', [UserController::class, 'createAccount']);
    Route::post('users/{user}/permissions', [UserController::class, 'syncPermissions']);
    Route::get('modules', [ModuleController::class, 'index']);
});
