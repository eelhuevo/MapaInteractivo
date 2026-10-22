<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventoConsulta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EventoConsultaController extends Controller
{
    /**
     * Registra un evento de consulta/búsqueda/ruta sobre un espacio.
     * Es público: los visitantes también generan estadísticas (HU-14);
     * si hay sesión iniciada se asocia al usuario.
     */
    public function store(Request $request): JsonResponse
    {
        $datosValidados = $request->validate([
            'idEspacio' => ['required', 'integer', 'exists:espacios,idEspacio'],
            'tipoEvento' => ['required', Rule::in(EventoConsulta::TIPOS_EVENTO)],
        ]);

        EventoConsulta::registrar(
            $datosValidados['idEspacio'],
            $datosValidados['tipoEvento'],
            $request->user('sanctum')?->idUsuario
        );

        return response()->json([
            'mensaje' => 'Evento registrado.',
        ], 201);
    }
}
