<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('laboratorios', function (Blueprint $table) {
            $table->id('idLaboratorio');
            $table->foreignId('idEspacio')->unique()->constrained('espacios', 'idEspacio')->cascadeOnDelete();
            $table->foreignId('idTipoLaboratorio')->constrained('tiposLaboratorio', 'idTipoLaboratorio')->restrictOnDelete();
            $table->string('numeroLaboratorio', 20);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laboratorios');
    }
};
