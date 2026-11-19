<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Habilita la extensión PostGIS en PostgreSQL (Supabase).
     *
     * En Supabase también se puede activar desde el panel:
     * Database → Extensions → postgis
     */
    public function up(): void
    {
        try {
            DB::statement('CREATE EXTENSION IF NOT EXISTS postgis');
        } catch (\Throwable $excepcion) {
            throw new \RuntimeException(
                'No se pudo habilitar la extensión PostGIS. Actívala manualmente en Supabase: '.
                'Dashboard → Database → Extensions → postgis. Detalle: '.$excepcion->getMessage()
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No se deshabilita PostGIS para no romper otras tablas que lo usen.
    }
};
