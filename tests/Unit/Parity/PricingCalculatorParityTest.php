<?php

namespace Tests\Unit\Parity;

use Tests\TestCase;
use App\Modules\Sales\Services\PricingCalculator;

class PricingCalculatorParityTest extends TestCase
{
    /**
     * @paridade @critico
     * Cenário: Cálculo de Item com Moldura (Linear) e Vidro (M2)
     */
    public function test_calculo_item_com_moldura_linear_e_vidro_m2()
    {
        $calculator = new PricingCalculator();
        
        // Dimensões: 50x50 cm, Espessura base=0 para simplificar o teste inicial
        $height = 0.50; // Metros
        $width = 0.50;  // Metros
        $thickness = 0; // cm

        // Moldura: Cat 2 (Linear), Valor=10
        $molduraVal = $calculator->calculate($height, $width, $thickness, 10.00, 2);
        $this->assertEquals(20.00, $molduraVal, "Valor da moldura linear deve ser R$ 20.00");

        // Vidro: Cat 3 (M2), Valor=50
        $vidroVal = $calculator->calculate($height, $width, $thickness, 50.00, 3);
        $this->assertEquals(12.50, $vidroVal, "Valor do vidro M2 deve ser R$ 12.50");

        $total = $molduraVal + $vidroVal;
        $this->assertEquals(32.50, $total, "Total do item deve ser R$ 32.50");
    }

    /**
     * @paridade @arredondamento
     * Cenário: Paridade de Arredondamento com o Legado (COD-001)
     */
    public function test_paridade_de_arredondamento_legado()
    {
        $calculator = new PricingCalculator();
        
        // Dimensões que acionam o arredondamento: 33.3cm x 44.4cm
        $height = 0.333;
        $width = 0.444;
        
        // Vidro: Cat 3 (M2), Valor=100
        $val = $calculator->calculate($height, $width, 0, 100.00, 3);
        
        // A lógica de ceil($dim * 2) / 2 resultará em:
        // 0.333 -> 0.5
        // 0.444 -> 0.5
        // Área = 0.25 * 100 = 25.00
        
        $this->assertEquals(25.00, $val, "O arredondamento em CF_Arredondar deve ser preservado exatamente.");
    }
}
