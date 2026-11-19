<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EspacioMapaResource;
use App\Models\Espacio;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AulaController extends Controller
{
    /**
     * HU-18 — Consultar ubicación de aulas.
     * Permite buscar aulas por nombre o número; cada resultado trae
     * latitud/longitud para centrar el mapa al seleccionarla.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'buscar' => ['nullable', 'string', 'max:150'],
        ]);

        $consultaAulas = Espacio::query()
            ->activos()
            ->conLatitudLongitud('coordenadasEspacio')
            ->with(['tipoEspacio', 'edificio', 'piso', 'horariosEspacio', 'aula'])
            ->whereHas('aula')
            ->when($request->filled('buscar'), function ($consulta) use ($request) {
                $textoBusqueda = (string) $request->string('buscar');

                $consulta->where(function ($consultaTexto) use ($textoBusqueda) {
                    $consultaTexto->where('nombreEspacio', 'ilike', '%'.$textoBusqueda.'%')
                        ->orWhereHas('aula', fn ($consultaAula) => $consultaAula->where('numeroAula', 'ilike', '%'.$textoBusqueda.'%'));
                });
            })
            ->orderBy('nombreEspacio');

        return EspacioMapaResource::collection($consultaAulas->get());
    }
}
