<?php

namespace App\Modules\Sales\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Sales\Mail\ProposalMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class EmailController extends Controller
{
    public function sendProposal(Request $request)
    {
        $request->validate([
            'to' => 'required|email',
            'text' => 'required|string',
            'content' => 'required|string',
        ]);

        Mail::to($request->to)->send(new ProposalMail($request->text, $request->content));

        return response()->json(['message' => 'Email enviado com sucesso!']);
    }
}
