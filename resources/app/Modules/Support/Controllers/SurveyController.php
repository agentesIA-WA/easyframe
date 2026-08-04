<?php

namespace App\Modules\Support\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Support\Models\Survey;
use App\Modules\Support\Models\SurveyResponse;
use Illuminate\Http\Request;

class SurveyController extends Controller
{
    public function index()
    {
        return response()->json(Survey::where('is_active', true)->get());
    }

    public function storeResponse(Request $request)
    {
        $data = $request->validate([
            'survey_id' => 'required|exists:surveys,id',
            'customer_id' => 'required|exists:customers,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string',
        ]);

        return response()->json(SurveyResponse::create($data));
    }
}
