<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Espacio;
use App\Models\EventoConsulta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EstadisticaController extends Controller
{
    /**
     * HU-14 — Ranking de las oficinas y servicios más consultados.
     * Solo accesible para administradores (middleware rol).
     */
    public function espaciosMasConsultados(Request $request): JsonResponse
    {
        $request->validate([
            'tipoEvento' => ['nullable', 'string', 'in:consulta,busqueda,ruta'],
            'limite' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $limiteRanking = $request->integer('limite', 10);

        $consultaRanking = EventoConsulta::query()
            ->select('idEspacio', DB::raw('COUNT(*) AS "totalConsultas"'))
            ->addSelect([
                DB::raw('COUNT(*) FILTER (WHERE "tipoEvento" = \'consulta\') AS "totalFichas"'),
                DB::raw('COUNT(*) FILTER (WHERE "tipoEvento" = \'busqueda\') AS "totalBusquedas"'),
                DB::raw('COUNT(*) FILTER (WHERE "tipoEvento" = \'ruta\') AS "totalRutas"'),
            ])
            ->when(
                $request->filled('tipoEvento'),
                fn ($consulta) => $consulta->where('tipoEvento', $request->string('tipoEvento'))
            )
            ->groupBy('idEspacio')
            ->orderByDesc('totalConsultas')
            ->limit($limiteRanking);

        $rankingEspacios = $consultaRanking->get();

        $datosEspacios = Espacio::with(['edificio:idEdificio,nombreEdificio', 'tipoEspacio:idTipoEspacio,nombreTipoEspacio'])
            ->whereIn('idEspacio', $rankingEspacios->pluck('idEspacio'))
            ->get()
            ->keyBy('idEspacio');

        return response()->json([
            'ranking' => $rankingEspacios->values()->map(function ($filaRanking, int $posicion) use ($datosEspacios) {
                $espacio = $datosEspacios->get($filaRanking->idEspacio);

                return [
                    'posicion' => $posicion + 1,
                    'idEspacio' => $filaRanking->idEspacio,
                    'nombreEspacio' => $espacio?->nombreEspacio,
                    'edificio' => $espacio?->edificio?->nombreEdificio,
                    'tipoEspacio' => $espacio?->tipoEspacio?->nombreTipoEspacio,
                    'totalConsultas' => (int) $filaRanking->totalConsultas,
                    'detalle' => [
                        'fichas' => (int) $filaRanking->totalFichas,
                        'busquedas' => (int) $filaRanking->totalBusquedas,
                        'rutas' => (int) $filaRanking->totalRutas,
                    ],
                ];
            }),
            'totalEventosRegistrados' => EventoConsulta::count(),
        ]);
    }
}
