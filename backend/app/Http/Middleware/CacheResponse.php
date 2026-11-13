<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Middleware de caché de respuesta para endpoints de lectura (GET).
 *
 * - Solo afecta a peticiones GET/HEAD.
 * - Genera clave: "response:{url}:{query}:{user_id_or_guest}".
 * - TTL configurable vía header `X-Cache-TTL` (segundos) o 600 por defecto.
 * - Añade header `X-Cache: HIT/MISS` para depuración.
 */
class CacheResponse
{
    public function handle(Request $request, Closure $next): SymfonyResponse
    {
        // Solo cachear GET y HEAD
        if (! in_array($request->method(), ['GET', 'HEAD'], true)) {
            return $next($request);
        }

        // X-Cache-TTL: 0 (o negativo) = sin caché: respuesta al momento.
        // Herramienta manual/de depuración: la web NO envía esta cabecera
        // (las escrituras del panel admin vacían la caché con cache.invalidar,
        // así que siempre ve los datos recién guardados). Se usa para pedir
        // una respuesta fresca a mano sin reiniciar el backend.
        $ttlSolicitado = $request->header('X-Cache-TTL');
        if ($ttlSolicitado !== null && (int) $ttlSolicitado <= 0) {
            return $next($request)->header('X-Cache', 'OFF');
        }

        // No cachear si hay Authorization (salvo que se configure otherwise)
        // Para endpoints públicos sin token, sí cacheamos.
        $userId = $request->user()?->getAuthIdentifier() ?? 'guest';

        $key = 'response:' . $request->fullUrl() . ':' . $userId;
        // 600 s por defecto: la caché se invalida sola cuando el panel
        // admin guarda cambios (middleware cache.invalidar), así que no
        // hace falta refrescarla en cada carga. El estado "abierto/
        // cerrado" de la ficha viene de /espacios/{id}/estado, sin caché.
        $ttl = (int) ($request->header('X-Cache-TTL') ?? 600);

        if (Cache::has($key)) {
            $cached = Cache::get($key);
            $response = response($cached['content'], $cached['status'])
                ->withHeaders($cached['headers'])
                ->header('X-Cache', 'HIT');
            return $response;
        }

        $response = $next($request);

        // Solo cachear respuestas exitosas (2xx) y JSON
        if ($response->isSuccessful()
            && str_contains($response->headers->get('Content-Type') ?? '', 'json')) {

            Cache::put($key, [
                'content' => $response->getContent(),
                'status'  => $response->getStatusCode(),
                'headers' => $response->headers->all(),
            ], $ttl);
        }

        return $response->header('X-Cache', 'MISS');
    }
}