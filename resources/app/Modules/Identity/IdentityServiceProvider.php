<?php

namespace App\Modules\Identity;

use App\Modules\ModuleServiceProvider;

class IdentityServiceProvider extends ModuleServiceProvider
{
    protected string $modulePath = __DIR__;

    public function register(): void
    {
        // Registro de dependências de segurança (ex: JWT)
    }
}
