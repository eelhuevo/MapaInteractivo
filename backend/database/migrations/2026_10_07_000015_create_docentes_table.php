<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('docentes', function (Blueprint $table) {
            $table->id('idDocente');
            $table->foreignId('idUsuario')->unique()->constrained('usuarios', 'idUsuario')->cascadeOnDelete();
            $table->string('departamentoDocente', 120)->nullable();
            $table->foreignId('idEspacioOficina')->nullable()->constrained('espacios', 'idEspacio')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('docentes');
    }
};
