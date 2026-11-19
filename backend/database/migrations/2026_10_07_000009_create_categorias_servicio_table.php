<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categoriasServicio', function (Blueprint $table) {
            $table->id('idCategoriaServicio');
            // caja, bienestar, secretaría, laboratorio, etc.
            $table->string('nombreCategoriaServicio', 80)->unique();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categoriasServicio');
    }
};
