<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Docente;
use App\Models\Materia;
use Illuminate\Http\JsonResponse;

/**
 * HU "Consulta de docentes" y "Consulta de horarios" — lista de los
 * docentes con su horario semanal, para el panel "Horarios" de la web
 * (MANUAL-USUARIO seccion 9: al pulsar un bloque te lleva a su aula).
 *
 * Esta lista reemplaza a los docentes inventados que antes vivian en
 * frontend/js/data/docentes.js: los datos falsos ahora salen de los
 * seeders (DocenteSeeder, 10 docentes) y llegan por esta ruta.
 */
class DocenteController extends Controller
{
    /** Orden del panel semanal (lunes primero) */
    private const ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

    public function index(): JsonResponse
    {
        $docentes = Docente::query()
            ->with(['usuario', 'horarios', 'oficina:idEspacio,nombreEspacio', 'materias'])
            ->whereHas('usuario', function ($consulta) {
                $consulta->where('estaActivo', true);
            })
            ->orderBy('idDocente')
            ->get();

        return response()->json([
            'docentes' => $docentes->map(function (Docente $docente) {
                return [
                    'idDocente' => $docente->idDocente,
                    'nombreCompleto' => $docente->usuario?->nombreCompleto,
                    'nombre' => $docente->usuario?->nombreUsuario,
                    'apellidoPaterno' => $docente->usuario?->apellidoPaternoUsuario,
                    'apellidoMaterno' => $docente->usuario?->apellidoMaternoUsuario,
                    'correoUsuario' => $docente->usuario?->correoUsuario,
                    'departamentoDocente' => $docente->departamentoDocente,
                    'idEspacioOficina' => $docente->idEspacioOficina,
                    'nombreEspacioOficina' => $docente->oficina?->nombreEspacio,
                    'materias' => $docente->materias->map(fn (Materia $materia) => [
                        'idMateria' => $materia->idMateria,
                        'nombreMateria' => $materia->nombreMateria,
                        'semestreMateria' => $materia->pivot->semestreMateria,
                    ])->values(),
                    'horarios' => self::turnosOrdenados($docente),
                ];
            })->values(),
        ]);
    }

    /**
     * Turnos del docente ordenados de lunes a domingo y con las horas
     * en formato corto "HH:MM" (como los espera la web).
     */
    private static function turnosOrdenados(Docente $docente): array
    {
        return $docente->horarios
            ->sortBy(function ($turno) {
                $posicion = array_search($turno->diaSemana, self::ORDEN_DIAS, true);

                return $posicion === false ? 99 : $posicion;
            })
            ->values()
            ->map(fn ($turno) => [
                'diaSemana' => $turno->diaSemana,
                'horaInicio' => substr((string) $turno->horaInicio, 0, 5),
                'horaFin' => substr((string) $turno->horaFin, 0, 5),
            ])
            ->all();
    }
}
