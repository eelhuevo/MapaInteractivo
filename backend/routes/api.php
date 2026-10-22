<?php

use App\Http\Controllers\Api\Admin\AdminEspacioController;
use App\Http\Controllers\Api\Admin\AdminUsuarioController;
use App\Http\Controllers\Api\Admin\EstadisticaController;
use App\Http\Controllers\Api\AulaController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BusquedaController;
use App\Http\Controllers\Api\CatalogoController;
use App\Http\Controllers\Api\CodigoQrController;
use App\Http\Controllers\Api\EdificioController;
use App\Http\Controllers\Api\EspacioController;
use App\Http\Controllers\Api\EventoConsultaController;
use App\Http\Controllers\Api\FavoritoController;
use App\Http\Controllers\Api\NotificacionController;
use App\Http\Controllers\Api\RutaController;
use App\Http\Controllers\Api\SugerenciaController;
use App\Http\Controllers\Api\ZonaController;
use Illuminate\Support\Facades\Route;

/*
|----------------------------------------------------------------------
| Rutas públicas (también disponibles para visitantes / invitados)
|----------------------------------------------------------------------
*/

// HU-16 / HU-17 — autenticación y registro (no cacheables: POST)
Route::post('/auth/registro', [AuthController::class, 'registrar']);
Route::post('/auth/login', [AuthController::class, 'iniciarSesion']);

/*
| Endpoints de lectura pública → cache.response (TTL 60 s por defecto).
| Solo listados estáticos; fichas, estado, rutas y QR NO se cachean (cambian por usuario/escrituras).
| El frontend puede enviar header "X-Cache-TTL: <segundos>" para ajustar.
*/
Route::middleware('cache.res')->group(function () {
    // HU-01 / HU-02 / HU-19 — mapa y filtros (listado principal)
    Route::get('/espacios', [EspacioController::class, 'index']);
    // HU-05 — búsqueda de ubicaciones
    Route::get('/busqueda', [BusquedaController::class, 'buscar']);

    // HU-18 — ubicación de aulas
    Route::get('/aulas', [AulaController::class, 'index']);

    // HU-07 — edificios (listado y detalle) y sus pisos
    Route::get('/edificios', [EdificioController::class, 'index']);
    Route::get('/edificios/{idEdificio}', [EdificioController::class, 'show'])->whereNumber('idEdificio');
    Route::get('/edificios/{idEdificio}/pisos', [EdificioController::class, 'pisos'])->whereNumber('idEdificio');

    // HU-08 — entrada principal y estacionamientos
    Route::get('/zonas', [ZonaController::class, 'index']);

    // Catálogos para los filtros del frontend
    Route::get('/catalogos/tipos-espacio', [CatalogoController::class, 'tiposEspacio']);
    Route::get('/catalogos/categorias-servicio', [CatalogoController::class, 'categoriasServicio']);
    Route::get('/catalogos/tipos-laboratorio', [CatalogoController::class, 'tiposLaboratorio']);
    Route::get('/catalogos/carreras', [CatalogoController::class, 'carreras']);
});

// HU-03 / HU-09 — ficha y estado (SIN caché: cambian por horario y por escrituras admin)
Route::get('/espacios/{idEspacio}', [EspacioController::class, 'show'])->whereNumber('idEspacio');
Route::get('/espacios/{idEspacio}/estado', [EspacioController::class, 'estado'])->whereNumber('idEspacio');

// HU-11 — resolver código QR de un edificio (SIN caché: por código específico)
Route::get('/codigos-qr/{codigoQr}', [CodigoQrController::class, 'resolver']);

// HU-10 — ruta peatonal hacia un espacio (SIN caché: depende de lat/lng del usuario)
Route::get('/rutas', [RutaController::class, 'calcular']);

// Registro de eventos de consulta (público, usuario opcional) — HU-14 (no cacheable: POST)
Route::post('/eventos-consulta', [EventoConsultaController::class, 'store']);

/*
|----------------------------------------------------------------------
| Rutas que requieren autenticación (token Sanctum)
|----------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    // Sesión y perfil
    Route::post('/auth/logout', [AuthController::class, 'cerrarSesion']);
    Route::get('/auth/perfil', [AuthController::class, 'perfil']);

    // HU-15 — cambiar el idioma del sistema
    Route::put('/perfil/idioma', [AuthController::class, 'actualizarIdioma']);

    // HU-12 — favoritos
    Route::get('/favoritos', [FavoritoController::class, 'index']);
    Route::post('/favoritos', [FavoritoController::class, 'store']);
    Route::delete('/favoritos/{idEspacio}', [FavoritoController::class, 'destroy'])->whereNumber('idEspacio');

    // HU-13 — notificaciones de cambios
    Route::get('/notificaciones', [NotificacionController::class, 'index']);
    Route::patch('/notificaciones/{idNotificacion}/leida', [NotificacionController::class, 'marcarLeida'])->whereNumber('idNotificacion');
    Route::patch('/notificaciones/leer-todas', [NotificacionController::class, 'marcarTodasLeidas']);

    // HU-20 — sugerencias según carrera y semestre
    Route::get('/sugerencias', [SugerenciaController::class, 'index']);
});

/*
|----------------------------------------------------------------------
| Rutas de administración (HU-06, HU-14, HU-17)
| Solo administrador y personalAdministrativo
|----------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'rol:administrador,personalAdministrativo'])
    ->prefix('admin')
    ->group(function () {
        // HU-06 — administrar oficinas o servicios (CRUD)
        Route::post('/espacios', [AdminEspacioController::class, 'store']);
        Route::put('/espacios/{idEspacio}', [AdminEspacioController::class, 'update'])->whereNumber('idEspacio');
        Route::patch('/espacios/{idEspacio}', [AdminEspacioController::class, 'update'])->whereNumber('idEspacio');
        Route::delete('/espacios/{idEspacio}', [AdminEspacioController::class, 'destroy'])->whereNumber('idEspacio');

        // HU-17 — registrar usuarios con cualquier rol
        Route::get('/usuarios', [AdminUsuarioController::class, 'index']);
        Route::post('/usuarios', [AdminUsuarioController::class, 'store']);

        // HU-14 — estadísticas de uso
        Route::get('/estadisticas/espacios-mas-consultados', [EstadisticaController::class, 'espaciosMasConsultados']);
    });
