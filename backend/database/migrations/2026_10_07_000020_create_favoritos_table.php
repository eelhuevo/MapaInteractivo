<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('favoritos', function (Blueprint $table) {
            $table->id('idFavorito');
            $table->foreignId('idUsuario')->constrained('usuarios', 'idUsuario')->cascadeOnDelete();
            $table->foreignId('idEspacio')->constrained('espacios', 'idEspacio')->cascadeOnDelete();
            $table->timestamp('creadoEn')->useCurrent();

            $table->unique(['idUsuario', 'idEspacio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favoritos');
    }
};
