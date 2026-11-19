<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rol;
use Illuminate\Http\JsonResponse;

/**
 * Catálogo de roles del sistema (HU-17: registro con rol elegido).
 * Publico: solo devuelve nombres y descripciones, nada sensible.
 */
class RolController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'roles' => Rol::query()
                ->orderBy('idRol')
                ->get(['idRol', 'nombreRol', 'descripcionRol']),
        ]);
    }
}
