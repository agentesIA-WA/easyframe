<?php

namespace App\Modules\Sales\Models;

use App\Models\BaseModel;

class OrderEditLog extends BaseModel
{
    protected $fillable = ['order_id', 'user_id', 'user_name', 'reason'];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
