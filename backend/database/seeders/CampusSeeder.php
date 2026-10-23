<?php

namespace Database\Seeders;

use App\Models\Aula;
use App\Models\CategoriaServicio;
use App\Models\CodigoQr;
use App\Models\Edificio;
use App\Models\Espacio;
use App\Models\HorarioEspacio;
use App\Models\Laboratorio;
use App\Models\Oficina;
use App\Models\Piso;
use App\Models\TipoEspacio;
use App\Models\TipoLaboratorio;
use App\Models\Zona;
use Illuminate\Database\Seeder;

/**
 * Datos de ejemplo del campus (coordenadas de referencia en la zona
 * de Calacoto, La Paz — ajustar con las coordenadas reales de QGIS).
 */
class CampusSeeder extends Seeder
{
    public function run(): void
    {
        /*
        |--------------------------------------------------------------
        | Zonas: entrada principal, estacionamientos y área deportiva
        |--------------------------------------------------------------
        */
        $zonasCampus = [
            ['nombreZona' => 'Entrada Principal', 'tipoZona' => 'entradaPrincipal', 'latitud' => -16.54120, 'longitud' => -68.08520],
            ['nombreZona' => 'Estacionamiento Norte', 'tipoZona' => 'estacionamiento', 'latitud' => -16.54090, 'longitud' => -68.08540],
            ['nombreZona' => 'Estacionamiento Sur', 'tipoZona' => 'estacionamiento', 'latitud' => -16.54160, 'longitud' => -68.08490],
            ['nombreZona' => 'Canchas Deportivas', 'tipoZona' => 'areaDeportiva', 'latitud' => -16.54180, 'longitud' => -68.08560],
        ];

        $mapaZonas = [];

        foreach ($zonasCampus as $datosZona) {
            $zonaCreada = Zona::firstOrNew(['nombreZona' => $datosZona['nombreZona']]);
            $zonaCreada->tipoZona = $datosZona['tipoZona'];
            $zonaCreada->asignarPunto('coordenadasZona', $datosZona['latitud'], $datosZona['longitud']);
            $zonaCreada->save();
            $mapaZonas[$datosZona['nombreZona']] = $zonaCreada;
        }

        /*
        |--------------------------------------------------------------
        | Edificios y pisos
        |--------------------------------------------------------------
        */
        $edificiosCampus = [
            ['nombreEdificio' => 'Edificio A — Aulas', 'codigoEdificio' => 'A', 'descripcionEdificio' => 'Edificio principal de aulas y auditorio.', 'latitud' => -16.54100, 'longitud' => -68.08500, 'pisos' => 4],
            ['nombreEdificio' => 'Edificio B — Laboratorios', 'codigoEdificio' => 'B', 'descripcionEdificio' => 'Laboratorios de sistemas, redes, física y química.', 'latitud' => -16.54080, 'longitud' => -68.08470, 'pisos' => 3],
            ['nombreEdificio' => 'Edificio C — Administrativo', 'codigoEdificio' => 'C', 'descripcionEdificio' => 'Oficinas administrativas, caja y secretarías.', 'latitud' => -16.54130, 'longitud' => -68.08460, 'pisos' => 2],
            ['nombreEdificio' => 'Biblioteca Central', 'codigoEdificio' => 'BIB', 'descripcionEdificio' => 'Biblioteca central y salas de estudio.', 'latitud' => -16.54115, 'longitud' => -68.08490, 'pisos' => 2],
        ];

        $mapaEdificios = [];
        $mapaPisos = [];

        foreach ($edificiosCampus as $datosEdificio) {
            $edificioCreado = Edificio::firstOrNew(['codigoEdificio' => $datosEdificio['codigoEdificio']]);
            $edificioCreado->nombreEdificio = $datosEdificio['nombreEdificio'];
            $edificioCreado->descripcionEdificio = $datosEdificio['descripcionEdificio'];
            $edificioCreado->asignarPunto('coordenadasEdificio', $datosEdificio['latitud'], $datosEdificio['longitud']);
            $edificioCreado->save();
            $mapaEdificios[$datosEdificio['codigoEdificio']] = $edificioCreado;

            for ($numeroPiso = 1; $numeroPiso <= $datosEdificio['pisos']; $numeroPiso++) {
                $pisoCreado = Piso::firstOrCreate(
                    ['idEdificio' => $edificioCreado->idEdificio, 'numeroPiso' => $numeroPiso],
                    ['nombrePiso' => 'Piso '.$numeroPiso]
                );
                $mapaPisos[$datosEdificio['codigoEdificio']][$numeroPiso] = $pisoCreado;
            }

            // Código QR del edificio (HU-11)
            CodigoQr::firstOrCreate(
                ['codigoQr' => 'QR-EDIFICIO-'.$datosEdificio['codigoEdificio']],
                [
                    'idEdificio' => $edificioCreado->idEdificio,
                    'urlFichaEdificio' => '/edificios/'.$edificioCreado->idEdificio,
                ]
            );
        }

        /*
        |--------------------------------------------------------------
        | Espacios: aulas, laboratorios, oficinas y servicios
        |--------------------------------------------------------------
        */
        $mapaTiposEspacio = TipoEspacio::pluck('idTipoEspacio', 'nombreTipoEspacio');
        $mapaCategorias = CategoriaServicio::pluck('idCategoriaServicio', 'nombreCategoriaServicio');
        $mapaTiposLaboratorio = TipoLaboratorio::pluck('idTipoLaboratorio', 'nombreTipoLaboratorio');

        // Aulas del Edificio A (HU-18)
        $aulasEdificioA = [
            ['numeroAula' => 'A-101', 'capacidadAula' => 45, 'piso' => 1, 'latitud' => -16.54098, 'longitud' => -68.08502],
            ['numeroAula' => 'A-102', 'capacidadAula' => 40, 'piso' => 1, 'latitud' => -16.54102, 'longitud' => -68.08498],
            ['numeroAula' => 'A-201', 'capacidadAula' => 45, 'piso' => 2, 'latitud' => -16.54099, 'longitud' => -68.08503],
            ['numeroAula' => 'A-301', 'capacidadAula' => 35, 'piso' => 3, 'latitud' => -16.54101, 'longitud' => -68.08497],
            ['numeroAula' => 'A-401', 'capacidadAula' => 50, 'piso' => 4, 'latitud' => -16.54100, 'longitud' => -68.08501],
        ];

        foreach ($aulasEdificioA as $datosAula) {
            $espacioAula = $this->crearEspacio([
                'idEdificio' => $mapaEdificios['A']->idEdificio,
                'idPiso' => $mapaPisos['A'][$datosAula['piso']]->idPiso,
                'idTipoEspacio' => $mapaTiposEspacio['aula'],
                'idCategoriaServicio' => $mapaCategorias['aulas'],
                'nombreEspacio' => 'Aula '.$datosAula['numeroAula'],
                'descripcionEspacio' => 'Aula de clases con capacidad para '.$datosAula['capacidadAula'].' estudiantes.',
                'contactoEspacio' => 'aulas@univalle.edu.bo',
                'latitud' => $datosAula['latitud'],
                'longitud' => $datosAula['longitud'],
            ], 'semana');

            Aula::firstOrCreate(
                ['idEspacio' => $espacioAula->idEspacio],
                ['numeroAula' => $datosAula['numeroAula'], 'capacidadAula' => $datosAula['capacidadAula']]
            );
        }

        // Laboratorios del Edificio B (HU-19)
        $laboratoriosEdificioB = [
            ['numeroLaboratorio' => 'B-101', 'tipoLaboratorio' => 'sistemas', 'piso' => 1, 'latitud' => -16.54078, 'longitud' => -68.08472],
            ['numeroLaboratorio' => 'B-102', 'tipoLaboratorio' => 'redes', 'piso' => 1, 'latitud' => -16.54082, 'longitud' => -68.08468],
            ['numeroLaboratorio' => 'B-201', 'tipoLaboratorio' => 'física', 'piso' => 2, 'latitud' => -16.54079, 'longitud' => -68.08473],
            ['numeroLaboratorio' => 'B-301', 'tipoLaboratorio' => 'química', 'piso' => 3, 'latitud' => -16.54081, 'longitud' => -68.08467],
        ];

        foreach ($laboratoriosEdificioB as $datosLaboratorio) {
            $espacioLaboratorio = $this->crearEspacio([
                'idEdificio' => $mapaEdificios['B']->idEdificio,
                'idPiso' => $mapaPisos['B'][$datosLaboratorio['piso']]->idPiso,
                'idTipoEspacio' => $mapaTiposEspacio['laboratorio'],
                'idCategoriaServicio' => $mapaCategorias['laboratorio'],
                'nombreEspacio' => 'Laboratorio de '.ucfirst($datosLaboratorio['tipoLaboratorio']).' '.$datosLaboratorio['numeroLaboratorio'],
                'descripcionEspacio' => 'Laboratorio de '.$datosLaboratorio['tipoLaboratorio'].' del Edificio B.',
                'contactoEspacio' => 'lab'.strtolower($datosLaboratorio['tipoLaboratorio']).'@univalle.edu.bo',
                'latitud' => $datosLaboratorio['latitud'],
                'longitud' => $datosLaboratorio['longitud'],
            ], 'semana');

            Laboratorio::firstOrCreate(
                ['idEspacio' => $espacioLaboratorio->idEspacio],
                [
                    'idTipoLaboratorio' => $mapaTiposLaboratorio[$datosLaboratorio['tipoLaboratorio']],
                    'numeroLaboratorio' => $datosLaboratorio['numeroLaboratorio'],
                ]
            );
        }

        // Oficinas y servicios del Edificio C (HU-02, HU-03)
        $oficinasEdificioC = [
            ['nombreOficina' => 'Caja Universitaria', 'responsableOficina' => 'Lic. María Quispe', 'categoria' => 'caja', 'piso' => 1, 'contacto' => 'caja@univalle.edu.bo', 'latitud' => -16.54128, 'longitud' => -68.08462],
            ['nombreOficina' => 'Bienestar Estudiantil', 'responsableOficina' => 'Lic. Juan Mamani', 'categoria' => 'bienestar estudiantil', 'piso' => 1, 'contacto' => 'bienestar@univalle.edu.bo', 'latitud' => -16.54132, 'longitud' => -68.08458],
            ['nombreOficina' => 'Secretaría Académica', 'responsableOficina' => 'Lic. Rosa Flores', 'categoria' => 'secretaría académica', 'piso' => 2, 'contacto' => 'secretaria@univalle.edu.bo', 'latitud' => -16.54129, 'longitud' => -68.08463],
            ['nombreOficina' => 'Dirección de Carrera — Sistemas', 'responsableOficina' => 'Ing. Carlos Vargas', 'categoria' => 'dirección de carrera', 'piso' => 2, 'contacto' => 'dir.sistemas@univalle.edu.bo', 'latitud' => -16.54131, 'longitud' => -68.08457],
        ];

        foreach ($oficinasEdificioC as $datosOficina) {
            $espacioOficina = $this->crearEspacio([
                'idEdificio' => $mapaEdificios['C']->idEdificio,
                'idPiso' => $mapaPisos['C'][$datosOficina['piso']]->idPiso,
                'idTipoEspacio' => $mapaTiposEspacio['oficina'],
                'idCategoriaServicio' => $mapaCategorias[$datosOficina['categoria']],
                'nombreEspacio' => $datosOficina['nombreOficina'],
                'descripcionEspacio' => 'Oficina de '.$datosOficina['nombreOficina'].'.',
                'contactoEspacio' => $datosOficina['contacto'],
                'latitud' => $datosOficina['latitud'],
                'longitud' => $datosOficina['longitud'],
            ], 'oficina');

            Oficina::firstOrCreate(
                ['idEspacio' => $espacioOficina->idEspacio],
                ['nombreOficina' => $datosOficina['nombreOficina'], 'responsableOficina' => $datosOficina['responsableOficina']]
            );
        }

        // Biblioteca central
        $espacioBiblioteca = $this->crearEspacio([
            'idEdificio' => $mapaEdificios['BIB']->idEdificio,
            'idPiso' => $mapaPisos['BIB'][1]->idPiso,
            'idTipoEspacio' => $mapaTiposEspacio['biblioteca'],
            'idCategoriaServicio' => $mapaCategorias['biblioteca'],
            'nombreEspacio' => 'Biblioteca Central',
            'descripcionEspacio' => 'Préstamo de libros, salas de estudio y hemeroteca.',
            'contactoEspacio' => 'biblioteca@univalle.edu.bo',
            'latitud' => -16.54115,
            'longitud' => -68.08490,
        ], 'biblioteca');

        Oficina::firstOrCreate(
            ['idEspacio' => $espacioBiblioteca->idEspacio],
            ['nombreOficina' => 'Biblioteca Central', 'responsableOficina' => 'Lic. Ana Torrez']
        );

        // Cafetería (Edificio A, piso 1)
        $this->crearEspacio([
            'idEdificio' => $mapaEdificios['A']->idEdificio,
            'idPiso' => $mapaPisos['A'][1]->idPiso,
            'idTipoEspacio' => $mapaTiposEspacio['oficina'],
            'idCategoriaServicio' => $mapaCategorias['cafetería'],
            'nombreEspacio' => 'Cafetería Central',
            'descripcionEspacio' => 'Servicio de alimentos y bebidas.',
            'contactoEspacio' => 'cafeteria@univalle.edu.bo',
            'latitud' => -16.54103,
            'longitud' => -68.08499,
        ], 'oficina');
    }

