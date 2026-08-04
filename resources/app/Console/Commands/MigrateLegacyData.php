<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Services\ETL\DataSanitizer;
use Illuminate\Support\Str;

class MigrateLegacyData extends Command
{
    protected $signature = 'sdm:migrate-legacy';
    protected $description = 'Executa o ETL dos dados do sistema legado para o MySQL';

    public function handle()
    {
        $this->info('Iniciando migração de dados...');

        $this->migrateCustomers();
        $this->migrateOrders();
        $this->migratePayments();

        $this->info('Migração concluída com sucesso!');
    }

    private function migrateCustomers()
    {
        $this->info('Migrando clientes...');
        
        // Simulação de leitura do banco legado (definido em config/database.php como 'legacy')
        $legacyCustomers = DB::connection('legacy')->table('CLIENTE')->get();

        foreach ($legacyCustomers as $legacy) {
            DB::table('customers')->updateOrInsert(
                ['legacy_id' => $legacy->COD_CLIENTE],
                [
                    'uuid' => Str::uuid(),
                    'name' => DataSanitizer::normalize($legacy->nome_cliente),
                    'tax_id' => $legacy->cpf_cnpj_cliente,
                    'cep' => $legacy->cep_cliente,
                    'uf' => $legacy->uf_cliente,
                    'city' => DataSanitizer::normalize($legacy->cidade_cliente),
                    'address' => DataSanitizer::normalize($legacy->end_cliente),
                    'created_at' => DataSanitizer::formatDate($legacy->dt_cadastro ?? now()),
                    'updated_at' => now(),
                ]
            );
        }
    }

    private function migrateOrders()
    {
        $this->info('Migrando orçamentos e pedidos...');
        
        $legacyOrders = DB::connection('legacy')->table('ORCAMENTO')->get();

        foreach ($legacyOrders as $legacy) {
            $status = $this->mapStatus($legacy->Status);

            DB::table('orders')->updateOrInsert(
                ['legacy_id' => $legacy->COD_ORCAMENTO],
                [
                    'uuid' => Str::uuid(),
                    'customer_id' => $this->getNewId('customers', $legacy->COD_CLIENTE),
                    'status' => $status,
                    'total_value' => $legacy->vl_pedido ?? 0,
                    'created_at' => DataSanitizer::formatDate($legacy->dt_pedido),
                    'updated_at' => now(),
                ]
            );
        }
    }

    private function migratePayments()
    {
        $this->info('Migrando parcelas...');
        
        $legacyPayments = DB::connection('legacy')->table('PARCELA')->get();

        foreach ($legacyPayments as $legacy) {
            DB::table('payments')->updateOrInsert(
                ['legacy_id' => $legacy->CODIGO],
                [
                    'order_id' => $this->getNewId('orders', $legacy->nro_pedido),
                    'parent_id' => $legacy->Original > 0 ? $this->getNewId('payments', $legacy->Original) : null,
                    'installment_number' => $legacy->num_parcela ?? 1,
                    'due_date' => DataSanitizer::formatDate($legacy->dt_parcela),
                    'status' => $legacy->situacao_parc ?? 'A',
                    'value' => $legacy->valor_parc ?? 0,
                    'paid_value' => $legacy->valor_pago ?? 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }

    private function mapStatus($legacyStatus)
    {
        $map = [
            '0' => 'production',
            '1' => 'ready',
            '2' => 'delivered',
            '3' => 'difficult_delivery',
            '4' => 'delivered_unpaid'
        ];
        return $map[$legacyStatus] ?? 'draft';
    }

    private function getNewId($table, $legacyId)
    {
        return DB::table($table)->where('legacy_id', $legacyId)->value('id');
    }
}
