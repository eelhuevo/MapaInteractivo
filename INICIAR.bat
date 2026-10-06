@echo off
title UniMap - Campus Universitario
cd /d "%~dp0"

set PUERTO=8080

echo ============================================
echo    UniMap - Campus Universitario
echo ============================================
echo.

where python >nul 2>nul
if %errorlevel%==0 goto :con_python

where py >nul 2>nul
if %errorlevel%==0 goto :con_py

echo No se encontro Python en este equipo.
echo.
echo Opciones:
echo   1. Instala Python 3 desde https://www.python.org
echo   2. Abre index.html directamente. El mapa 2D, los filtros,
echo      la busqueda, los horarios y los favoritos funcionan,
echo      pero la vista 3D no podra descargar los modelos.
echo.
pause
goto :fin

:con_python
start "UniMap - servidor (no cerrar)" /min cmd /c "python -m http.server %PUERTO%"
goto :abrir

:con_py
start "UniMap - servidor (no cerrar)" /min cmd /c "py -m http.server %PUERTO%"
goto :abrir

:abrir
timeout /t 2 /nobreak >nul
start "" http://localhost:%PUERTO%
echo Servidor iniciado en  http://localhost:%PUERTO%
echo.
echo Se ha abierto el navegador. Si no, copia la direccion en tu barra.
echo Para detener el servidor, cierra la ventana "UniMap - servidor".
echo.
pause

:fin
