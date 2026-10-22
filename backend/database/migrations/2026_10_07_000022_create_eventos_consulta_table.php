<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('eventosConsulta', function (Blueprint $table) {
            $table->id('idEventoConsulta');
            $table->foreignId('idEspacio')->constrained('espacios', 'idEspacio')->cascadeOnDelete();
            // nullable: los visitantes consultan sin iniciar sesión
            $table->foreignId('idUsuario')->nullable()->constrained('usuarios', 'idUsuario')->nullOnDelete();
            // consulta, busqueda, ruta
            $table->string('tipoEvento', 20);
            $table->timestamp('creadoEn')->useCurrent();

            $table->index(['idEspacio', 'tipoEvento']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eventosConsulta');
    }
};
