# =============================================================
#  MapaInteractivo - instalacion del entorno en una maquina nueva
#  -------------------------------------------------------------
#  Uso: ejecutar INSTALAR.bat  (no doble clic sobre este archivo)
#
#  Que hace (solo la primera vez en cada maquina):
#    1. Busca un PHP 8.3+ con extensiones en el PATH; si no lo
#       encuentra (o le faltan extensiones), descarga PHP 8.4
#       portable a %USERPROFILE%\php84 y lo agrega al PATH de
#       usuario (NO toca XAMPP ni el PHP del sistema)
#    2. Crea su php.ini con las extensiones que Laravel necesita
#    3. Descarga Composer (composer.phar) junto a ese PHP y crea
#       un shim composer.bat para usarlo desde la terminal
#    4. Llama a CONFIGURAR.ps1, que completa el backend:
#       .env, composer install, APP_KEY, conexion, migraciones
#       y semillas (pisos, espacios y usuarios de ejemplo)
#
#  Despues de esto, el uso diario son solo dos dobles clics:
#    INICIAR.bat          -> la pagina   (http://localhost:8080)
#    INICIAR-BACKEND.bat  -> la API     (http://localhost:8000)
#
#  Requiere internet la primera vez. No modifica el codigo del
#  proyecto. Este archivo usa solo caracteres ASCII a proposito.
# =============================================================

$ErrorActionPreference = 'Stop'

# PowerShell 5.1 puede necesitar este ajuste para hablar por HTTPS
if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
} catch { }

$raiz  = $PSScriptRoot
if (-not $raiz) { $raiz = (Get-Location).Path }
$dest  = Join-Path $env:USERPROFILE 'php84'
$php   = Join-Path $dest 'php.exe'
$composerPhar = Join-Path $dest 'composer.phar'

# Extensiones que Laravel + Supabase necesitan
$EXTENSIONES = @('pdo_pgsql', 'pgsql', 'fileinfo', 'zip', 'intl', 'mbstring', 'curl', 'openssl')

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
# (NativeCommandError) que detiene el script. Composer SIEMPRE escribe
# datos por stderr (version de PHP, avisos), asi que sin este auxiliar
# la instalacion se rompe en todas las maquinas. Solo PowerShell 7 lo
# desactiva con $PSNativeCommandUseErrorActionPreference (arriba).
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

