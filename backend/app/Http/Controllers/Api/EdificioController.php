<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EspacioMapaResource;
use App\Models\Edificio;
use Illuminate\Http\JsonResponse;

class EdificioController extends Controller
{
    /**
     * Lista de edificios con sus coordenadas (marcadores del mapa, HU-01).
     */
    public function index(): JsonResponse
    {
        $coleccionEdificios = Edificio::query()
            ->conLatitudLongitud('coordenadasEdificio')
            ->with('zona')
            ->withCount(['espacios' => fn ($consulta) => $consulta->where('estaActivo', true)])
            ->orderBy('nombreEdificio')
            ->get();

        return response()->json([
            'edificios' => $coleccionEdificios->map(fn (Edificio $edificio) => [
                'idEdificio' => $edificio->idEdificio,
                'nombreEdificio' => $edificio->nombreEdificio,
                'codigoEdificio' => $edificio->codigoEdificio,
                'descripcionEdificio' => $edificio->descripcionEdificio,
                'latitud' => (float) $edificio->latitud,
                'longitud' => (float) $edificio->longitud,
                'totalEspacios' => $edificio->espacios_count,
                'zona' => $edificio->zona ? [
                    'idZona' => $edificio->zona->idZona,
                    'nombreZona' => $edificio->zona->nombreZona,
                    'tipoZona' => $edificio->zona->tipoZona,
                ] : null,
            ])->values(),
        ]);
    }

    /**
     * HU-07 — Servicios disponibles por edificio: al seleccionar un
     * edificio se muestra la lista de oficinas, laboratorios y
     * servicios que contiene, con nombre y tipo de servicio.
     */
    public function show(int $idEdificio): JsonResponse
    {
        $edificioEncontrado = Edificio::query()
            ->conLatitudLongitud('coordenadasEdificio')
            ->with(['zona', 'pisos', 'codigosQr'])
            ->findOrFail($idEdificio);

        $espaciosDelEdificio = $edificioEncontrado->espacios()
            ->activos()
            ->conLatitudLongitud('coordenadasEspacio')
            ->with(['tipoEspacio', 'categoriaServicio', 'piso', 'horariosEspacio', 'aula', 'laboratorio.tipoLaboratorio', 'oficina'])
            ->orderBy('nombreEspacio')
            ->get();

        return response()->json([
            'edificio' => [
                'idEdificio' => $edificioEncontrado->idEdificio,
                'nombreEdificio' => $edificioEncontrado->nombreEdificio,
                'codigoEdificio' => $edificioEncontrado->codigoEdificio,
                'descripcionEdificio' => $edificioEncontrado->descripcionEdificio,
                'latitud' => (float) $edificioEncontrado->latitud,
                'longitud' => (float) $edificioEncontrado->longitud,
                'zona' => $edificioEncontrado->zona ? [
                    'idZona' => $edificioEncontrado->zona->idZona,
                    'nombreZona' => $edificioEncontrado->zona->nombreZona,
                    'tipoZona' => $edificioEncontrado->zona->tipoZona,
                ] : null,
                'pisos' => $edificioEncontrado->pisos->map(fn ($piso) => [
                    'idPiso' => $piso->idPiso,
                    'numeroPiso' => $piso->numeroPiso,
                    'nombrePiso' => $piso->nombrePiso,
                ])->values(),
            ],
            'servicios' => EspacioMapaResource::collection($espaciosDelEdificio),
        ]);
    }

    /**
     * Pisos de un edificio (consulta de pisos del mapa).
     */
    public function pisos(int $idEdificio): JsonResponse
    {
        $edificioEncontrado = Edificio::with(['pisos' => fn ($consulta) => $consulta->orderBy('numeroPiso')])
            ->findOrFail($idEdificio);

        return response()->json([
            'idEdificio' => $edificioEncontrado->idEdificio,
            'nombreEdificio' => $edificioEncontrado->nombreEdificio,
            'pisos' => $edificioEncontrado->pisos->map(fn ($piso) => [
                'idPiso' => $piso->idPiso,
                'numeroPiso' => $piso->numeroPiso,
                'nombrePiso' => $piso->nombrePiso,
            ])->values(),
        ]);
    }
}
