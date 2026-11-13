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
 *
 * Los espacios se colocan en un plano logico de 800x600 con dos
 * columnas (x=170 y x=400) y cinco filas (y=70,150,230,310,390).
 * La posicion se traduce a lat/lng con la formula inversa que usa el
 * frontend (core/api.js) para que cada cuadro caiga en su lugar.
 * La columna x=600 queda libre para los espacios que crea el
 * administrador desde el panel web.
 */
class CampusSeeder extends Seeder
{
    /* Escala del plano (igual que ESCALA_PLANO en core/api.js) */
    private const ESCALA_PLANO = 0.000003;

    /* Coordenadas base de cada edificio (misma tabla que el frontend) */
    private const COORDENADAS_EDIFICIO = [
        'A' => ['latitud' => -16.54100, 'longitud' => -68.08500],
        'B' => ['latitud' => -16.54080, 'longitud' => -68.08470],
        'C' => ['latitud' => -16.54130, 'longitud' => -68.08460],
        'BIB' => ['latitud' => -16.54115, 'longitud' => -68.08490],
    ];

    /* Filas del plano segun el tipo de contenido */
    private const FILA_AULAS = 70;
    private const FILA_LABS = 150;
    private const FILA_OFICINAS = 230;
    private const FILA_SERVICIOS = 310;
    private const FILA_ESPECIALES = 390;

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

        // Pisos con la numeracion real del frontend (el panel web
        // sincroniza cada espacio al numero de piso de su torre):
        //   A = Torre Antigua (4..17), B = Torre Innovacion (0,4,6..11)
        $pisosFrontend = [
            'A' => [4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17],
            'B' => [0, 4, 6, 7, 8, 9, 10, 11],
        ];