function Buscar-PhpEnPath {
    $cmd = Get-Command php -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

# ---------------------------------------------------------------
#  1. PHP
# ---------------------------------------------------------------
Titulo "MapaInteractivo - instalacion del entorno"

$phpEnPath = Buscar-PhpEnPath
$usarPath  = $false
if ($phpEnPath) {
    $version = & $phpEnPath -r "echo PHP_VERSION;"
    if ($LASTEXITCODE -eq 0 -and $version -ge '8.3') {
        # Comprueba tambien las extensiones: si le faltan (p. ej. un
        # PHP de XAMPP sin pgsql), mejor usar el portable aparte.
        $cargadasPath = (Ejecutar $phpEnPath @('-m')).Salida
        $faltanPath   = @($EXTENSIONES | Where-Object { $cargadasPath -notcontains $_ })
        if ($faltanPath.Count -eq 0) {
            Paso "Paso 1/3 - PHP"
            Ok "Ya hay PHP $version con todas las extensiones: $phpEnPath"
            $php = $phpEnPath
            $usarPath = $true
        }
        else {
            Aviso "El PHP del PATH ($version) le faltan: $($faltanPath -join ', ')"
            Aviso "Se usara una instalacion portable aparte (no toca el sistema)."
        }
    }
    elseif ($LASTEXITCODE -eq 0) {
        Aviso "El PHP del PATH es $version y el backend necesita 8.3+"
        Aviso "Se usara una instalacion portable aparte."
    }
    else {
        Aviso "No se pudo ejecutar el PHP del PATH; se usara uno portable."
    }
}

if (-not (Test-Path $php)) {
    Paso "Paso 1/3 - Descargando PHP 8.4 portable"
    Aviso "Esto puede tardar un par de minutos la primera vez..."

    # Buscar la ultima version estable 8.4 (nueva o en archivo)
    $paginas = @(
        @{ url = 'https://windows.php.net/downloads/releases/';      prefijo = 'https://windows.php.net/downloads/releases/' },
        @{ url = 'https://windows.php.net/downloads/releases/archives/'; prefijo = 'https://windows.php.net/downloads/releases/archives/' }
    )
    $zip = $null
    $urlDescarga = $null
    foreach ($pagina in $paginas) {
        try {
            $html = (Invoke-WebRequest -Uri $pagina.url -UseBasicParsing -TimeoutSec 30).Content
            $coincidencia = [regex]::Match($html, 'href="(php-8\.4\.\d+-1-nts-Win32-vs17-x64\.zip)"')
            if (-not $coincidencia.Success) {
                $coincidencia = [regex]::Match($html, 'href="(php-8\.4\.\d+-nts-Win32-vs17-x64\.zip)"')
            }
            if ($coincidencia.Success) {
                $zip = $coincidencia.Groups[1].Value
                $urlDescarga = $pagina.prefijo + $zip
                break
            }
        } catch { }
    }

    if (-not $zip) {
        Fallo "No se encontro la descarga de PHP 8.4 en windows.php.net."
        Write-Host "        Comprueba tu conexion o instala PHP 8.3+ a mano"
        Write-Host "        desde https://windows.php.net/download/ en $dest"
        exit 1
    }

    Ok "Version a descargar: $zip"

    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    $zipRuta = Join-Path $env:TEMP 'unimap-php84.zip'
    & curl.exe -L --retry 2 --retry-delay 2 -o $zipRuta $urlDescarga
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $zipRuta)) {
        Fallo "No se pudo descargar PHP. Revisa tu conexion e intenta de nuevo."
        exit 1
    }

    Expand-Archive -Path $zipRuta -DestinationPath $dest -Force
    Remove-Item $zipRuta -ErrorAction SilentlyContinue

    if (-not (Test-Path $php)) {
        Fallo "La descarga no contiene php.exe en $dest"
        exit 1
    }
    Ok "PHP instalado en $dest"
}

