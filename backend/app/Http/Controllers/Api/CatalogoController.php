<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Carrera;
use App\Models\CategoriaServicio;
use App\Models\TipoEspacio;
use App\Models\TipoLaboratorio;
use Illuminate\Http\JsonResponse;

/**
 * Catálogos para llenar los filtros del frontend
 * (categorías HU-02, tipos de laboratorio HU-19, carreras HU-20).
 */
class CatalogoController extends Controller
{
    public function tiposEspacio(): JsonResponse
    {
        return response()->json([
            'tiposEspacio' => TipoEspacio::orderBy('nombreTipoEspacio')->get([
                'idTipoEspacio', 'nombreTipoEspacio',
            ]),
        ]);
    }

    public function categoriasServicio(): JsonResponse
    {
        return response()->json([
            'categoriasServicio' => CategoriaServicio::orderBy('nombreCategoriaServicio')->get([
                'idCategoriaServicio', 'nombreCategoriaServicio',
            ]),
        ]);
    }

    public function tiposLaboratorio(): JsonResponse
    {
        return response()->json([
            'tiposLaboratorio' => TipoLaboratorio::orderBy('nombreTipoLaboratorio')->get([
                'idTipoLaboratorio', 'nombreTipoLaboratorio',
            ]),
        ]);
    }

    public function carreras(): JsonResponse
    {
        return response()->json([
            'carreras' => Carrera::orderBy('nombreCarrera')->get([
                'idCarrera', 'nombreCarrera',
            ]),
        ]);
    }
}
