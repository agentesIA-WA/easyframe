<?php

namespace App\Modules\Core\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $guarded = ['id'];

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class);
    }

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }
}
