<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aulas', function (Blueprint $table) {
            $table->id('idAula');
            $table->foreignId('idEspacio')->unique()->constrained('espacios', 'idEspacio')->cascadeOnDelete();
            $table->string('numeroAula', 20);
            $table->unsignedSmallInteger('capacidadAula')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aulas');
    }
};
