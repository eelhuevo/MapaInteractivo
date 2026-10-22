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
 * - TTL configurable vía header `X-Cache-TTL` (segundos) o 60 por defecto.
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

        // No cachear si hay Authorization (salvo que se configure otherwise)
        // Para endpoints públicos sin token, sí cacheamos.
        $userId = $request->user()?->getAuthIdentifier() ?? 'guest';

        $key = 'response:' . $request->fullUrl() . ':' . $userId;
        $ttl = (int) ($request->header('X-Cache-TTL') ?? 60); // 60 s por defecto

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