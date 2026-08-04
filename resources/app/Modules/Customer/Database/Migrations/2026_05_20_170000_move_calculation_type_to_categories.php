<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Adiciona calculation_type na tabela categories (se não existir)
        if (!Schema::hasColumn('categories', 'calculation_type')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->integer('calculation_type')->default(1)->after('description')
                      ->comment('1=Absoluto, 2=Linear, 3=M2, 4=Legado M2 Área');
            });
        }

        // 2. Migra o valor mais frequente de cada categoria a partir dos produtos existentes
        if (Schema::hasColumn('products', 'calculation_type')) {
            $categories = DB::table('categories')->get();
            foreach ($categories as $category) {
                $mostCommon = DB::table('products')
                    ->select('calculation_type', DB::raw('COUNT(*) as cnt'))
                    ->where('category_id', $category->id)
                    ->whereNotNull('calculation_type')
                    ->groupBy('calculation_type')
                    ->orderByDesc('cnt')
                    ->first();

                if ($mostCommon) {
                    DB::table('categories')
                        ->where('id', $category->id)
                        ->update(['calculation_type' => $mostCommon->calculation_type]);
                }
            }

            // 3. Remove a coluna calculation_type da tabela products
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('calculation_type');
            });
        }
    }

    public function down(): void
    {
        // Restaura calculation_type nos produtos com default Absoluto
        Schema::table('products', function (Blueprint $table) {
            $table->integer('calculation_type')->default(1)->after('cost_price')
                  ->comment('1=Absoluto, 2=Linear, 3=M2, etc.');
        });

        // Copia o valor da categoria de volta para cada produto
        $products = DB::table('products')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->select('products.id', 'categories.calculation_type')
            ->get();

        foreach ($products as $product) {
            DB::table('products')
                ->where('id', $product->id)
                ->update(['calculation_type' => $product->calculation_type]);
        }

        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('calculation_type');
        });
    }
};
