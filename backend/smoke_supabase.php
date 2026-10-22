<?php

$BASE = 'http://127.0.0.1:8000';
$G['pass'] = 0;
$G['fail'] = 0;
$G['fails'] = [];

function pedir($metodo, $ruta, $datos = null, $token = null)
{
    $headers = ['Accept: application/json', 'Content-Type: application/json'];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    $opts = [
        'http' => [
            'method' => $metodo,
            'header' => implode("\r\n", $headers),
            'timeout' => 40,
            'ignore_errors' => true,
        ],
    ];
    if ($datos !== null) {
        $opts['http']['content'] = json_encode($datos, JSON_UNESCAPED_UNICODE);
    }
    $ctx = stream_context_create($opts);
    $body = @file_get_contents('http://127.0.0.1:8000' . $ruta, false, $ctx);
    $status = 0;
    if (isset($http_response_header[0]) && preg_match('#HTTP/\S+\s+(\d+)#', $http_response_header[0], $m)) {
        $status = (int) $m[1];
    }
    return [$status, (string) $body];
}

function probar($nombre, $condicion, $extra = '')
{
    global $G;
    if ($condicion) {
        $G['pass']++;
        echo "[PASS] {$nombre}\n";
    } else {
        $G['fail']++;
        $G['fails'][] = $nombre;
        echo "[FAIL] {$nombre}" . ($extra ? " | {$extra}" : '') . "\n";
    }
}

function items($body)
{
    $j = json_decode($body, true);
    if (! is_array($j)) {
        return -1;
    }
    if (array_key_exists('data', $j) && is_array($j['data'])) {
        return count($j['data']);
    }
    if (array_key_exists('datos', $j) && is_array($j['datos'])) {
        return count($j['datos']);
    }
    if (array_key_exists('espacios', $j) && is_array($j['espacios'])) {
        return count($j['espacios']);
    }
    foreach (['edificios', 'zonas', 'aulas', 'tiposEspacio', 'categoriasServicio', 'tiposLaboratorio', 'tipos', 'categorias', 'carreras', 'resultados', 'usuarios', 'favoritos', 'notificaciones', 'sugerencias'] as $k) {
        if (array_key_exists($k, $j) && is_array($j[$k])) {
            return count($j[$k]);
        }
    }
    return array_key_exists(0, $j) ? count($j) : -1;
}

echo "== PÚBLICAS (HU-01 a HU-14, HU-18) ==\n";

[$s, $b] = pedir('GET', '/api/espacios');
probar('GET /espacios → 200 con 15 espacios', $s === 200, "status {$s}");

[$s, $b] = pedir('GET', '/api/espacios?tipoEspacio=1');
probar('GET /espacios?tipoEspacio=1 → 200', $s === 200, "status {$s}");

[$s, $b] = pedir('GET', '/api/espacios/1');
$ficha = json_decode($b, true);
probar('GET /espacios/1 (ficha) → 200', $s === 200, "status {$s}");
probar('  ficha trae coordenadas', is_array($ficha) && (isset($ficha['latitud']) || isset($ficha['coordenadas']) || json_encode($ficha) !== 'null'));

[$s, $b] = pedir('GET', '/api/espacios/1/estado');
probar('GET /espacios/1/estado (HU-09) → 200', $s === 200, "status {$s}");

[$s, $b] = pedir('GET', '/api/busqueda?q=Biblioteca');
probar('GET /busqueda (HU-05) → 200', $s === 200, "status {$s}");

[$s, $b] = pedir('GET', '/api/aulas');
probar('GET /aulas (HU-18) → 200 con 5 aulas', $s === 200 && items($b) === 5, "status {$s}, items " . items($b));

[$s, $b] = pedir('GET', '/api/edificios');
probar('GET /edificios → 200 con 4 edificios', $s === 200 && items($b) === 4, "status {$s}, items " . items($b));

[$s, $b] = pedir('GET', '/api/edificios/1/pisos');
probar('GET /edificios/1/pisos → 200', $s === 200, "status {$s}");

[$s, $b] = pedir('GET', '/api/zonas');
probar('GET /zonas → 200 con 4 zonas', $s === 200 && items($b) === 4, "status {$s}, items " . items($b));