        foreach ($edificiosCampus as $datosEdificio) {
            $edificioCreado = Edificio::firstOrNew(['codigoEdificio' => $datosEdificio['codigoEdificio']]);
            $edificioCreado->nombreEdificio = $datosEdificio['nombreEdificio'];
            $edificioCreado->descripcionEdificio = $datosEdificio['descripcionEdificio'];
            $edificioCreado->asignarPunto('coordenadasEdificio', $datosEdificio['latitud'], $datosEdificio['longitud']);
            $edificioCreado->save();
            $mapaEdificios[$datosEdificio['codigoEdificio']] = $edificioCreado;

            // Pisos 1..N de demostracion + los pisos reales del plano
            $listaPisos = array_merge(
                range(1, $datosEdificio['pisos']),
                $pisosFrontend[$datosEdificio['codigoEdificio']] ?? []
            );

            foreach (array_unique($listaPisos) as $numeroPiso) {
                $pisoCreado = Piso::firstOrCreate(
                    ['idEdificio' => $edificioCreado->idEdificio, 'numeroPiso' => $numeroPiso],
                    ['nombrePiso' => $numeroPiso === 0 ? 'Planta Baja' : 'Piso '.$numeroPiso]
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

        // Slots ya ocupados en el plano: "A|4|70|170" => true.
        // La reubicacion de los espacios legacy va primero; la
        // generacion por piso solo usa los slots que quedaron libres.
        $ocupados = [];

        // Aulas del Edificio A (HU-18): se reubican en pisos reales
        // del plano conservando su nombre (los referencian los tests y
        // SugerenciaSeeder). Solo estas 5 crean fila en la tabla aulas.
        $aulasEdificioA = [
            ['numeroAula' => 'A-101', 'capacidadAula' => 45, 'piso' => 4, 'x' => 170, 'y' => self::FILA_AULAS],
            ['numeroAula' => 'A-102', 'capacidadAula' => 40, 'piso' => 4, 'x' => 400, 'y' => self::FILA_AULAS],
            ['numeroAula' => 'A-201', 'capacidadAula' => 45, 'piso' => 5, 'x' => 170, 'y' => self::FILA_AULAS],
            ['numeroAula' => 'A-301', 'capacidadAula' => 35, 'piso' => 5, 'x' => 400, 'y' => self::FILA_AULAS],
            ['numeroAula' => 'A-401', 'capacidadAula' => 50, 'piso' => 6, 'x' => 170, 'y' => self::FILA_AULAS],
        ];

        foreach ($aulasEdificioA as $datosAula) {
            $punto = $this->puntoDeSlot('A', $datosAula['x'], $datosAula['y']);
            $espacioAula = $this->crearEspacio([
                'idEdificio' => $mapaEdificios['A']->idEdificio,
                'idPiso' => $mapaPisos['A'][$datosAula['piso']]->idPiso,
                'idTipoEspacio' => $mapaTiposEspacio['aula'],
                'idCategoriaServicio' => $mapaCategorias['aulas'],
                'nombreEspacio' => 'Aula '.$datosAula['numeroAula'],
                'descripcionEspacio' => 'Aula de clases con capacidad para '.$datosAula['capacidadAula'].' estudiantes.',
                'contactoEspacio' => 'aulas@univalle.edu.bo',
                'latitud' => $punto['latitud'],
                'longitud' => $punto['longitud'],
            ], 'semana');

            Aula::firstOrCreate(
                ['idEspacio' => $espacioAula->idEspacio],
                ['numeroAula' => $datosAula['numeroAula'], 'capacidadAula' => $datosAula['capacidadAula']]
            );

            $ocupados['A|'.$datosAula['piso'].'|'.self::FILA_AULAS.'|'.$datosAula['x']] = true;
        }

        // Laboratorios del Edificio B (HU-19): reubicados en pisos
        // reales conservando nombre y tipo de laboratorio
        $laboratoriosEdificioB = [
            ['numeroLaboratorio' => 'B-101', 'tipoLaboratorio' => 'sistemas', 'piso' => 4, 'x' => 170, 'y' => self::FILA_LABS],
            ['numeroLaboratorio' => 'B-102', 'tipoLaboratorio' => 'redes', 'piso' => 4, 'x' => 400, 'y' => self::FILA_LABS],
            ['numeroLaboratorio' => 'B-201', 'tipoLaboratorio' => 'física', 'piso' => 6, 'x' => 170, 'y' => self::FILA_LABS],
            ['numeroLaboratorio' => 'B-301', 'tipoLaboratorio' => 'química', 'piso' => 6, 'x' => 400, 'y' => self::FILA_LABS],
        ];

        foreach ($laboratoriosEdificioB as $datosLaboratorio) {
            $punto = $this->puntoDeSlot('B', $datosLaboratorio['x'], $datosLaboratorio['y']);
            $espacioLaboratorio = $this->crearEspacio([
                'idEdificio' => $mapaEdificios['B']->idEdificio,
                'idPiso' => $mapaPisos['B'][$datosLaboratorio['piso']]->idPiso,
                'idTipoEspacio' => $mapaTiposEspacio['laboratorio'],
                'idCategoriaServicio' => $mapaCategorias['laboratorio'],
                'nombreEspacio' => 'Laboratorio de '.ucfirst($datosLaboratorio['tipoLaboratorio']).' '.$datosLaboratorio['numeroLaboratorio'],
                'descripcionEspacio' => 'Laboratorio de '.$datosLaboratorio['tipoLaboratorio'].' del Edificio B.',
                'contactoEspacio' => 'lab'.strtolower($datosLaboratorio['tipoLaboratorio']).'@univalle.edu.bo',
                'latitud' => $punto['latitud'],
                'longitud' => $punto['longitud'],
            ], 'semana');

            Laboratorio::firstOrCreate(
                ['idEspacio' => $espacioLaboratorio->idEspacio],
                [
                    'idTipoLaboratorio' => $mapaTiposLaboratorio[$datosLaboratorio['tipoLaboratorio']],
                    'numeroLaboratorio' => $datosLaboratorio['numeroLaboratorio'],
                ]
            );

            $ocupados['B|'.$datosLaboratorio['piso'].'|'.self::FILA_LABS.'|'.$datosLaboratorio['x']] = true;
        }

        // Cafetería (Edificio A, piso 4)
        $puntoCafeteria = $this->puntoDeSlot('A', 170, self::FILA_OFICINAS);
        $this->crearEspacio([
            'idEdificio' => $mapaEdificios['A']->idEdificio,
            'idPiso' => $mapaPisos['A'][4]->idPiso,
            'idTipoEspacio' => $mapaTiposEspacio['oficina'],
            'idCategoriaServicio' => $mapaCategorias['cafetería'],
            'nombreEspacio' => 'Cafetería Central',
            'descripcionEspacio' => 'Servicio de alimentos y bebidas.',
            'contactoEspacio' => 'cafeteria@univalle.edu.bo',
            'latitud' => $puntoCafeteria['latitud'],
            'longitud' => $puntoCafeteria['longitud'],
        ], 'oficina');
        $ocupados['A|4|'.self::FILA_OFICINAS.'|170'] = true;

        /*
        |--------------------------------------------------------------
        | Planta Baja del Edificio B: 10 tarjetas especiales
        |--------------------------------------------------------------
        */
        $plantaBajaB = [
            ['nombre' => 'Aula 501 · Introduccion', 'tipo' => 'aula', 'categoria' => 'aulas', 'x' => 170, 'y' => self::FILA_AULAS, 'horario' => 'semana', 'contacto' => 'Ext. 501'],
            ['nombre' => 'Aula 502 · Metodologia', 'tipo' => 'aula', 'categoria' => 'aulas', 'x' => 400, 'y' => self::FILA_AULAS, 'horario' => 'semana', 'contacto' => 'Ext. 502'],
            ['nombre' => 'Lab. Sistemas · B P0', 'tipo' => 'laboratorio', 'categoria' => 'laboratorio', 'lab' => 'sistemas', 'x' => 170, 'y' => self::FILA_LABS, 'horario' => 'semana', 'contacto' => 'lab.sistemas@univalle.edu.bo'],
            ['nombre' => 'Recepcion', 'tipo' => 'oficina', 'x' => 400, 'y' => self::FILA_LABS, 'horario' => 'oficina', 'contacto' => 'Ext. 500'],
            ['nombre' => 'Direccion', 'tipo' => 'oficina', 'x' => 170, 'y' => self::FILA_OFICINAS, 'horario' => 'oficina', 'contacto' => 'Ext. 503'],
            ['nombre' => 'Secretaria', 'tipo' => 'oficina', 'x' => 400, 'y' => self::FILA_OFICINAS, 'horario' => 'oficina', 'contacto' => 'Ext. 504'],
            ['nombre' => 'Area de Exposiciones', 'tipo' => 'salon', 'x' => 170, 'y' => self::FILA_SERVICIOS, 'horario' => 'oficina', 'contacto' => 'Ext. 505'],
            ['nombre' => 'Coworking', 'tipo' => 'salon', 'x' => 400, 'y' => self::FILA_SERVICIOS, 'horario' => 'oficina', 'contacto' => 'Ext. 506'],
            ['nombre' => 'Cafe Innovation', 'tipo' => 'comedor', 'categoria' => 'cafetería', 'x' => 170, 'y' => self::FILA_ESPECIALES, 'horario' => 'oficina', 'contacto' => 'Ext. 507'],
            ['nombre' => 'Estacionamiento Principal', 'tipo' => 'estacionamiento', 'x' => 400, 'y' => self::FILA_ESPECIALES, 'horario' => 'oficina', 'contacto' => 'Ext. 508'],
        ];

        foreach ($plantaBajaB as $tarjeta) {
            $punto = $this->puntoDeSlot('B', $tarjeta['x'], $tarjeta['y']);
            $espacioPb = $this->crearEspacio([
                'idEdificio' => $mapaEdificios['B']->idEdificio,
                'idPiso' => $mapaPisos['B'][0]->idPiso,
                'idTipoEspacio' => $mapaTiposEspacio[$tarjeta['tipo']],
                'idCategoriaServicio' => isset($tarjeta['categoria']) ? $mapaCategorias[$tarjeta['categoria']] : null,
                'nombreEspacio' => $tarjeta['nombre'],
                'descripcionEspacio' => 'Servicio de planta baja del Edificio B.',
                'contactoEspacio' => $tarjeta['contacto'],
                'latitud' => $punto['latitud'],
                'longitud' => $punto['longitud'],
            ], $tarjeta['horario']);

            if (isset($tarjeta['lab'])) {
                Laboratorio::firstOrCreate(
                    ['idEspacio' => $espacioPb->idEspacio],
                    [
                        'idTipoLaboratorio' => $mapaTiposLaboratorio[$tarjeta['lab']],
                        'numeroLaboratorio' => 'B-PB-1',
                    ]
                );
            }
        }

        /*
        |--------------------------------------------------------------
        | Contenido generado de cada piso real de las dos torres:
        |   fila 70  -> 2 aulas        fila 150 -> 2 laboratorios
        |   fila 230 -> 2 oficinas     fila 310 -> salon (+ biblioteca
        |                                              si piso % 3 == 0)
        |   fila 390 -> solo el top floor: conferencias y auditorio
        | Los slots ya ocupados por los espacios legacy se saltan.
        |--------------------------------------------------------------
        */
        $torres = [
            'A' => [
                'pisos' => [4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17],
                'top' => 17,
                'baseAula' => 100,   // Aula 141, 142 ... (100 + piso*10 + i)
                'asignaturas' => ['Algebra', 'Calculo', 'Fisica', 'Quimica', 'Programacion',
                    'Bases de Datos', 'Sistemas Operativos', 'Redes', 'Estructuras', 'Probabilidad'],
                'departamentos' => ['Ciencias', 'Ingenieria', 'Matematicas', 'Sala de Profesores', 'Coordinacion'],
            ],
            'B' => [
                'pisos' => [4, 6, 7, 8, 9, 10, 11],
                'top' => 11,
                'baseAula' => 500,   // Aula 541, 542 ... (500 + piso*10 + i)
                'asignaturas' => ['Inteligencia Artificial', 'Robotica', 'IoT', 'Big Data',
                    'Ciberseguridad', 'Machine Learning', 'Cloud Computing', 'DevOps'],
                'departamentos' => ['Innovacion', 'Investigacion', 'Vinculacion', 'Laboratorio de Ideas', 'Startup Hub'],
            ],
        ];

        // Solo los 4 tipos de laboratorio del catalogo (HU-19)
        $cicloTiposLab = ['sistemas', 'redes', 'física', 'química'];

        foreach ($torres as $cod => $torre) {
            foreach ($torre['pisos'] as $piso) {
                $idPiso = $mapaPisos[$cod][$piso]->idPiso;

                // Aulas (fila 70)
                foreach ([170, 400] as $i => $x) {
                    if (isset($ocupados[$cod.'|'.$piso.'|'.self::FILA_AULAS.'|'.$x])) {
                        continue;
                    }
                    $numero = $torre['baseAula'] + $piso * 10 + ($i + 1);
                    $asignatura = $torre['asignaturas'][($piso + $i) % count($torre['asignaturas'])];
                    $punto = $this->puntoDeSlot($cod, $x, self::FILA_AULAS);
                    $this->crearEspacio([
                        'idEdificio' => $mapaEdificios[$cod]->idEdificio,
                        'idPiso' => $idPiso,
                        'idTipoEspacio' => $mapaTiposEspacio['aula'],
                        'idCategoriaServicio' => $mapaCategorias['aulas'],
                        'nombreEspacio' => 'Aula '.$numero.' · '.$asignatura,
                        'descripcionEspacio' => 'Aula de '.$asignatura.'.',
                        'contactoEspacio' => 'aulas@univalle.edu.bo',
                        'latitud' => $punto['latitud'],
                        'longitud' => $punto['longitud'],
                    ], 'semana');
                }

                // Laboratorios (fila 150)
                foreach ([170, 400] as $i => $x) {
                    if (isset($ocupados[$cod.'|'.$piso.'|'.self::FILA_LABS.'|'.$x])) {
                        continue;
                    }
                    $tipoLab = $cicloTiposLab[($piso + $i) % count($cicloTiposLab)];
                    $punto = $this->puntoDeSlot($cod, $x, self::FILA_LABS);
                    $espacioLab = $this->crearEspacio([
                        'idEdificio' => $mapaEdificios[$cod]->idEdificio,
                        'idPiso' => $idPiso,
                        'idTipoEspacio' => $mapaTiposEspacio['laboratorio'],
                        'idCategoriaServicio' => $mapaCategorias['laboratorio'],
                        'nombreEspacio' => 'Lab. '.ucfirst($tipoLab).' · '.$cod.' P'.$piso,
                        'descripcionEspacio' => 'Laboratorio de '.$tipoLab.'.',
                        'contactoEspacio' => 'lab'.strtolower($tipoLab).'@univalle.edu.bo',
                        'latitud' => $punto['latitud'],
                        'longitud' => $punto['longitud'],
                    ], 'semana');

                    Laboratorio::firstOrCreate(
                        ['idEspacio' => $espacioLab->idEspacio],
                        [
                            'idTipoLaboratorio' => $mapaTiposLaboratorio[$tipoLab],
                            'numeroLaboratorio' => $cod.'-P'.$piso.'-'.($i + 1),
                        ]
                    );
                }

                // Oficinas (fila 230)
                foreach ([170, 400] as $i => $x) {
                    if (isset($ocupados[$cod.'|'.$piso.'|'.self::FILA_OFICINAS.'|'.$x])) {
                        continue;
                    }
                    $nombreDept = $torre['departamentos'][($piso + $i) % count($torre['departamentos'])];
                    $punto = $this->puntoDeSlot($cod, $x, self::FILA_OFICINAS);
                    $this->crearEspacio([
                        'idEdificio' => $mapaEdificios[$cod]->idEdificio,
                        'idPiso' => $idPiso,
                        'idTipoEspacio' => $mapaTiposEspacio['oficina'],
                        'nombreEspacio' => 'Dept. '.$nombreDept.' · '.$cod.' P'.$piso,
                        'descripcionEspacio' => 'Oficina del departamento de '.$nombreDept.'.',
                        'contactoEspacio' => 'Ext. '.($piso * 10 + $i + 5),
                        'latitud' => $punto['latitud'],
                        'longitud' => $punto['longitud'],
                    ], 'oficina');
                }

                // Servicios (fila 310): salon siempre; biblioteca si piso % 3 == 0
                $puntoSalon = $this->puntoDeSlot($cod, 170, self::FILA_SERVICIOS);
                $this->crearEspacio([
                    'idEdificio' => $mapaEdificios[$cod]->idEdificio,
                    'idPiso' => $idPiso,
                    'idTipoEspacio' => $mapaTiposEspacio['salon'],
                    'nombreEspacio' => 'Salon Multiuso · '.$cod.' P'.$piso,
                    'descripcionEspacio' => 'Salon multiuso para eventos del piso '.$piso.'.',
                    'contactoEspacio' => 'Ext. '.($piso * 10 + 7),
                    'latitud' => $puntoSalon['latitud'],
                    'longitud' => $puntoSalon['longitud'],
                ], 'oficina');

                if ($piso % 3 === 0) {
                    $puntoBib = $this->puntoDeSlot($cod, 400, self::FILA_SERVICIOS);
                    $this->crearEspacio([
                        'idEdificio' => $mapaEdificios[$cod]->idEdificio,
                        'idPiso' => $idPiso,
                        'idTipoEspacio' => $mapaTiposEspacio['biblioteca'],
                        'idCategoriaServicio' => $mapaCategorias['biblioteca'],
                        'nombreEspacio' => 'Sala de Estudio · '.$cod.' P'.$piso,
                        'descripcionEspacio' => 'Sala de estudio del piso '.$piso.'.',
                        'contactoEspacio' => 'Ext. '.($piso * 10 + 6),
                        'latitud' => $puntoBib['latitud'],
                        'longitud' => $puntoBib['longitud'],
                    ], 'biblioteca');
                }

                // Top floor (fila 390): conferencias y auditorio
                if ($piso === $torre['top']) {
                    $puntoConf = $this->puntoDeSlot($cod, 170, self::FILA_ESPECIALES);
                    $this->crearEspacio([
                        'idEdificio' => $mapaEdificios[$cod]->idEdificio,
                        'idPiso' => $idPiso,
                        'idTipoEspacio' => $mapaTiposEspacio['salon'],
                        'nombreEspacio' => 'Sala de Conferencias · '.$cod.' P'.$piso,
                        'descripcionEspacio' => 'Sala de conferencias y charlas academicas.',
                        'contactoEspacio' => 'Ext. '.($piso * 10 + 8),
                        'latitud' => $puntoConf['latitud'],
                        'longitud' => $puntoConf['longitud'],
                    ], 'oficina');

                    $puntoAud = $this->puntoDeSlot($cod, 400, self::FILA_ESPECIALES);
                    $this->crearEspacio([
                        'idEdificio' => $mapaEdificios[$cod]->idEdificio,
                        'idPiso' => $idPiso,
                        'idTipoEspacio' => $mapaTiposEspacio['auditorio'],
                        'nombreEspacio' => 'Auditorio · '.$cod.' P'.$piso,
                        'descripcionEspacio' => 'Auditorio para actos academicos.',
                        'contactoEspacio' => 'Ext. '.($piso * 10 + 9),
                        'latitud' => $puntoAud['latitud'],
                        'longitud' => $puntoAud['longitud'],
                    ], 'oficina');
                }
            }
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
    }

    /**
     * Posicion del plano logico (800x600) -> lat/lng, con la formula
     * inversa de la que usa el frontend en core/api.js:
     *   lat = latEdificio + (300 - y) * ESCALA
     *   lng = lngEdificio + (x - 400) * ESCALA
     */
    private function puntoDeSlot(string $codEdificio, int $x, int $y): array
    {
        $base = self::COORDENADAS_EDIFICIO[$codEdificio] ?? self::COORDENADAS_EDIFICIO['A'];

        return [
            'latitud' => round($base['latitud'] + (300 - $y) * self::ESCALA_PLANO, 6),
            'longitud' => round($base['longitud'] + ($x - 400) * self::ESCALA_PLANO, 6),
        ];
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
