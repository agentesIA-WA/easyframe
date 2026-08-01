<?php

namespace App\Modules\Core\Traits;

use App\Modules\Core\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

trait HasAudit
{
    public static function bootHasAudit()
    {
        static::created(function ($model) {
            self::logAudit($model, 'Created');
        });

        static::updated(function ($model) {
            self::logAudit($model, 'Updated');
        });

        static::deleted(function ($model) {
            self::logAudit($model, 'Deleted');
        });
    }

    protected static function logAudit($model, $action)
    {
        AuditLog::create([
            'user_id' => Auth::id(), // Removido fallback fixo para evitar erro de integridade
            'description' => $action . ' ' . class_basename($model) . ' ID: ' . $model->id,
            'metadata' => json_encode($model->getDirty()),
            'module_id' => $model->moduleId ?? null,
        ]);
    }
}
