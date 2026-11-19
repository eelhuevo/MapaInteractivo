<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Invalida la caché de respuestas (middleware cache.res) cuando una
 * escritura de administración guarda, edita o borra datos.
 *
 * Sin esto, la web del mapa tendría que pedir /api/espacios con
 * "X-Cache-TTL: 0" en cada carga (siempre consultando Supabase, ~3 s)
 * para no mostrar datos viejos. Con esta invalidación, la primera
 * carga llena la caché y las siguientes se leen de disco en milisegundos,
 * y al mismo tiempo cualquier cambio del panel admin se ve al instante
 * en todas las máquinas (la caché se limpia en el servidor).
 *
 * Solo se registra en el grupo de rutas admin: las escrituras públicas
 * (login, favoritos, eventos de consulta) no afectan a los listados
 * cacheados. La caché solo contiene respuestas, así que vaciarla es
 * inofensivo.
 */
class InvalidarCacheRespuestas
{
    public function handle(Request $request, Closure $next): Response
    {
        $respuesta = $next($request);

        if (! in_array($request->method(), ['GET', 'HEAD'], true)) {
            Cache::flush();
        }

        return $respuesta;
    }
}
