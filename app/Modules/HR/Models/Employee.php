<?php

namespace App\Modules\HR\Models;

use App\Models\BaseModel;
use App\Models\User;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends BaseModel
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'name', 'tax_id', 'role', 'salary', 
        'commission_rate', 'hired_at', 'can_sell', 
        'is_molder', 'phone', 'cellphone', 'notes', 'legacy_id'
    ];

    protected $casts = [
        'hired_at' => 'date',
        'can_sell' => 'boolean',
        'is_molder' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
