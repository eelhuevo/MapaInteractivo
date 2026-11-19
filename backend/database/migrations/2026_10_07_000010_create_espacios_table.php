<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('espacios', function (Blueprint $table) {
            $table->id('idEspacio');
            $table->foreignId('idEdificio')->constrained('edificios', 'idEdificio')->cascadeOnDelete();
            $table->foreignId('idPiso')->constrained('pisos', 'idPiso')->restrictOnDelete();
            $table->foreignId('idTipoEspacio')->constrained('tiposEspacio', 'idTipoEspacio')->restrictOnDelete();
            $table->foreignId('idCategoriaServicio')->nullable()->constrained('categoriasServicio', 'idCategoriaServicio')->nullOnDelete();
            $table->string('nombreEspacio', 150);
            $table->text('descripcionEspacio')->nullable();
            $table->string('contactoEspacio', 150)->nullable();
            $table->geometry('coordenadasEspacio', subtype: 'point', srid: 4326);
            $table->boolean('estaActivo')->default(true);

            $table->spatialIndex('coordenadasEspacio');
            $table->index('nombreEspacio');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('espacios');
    }
};
