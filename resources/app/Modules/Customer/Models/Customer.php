<?php

namespace App\Modules\Customer\Models;

use App\Models\BaseModel;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

use App\Modules\Core\Traits\HasAudit;

class Customer extends BaseModel
{
    use SoftDeletes, HasAudit;

    public int $moduleId = 1; // Módulo de Cadastros

    protected $fillable = ['name', 'tax_id', 'email', 'phone', 'contacts', 'cep', 'uf', 'city', 'address', 'notes', 'legacy_id'];

    protected $casts = [
        'contacts' => 'json',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(fn ($customer) => $customer->uuid = (string) Str::uuid());
    }
}
