<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EspacioMapaResource;
use App\Models\Espacio;
use App\Models\SugerenciaEspacio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SugerenciaController extends Controller
{
    /**
     * HU-20 — Sugerencias de oficinas, laboratorios y servicios según
     * la carrera y el semestre del estudiante autenticado.
     */
    public function index(Request $request): JsonResponse
    {
        $usuarioAutenticado = $request->user()->loadMissing('estudiante');

        if (! $usuarioAutenticado->estudiante) {
            return response()->json([
                'mensaje' => 'Las sugerencias están disponibles para estudiantes.',
                'sugerencias' => [],
            ]);
        }

        $estudianteActual = $usuarioAutenticado->estudiante;

        $idsEspaciosSugeridos = SugerenciaEspacio::where('idCarrera', $estudianteActual->idCarrera)
            ->where('semestreObjetivo', '<=', $estudianteActual->semestreEstudiante)
            ->orderByDesc('semestreObjetivo')
            ->pluck('idEspacio')
            ->unique()
            ->values();

        $espaciosSugeridos = Espacio::query()
            ->activos()
            ->conLatitudLongitud('coordenadasEspacio')
            ->with(['tipoEspacio', 'categoriaServicio', 'edificio', 'piso', 'horariosEspacio', 'aula', 'laboratorio.tipoLaboratorio'])
            ->whereIn('idEspacio', $idsEspaciosSugeridos)
            ->get()
            ->sortBy(fn ($espacio) => $idsEspaciosSugeridos->search($espacio->idEspacio))
            ->values();

        return response()->json([
            'carrera' => [
                'idCarrera' => $estudianteActual->idCarrera,
                'nombreCarrera' => $estudianteActual->carrera?->nombreCarrera,
            ],
            'semestreEstudiante' => $estudianteActual->semestreEstudiante,
            'sugerencias' => EspacioMapaResource::collection($espaciosSugeridos),
        ]);
    }
}
