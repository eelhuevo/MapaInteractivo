@echo off
title UniMap - Backend Laravel (API)
cd /d "%~dp0"

set PUERTO=8000

echo ============================================
echo    UniMap - Backend Laravel (API)
echo ============================================
echo.
echo Carpeta: %cd%\backend
echo Puerto:  %PUERTO%
echo.

:: Paso 1: localizar PHP. Necesita 8.3+ con las extensiones del
:: backend (Laravel 13 no corre en PHP 8.0 de XAMPP).
:: Orden: primero el portable de INSTALAR.bat, luego el del PATH
:: pero solo si cumple; si no, se avisa en vez de fallar en silencio.
set "PHP="
set "PHP_OK="

:: a) Instalacion portable (%USERPROFILE%\php84) que crea INSTALAR.bat
if exist "%USERPROFILE%\php84\php.exe" (
    "%USERPROFILE%\php84\php.exe" -r "exit(version_compare(PHP_VERSION,'8.3.0','>=') && extension_loaded('pdo_pgsql') && extension_loaded('mbstring') && extension_loaded('curl') ? 0 : 1);" >nul 2>nul
    if not errorlevel 1 (
        set "PHP=%USERPROFILE%\php84\php.exe"
        set "PHP_OK=1"
    )
)

:: b) PHP del PATH, solo si cumple 8.3+ y trae las extensiones
if not defined PHP_OK (
    where php >nul 2>nul
    if not errorlevel 1 (
        php -r "exit(version_compare(PHP_VERSION,'8.3.0','>=') && extension_loaded('pdo_pgsql') && extension_loaded('mbstring') && extension_loaded('curl') ? 0 : 1);" >nul 2>nul
        if not errorlevel 1 (
            set "PHP=php"
            set "PHP_OK=1"
        )
    )
)

if not defined PHP_OK (
    echo ERROR: No hay un PHP 8.3+ con extensiones: pdo_pgsql, mbstring, curl.
    echo.
    echo Encontrado en el PATH:
    where php 2>nul
    php -r "echo 'PHP ', PHP_VERSION;" 2>nul
    echo.
    echo Solucion: ejecuta INSTALAR.bat una vez en la raiz del proyecto.
    echo Instala un PHP portable aparte sin tocar XAMPP ni el sistema.
    echo.
    pause
    exit /b 1
)

goto :php-listo

:php-listo
echo PHP: %PHP%

:: Paso 2: verificar dependencias del backend (vendor)
if not exist "backend\vendor\autoload.php" (
    echo ERROR: Faltan las dependencias del backend: carpeta backend\vendor.
    echo Ejecuta una sola vez:
    echo.
    echo     cd backend
    echo     composer install
    echo.
    pause
    exit /b 1
)

:: Paso 3: liberar el puerto SOLO si lo ocupa un servidor php previo
echo Liberando puerto %PUERTO% si esta ocupado por un servidor previo...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%PUERTO% .*LISTENING"') do (
    for /f "delims=" %%N in ('powershell -NoProfile -Command "(Get-Process -Id %%P -ErrorAction SilentlyContinue).ProcessName"') do (
        if /i "%%N"=="php" (
            echo   Cerrando backend php previo (PID %%P^)...
            taskkill /f /pid %%P >nul 2>&1
        ) else (
            echo   AVISO: el puerto lo ocupa "%%N" (PID %%P^). No se cierra nada.
            echo   Cambia el puerto en INICIAR-BACKEND.bat o cierra ese programa manualmente.
        )
    )
)
timeout /t 1 /nobreak >nul

:: Paso 4: arrancar la API en una ventana minimizada
echo Iniciando servidor API...
pushd backend
start "UniMap - backend (no cerrar)" /min "%PHP%" artisan serve --port=%PUERTO%
popd

:: Paso 5: esperar y comprobar que responde
timeout /t 3 /nobreak >nul
start "" http://localhost:%PUERTO%/api/edificios

echo ============================================
echo  Backend activo en  http://localhost:%PUERTO%/api
echo.
echo  - La web (INICIAR.bat, puerto 8080) sincroniza con este
echo    servidor: login, avisos, estadisticas y el panel admin
echo  - No cierres la ventana del backend
echo  - Para detener: cierra esa ventana o pulsa Ctrl+C ahi
echo ============================================
echo.
pause
