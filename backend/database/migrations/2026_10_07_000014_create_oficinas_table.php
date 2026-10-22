<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oficinas', function (Blueprint $table) {
            $table->id('idOficina');
            $table->foreignId('idEspacio')->unique()->constrained('espacios', 'idEspacio')->cascadeOnDelete();
            $table->string('nombreOficina', 120);
            $table->string('responsableOficina', 120)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oficinas');
    }
};
