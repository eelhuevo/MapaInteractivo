<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notificaciones', function (Blueprint $table) {
            $table->id('idNotificacion');
            $table->foreignId('idUsuario')->constrained('usuarios', 'idUsuario')->cascadeOnDelete();
            $table->foreignId('idEspacio')->constrained('espacios', 'idEspacio')->cascadeOnDelete();
            $table->text('mensajeNotificacion');
            // ubicacion, horario, contacto
            $table->string('tipoCambio', 20);
            $table->boolean('estaLeida')->default(false);
            $table->timestamp('creadoEn')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notificaciones');
    }
};
