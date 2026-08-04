<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->string('state_registration', 20)->nullable()->after('tax_id');
            $table->string('address', 100)->nullable()->after('uf');
            $table->string('neighborhood', 50)->nullable()->after('address');
            
            // Contatos específicos conforme legado
            $table->string('manager_name', 80)->nullable();
            $table->string('manager_phone', 30)->nullable();
            $table->string('seller_name', 80)->nullable();
            $table->string('seller_phone1', 30)->nullable();
            $table->string('seller_phone2', 30)->nullable();
            $table->string('billing_contact', 50)->nullable();
            $table->string('billing_phone', 30)->nullable();
            
            $table->string('tips', 250)->nullable()->comment('Dicas do Fornecedor (FOR_DICAS)');
        });
    }

    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn([
                'state_registration', 'address', 'neighborhood',
                'manager_name', 'manager_phone', 'seller_name',
                'seller_phone1', 'seller_phone2', 'billing_contact',
                'billing_phone', 'tips'
            ]);
        });
    }
};
