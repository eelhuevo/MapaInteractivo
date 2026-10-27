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
Paso "Paso 1/7 - Verificando PHP"
$phpCmd = Get-Command php -ErrorAction SilentlyContinue
if (-not $phpCmd) {
    Fallo "No se encontro PHP en el PATH."
    Write-Host "        Instala PHP 8.1 o superior desde"
    Write-Host "        https://windows.php.net/download/"
    Write-Host "        y marca 'Add PHP to PATH' al instalar."
    exit 1
}
$phpVersion = & php -r "echo PHP_VERSION;"
Ok "PHP $phpVersion"

# ---- 2. Extensiones ---------------------------------------------
Paso "Paso 2/7 - Verificando extensiones de PHP"
$iniRuta = & php -r "echo php_ini_loaded_file();"
if (-not $iniRuta -or -not (Test-Path $iniRuta)) {
    Fallo "No se encontro el archivo php.ini."
    exit 1
}
Ok "php.ini: $iniRuta"

$cargadas  = @(& php -m)
$faltan    = @($EXTENSIONES | Where-Object { $cargadas -notcontains $_ })

if ($faltan.Count -eq 0) {
    Ok ("Activas: " + ($EXTENSIONES -join ', '))
}
else {
    Aviso ("Faltan: " + ($faltan -join ', '))
    $resultado = Activar-Extension -RutaIni $iniRuta -Nombres $faltan
    foreach ($r in $resultado) { Write-Host "         -> $r" }

    # Se re-verifica con un proceso nuevo para recargar php.ini
    $cargadas2 = @(& php -m)
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
Paso "Paso 3/7 - Configurando archivo .env"
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
Paso "Paso 4/7 - Verificando dependencias"
$autoload = Join-Path $backend 'vendor\autoload.php'
if (Test-Path $autoload) {
    Ok "vendor/ ya instalado"
}
else {
    $composerCmd = Get-Command composer -ErrorAction SilentlyContinue
    if (-not $composerCmd) {
        Fallo "Falta vendor/ y Composer no esta instalado."
        Write-Host "        Instala Composer desde https://getcomposer.org/download/"
        exit 1
    }
    Aviso "Instalando dependencias (puede tardar un poco)..."
    Push-Location $backend
    & composer install --no-interaction --prefer-dist
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
Paso "Paso 5/7 - Clave de aplicacion"
$envContenido = Get-Content $envArchivo -Raw
if ($envContenido -match '(?m)^APP_KEY=base64:.+') {
    Ok "APP_KEY ya configurada"
}
else {
    Push-Location $backend
    & php artisan key:generate --force | Out-Null
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
Paso "Paso 6/7 - Probando conexion con Supabase"
Push-Location $backend
$salida   = (& php artisan migrate:status 2>&1 | Out-String)
$exitCode = $LASTEXITCODE
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
    Paso "Paso 7/7 - Aplicando migraciones pendientes"
    Push-Location $backend
    & php artisan migrate --force
    Pop-Location
    Ok "Migraciones aplicadas"
}
else {
    Paso "Paso 7/7 - Migraciones"
    Ok "Nada pendiente, la base de datos esta al dia"
}

# ---- Resumen ------------------------------------------------------
Titulo "CONFIGURACION COMPLETADA"
Write-Host "  El backend quedo conectado a Supabase."
Write-Host ""
Write-Host "  Para arrancar el proyecto:"
Write-Host ""
Write-Host "    Backend  (API)  :  cd backend"
Write-Host "                       php artisan serve"
Write-Host "                       -> http://localhost:8000"
Write-Host ""
Write-Host "    Frontend (pagina): doble clic en INICIAR.bat"
Write-Host "                       -> http://localhost:8080"
Write-Host ""
Write-Host "  Nota: la pagina hoy funciona con datos locales y no"
Write-Host "  necesita el backend para mostrarse."

if (-not $SinPreguntar) {
    Write-Host ""
    $respuesta = Read-Host "  Deseas arrancar el backend ahora? (S/N)"
    if ($respuesta -match '^[sS]') {
        Write-Host ""
        Write-Host "  Arrancando el servidor... (cierra esta ventana para detenerlo)"
        Write-Host ""
        Push-Location $backend
        & php artisan serve
        Pop-Location
    }
}
