<?php

namespace App\Modules\Sales\Services;

class PricingCalculator
{
    /**
     * Reimplementação do motor de cálculo legado (BR-MIGRAR-007).
     */
    public function calculate(float $height, float $width, float $productWidth, float $unitValue, int $type, float $quantity = 1, float $decoratorDiscount = 0): float
    {
        // Regra COD-001: Arredondamento idêntico ao CF_Arredondar
        $h = $this->roundDimension($height);
        $w = $this->roundDimension($width);
        
        // Perímetro em CM, convertido para Metros Lineares (/ 100)
        // Regra: 2 * (H + W) + 4 * Largura da Moldura (para cantos)
        $perimeter = (($h + $w) * 2 + ($productWidth * 4)) / 100;
        
        // Área em CM2, convertida para M2 (/ 10000)
        $area = ($h * $w) / 10000;

        $total = match ($type) {
            1 => $quantity * $unitValue, // Absoluto: Valor x Qtd
            2 => $perimeter * $unitValue * $quantity, // Linear: Perímetro(m) x Valor x Qtd
            3 => $area * $unitValue * $quantity,      // M2: Área(m2) x Valor x Qtd
            4 => (($h * $w / 10000) + (($productWidth * 2 / 100) * ($h + $w) / 100)) * $unitValue, // Legado: Soma Área e Calcula M2
            default => $unitValue * $quantity,
        };

        // Regra BR-MIGRAR-010: Ajuste de Decorador
        if ($decoratorDiscount > 0) {
            $total = $total / ((100 - $decoratorDiscount) / 100);
        }

        return $total;
    }

    /**
     * Simula o comportamento do custom tag CF_Arredondar.
     */
    private function roundDimension(float $dim): float
    {
        // Legado costuma arredondar para cima ou para o próximo .5/.0 dependendo da config
        return ceil($dim * 2) / 2; 
    }
}