    /**
     * Crea un espacio con su punto PostGIS y sus horarios según el tipo:
     *  - semana: lunes a viernes 07:00–21:00 y sábado 08:00–12:00
     *  - oficina: lunes a viernes 08:00–16:00
     *  - biblioteca: lunes a viernes 07:30–20:00 y sábado 08:00–13:00
     */
    private function crearEspacio(array $datosEspacio, string $tipoHorario = 'semana'): Espacio
    {
        $latitudEspacio = $datosEspacio['latitud'];
        $longitudEspacio = $datosEspacio['longitud'];
        unset($datosEspacio['latitud'], $datosEspacio['longitud']);

        $espacioNuevo = Espacio::firstOrNew(['nombreEspacio' => $datosEspacio['nombreEspacio']]);
        $espacioNuevo->fill($datosEspacio);
        $espacioNuevo->asignarPunto('coordenadasEspacio', $latitudEspacio, $longitudEspacio);
        $espacioNuevo->save();

        $horariosPorTipo = [
            'semana' => [
                ['dias' => ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], 'apertura' => '07:00', 'cierre' => '21:00'],
                ['dias' => ['sabado'], 'apertura' => '08:00', 'cierre' => '12:00'],
            ],
            'oficina' => [
                ['dias' => ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], 'apertura' => '08:00', 'cierre' => '16:00'],
            ],
            'biblioteca' => [
                ['dias' => ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], 'apertura' => '07:30', 'cierre' => '20:00'],
                ['dias' => ['sabado'], 'apertura' => '08:00', 'cierre' => '13:00'],
            ],
        ];

        foreach ($horariosPorTipo[$tipoHorario] as $bloqueHorario) {
            foreach ($bloqueHorario['dias'] as $diaSemana) {
                HorarioEspacio::firstOrCreate([
                    'idEspacio' => $espacioNuevo->idEspacio,
                    'diaSemana' => $diaSemana,
                    'horaApertura' => $bloqueHorario['apertura'],
                    'horaCierre' => $bloqueHorario['cierre'],
                ]);
            }
        }

        return $espacioNuevo;
    }
}
