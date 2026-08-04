<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stores', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->nullable();
            $table->string('company_name')->default('EASY FRAME');
            $table->string('corporate_name')->nullable();
            $table->string('cnpj')->nullable();
            $table->string('cpf')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('cep')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->string('business_hours')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('user_stores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('store_id')->constrained('stores')->onDelete('cascade');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        // Copia as configurações existentes de settings para a Loja #1 (Matriz)
        $existingSetting = DB::table('settings')->first();
        if ($existingSetting) {
            DB::table('stores')->insert([
                'id' => 1,
                'name' => 'Loja Matriz',
                'code' => 'MATRIZ',
                'company_name' => $existingSetting->company_name ?? 'EASY FRAME',
                'corporate_name' => $existingSetting->corporate_name ?? null,
                'cnpj' => $existingSetting->cnpj ?? null,
                'cpf' => $existingSetting->cpf ?? null,
                'address' => $existingSetting->address ?? null,
                'city' => $existingSetting->city ?? null,
                'cep' => $existingSetting->cep ?? null,
                'phone' => $existingSetting->phone ?? null,
                'email' => $existingSetting->email ?? null,
                'website' => $existingSetting->website ?? null,
                'business_hours' => $existingSetting->business_hours ?? null,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            DB::table('stores')->insert([
                'id' => 1,
                'name' => 'Loja Matriz',
                'code' => 'MATRIZ',
                'company_name' => 'EASY FRAME',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Atribui acesso à Loja #1 para todos os usuários existentes
        $users = DB::table('users')->pluck('id');
        foreach ($users as $userId) {
            DB::table('user_stores')->insert([
                'user_id' => $userId,
                'store_id' => 1,
                'is_default' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_stores');
        Schema::dropIfExists('stores');
    }
};
