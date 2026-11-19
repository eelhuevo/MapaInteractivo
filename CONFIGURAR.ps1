# =============================================================
#  MapaInteractivo - configuracion automatica del backend
#  -------------------------------------------------------------
#  Uso: ejecutar CONFIGURAR.bat  (no doble clic sobre este archivo)
#
#  Que hace:
#    1. Verifica PHP y sus extensiones
#    2. Activa en php.ini las extensiones que falten
#    3. Crea backend\.env a partir de .env.example
#    4. Instala las dependencias de Composer (si faltan)
#    5. Genera la APP_KEY
#    6. Prueba la conexion con Supabase
#    7. Aplica las migraciones pendientes
#    8. Siembra los datos (pisos, espacios, usuarios) y muestra
#       los conteos de las tablas para confirmar que entraron
#
#  El script es repetible: puedes ejecutarlo cuantas veces quieras.
#  No modifica la pagina ni el codigo del proyecto.
#
#  Nota: este archivo usa solo caracteres ASCII a proposito, para
#        que Windows PowerShell 5.1 lo lea correctamente sin BOM.
# =============================================================

param(
    # Ejecuta sin pedir nada por teclado (util para pruebas)
    [switch]$SinPreguntar
)

$ErrorActionPreference = 'Stop'

# PowerShell 7 no debe tratar la salida de error de php/composer
# como una excepcion que detenga el script.
if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$raiz       = $PSScriptRoot
if (-not $raiz) { $raiz = (Get-Location).Path }
$backend    = Join-Path $raiz 'backend'
$envArchivo = Join-Path $backend '.env'
$envEjemplo = Join-Path $backend '.env.example'

# --- Datos de conexion a Supabase -------------------------------------
# El host directo (db.<referencia>.supabase.co) es IPv6-only y no
# funciona desde la mayoria de las redes locales. Se usa el pooler
# IPv4, que es la forma recomendada por Supabase.
$DB_HOST = 'aws-1-sa-east-1.pooler.supabase.com'
$DB_PORT = '6543'
$DB_USER = 'postgres.tamxwusifywmdqaicitg'
$DB_NAME = 'postgres'

# --- Extensiones de PHP que Laravel necesita --------------------------
$EXTENSIONES = @('pdo_pgsql', 'pgsql', 'fileinfo', 'zip', 'intl', 'mbstring', 'curl', 'openssl')


# ---------------------------------------------------------------
#  Utilidades de mensaje
# ---------------------------------------------------------------
function Titulo([string]$t) {
    Write-Host ""
    Write-Host "=================================================="
    Write-Host "  $t"
    Write-Host "=================================================="
}
function Paso([string]$t) {
    Write-Host ""
    Write-Host "--> $t" -ForegroundColor Cyan
}
function Ok([string]$t) {
    Write-Host "    [OK]     $t" -ForegroundColor Green
}
function Aviso([string]$t) {
    Write-Host "    [AVISO]  $t" -ForegroundColor Yellow
}
function Fallo([string]$t) {
    Write-Host "    [ERROR]  $t" -ForegroundColor Red
}

# Ejecuta un comando nativo (php, composer, ...) y devuelve su salida
# completa (stdout + stderr) como texto plano, mas el codigo de salida.
#
# Motivo: en Windows PowerShell 5.1, con $ErrorActionPreference='Stop',
# redirigir 2>&1 convierte cada linea de stderr en un error fatal
# (NativeCommandError) que detiene el script. php artisan escribe avisos
# y errores por stderr, asi que sin este auxiliar este script se rompe
# en distintos pasos segun la maquina. Solo PowerShell 7 lo desactiva
# con $PSNativeCommandUseErrorActionPreference (arriba).
function Ejecutar {
    param(
        [Parameter(Mandatory = $true)][string]$Comando,
        [string[]]$Argumentos = @()
    )
    $eapAnterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $lineas = @(& $Comando @Argumentos 2>&1)
        $codigo = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $eapAnterior
    }
    # Las lineas de stderr llegan como ErrorRecord: se pasan a texto simple
    $salida = @($lineas | ForEach-Object { "$_" })
    [pscustomobject]@{
        Salida = $salida
        Texto  = ($salida -join "`n")
        Codigo = $codigo
    }
}


