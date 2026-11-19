<?php

namespace Database\Seeders;

use App\Models\Carrera;
use App\Models\Espacio;
use App\Models\SugerenciaEspacio;
use Illuminate\Database\Seeder;

/**
 * Sugerencias de espacios por carrera y semestre (HU-20).
 */
class SugerenciaSeeder extends Seeder
{
    public function run(): void
    {
        $carreraSistemas = Carrera::where('nombreCarrera', 'Ingeniería de Sistemas')->first();

        if (! $carreraSistemas) {
            return;
        }

        $mapaEspacios = Espacio::pluck('idEspacio', 'nombreEspacio');

        // nombreEspacio => semestre objetivo desde el que se sugiere
        $sugerenciasSistemas = [
            'Laboratorio de Sistemas B-101' => 1,
            'Laboratorio de Redes B-102' => 3,
            'Biblioteca Central' => 1,
            'Aula A-101' => 1,
            'Aula A-201' => 2,
            'Bienestar Estudiantil' => 1,
            'Caja Universitaria' => 1,
            'Dirección de Carrera — Sistemas' => 2,
            'Secretaría Académica' => 1,
        ];

        foreach ($sugerenciasSistemas as $nombreEspacio => $semestreObjetivo) {
            if (! isset($mapaEspacios[$nombreEspacio])) {
                continue;
            }

            SugerenciaEspacio::firstOrCreate([
                'idCarrera' => $carreraSistemas->idCarrera,
                'semestreObjetivo' => $semestreObjetivo,
                'idEspacio' => $mapaEspacios[$nombreEspacio],
            ]);
        }
    }
}
