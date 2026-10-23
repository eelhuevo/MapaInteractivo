<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EspacioMapaResource;
use App\Models\Espacio;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BusquedaController extends Controller
{
    /**
     * HU-05 — Buscar ubicación por nombre.
     * Devuelve resultados mientras se escribe; el frontend centra el
     * mapa en la latitud/longitud del resultado seleccionado.
     */
    public function buscar(Request $request): AnonymousResourceCollection
    {
        $datosValidados = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:150'],
        ]);

        $textoBusqueda = $datosValidados['q'];

        $resultadosBusqueda = Espacio::query()
            ->activos()
            ->conLatitudLongitud('coordenadasEspacio')
            ->with(['tipoEspacio', 'categoriaServicio', 'edificio', 'piso', 'horariosEspacio', 'aula', 'laboratorio.tipoLaboratorio'])
            ->where(function ($consulta) use ($textoBusqueda) {
                $consulta->where('nombreEspacio', 'ilike', '%'.$textoBusqueda.'%')
                    // También busca por número de aula o laboratorio (HU-18)
                    ->orWhereHas('aula', fn ($consultaAula) => $consultaAula->where('numeroAula', 'ilike', '%'.$textoBusqueda.'%'))
                    ->orWhereHas('laboratorio', fn ($consultaLab) => $consultaLab->where('numeroLaboratorio', 'ilike', '%'.$textoBusqueda.'%'));
            })
            ->limit(15)
            ->get();

        return EspacioMapaResource::collection($resultadosBusqueda);
    }
}
