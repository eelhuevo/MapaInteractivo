@echo off
setlocal
title UniMap - Iniciar todo
cd /d "%~dp0"

set PUERTO_WEB=8080
set PUERTO_API=8000

echo ============================================
echo    UniMap - Iniciando backend + frontend
echo ============================================
echo.

:: ---- 1. Buscar PHP 8.3+ (portable de INSTALAR.bat o el del PATH) ----
set "PHP="
if exist "%USERPROFILE%\php84\php.exe" (
    "%USERPROFILE%\php84\php.exe" -r "exit(version_compare(PHP_VERSION,'8.3.0','>=') && extension_loaded('pdo_pgsql') ? 0 : 1);" >nul 2>nul
    if not errorlevel 1 set "PHP=%USERPROFILE%\php84\php.exe"
)
if not defined PHP (
    where php >nul 2>nul
    if not errorlevel 1 (
        php -r "exit(version_compare(PHP_VERSION,'8.3.0','>=') && extension_loaded('pdo_pgsql') ? 0 : 1);" >nul 2>nul
        if not errorlevel 1 set "PHP=php"
    )
)
if not defined PHP (
    echo ERROR: no hay PHP 8.3+ con pdo_pgsql. Ejecuta INSTALAR.bat una vez.
    pause
    exit /b 1
)
if not exist "backend\vendor\autoload.php" (
    echo ERROR: faltan las dependencias del backend. Ejecuta CONFIGURAR.bat una vez.
    pause
    exit /b 1
)

:: ---- 2. Liberar puertos si quedaron servidores previos (solo php/python) ----
call :liberar %PUERTO_API%
call :liberar %PUERTO_WEB%

:: ---- 3. Backend (API Laravel) en segundo plano ----
echo [1/3] Iniciando backend en puerto %PUERTO_API%...
pushd backend
start "UniMap - backend (no cerrar)" /min "%PHP%" artisan serve --port=%PUERTO_API%
popd

:: ---- 4. Frontend (servidor estatico) en segundo plano ----
echo [2/3] Iniciando frontend en puerto %PUERTO_WEB%...
where python >nul 2>nul
if not errorlevel 1 (
    start "UniMap - frontend (no cerrar)" /min python -m http.server %PUERTO_WEB%
) else (
    where py >nul 2>nul
    if not errorlevel 1 (
        start "UniMap - frontend (no cerrar)" /min py -m http.server %PUERTO_WEB%
    ) else (
        start "UniMap - frontend (no cerrar)" /min "%PHP%" -S localhost:%PUERTO_WEB%
    )
)

:: ---- 5. Esperar solo lo necesario (maximo ~15 s) y abrir el navegador ----
echo [3/3] Esperando que el frontend responda...
powershell -NoProfile -Command "$t=0; while($t -lt 30){ try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 http://localhost:%PUERTO_WEB%/index.html | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 500; $t++ } }; exit 1"
start "" http://localhost:%PUERTO_WEB%/index.html

echo.
echo ============================================
echo  Listo:
echo    Web: http://localhost:%PUERTO_WEB%/index.html
echo    API: http://localhost:%PUERTO_API%/api
echo.
echo  El mapa se llena solo cuando el backend termine de
echo  arrancar (unos segundos). Para apagar todo: DETENER.bat
echo ============================================
timeout /t 5 >nul
exit /b 0

:liberar
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%1 .*LISTENING"') do (
    for /f "delims=" %%N in ('powershell -NoProfile -Command "(Get-Process -Id %%P -ErrorAction SilentlyContinue).ProcessName"') do (
        if /i "%%N"=="php" taskkill /f /pid %%P >nul 2>&1
        if /i "%%N"=="python" taskkill /f /pid %%P >nul 2>&1
    )
)
exit /b 0
