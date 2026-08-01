<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Services\ETL\DataSanitizer;

abstract class BaseModel extends Model
{
    /**
     * Aplica sanitização automática UCase (COD-002 / BR-MIGRAR-001).
     */
    public function setAttribute($key, $value)
    {
        if (is_string($value) && $this->isSanitizable($key)) {
            $value = DataSanitizer::normalize($value);
        }

        return parent::setAttribute($key, $value);
    }

    /**
     * Verifica se o campo deve ser sanitizado.
     */
    protected function isSanitizable(string $key): bool
    {
        $nonSanitizable = ['email', 'password', 'uuid', 'remember_token'];
        return !in_array($key, $nonSanitizable);
    }
}
