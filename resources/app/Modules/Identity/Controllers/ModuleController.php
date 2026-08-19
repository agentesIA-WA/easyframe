<?php

namespace App\Modules\Identity\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Identity\Models\SystemModule;
use Illuminate\Http\Request;

class ModuleController extends Controller
{
    public function index()
    {
        // Garantir que todos os módulos do sistema (como Lojas) existam no banco ao carregar a tela
        $expectedModules = [
            ['name' => 'budgets', 'label' => 'Comercial > Orçamentos'],
            ['name' => 'orders', 'label' => 'Comercial > Pedidos & Produção'],
            ['name' => 'customers', 'label' => 'Cadastros > Clientes'],
            ['name' => 'suppliers', 'label' => 'Cadastros > Fornecedores'],
            ['name' => 'products', 'label' => 'Cadastros > Produtos & Molduras'],
            ['name' => 'purchases', 'label' => 'Cadastros > Entrada de Compras'],
            ['name' => 'categories', 'label' => 'Cadastros > Categorias'],
            ['name' => 'employees', 'label' => 'Cadastros > Funcionários'],
            ['name' => 'payments', 'label' => 'Financeiro > Recebimentos'],
            ['name' => 'daily_balances', 'label' => 'Financeiro > Saldo Diário / Caixa'],
            ['name' => 'expenses', 'label' => 'Financeiro > Despesas'],
            ['name' => 'expense_types', 'label' => 'Financeiro > Tipos de Despesa'],
            ['name' => 'expense_subtypes', 'label' => 'Financeiro > Subtipos de Despesa'],
            ['name' => 'payment_methods', 'label' => 'Financeiro > Formas de Pagamento'],
            ['name' => 'settings', 'label' => 'Sistema > Configurações Globais'],
            ['name' => 'permissions', 'label' => 'Sistema > Controle de Acesso'],
            ['name' => 'stores', 'label' => 'Sistema > Lojas / Identidades'],
            ['name' => 'inventory', 'label' => 'Gestão > Estoque'],
            ['name' => 'reports', 'label' => 'Gestão > Relatórios'],
        ];

        foreach ($expectedModules as $mod) {
            SystemModule::updateOrCreate(
                ['name' => $mod['name']],
                array_merge($mod, ['is_active' => true])
            );
        }

        // Garante a ordenação correta e lógica independente do ID no MySQL
        $modules = SystemModule::where('is_active', true)->get();
        $order = array_column($expectedModules, 'name');
        $sortedModules = $modules->sortBy(function ($model) use ($order) {
            $idx = array_search($model->name, $order);
            return $idx === false ? 999 : $idx;
        })->values();

        return response()->json($sortedModules);
    }
}