# ---------------------------------------------------------------
#  2. php.ini con las extensiones necesarias (solo PHP portable)
# ---------------------------------------------------------------
if ($usarPath) {
    Paso "Paso 2/3 - Extensiones de PHP"
    Ok "Se usa el PHP del PATH y ya tiene todas las extensiones."
}
else {
    Paso "Paso 2/3 - Configurando php.ini (PHP portable)"
    # Asegura la carpeta antes de escribir dentro
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    $iniRuta = Join-Path $dest 'php.ini'

    $lineasIni = @(
        '; php.ini del PHP portable de UniMap (Laravel + PostgreSQL/Supabase)',
        "extension_dir = `"$dest\ext`"",
        '',
        'extension=curl',
        'extension=mbstring',
        'extension=pdo_pgsql',
        'extension=pgsql',
        'extension=zip',
        'extension=intl',
        'extension=openssl',
        'extension=fileinfo',
        'extension=sodium',
        '',
        'memory_limit = 512M',
        'max_execution_time = 120',
        'error_reporting = E_ALL',
        'display_errors = On',
        'date.timezone = America/La_Paz'
    )
    [System.IO.File]::WriteAllLines($iniRuta, $lineasIni, (New-Object System.Text.UTF8Encoding($false)))
    Ok "php.ini creado en $iniRuta"

    # Verificar que todas las extensiones cargan
    $verifPhp = Ejecutar $php @('-m')
    $cargadas = $verifPhp.Salida
    if ($verifPhp.Codigo -ne 0) {
        Fallo "php.exe no corre. Salida:"
        Write-Host $verifPhp.Texto
        exit 1
    }
    $faltan = @($EXTENSIONES | Where-Object { $cargadas -notcontains $_ })
    if ($faltan.Count -gt 0) {
        Fallo ("Faltan extensiones: " + ($faltan -join ', '))
        Write-Host "        Revisa $iniRuta"
        exit 1
    }
    Ok ("Extensiones activas: " + ($EXTENSIONES -join ', '))

    # Agrega %USERPROFILE%\php84 al PATH de usuario (idempotente) para
    # que 'php' funcione en la terminal de VS Code y en cualquier consola
    $pathUsuario = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ([string]::IsNullOrEmpty($pathUsuario)) { $pathUsuario = '' }
    if ($pathUsuario -notlike "*$dest*") {
        [Environment]::SetEnvironmentVariable('Path', ($pathUsuario.TrimEnd(';') + ';' + $dest), 'User')
        Ok "Agregado al PATH de usuario: $dest"
        Aviso "Abre de nuevo la terminal de VS Code para que 'php' responda."
    }
}
$versionFinal = & $php -r "echo PHP_VERSION;"
Ok "PHP $versionFinal listo"

# ---------------------------------------------------------------
#  3. Composer
# ---------------------------------------------------------------
Paso "Paso 3/3 - Composer"
$composerEnPath = Get-Command composer -ErrorAction SilentlyContinue
if ($composerEnPath) {
    Ok "Composer del sistema: $($composerEnPath.Source)"
}
else {
    if (-not (Test-Path $composerPhar)) {
        Aviso "Descargando Composer..."
        # Asegura la carpeta antes de escribir dentro
        New-Item -ItemType Directory -Force -Path $dest | Out-Null
        & curl.exe -L --retry 2 --retry-delay 2 -o $composerPhar "https://getcomposer.org/composer-stable.phar"
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $composerPhar)) {
            Fallo "No se pudo descargar Composer."
            exit 1
        }
    }
    $verifComposer = Ejecutar $php @($composerPhar, '--version')
    if ($verifComposer.Codigo -ne 0) {
        Fallo "composer.phar no corre. Salida:"
        Write-Host $verifComposer.Texto
        exit 1
    }
    Ok ($verifComposer.Salida | Select-Object -First 1)

    # Shim 'composer.bat' junto al PHP portable, para que el comando
    # 'composer' funcione en la terminal de VS Code sin instalar nada
    if (-not $usarPath) {
        $shimComposer = Join-Path $dest 'composer.bat'
        $lineasShim = @(
            '@echo off',
            '"%~dp0php.exe" "%~dp0composer.phar" %*'
        )
        [System.IO.File]::WriteAllLines($shimComposer, $lineasShim, (New-Object System.Text.UTF8Encoding($false)))
        Ok "Comando 'composer' disponible: $shimComposer"
    }
}

# ---------------------------------------------------------------
#  4. Backend: .env, dependencias, clave, conexion, migraciones
# ---------------------------------------------------------------
Titulo "ENTORNO INSTALADO - configurando el backend"
Write-Host "  Continuando con CONFIGURAR.ps1 ..."
& (Join-Path $raiz 'CONFIGURAR.ps1')
if ($LASTEXITCODE -ne 0) {
    Fallo "CONFIGURAR.ps1 termino con errores (codigo $LASTEXITCODE)."
    Write-Host "        Revisa el mensaje de arriba; cuando este resuelto"
    Write-Host "        vuelve a ejecutar CONFIGURAR.bat."
    exit 1
}

Titulo "INSTALACION TERMINADA"
Write-Host "  En esta maquina ya no hace falta INSTALAR.bat."
Write-Host ""
Write-Host "  Uso diario (doble clic):"
Write-Host ""
Write-Host "    1. INICIAR-BACKEND.bat  -> API en    http://localhost:8000"
Write-Host "       (o en VS Code: cd backend  ->  php artisan serve)"
Write-Host "    2. INICIAR.bat          -> pagina en http://localhost:8080"
Write-Host ""
Write-Host "  Comprueba el backend con:"
Write-Host "    http://localhost:8000/api/edificios   (debe salir JSON)"
Write-Host "    (la raiz http://localhost:8000/api da 404: es normal)"
Write-Host ""
Write-Host "  Entra con: admin@univalle.edu.bo  /  Admin12345"
Write-Host ""
