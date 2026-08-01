<?php

namespace Tests\Feature\Parity;

use Tests\TestCase;
use App\Modules\Finance\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PaymentLiquidationParityTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @paridade @financeiro
     * Cenário: Baixa Total de Parcela
     */
    public function test_baixa_total_de_parcela()
    {
        $payment = Payment::factory()->create([
            'status' => 'A',
            'value' => 500.00,
            'paid_value' => 0
        ]);

        $residual = $payment->pay(500.00, 'ESP');

        $this->assertNull($residual, "Nenhum resíduo deve ser gerado no pagamento total.");
        $this->assertEquals('P', $payment->status);
        $this->assertEquals(500.00, $payment->paid_value);
    }

    /**
     * @paridade @residual
     * Cenário: Recebimento Parcial com Geração de Resíduo
     */
    public function test_recebimento_parcial_com_geracao_de_residuo()
    {
        $payment = Payment::factory()->create([
            'status' => 'A',
            'value' => 1000.00,
            'paid_value' => 0
        ]);

        $residual = $payment->pay(300.00, 'CC');

        // A parcela original fica ABERTA
        $this->assertEquals('A', $payment->status);
        $this->assertEquals(1000.00, $payment->value);
        
        // O resíduo fica PAGO
        $this->assertNotNull($residual);
        $this->assertEquals($payment->id, $residual->parent_id);
        $this->assertEquals('P', $residual->status);
        $this->assertEquals(300.00, $residual->value);
        $this->assertEquals(300.00, $residual->paid_value);
    }
}
