<?php

namespace App\Modules\Customer\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseItem extends Model
{
    protected $fillable = ['purchase_id', 'product_id', 'quantity', 'unit_cost', 'total_cost'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
