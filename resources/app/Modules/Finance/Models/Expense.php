<?php

namespace App\Modules\Finance\Models;

use App\Models\BaseModel;
use Illuminate\Database\Eloquent\SoftDeletes;

class Expense extends BaseModel
{
    use SoftDeletes;

    protected $fillable = [
        'store_id', 'expense_type_id', 'supplier_id', 'description', 'amount', 
        'due_date', 'issue_date', 'payment_date', 'document_type', 
        'document_number', 'status', 'is_countable', 'is_visible', 'notes', 'legacy_id'
    ];

    protected $casts = [
        'due_date' => 'date',
        'issue_date' => 'date',
        'payment_date' => 'date',
        'is_countable' => 'boolean',
        'is_visible' => 'boolean',
    ];

    public function type()
    {
        return $this->belongsTo(ExpenseType::class, 'expense_type_id');
    }
}