# ---------------------------------------------------------------
#  Lee un password por teclado (oculto)
# ---------------------------------------------------------------
function Leer-Password([string]$mensaje) {
    $seguro = Read-Host "    $mensaje" -AsSecureString
    $bstr   = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}


# ---------------------------------------------------------------
#  Activa una extension en php.ini (con backup previo)
# ---------------------------------------------------------------
function Activar-Extension {
    param([string]$RutaIni, [string[]]$Nombres)

    # Latin1 preserva byte a byte el contenido original del archivo
    $latin1 = [System.Text.Encoding]::GetEncoding(28591)
    $contenido = [System.IO.File]::ReadAllText($RutaIni, $latin1)

    # Backup una sola vez, para no pisar el original
    $backup = "$RutaIni.bak"
    if (-not (Test-Path $backup)) {
        Copy-Item $RutaIni $backup
        Aviso "Backup creado: $backup"
    }

    $hechas = @()
    foreach ($e in $Nombres) {
        $escapado = [regex]::Escape($e)
        $patronActiva = "(?m)^[ \t]*extension=$escapado(\.dll)?[ \t]*`r?$"
        $patronComent = "(?m)^[ \t]*;[ \t]*extension=$escapado(\.dll)?[ \t]*`r?$"

        if ([regex]::IsMatch($contenido, $patronActiva)) {
            # Ya estaba activa (no aparece en php -m por otra razon)
            continue
        }
        elseif ([regex]::IsMatch($contenido, $patronComent)) {
            $contenido = [regex]::Replace($contenido, $patronComent, "extension=$e")
            $hechas += "$e (descomentada)"
        }
        else {
            $contenido = $contenido.TrimEnd() + "`r`nextension=$e`r`n"
            $hechas += "$e (anadida)"
        }
    }

    if ($hechas.Count -gt 0) {
        [System.IO.File]::WriteAllText($RutaIni, $contenido, $latin1)
    }
    return $hechas
}


# ---------------------------------------------------------------
#  Programa principal
# ---------------------------------------------------------------
Titulo "MapaInteractivo - configuracion automatica"
Write-Host "  Carpeta: $raiz"

# ---- 1. PHP ------------------------------------------------------
Paso "Paso 1/8 - Verificando PHP"
$phpCmd = Get-Command php -ErrorAction SilentlyContinue
$portablePhp = Join-Path $env:USERPROFILE 'php84\php.exe'
if ($phpCmd) {
    $PHP = 'php'
}
elseif (Test-Path $portablePhp) {
    # Instalacion portable que crea INSTALAR.bat (no toca el sistema)
    $PHP = $portablePhp
}
else {
    Fallo "No se encontro PHP en el PATH ni en $portablePhp"
    Write-Host "        Ejecuta INSTALAR.bat en la raiz del proyecto: descarga"
    Write-Host "        PHP portable y Composer sin tocar XAMPP ni el sistema."
    exit 1
}
$phpVersion = & $PHP -r "echo PHP_VERSION;"
Ok "PHP $phpVersion ($PHP)"

# ---- 2. Extensiones ---------------------------------------------
Paso "Paso 2/8 - Verificando extensiones de PHP"
$iniRuta = & $PHP -r "echo php_ini_loaded_file();"
if (-not $iniRuta -or -not (Test-Path $iniRuta)) {
    Fallo "No se encontro el archivo php.ini."
    exit 1
}
Ok "php.ini: $iniRuta"

$cargadas  = (Ejecutar $PHP @('-m')).Salida
$faltan    = @($EXTENSIONES | Where-Object { $cargadas -notcontains $_ })

