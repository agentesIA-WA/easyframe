<?php

namespace App\Modules\Core\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class PaymentMethod extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'is_cash' => 'boolean',
        'is_active' => 'boolean',
        'commission_rate' => 'float',
    ];

    /**
     * Normaliza a descrição para maiúsculas (UCase) conforme o legado.
     */
    protected function description(): Attribute
    {
        return Attribute::make(
            set: fn (string $value) => mb_strtoupper($value),
        );
    }
}
