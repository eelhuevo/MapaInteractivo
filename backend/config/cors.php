<?php

/*
|--------------------------------------------------------------------------
| CORS — permitir el frontend en localhost:8080
|--------------------------------------------------------------------------
|
| INICIAR.bat sirve el frontend en el puerto 8080 y el backend corre en
| el 8000 (php artisan serve). Al ser puertos distintos el navegador
| aplica CORS: sin estas cabeceras toda llamada fetch() desde la web
| seria bloqueada antes de llegar a Laravel.
|
*/

return [

    // Rutas de la API que aceptan peticiones cross-origin
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Se permite cualquier origen local: no se usan cookies de sesion
    // (la autenticacion es por token Bearer), asi que '*' es seguro.
    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