if ($faltan.Count -eq 0) {
    Ok ("Activas: " + ($EXTENSIONES -join ', '))
}
else {
    Aviso ("Faltan: " + ($faltan -join ', '))
    $resultado = Activar-Extension -RutaIni $iniRuta -Nombres $faltan
    foreach ($r in $resultado) { Write-Host "         -> $r" }

    # Se re-verifica con un proceso nuevo para recargar php.ini
    $cargadas2 = (Ejecutar $PHP @('-m')).Salida
    $todavia   = @($EXTENSIONES | Where-Object { $cargadas2 -notcontains $_ })
    if ($todavia.Count -eq 0) {
        Ok "Todas las extensiones quedaron activas"
    }
    else {
        Fallo ("Siguen faltando: " + ($todavia -join ', '))
        Write-Host "        Revisa $iniRuta y vuelve a ejecutar."
        exit 1
    }
}

# ---- 3. Archivo .env --------------------------------------------
Paso "Paso 3/8 - Configurando archivo .env"
if (-not (Test-Path $envEjemplo)) {
    Fallo "No se encontro .env.example en $backend"
    exit 1
}

if (Test-Path $envArchivo) {
    Ok ".env ya existe (se conserva el actual)"

    # Detecta el host directo, que no funciona por IPv6
    $actual = Get-Content $envArchivo -Raw
    if ($actual -match '(?m)^DB_HOST=db\.') {
        Aviso "El .env usa el host directo de Supabase (db.*), que es IPv6-only"
        Write-Host "         y suele fallar en redes locales."
        Write-Host "         Usa el pooler IPv4: $DB_HOST (puerto $DB_PORT)"
    }
}
else {
    if ($SinPreguntar) {
        Fallo "Falta backend\.env y se ejecuto con -SinPreguntar"
        Write-Host "        Ejecuta CONFIGURAR.bat sin ese parametro."
        exit 1
    }

    $password = ""
    while (-not $password) {
        $password = Leer-Password "Password de Supabase (usuario 'postgres'):"
        if (-not $password) { Aviso "El password no puede quedar vacio." }
    }

    $lineas    = Get-Content $envEjemplo
    $nuevas    = foreach ($l in $lineas) {
        if     ($l -match '^DB_HOST=')     { "DB_HOST=$DB_HOST" }
        elseif ($l -match '^DB_PORT=')     { "DB_PORT=$DB_PORT" }
        elseif ($l -match '^DB_USERNAME=') { "DB_USERNAME=$DB_USER" }
        elseif ($l -match '^DB_DATABASE=') { "DB_DATABASE=$DB_NAME" }
        elseif ($l -match '^DB_PASSWORD=') { "DB_PASSWORD=$password" }
        else { $l }
    }

    # UTF-8 sin BOM: Laravel lo lee bien y acepta caracteres no ASCII
    [System.IO.File]::WriteAllLines($envArchivo, $nuevas, (New-Object System.Text.UTF8Encoding($false)))
    Ok ".env creado en $envArchivo"
    Aviso "El archivo .env NO se sube a GitHub (esta en .gitignore)"
}

# ---- 4. Dependencias de Composer ---------------------------------
Paso "Paso 4/8 - Verificando dependencias"
$autoload = Join-Path $backend 'vendor\autoload.php'
if (Test-Path $autoload) {
    Ok "vendor/ ya instalado"
}
else {
    $composerCmd = Get-Command composer -ErrorAction SilentlyContinue
    $portableComposer = Join-Path $env:USERPROFILE 'php84\composer.phar'
    if ($composerCmd) {
        $COMPOSER = 'composer'
    }
    elseif (Test-Path $portableComposer) {
        # Composer descargado por INSTALAR.bat, se ejecuta con el PHP portable
        $COMPOSER = $portableComposer
    }
    else {
        Fallo "Falta vendor/ y Composer no esta instalado."
        Write-Host "        Ejecuta INSTALAR.bat en la raiz del proyecto: descarga"
        Write-Host "        Composer junto al PHP portable y continua solo."
        exit 1
    }
    Aviso "Instalando dependencias (puede tardar un poco)..."
    Push-Location $backend
    if ($COMPOSER -eq 'composer') {
        & composer install --no-interaction --prefer-dist
    }
    else {
        & $PHP $COMPOSER install --no-interaction --prefer-dist
    }
    Pop-Location

    if (Test-Path $autoload) {
        Ok "Dependencias instaladas"
    }
    else {
        Fallo "No se pudo instalar vendor/"
        exit 1
    }
}

