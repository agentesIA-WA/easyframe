<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class CpfCnpjRule implements ValidationRule
{
    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (empty($value)) {
            return;
        }

        $clean = strtoupper(preg_replace('/[^A-Z0-9]/i', '', (string)$value));

        if (strlen($clean) === 11) {
            if (!$this->isValidCpf($clean)) {
                $fail('O CPF informado não é válido.');
            }
            return;
        }

        if (strlen($clean) === 14) {
            if (!$this->isValidCnpj($clean)) {
                $fail('O CNPJ informado não é válido.');
            }
            return;
        }

        $fail('O campo CPF/CNPJ deve conter 11 (CPF) ou 14 (CNPJ) dígitos válidos.');
    }

    private function isValidCpf(string $cpf): bool
    {
        if (strlen($cpf) !== 11 || preg_match('/^(\d)\1{10}$/', $cpf)) {
            return false;
        }

        for ($t = 9; $t < 11; $t++) {
            for ($d = 0, $c = 0; $c < $t; $c++) {
                $d += (int)$cpf[$c] * (($t + 1) - $c);
            }
            $d = ((10 * $d) % 11) % 10;
            if ((int)$cpf[$c] !== $d) {
                return false;
            }
        }
        return true;
    }

    private function isValidCnpj(string $cnpj): bool
    {
        if (strlen($cnpj) !== 14 || preg_match('/^([a-zA-Z0-9])\1{13}$/', $cnpj)) {
            return false;
        }

        // Os dois últimos dígitos (DVs) devem ser obrigatoriamente numéricos (0-9)
        if (!ctype_digit(substr($cnpj, 12, 2))) {
            return false;
        }

        $charVal = fn($ch) => ord($ch) - 48;

        $b = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        for ($i = 0, $n = 0; $i < 12; $i++) {
            $n += $charVal($cnpj[$i]) * $b[$i];
        }
        $dv1 = ($n % 11) < 2 ? 0 : 11 - ($n % 11);
        if ((int)$cnpj[12] !== $dv1) {
            return false;
        }

        $b2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        for ($i = 0, $n = 0; $i < 13; $i++) {
            $n += $charVal($cnpj[$i]) * $b2[$i];
        }
        $dv2 = ($n % 11) < 2 ? 0 : 11 - ($n % 11);
        if ((int)$cnpj[13] !== $dv2) {
            return false;
        }

        return true;
    }
}
