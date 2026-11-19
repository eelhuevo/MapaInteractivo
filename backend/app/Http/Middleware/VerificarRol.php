<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Verifica que el usuario autenticado tenga uno de los roles indicados.
 *
 * Uso en rutas: ->middleware('rol:administrador,personalAdministrativo')
 */
class VerificarRol
{
    public function handle(Request $request, Closure $next, string ...$rolesPermitidos): Response
    {
        $usuarioAutenticado = $request->user();

        if (! $usuarioAutenticado || ! $usuarioAutenticado->tieneRol(...$rolesPermitidos)) {
            return response()->json([
                'mensaje' => 'No tienes permisos para acceder a este recurso.',
            ], 403);
        }

        return $next($request);
    }
}
