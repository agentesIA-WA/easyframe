<?php

namespace App\Modules\Support\Models;

use Illuminate\Database\Eloquent\Model;

class SurveyResponse extends Model
{
    protected $fillable = ['survey_id', 'customer_id', 'rating', 'comment'];
}
