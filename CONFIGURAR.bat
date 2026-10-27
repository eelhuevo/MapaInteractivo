@echo off
title UniMap - Configuracion
cd /d "%~dp0"

echo ==================================================
echo    UniMap - Configuracion automatica
echo ==================================================
echo.

:: Ejecuta el script de configuracion con PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CONFIGURAR.ps1" %*

echo.
pause
