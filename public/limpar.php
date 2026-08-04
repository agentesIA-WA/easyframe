<?php
/**
 * Script de emergência para limpeza de cache em hospedagens sem terminal SSH (Locaweb).
 * Acesse no navegador: https://www.easyframe.net.br/limpar.php
 */

$baseDir = __DIR__ . '/..';

// Reset PHP OPcache se ativo no servidor (vital para a Locaweb recarregar arquivos .php editados)
$opcacheCleared = false;
if (function_exists('opcache_reset')) {
    $opcacheCleared = @opcache_reset();
}

clearstatcache(true);

$filesToDelete = [
    __DIR__ . '/hot',
    $baseDir . '/public/hot',
    $baseDir . '/bootstrap/cache/routes-v7.php',
    $baseDir . '/bootstrap/cache/routes.php',
    $baseDir . '/bootstrap/cache/config.php',
    $baseDir . '/bootstrap/cache/services.php',
    $baseDir . '/bootstrap/cache/packages.php',
];

$deleted = [];
foreach ($filesToDelete as $file) {
    if (file_exists($file)) {
        if (@unlink($file)) {
            $deleted[] = basename($file);
        }
    }
}

// Se o autoload do Laravel existir, chama os comandos do Artisan para garantir
$dbUpdated = false;
$errorMessage = null;

if (file_exists($baseDir . '/vendor/autoload.php')) {
    try {
        require $baseDir . '/vendor/autoload.php';
        $app = require_once $baseDir . '/bootstrap/app.php';
        $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
        $kernel->bootstrap();
        
        try { \Illuminate\Support\Facades\Artisan::call('route:clear'); } catch (\Throwable $e) {}
        try { \Illuminate\Support\Facades\Artisan::call('config:clear'); } catch (\Throwable $e) {}
        try { \Illuminate\Support\Facades\Artisan::call('view:clear'); } catch (\Throwable $e) {}
        try { \Illuminate\Support\Facades\Artisan::call('cache:clear'); } catch (\Throwable $e) {}
        
        // Executa as migrations no banco de dados da Locaweb (essencial para as novas tabelas stores e employee_stores)
        try {
            \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
            $migrationOutput = trim(\Illuminate\Support\Facades\Artisan::output());
        } catch (\Throwable $e) {
            $migrationOutput = "Erro na migração: " . $e->getMessage();
        }

        // Sincroniza todos os módulos diretamente pelo DB para garantir que existam no MySQL da Locaweb e estejam ativos (1)
        if (class_exists(\Illuminate\Support\Facades\DB::class)) {
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
                $existing = \Illuminate\Support\Facades\DB::table('system_modules')->where('name', $mod['name'])->first();
                if ($existing) {
                    \Illuminate\Support\Facades\DB::table('system_modules')
                        ->where('name', $mod['name'])
                        ->update([
                            'label' => $mod['label'],
                            'is_active' => 1,
                            'updated_at' => date('Y-m-d H:i:s')
                        ]);
                } else {
                    \Illuminate\Support\Facades\DB::table('system_modules')->insert([
                        'name' => $mod['name'],
                        'label' => $mod['label'],
                        'is_active' => 1,
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
                }
            }
            $dbUpdated = true;
        }
    } catch (\Throwable $e) {
        $errorMessage = $e->getMessage();
    }
}

// Extrai as últimas linhas do laravel.log para diagnosticar erros 500 sem terminal SSH
$latestLog = null;
$logFile = $baseDir . '/storage/logs/laravel.log';
if (file_exists($logFile) && filesize($logFile) > 0) {
    $handle = @fopen($logFile, 'r');
    if ($handle) {
        fseek($handle, -min(filesize($logFile), 4096), SEEK_END);
        $logContent = fread($handle, 4096);
        fclose($handle);
        $lines = explode("\n", trim($logContent));
        $latestLog = implode("\n", array_slice($lines, -12));
    }
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'status' => 'success',
    'message' => 'Cache de rotas e OPcache removidos, migrações executadas e módulo de lojas inserido com sucesso!',
    'opcache_reset' => $opcacheCleared,
    'migracoes' => $migrationOutput ?? 'Não executado',
    'modulo_lojas_cadastrado' => $dbUpdated,
    'erro_db' => $errorMessage,
    'ultimo_log_erro' => $latestLog,
    'arquivos_deletados' => $deleted
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
