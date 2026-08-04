<?php

namespace App\Modules\Customer\Models;

use App\Models\BaseModel;

class InventoryMovement extends BaseModel
{
    protected $fillable = ['product_id', 'type', 'quantity', 'reference_type', 'reference_id', 'reason'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
