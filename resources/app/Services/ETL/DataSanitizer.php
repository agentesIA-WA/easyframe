<?php

namespace App\Services\ETL;

class DataSanitizer
{
    /**
     * Remove acentos e converte para maiúsculas (Normalização Legada).
     */
    public static function normalize(string $value): string
    {
        $value = mb_strtoupper($value, 'UTF-8');
        $map = [
            'Á' => 'A', 'À' => 'A', 'Â' => 'A', 'Ã' => 'A', 'Ä' => 'A',
            'É' => 'E', 'È' => 'E', 'Ê' => 'E', 'Ë' => 'E',
            'Í' => 'I', 'Ì' => 'I', 'Î' => 'I', 'Ï' => 'I',
            'Ó' => 'O', 'Ò' => 'O', 'Ô' => 'O', 'Õ' => 'O', 'Ö' => 'O',
            'Ú' => 'U', 'Ù' => 'U', 'Û' => 'U', 'Ü' => 'U',
            'Ç' => 'C', 'Ñ' => 'N'
        ];
        return strtr($value, $map);
    }

    /**
     * Converte datas do formato legado para ISO.
     */
    public static function formatDate(?string $legacyDate): ?string
    {
        if (!$legacyDate) return null;
        // Assume format yyyy-mm-dd ou similar vindo do SQL Legacy
        return date('Y-m-d H:i:s', strtotime($legacyDate));
    }
}
