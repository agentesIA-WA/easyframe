<?php

namespace App\Modules\Finance\Models;

use App\Models\BaseModel;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends BaseModel
{
    use SoftDeletes;

    protected $fillable = [
        'order_id', 
        'parent_id', 
        'installment_number', 
        'due_date', 
        'status', 
        'value', 
        'paid_value', 
        'paid_at', 
        'payment_method', 
        'cheque_number', 
        'cheque_agency', 
        'cheque_account', 
        'card_brand', 
        'observation',
        'legacy_id'
    ];

    public function order()
    {
        return $this->belongsTo(\App\Modules\Sales\Models\Order::class);
    }

    /**
     * Regra de Baixa Residual (BR-MIGRAR-004).
     */
    public function pay(float $amount, string $method = 'ESP'): ?Payment
    {
        if ($amount >= $this->value) {
            $this->update([
                'status' => 'P',
                'paid_value' => $amount,
                'paid_at' => now(),
                'payment_method' => $method
            ]);
            return null;
        }

        // Gera resíduo
        return self::create([
            'order_id' => $this->order_id,
            'parent_id' => $this->id,
            'installment_number' => $this->installment_number,
            'due_date' => $this->due_date,
            'status' => 'P',
            'value' => $amount,
            'paid_value' => $amount,
            'paid_at' => now(),
            'payment_method' => $method
        ]);
    }
}
