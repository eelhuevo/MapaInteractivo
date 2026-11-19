<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EspacioMapaResource;
use App\Models\Espacio;
use App\Models\Favorito;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoritoController extends Controller
{
    /**
     * HU-12 — Lista de favoritos del usuario autenticado.
     */
    public function index(Request $request): JsonResponse
    {
        $idsEspaciosFavoritos = Favorito::where('idUsuario', $request->user()->idUsuario)
            ->orderByDesc('creadoEn')
            ->pluck('idEspacio');

        $espaciosFavoritos = Espacio::query()
            ->activos()
            ->conLatitudLongitud('coordenadasEspacio')
            ->with(['tipoEspacio', 'categoriaServicio', 'edificio', 'piso', 'horariosEspacio', 'aula', 'laboratorio.tipoLaboratorio'])
            ->whereIn('idEspacio', $idsEspaciosFavoritos)
            ->get()
            ->sortBy(fn ($espacio) => $idsEspaciosFavoritos->search($espacio->idEspacio))
            ->values();

        return response()->json([
            'favoritos' => EspacioMapaResource::collection($espaciosFavoritos),
        ]);
    }

    /**
     * HU-12 — Marcar un espacio como favorito.
     * Si ya estaba marcado, responde sin duplicar.
     */
    public function store(Request $request): JsonResponse
    {
        $datosValidados = $request->validate([
            'idEspacio' => ['required', 'integer', 'exists:espacios,idEspacio'],
        ]);

        $favoritoGuardado = Favorito::firstOrCreate([
            'idUsuario' => $request->user()->idUsuario,
            'idEspacio' => $datosValidados['idEspacio'],
        ]);

        return response()->json([
            'mensaje' => 'Espacio marcado como favorito.',
            'favorito' => [
                'idFavorito' => $favoritoGuardado->idFavorito,
                'idEspacio' => $favoritoGuardado->idEspacio,
            ],
        ], 201);
    }

    /**
     * HU-12 — Desmarcar favorito.
     */
    public function destroy(Request $request, int $idEspacio): JsonResponse
    {
        $favoritoEliminado = Favorito::where('idUsuario', $request->user()->idUsuario)
            ->where('idEspacio', $idEspacio)
            ->delete();

        if (! $favoritoEliminado) {
            return response()->json([
                'mensaje' => 'El espacio no estaba en tus favoritos.',
            ], 404);
        }

        return response()->json([
            'mensaje' => 'Espacio eliminado de favoritos.',
        ]);
    }
}