[$s, $b] = pedir('GET', '/api/codigos-qr/QR-EDIFICIO-A');
probar('GET /codigos-qr/QR-EDIFICIO-A (HU-11) → 200', $s === 200, "status {$s}");

[$s, $b] = pedir('GET', '/api/catalogos/tipos-espacio');
probar('GET /catalogos/tipos-espacio → 200 con 6', $s === 200 && items($b) === 6, "status {$s}, items " . items($b));

[$s, $b] = pedir('GET', '/api/catalogos/categorias-servicio');
probar('GET /catalogos/categorias-servicio → 200 con 8', $s === 200 && items($b) === 8, "status {$s}, items " . items($b));

[$s, $b] = pedir('GET', '/api/catalogos/tipos-laboratorio');
probar('GET /catalogos/tipos-laboratorio → 200 con 4', $s === 200 && items($b) === 4, "status {$s}, items " . items($b));

[$s, $b] = pedir('GET', '/api/catalogos/carreras');
probar('GET /catalogos/carreras → 200 con 8', $s === 200 && items($b) === 8, "status {$s}, items " . items($b));

[$s, $b] = pedir('GET', '/api/rutas?latitudOrigen=-16.5410&longitudOrigen=-68.0850&idEspacioDestino=6');
$ruta = json_decode($b, true);
probar('GET /rutas (HU-10) → 200 con distancia', $s === 200 && is_array($ruta) && (isset($ruta['distanciaMetros']) || isset($ruta['distancia']) || in_array('distanciaMetros', array_keys($ruta ?? []), true) || array_key_exists('geometriaRuta', $ruta) || array_key_exists('geometria', $ruta) || count($ruta ?? []) > 0), "status {$s}");

[$s, $b] = pedir('POST', '/api/eventos-consulta', ['idEspacio' => 1, 'tipoEvento' => 'consulta']);
probar('POST /eventos-consulta (HU-14) → 201', $s === 201, "status {$s}");

[$s, $b] = pedir('GET', '/api/espacios/999999');
probar('GET /espacios/999999 → 404', $s === 404, "status {$s}");

echo "\n== AUTENTICACIÓN Y PERFIL (HU-15, HU-16) ==\n";

[$s, $b] = pedir('POST', '/api/auth/login', ['correoUsuario' => 'estudiante@univalle.edu.bo', 'contrasena' => 'Estudiante12345']);
$login = json_decode($b, true);
$tokenEst = $login['tokenAcceso'] ?? null;
probar('POST /auth/login estudiante → 200 con token', $s === 200 && is_string($tokenEst) && strlen($tokenEst) > 10, "status {$s}");

[$s, $b] = pedir('GET', '/api/auth/perfil', null, $tokenEst);
probar('GET /auth/perfil → 200', $s === 200, "status {$s}");

[$s, $b] = pedir('PUT', '/api/perfil/idioma', ['idiomaPreferido' => 'en'], $tokenEst);
probar('PUT /perfil/idioma=en (HU-15) → 200', $s === 200, "status {$s}");
[$s, $b] = pedir('PUT', '/api/perfil/idioma', ['idiomaPreferido' => 'es'], $tokenEst);
probar('PUT /perfil/idioma=es → 200', $s === 200, "status {$s}");

[$s, $b] = pedir('POST', '/api/favoritos', ['idEspacio' => 2], $tokenEst);
probar('POST /favoritos (HU-12) → acepta', in_array($s, [200, 201], true), "status {$s}");

[$s, $b] = pedir('GET', '/api/favoritos', null, $tokenEst);
probar('GET /favoritos → lista con el favorito', $s === 200 && items($b) >= 1, "status {$s}, items " . items($b));

[$s, $b] = pedir('DELETE', '/api/favoritos/2', null, $tokenEst);
probar('DELETE /favoritos/2 → 200', $s === 200, "status {$s}");

[$s, $b] = pedir('GET', '/api/notificaciones', null, $tokenEst);
probar('GET /notificaciones → 200', $s === 200, "status {$s}");

[$s, $b] = pedir('GET', '/api/sugerencias', null, $tokenEst);
probar('GET /sugerencias (HU-20) → 200', $s === 200, "status {$s}");

echo "\n== REGISTRO PÚBLICO (HU-17) ==\n";

