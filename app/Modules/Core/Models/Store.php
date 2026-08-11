<?php

namespace App\Modules\Core\Models;

use App\Models\BaseModel;
use App\Models\User;

class Store extends BaseModel
{
    protected $fillable = [
        'name',
        'code',
        'company_name',
        'corporate_name',
        'cnpj',
        'cpf',
        'address',
        'city',
        'cep',
        'phone',
        'email',
        'website',
        'business_hours',
        'is_active',
        'is_wholesale',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_wholesale' => 'boolean',
    ];

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_stores')->withPivot('is_default')->withTimestamps();
    }
}
