<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@sdm.local'],
            [
                'name' => 'Administrador SDM',
                'password' => Hash::make('admin123'),
                'is_admin' => true,
            ]
        );
    }
}
