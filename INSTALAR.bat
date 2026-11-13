@echo off
title UniMap - Instalacion del entorno (solo 1a vez)
cd /d "%~dp0"

echo ==================================================
echo    UniMap - Instalacion del entorno
echo    (solo se ejecuta la primera vez en cada PC)
echo ==================================================
echo.

:: Ejecuta el instalador con PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALAR.ps1" %*

echo.
pause
