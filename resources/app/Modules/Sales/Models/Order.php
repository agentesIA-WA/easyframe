<?php

namespace App\Modules\Sales\Models;

use App\Models\BaseModel;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

use App\Modules\Core\Traits\HasAudit;

class Order extends BaseModel
{
    use SoftDeletes, HasAudit;

    public int $moduleId = 22; // Módulo de Pedidos

    protected $fillable = ['store_id', 'customer_id', 'seller_id', 'framer_id', 'status', 'total_value', 'discount', 'production_date', 'delivery_date', 'delivered_at', 'delivery_observation', 'legacy_id'];

    protected $casts = [
        'delivery_date' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(fn ($order) => $order->uuid = (string) Str::uuid());
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function customer()
    {
        return $this->belongsTo(\App\Modules\Customer\Models\Customer::class);
    }

    public function seller()
    {
        return $this->belongsTo(\App\Modules\HR\Models\Employee::class, 'seller_id');
    }

    public function framer()
    {
        return $this->belongsTo(\App\Modules\HR\Models\Employee::class, 'framer_id');
    }

    public function payments()
    {
        return $this->hasMany(\App\Modules\Finance\Models\Payment::class);
    }

    public function editLogs()
    {
        return $this->hasMany(OrderEditLog::class)->orderBy('created_at', 'desc');
    }

    /**
     * Invariante: O valor total deve ser a soma exata dos itens (BR-MIGRAR-006).
     */
    public function recalculateTotal(): void
    {
        $this->total_value = $this->items()->sum('item_value') - $this->discount;
        $this->save();
    }
}
