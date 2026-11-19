<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuarios', function (Blueprint $table) {
            $table->id('idUsuario');
            $table->foreignId('idRol')->constrained('roles', 'idRol')->restrictOnDelete();
            $table->string('nombreUsuario', 120);
            $table->string('correoUsuario', 150)->unique();
            $table->string('contrasenaHash', 255);
            $table->string('idiomaPreferido', 2)->default('es');
            $table->boolean('estaActivo')->default(true);
            $table->timestamp('creadoEn')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuarios');
    }
};
