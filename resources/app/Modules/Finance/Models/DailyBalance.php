<?php

namespace App\Modules\Finance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class DailyBalance extends Model
{
    protected $fillable = [
        'store_id', 'date', 'qty_005', 'qty_010', 'qty_025', 'qty_050', 'qty_100',
        'qty_200', 'qty_500', 'qty_1000', 'qty_2000', 'qty_5000', 'qty_10000',
        'total_cash', 'total_checks', 'grand_total', 'user_id', 'notes'
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Calcula o total em espécie baseado nas quantidades.
     */
    public function calculateCashTotal(): float
    {
        return ($this->qty_005 * 0.05) +
               ($this->qty_010 * 0.10) +
               ($this->qty_025 * 0.25) +
               ($this->qty_050 * 0.50) +
               ($this->qty_100 * 1.00) +
               ($this->qty_200 * 2.00) +
               ($this->qty_500 * 5.00) +
               ($this->qty_1000 * 10.00) +
               ($this->qty_2000 * 20.00) +
               ($this->qty_5000 * 50.00) +
               ($this->qty_10000 * 100.00);
    }
}