# ---- 5. APP_KEY --------------------------------------------------
Paso "Paso 5/8 - Clave de aplicacion"
$envContenido = Get-Content $envArchivo -Raw
if ($envContenido -match '(?m)^APP_KEY=base64:.+') {
    Ok "APP_KEY ya configurada"
}
else {
    Push-Location $backend
    & $PHP artisan key:generate --force | Out-Null
    Pop-Location

    $envContenido = Get-Content $envArchivo -Raw
    if ($envContenido -match '(?m)^APP_KEY=base64:.+') {
        Ok "APP_KEY generada"
    }
    else {
        Fallo "No se pudo generar la APP_KEY"
        exit 1
    }
}

# ---- 6. Conexion con Supabase ------------------------------------
Paso "Paso 6/8 - Probando conexion con Supabase"
Push-Location $backend
$estadoMig = Ejecutar $PHP @('artisan', 'migrate:status')
$salida    = $estadoMig.Texto
$exitCode  = $estadoMig.Codigo
Pop-Location

if ($exitCode -ne 0) {
    Fallo "No se pudo conectar con la base de datos."
    Write-Host ""
    Write-Host $salida
    Write-Host ""
    Write-Host "        Comprueba en el Dashboard de Supabase:"
    Write-Host "        Project Settings -> Database -> Connection info"
    exit 1
}
Ok "Conexion establecida"

$ejecutadas = ([regex]::Matches($salida, '(?m)\bRan\b')).Count
$pendientes = ([regex]::Matches($salida, '(?m)\bPending\b')).Count
Write-Host "         Migraciones: $ejecutadas ejecutadas, $pendientes pendientes"

# ---- 7. Migraciones ---------------------------------------------
if ($pendientes -gt 0) {
    Paso "Paso 7/8 - Aplicando migraciones pendientes"
    Push-Location $backend
    & $PHP artisan migrate --force
    Pop-Location
    Ok "Migraciones aplicadas"
}
else {
    Paso "Paso 7/8 - Migraciones"
    Ok "Nada pendiente, la base de datos esta al dia"
}

# ---- 8. Semillas (datos de ejemplo) -------------------------------
# Idempotente: todos los seeders usan firstOrCreate, asi que en una BD
# ya poblada solo agregan lo que falte (p. ej. los pisos reales 4..17
# de la Torre Antigua). Incluye el usuario admin@univalle.edu.bo.
#
# La siembra completa hace ~1500 consultas y cada consulta viaja
# ~200 ms hasta Supabase (Brasil), o sea ~6 minutos. Por eso aqui se
# comprueba primero si la BD ya esta poblada: si lo esta, se omite y
# solo se muestran los conteos (~2 segundos). Con la BD vacia siembra
# normal. Para volver a sembrar a mano:
#     cd backend  ->  php artisan db:seed --force
Paso "Paso 8/8 - Datos de ejemplo (pisos, espacios, usuarios)"

$scriptConteos = "echo '     edificios  = ' . App\Models\Edificio::count() . PHP_EOL; echo '     pisos      = ' . App\Models\Piso::count() . PHP_EOL; echo '     espacios   = ' . App\Models\Espacio::count() . PHP_EOL; echo '     aulas      = ' . App\Models\Aula::count() . PHP_EOL; echo '     laboratorios = ' . App\Models\Laboratorio::count() . PHP_EOL; echo '     usuarios   = ' . App\Models\Usuario::count() . PHP_EOL; echo '     zonas      = ' . App\Models\Zona::count() . PHP_EOL;"

Push-Location $backend
$recuento = Ejecutar $PHP @('artisan', 'tinker', '--execute', $scriptConteos)
Pop-Location

