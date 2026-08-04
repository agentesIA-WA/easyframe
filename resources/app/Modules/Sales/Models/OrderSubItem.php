<?php

namespace App\Modules\Sales\Models;

use App\Models\BaseModel;

class OrderSubItem extends BaseModel
{
    protected $fillable = ['order_item_id', 'product_id', 'description', 'value', 'quantity', 'calculation_type', 'margin'];
    protected $casts = ['margin' => 'float'];
    protected $with = ['product'];
    protected $appends = ['code'];

    public function item()
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function product()
    {
        return $this->belongsTo(\App\Modules\Customer\Models\Product::class);
    }

    public function getCodeAttribute()
    {
        return $this->product ? $this->product->code : null;
    }
}
