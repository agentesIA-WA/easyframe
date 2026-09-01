<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Modules\Core\Models\PaymentMethod;

class UpdatePaymentMethodsSettlement extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'payment-methods:update-settlement';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Updates legacy payment methods with the correct settlement configuration';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Updating payment methods settlement configurations...');

        $methods = PaymentMethod::all();

        foreach ($methods as $method) {
            $desc = mb_strtoupper($method->description);
            
            if (str_contains($desc, 'CARTAO') || str_contains($desc, 'CARTÃO')) {
                $method->update([
                    'settlement_type' => 'credit_card',
                    'settlement_days' => 30,
                    'installment_interval_days' => 30,
                ]);
                $this->line("Updated [{$desc}] as credit_card");
            } elseif (str_contains($desc, 'BOLETO') || str_contains($desc, 'PROMISS') || str_contains($desc, 'CHEQUE')) {
                $method->update([
                    'settlement_type' => 'custom_date',
                    'settlement_days' => 2, // 2 days for clearing
                    'installment_interval_days' => 30,
                ]);
                $this->line("Updated [{$desc}] as custom_date");
            } else {
                // DINHEIRO, PIX, DÉBITO, etc
                $method->update([
                    'settlement_type' => 'immediate',
                    'settlement_days' => 1,
                    'installment_interval_days' => 30,
                ]);
                $this->line("Updated [{$desc}] as immediate");
            }
        }

        $this->info('Done.');
    }
}
