<?php

namespace App\Modules;

use Illuminate\Support\ServiceProvider;

abstract class ModuleServiceProvider extends ServiceProvider
{
    /**
     * Onde o módulo reside.
     */
    protected string $modulePath;

    public function boot(): void
    {
        $this->loadMigrationsFrom($this->modulePath . '/Database/Migrations');
        $this->loadRoutesFrom($this->modulePath . '/Routes/api.php');
    }
}