# La BD se da por poblada si estas 4 tablas clave tienen filas
$faltanDatos = $false
foreach ($tabla in @('edificios', 'pisos', 'espacios', 'usuarios')) {
    if ($recuento.Texto -notmatch "(?m)^\s*$tabla\s*=\s*[1-9]\d*") { $faltanDatos = $true }
}
$yaHayDatos = ($recuento.Codigo -eq 0 -and -not $faltanDatos)

if ($yaHayDatos) {
    Ok "Datos de ejemplo ya presentes: siembra omitida (se ahorra ~6 min)"
    Write-Host "         Para sembrar de nuevo a mano: cd backend -> php artisan db:seed --force"
    $conteos = $recuento.Texto
}
else {
    Aviso "Base de datos vacia o incompleta: sembrando (puede tardar ~6 min)..."
    Push-Location $backend
    $resultadoSeed = Ejecutar $PHP @('artisan', 'db:seed', '--force')
    Pop-Location

    if ($resultadoSeed.Codigo -eq 0) {
        Ok "Datos de ejemplo listos"
        Push-Location $backend
        $recuento = Ejecutar $PHP @('artisan', 'tinker', '--execute', $scriptConteos)
        Pop-Location
        $conteos = $recuento.Texto
    }
    else {
        Aviso "Las semillas no terminaron bien (la BD puede estar ya poblada):"
        Write-Host $resultadoSeed.Texto
        $conteos = ''
    }
}

# Conteos visibles: asi se ve enseguida si la BD quedo poblada
if ($conteos -match 'espacios') {
    Write-Host ""
    Write-Host "    Conteos en Supabase (tabla -> filas):"
    # tinker (psysh) devuelve " edificios = 4" con un solo espacio
    # inicial, asi que el filtro acepta cualquier sangria y solo pide
    # "nombre = numero" para no imprimir ruido de psysh
    ($conteos -split "`r?`n") | Where-Object { $_ -match '^\s*\w+\s*=\s*\d+\s*$' } | ForEach-Object { Write-Host ("      " + $_.Trim()) }
}
elseif ($conteos) {
    Aviso "No se pudieron leer los conteos."
    Write-Host $conteos
}

# ---- Resumen ------------------------------------------------------
Titulo "CONFIGURACION COMPLETADA"
Write-Host "  El backend quedo conectado a Supabase."
Write-Host ""
Write-Host "  Como arrancar a diario (estilo XAMPP):"
Write-Host ""
Write-Host "    1. Doble clic a  INICIAR-BACKEND.bat   (API en http://localhost:8000)"
Write-Host "       - o en VS Code:  cd backend  ->  php artisan serve"
Write-Host "    2. Doble clic a  INICIAR.bat           (pagina en http://localhost:8080)"
Write-Host ""
Write-Host "  Comprueba que el backend responde abriendo en el navegador:"
Write-Host ""
Write-Host "       http://localhost:8000/api/edificios"
Write-Host ""
Write-Host "       (debe salir JSON con los 4 edificios. Entrar a la raiz"
Write-Host "        http://localhost:8000/api  da error 404: es normal, no"
Write-Host "        hay ruta en la raiz.)"
Write-Host ""
Write-Host "  La pagina toma los espacios del backend. Si el backend esta"
Write-Host "  apagado, el mapa sale vacio con un aviso (no usa datos locales)."
Write-Host ""
Write-Host "  Para ver los datos en Supabase: Dashboard -> Table Editor ->"
Write-Host "  tabla espacios (y usuarios, pisos, aulas...)."

if (-not $SinPreguntar) {
    Write-Host ""
    $respuesta = Read-Host "  Deseas arrancar el backend ahora? (S/N)"
    if ($respuesta -match '^[sS]') {
        Write-Host ""
        Write-Host "  Arrancando el servidor... (cierra esta ventana para detenerlo)"
        Write-Host ""
        Push-Location $backend
        & $PHP artisan serve
        Pop-Location
    }
}

