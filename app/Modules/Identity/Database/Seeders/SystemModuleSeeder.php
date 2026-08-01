<?php

namespace App\Modules\Identity\Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Identity\Models\SystemModule;

class SystemModuleSeeder extends Seeder
{
    public function run(): void
    {
        $modules = [
            // Comercial
            ['name' => 'budgets', 'label' => 'Comercial > Orçamentos'],
            ['name' => 'orders', 'label' => 'Comercial > Pedidos & Produção'],
            
            // Cadastros
            ['name' => 'customers', 'label' => 'Cadastros > Clientes'],
            ['name' => 'suppliers', 'label' => 'Cadastros > Fornecedores'],
            ['name' => 'products', 'label' => 'Cadastros > Produtos & Molduras'],
            ['name' => 'purchases', 'label' => 'Cadastros > Entrada de Compras'],
            ['name' => 'categories', 'label' => 'Cadastros > Categorias'],
            ['name' => 'employees', 'label' => 'Cadastros > Funcionários'],
            
            // Financeiro
            ['name' => 'payments', 'label' => 'Financeiro > Recebimentos'],
            ['name' => 'daily_balances', 'label' => 'Financeiro > Saldo Diário / Caixa'],
            ['name' => 'expenses', 'label' => 'Financeiro > Despesas'],
            ['name' => 'expense_types', 'label' => 'Financeiro > Tipos de Despesa'],
            ['name' => 'expense_subtypes', 'label' => 'Financeiro > Subtipos de Despesa'],
            ['name' => 'payment_methods', 'label' => 'Financeiro > Formas de Pagamento'],
            
            // Sistema
            ['name' => 'settings', 'label' => 'Sistema > Configurações Globais'],
            ['name' => 'permissions', 'label' => 'Sistema > Controle de Acesso'],
            
            // Gestão
            ['name' => 'inventory', 'label' => 'Gestão > Estoque'],
            ['name' => 'reports', 'label' => 'Gestão > Relatórios'],
        ];

        foreach ($modules as $module) {
            SystemModule::updateOrCreate(['name' => $module['name']], $module);
        }
    }
}
