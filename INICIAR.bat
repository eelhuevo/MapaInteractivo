@echo off
title UniMap - Campus Universitario
cd /d "%~dp0"

set PUERTO=8080

echo ============================================
echo    UniMap - Campus Universitario
echo ============================================
echo.
echo Carpeta: %cd%
echo Puerto:  %PUERTO%
echo.

:: Paso 1: liberar el puerto SOLO si el proceso es python
echo Liberando puerto %PUERTO% si esta ocupado por un servidor previo...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r ":%PUERTO% .*LISTENING"') do (
    for /f "delims=" %%N in ('powershell -NoProfile -Command "(Get-Process -Id %%P -ErrorAction SilentlyContinue).ProcessName"') do (
        if /i "%%N"=="python" (
            echo   Cerrando servidor python previo (PID %%P^)...
            taskkill /f /pid %%P >nul 2>&1
        ) else (
            echo   AVISO: el puerto lo ocupa "%%N" (PID %%P^). No se cierra nada.
            echo   Cambia el puerto en INICIAR.bat o cierra ese programa manualmente.
        )
    )
)
timeout /t 1 /nobreak >nul

:: Paso 2: verificar Python
where python >nul 2>nul
if %errorlevel%==0 (
    set PYCMD=python
    goto :arrancar
)

where py >nul 2>nul
if %errorlevel%==0 (
    set PYCMD=py
    goto :arrancar
)

echo.
echo ERROR: No se encontro Python.
echo Instala Python 3 desde https://www.python.org
echo y marca la casilla "Add Python to PATH".
echo.
pause
exit /b 1

:arrancar
echo Python encontrado: %PYCMD%
echo Iniciando servidor...
echo.

:: Paso 3: arrancar el servidor en una ventana minimizada
start "UniMap - servidor (no cerrar)" /min %PYCMD% -m http.server %PUERTO%

:: Paso 4: esperar y abrir el navegador
timeout /t 3 /nobreak >nul
start "" http://localhost:%PUERTO%/index.html

echo ============================================
echo  Servidor activo en  http://localhost:%PUERTO%/index.html
echo.
echo  - No cierres la ventana del servidor
echo  - Para detener: cierra esa ventana o pulsa Ctrl+C ahi
echo ============================================
echo.
pause
