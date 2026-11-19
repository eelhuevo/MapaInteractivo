<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notificacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificacionController extends Controller
{
    /**
     * HU-13 — Notificaciones del usuario: avisos cuando una oficina
     * o servicio cambia de ubicación, horario o contacto.
     */
    public function index(Request $request): JsonResponse
    {
        $consultaNotificaciones = Notificacion::where('idUsuario', $request->user()->idUsuario)
            ->with('espacio:idEspacio,nombreEspacio')
            ->orderByDesc('creadoEn');

        $consultaNotificaciones->when(
            $request->boolean('soloNoLeidas'),
            fn ($consulta) => $consulta->where('estaLeida', false)
        );

        $coleccionNotificaciones = $consultaNotificaciones->limit(50)->get();

        return response()->json([
            'totalNoLeidas' => Notificacion::where('idUsuario', $request->user()->idUsuario)
                ->where('estaLeida', false)
                ->count(),
            'notificaciones' => $coleccionNotificaciones->map(fn (Notificacion $notificacion) => [
                'idNotificacion' => $notificacion->idNotificacion,
                'mensajeNotificacion' => $notificacion->mensajeNotificacion,
                'tipoCambio' => $notificacion->tipoCambio,
                'estaLeida' => $notificacion->estaLeida,
                'creadoEn' => $notificacion->creadoEn?->toDateTimeString(),
                'espacio' => $notificacion->espacio ? [
                    'idEspacio' => $notificacion->espacio->idEspacio,
                    'nombreEspacio' => $notificacion->espacio->nombreEspacio,
                ] : null,
            ])->values(),
        ]);
    }

    /**
     * HU-13 — Marcar una notificación como leída.
     */
    public function marcarLeida(Request $request, int $idNotificacion): JsonResponse
    {
        $notificacionEncontrada = Notificacion::where('idUsuario', $request->user()->idUsuario)
            ->where('idNotificacion', $idNotificacion)
            ->firstOrFail();

        $notificacionEncontrada->estaLeida = true;
        $notificacionEncontrada->save();

        return response()->json([
            'mensaje' => 'Notificación marcada como leída.',
        ]);
    }

    /**
     * Marcar todas las notificaciones del usuario como leídas.
     */
    public function marcarTodasLeidas(Request $request): JsonResponse
    {
        Notificacion::where('idUsuario', $request->user()->idUsuario)
            ->where('estaLeida', false)
            ->update(['estaLeida' => true]);

        return response()->json([
            'mensaje' => 'Todas las notificaciones fueron marcadas como leídas.',
        ]);
    }
}
