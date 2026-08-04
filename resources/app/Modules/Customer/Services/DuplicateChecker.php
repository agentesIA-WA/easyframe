<?php

namespace App\Modules\Customer\Services;

use App\Modules\Customer\Models\Customer;
use Illuminate\Support\Collection;

class DuplicateChecker
{
    /**
     * Busca clientes com nomes similares para evitar duplicidade (BR-MIGRAR-002).
     */
    public function check(string $name): Collection
    {
        // Implementação simplificada usando LIKE; em produção, usar Soundex ou Levenshtein
        return Customer::where('name', 'LIKE', "%{$name}%")
            ->limit(5)
            ->get(['id', 'name', 'tax_id']);
    }
}
