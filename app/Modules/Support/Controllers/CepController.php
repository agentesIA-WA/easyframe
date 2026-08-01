<?php

namespace App\Modules\Support\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class CepController extends Controller
{
    /**
     * Busca endereços na base local (soq_cep) com fallback para ViaCEP API (BR-MIGRAR-014).
     */
    public function search(Request $request)
    {
        $rawCep = preg_replace('/\D/', '', $request->input('cep', ''));
        $rawDesc = trim($request->input('description', ''));

        // Se a busca forneceu um CEP de 8 dígitos
        if (strlen($rawCep) === 8) {
            $viaCepResult = $this->fetchFromViaCep($rawCep);
            if (!empty($viaCepResult)) {
                return response()->json([$viaCepResult]);
            }
        }

        // Se a descrição for um CEP de 8 dígitos
        $descDigits = preg_replace('/\D/', '', $rawDesc);
        if (strlen($descDigits) === 8) {
            $viaCepResult = $this->fetchFromViaCep($descDigits);
            if (!empty($viaCepResult)) {
                return response()->json([$viaCepResult]);
            }
        }

        // Tenta buscar no banco de dados local soq_cep se a conexão e tabelas existirem
        try {
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

            if (!empty($rawCep)) {
                $query->where('endereco.endereco_cep', 'LIKE', '%' . $rawCep . '%');
            }

            if (!empty($rawDesc)) {
                $query->where('endereco.endereco_logradouro', 'LIKE', '%' . strtoupper($rawDesc) . '%');
            }

            $results = $query->limit(50)->get();
            if ($results->isNotEmpty()) {
                return response()->json($results);
            }
        } catch (\Throwable $e) {
            // Se a base soq_cep não existir ou falhar, prossegue graciosamente para a ViaCEP API
        }

        // Se não encontrou no banco local, faz tentativa na ViaCEP caso haja CEP
        $targetCep = strlen($rawCep) === 8 ? $rawCep : (strlen($descDigits) === 8 ? $descDigits : null);
        if ($targetCep) {
            $viaCepResult = $this->fetchFromViaCep($targetCep);
            if (!empty($viaCepResult)) {
                return response()->json([$viaCepResult]);
            }
        }

        return response()->json([]);
    }

    private function fetchFromViaCep(string $cep): ?array
    {
        try {
            $response = Http::timeout(5)->get("https://viacep.com.br/ws/{$cep}/json/");
            if ($response->successful()) {
                $data = $response->json();
                if (!isset($data['erro']) || $data['erro'] !== true) {
                    return [
                        'cep' => preg_replace('/\D/', '', $data['cep'] ?? $cep),
                        'address' => $data['logradouro'] ?? '',
                        'neighborhood' => $data['bairro'] ?? '',
                        'city' => $data['localidade'] ?? '',
                        'uf' => $data['uf'] ?? ''
                    ];
                }
            }
        } catch (\Throwable $e) {
            // Ignora exceção de timeout/conectividade externa
        }

        return null;
    }
}
