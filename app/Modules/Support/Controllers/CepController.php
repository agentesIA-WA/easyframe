<?php

namespace App\Modules\Support\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CepController extends Controller
{
    /**
     * Busca endereços na base SOQ_CEP (BR-MIGRAR-014).
     */
    public function search(Request $request)
    {
        $query = DB::connection('soq_cep')->table('endereco')
            ->join('bairro', 'endereco.endereco_bairro', '=', 'bairro.bairro_codigo')
            ->join('cidade', 'bairro.bairro_cidade', '=', 'cidade.cidade_codigo')
            ->join('uf', 'cidade.cidade_uf', '=', 'uf.uf_codigo')
            ->select([
                'endereco.endereco_cep as cep',
                'endereco.endereco_logradouro as address',
                'bairro.bairro_nome as neighborhood',
                'cidade.cidade_nome as city',
                'uf.uf_sigla as uf'
            ]);

        if ($request->filled('cep')) {
            $query->where('endereco.endereco_cep', 'LIKE', '%' . preg_replace('/\D/', '', $request->cep) . '%');
        }

        if ($request->filled('description')) {
            $query->where('endereco.endereco_logradouro', 'LIKE', '%' . strtoupper($request->description) . '%');
        }

        return response()->json($query->limit(100)->get());
    }
}
