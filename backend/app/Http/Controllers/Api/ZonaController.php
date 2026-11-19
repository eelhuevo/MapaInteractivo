<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Zona;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ZonaController extends Controller
{
    /**
     * HU-08 — Entrada principal y estacionamientos.
     * Devuelve las zonas (entradaPrincipal, estacionamiento, areaDeportiva)
     * con coordenadas para marcarlas con íconos diferenciados.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'tipoZona' => ['nullable', 'string', 'in:entradaPrincipal,estacionamiento,areaDeportiva'],
        ]);

        $consultaZonas = Zona::query()
            ->conLatitudLongitud('coordenadasZona')
            ->orderBy('nombreZona');

        $consultaZonas->when(
            $request->filled('tipoZona'),
            fn ($consulta) => $consulta->where('tipoZona', $request->string('tipoZona'))
        );

        return response()->json([
            'zonas' => $consultaZonas->get()->map(fn (Zona $zona) => [
                'idZona' => $zona->idZona,
                'nombreZona' => $zona->nombreZona,
                'tipoZona' => $zona->tipoZona,
                'latitud' => $zona->latitud !== null ? (float) $zona->latitud : null,
                'longitud' => $zona->longitud !== null ? (float) $zona->longitud : null,
            ])->values(),
        ]);
    }
}