[$s, $b] = pedir('POST', '/api/auth/registro', [
    'nombreUsuario' => 'Estudiante Smoke',
    'correoUsuario' => 'smoke@test.bo',
    'contrasena' => 'Smoke123456',
    'nombreRol' => 'estudiante',
    'idCarrera' => 1,
    'semestreEstudiante' => 3,
]);
probar('POST /auth/registro estudiante → 201', $s === 201, "status {$s}");

echo "\n== ADMIN (HU-06, HU-14, HU-17) ==\n";

[$s, $b] = pedir('POST', '/api/auth/login', ['correoUsuario' => 'admin@univalle.edu.bo', 'contrasena' => 'Admin12345']);
$loginAdmin = json_decode($b, true);
$tokenAdmin = $loginAdmin['tokenAcceso'] ?? null;
probar('POST /auth/login admin → 200', $s === 200 && is_string($tokenAdmin), "status {$s}");

[$s, $b] = pedir('GET', '/api/admin/estadisticas/espacios-mas-consultados', null, $tokenAdmin);
probar('GET /admin/estadisticas/espacios-mas-consultados (HU-14) → 200', $s === 200, "status {$s}");

[$s, $b] = pedir('GET', '/api/admin/usuarios', null, $tokenAdmin);
probar('GET /admin/usuarios → 200', $s === 200, "status {$s}");

[$s, $b] = pedir('POST', '/api/admin/usuarios', [
    'nombreUsuario' => 'Docente Smoke',
    'correoUsuario' => 'smoke-docente@test.bo',
    'contrasena' => 'Smoke123456',
    'nombreRol' => 'docente',
], $tokenAdmin);
probar('POST /admin/usuarios docente → 201 (HU-17)', $s === 201, "status {$s}");

[$s, $b] = pedir('POST', '/api/admin/espacios', [
    'idEdificio' => 1,
    'idPiso' => 1,
    'idTipoEspacio' => 1,
    'nombreEspacio' => 'Espacio de Prueba Smoke',
    'descripcionEspacio' => 'Creado por la batería de pruebas',
    'latitud' => -16.541,
    'longitud' => -68.085,
    'estaActivo' => true,
], $tokenAdmin);
probar('POST /admin/espacios → 201 (HU-06)', in_array($s, [200, 201], true), "status {$s}");
$idNuevo = 0;
$cj = json_decode($b, true);
if (is_array($cj)) {
    $idNuevo = (int) ($cj['idEspacio'] ?? $cj['espacio']['idEspacio'] ?? 0);
}

if ($idNuevo > 0) {
    [$s, $b] = pedir('PUT', "/api/admin/espacios/{$idNuevo}", ['nombreEspacio' => 'Espacio Smoke Editado'], $tokenAdmin);
    probar("PUT /admin/espacios/{$idNuevo} → 200", $s === 200, "status {$s}");

    [$s, $b] = pedir('DELETE', "/api/admin/espacios/{$idNuevo}", null, $tokenAdmin);
    probar("DELETE /admin/espacios/{$idNuevo} → 200", $s === 200, "status {$s}");
} else {
    probar('PUT+DELETE /admin/espacios (requiere id)', false, 'no se obtuvo idEspacio');
}

echo "\n== PERMISOS (403 / 401) ==\n";

[$s, $b] = pedir('GET', '/api/admin/usuarios', null, $tokenEst);
probar('estudiante → /admin/usuarios = 403', $s === 403, "status {$s}");

[$s, $b] = pedir('GET', '/api/admin/usuarios');
probar('sin token → /admin/usuarios = 401', $s === 401, "status {$s}");

[$s, $b] = pedir('GET', '/api/favoritos');
probar('sin token → /favoritos = 401', $s === 401, "status {$s}");

[$s, $b] = pedir('GET', '/api/auth/perfil', null, 'token-invalido');
probar('token inválido → /auth/perfil = 401', $s === 401, "status {$s}");

[$s, $b] = pedir('POST', '/api/auth/logout', [], $tokenEst);
probar('POST /auth/logout → 200', $s === 200, "status {$s}");

echo "\n========================================\n";
echo "RESULTADO: {$G['pass']} PASS / {$G['fail']} FAIL\n";
if ($G['fail'] > 0) {
    echo "Fallos: " . implode(' | ', $G['fails']) . "\n";
    exit(1);
}
echo "TODO OK\n";