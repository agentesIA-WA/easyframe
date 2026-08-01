<?php

namespace App\Modules\Customer\Models;

use App\Models\BaseModel;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends BaseModel
{
    use SoftDeletes;

    protected $fillable = [
        'name', 'tax_id', 'state_registration', 'contact_name', 'contact_email',
        'phone1', 'phone2', 'website', 'cep', 'city', 'uf', 'address', 'neighborhood',
        'manager_name', 'manager_phone', 'seller_name', 'seller_phone1', 'seller_phone2',
        'billing_contact', 'billing_phone', 'tips', 'notes', 'legacy_id'
    ];

    /**
     * Normalização UCase para paridade com legado.
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($supplier) {
            $supplier->name = mb_strtoupper($supplier->name);
            $supplier->tips = mb_strtoupper($supplier->tips);
        });
    }
}

