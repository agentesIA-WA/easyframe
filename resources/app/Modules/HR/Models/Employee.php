<?php

namespace App\Modules\HR\Models;

use App\Models\BaseModel;
use App\Models\User;
use App\Modules\Core\Models\Store;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends BaseModel
{
    use SoftDeletes;

    protected $fillable = [
        'store_id', 'user_id', 'name', 'tax_id', 'role', 'salary', 
        'commission_rate', 'hired_at', 'can_sell', 
        'is_molder', 'phone', 'cellphone', 'notes', 'legacy_id'
    ];

    protected $casts = [
        'hired_at' => 'date',
        'can_sell' => 'boolean',
        'is_molder' => 'boolean',
    ];

    protected $appends = ['store_ids'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function stores()
    {
        return $this->belongsToMany(Store::class, 'employee_stores');
    }

    public function getStoreIdsAttribute(): array
    {
        if ($this->relationLoaded('stores') && $this->stores->count() > 0) {
            return $this->stores->pluck('id')->toArray();
        }
        return $this->store_id ? [$this->store_id] : [];
    }
}
