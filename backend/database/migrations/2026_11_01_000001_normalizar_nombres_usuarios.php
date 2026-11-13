<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Normaliza la tabla usuarios a 3FN: el nombre completo que vivia
     * en una sola columna (nombreUsuario) se parte en tres columnas
     * independientes (nombre, apellido paterno, apellido materno).
     *
     * Regla de particion de los datos existentes:
     *  - 3 o mas partes: nombre = todas menos las 2 ultimas,
     *    apellidoPaterno = penultima, apellidoMaterno = ultima
     *  - 2 partes: nombre = primera, apellidoPaterno = segunda,
     *    apellidoMaterno = vacio
     *  - 1 parte: nombre = esa, apellidos vacios
     */
    public function up(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->string('apellidoPaternoUsuario', 60)->default('')->after('nombreUsuario');
            $table->string('apellidoMaternoUsuario', 60)->default('')->after('apellidoPaternoUsuario');
        });

        foreach (DB::table('usuarios')->get() as $fila) {
            $partes = preg_split('/\s+/', trim((string) $fila->nombreUsuario), -1, PREG_SPLIT_NO_EMPTY);

            if (count($partes) >= 3) {
                $nombre = implode(' ', array_slice($partes, 0, -2));
                $paterno = $partes[count($partes) - 2];
                $materno = $partes[count($partes) - 1];
            } elseif (count($partes) === 2) {
                $nombre = $partes[0];
                $paterno = $partes[1];
                $materno = '';
            } else {
                $nombre = $partes[0] ?? '';
                $paterno = '';
                $materno = '';
            }

            DB::table('usuarios')->where('idUsuario', $fila->idUsuario)->update([
                'nombreUsuario' => $nombre,
                'apellidoPaternoUsuario' => $paterno,
                'apellidoMaternoUsuario' => $materno,
            ]);
        }
    }

    public function down(): void
    {
        foreach (DB::table('usuarios')->get() as $fila) {
            $nombreCompleto = trim(implode(' ', array_filter([
                $fila->nombreUsuario,
                $fila->apellidoPaternoUsuario,
                $fila->apellidoMaternoUsuario,
            ])));

            DB::table('usuarios')->where('idUsuario', $fila->idUsuario)->update([
                'nombreUsuario' => $nombreCompleto,
            ]);
        }

        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropColumn(['apellidoPaternoUsuario', 'apellidoMaternoUsuario']);
        });
    }
};
