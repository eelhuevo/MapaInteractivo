@echo off
title UniMap - Detener
echo Deteniendo backend (8000) y frontend (8080)...
for %%X in (8000 8080) do (
    for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%%X .*LISTENING"') do (
        for /f "delims=" %%N in ('powershell -NoProfile -Command "(Get-Process -Id %%P -ErrorAction SilentlyContinue).ProcessName"') do (
            if /i "%%N"=="php" taskkill /f /pid %%P >nul 2>&1
            if /i "%%N"=="python" taskkill /f /pid %%P >nul 2>&1
        )
    )
)
echo Listo.
timeout /t 2 >nul
