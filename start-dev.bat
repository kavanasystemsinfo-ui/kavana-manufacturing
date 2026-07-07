@echo off
title Kavana V3 - Full System
echo ===========================================
echo    🚀 LANZANDO ECOSISTEMA KAVANA V3
echo ===========================================
echo.

:: Limpiar procesos previos
echo [1/4] Limpiando procesos antiguos...
taskkill /F /IM node.exe /T >nul 2>&1

:: Lanzar Backend
echo [2/4] Iniciando Backend (Puerto 3001)...
:: Cambiamos /c por /k para que la ventana NO se cierre si el proceso se detiene o se reinicia
start "Kavana_V3_Backend" cmd /k "cd /d %~dp0backend && npm run dev"

:: Lanzar Frontend
echo [3/4] Iniciando Frontend (Puerto 5173)...
start "Kavana_V3_Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

:: Esperar a que los servidores estén listos y abrir navegador
echo [4/4] Abriendo Navegador en http://localhost:5173...
timeout /t 6 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================================
echo   ✅ SISTEMA ACTIVO - LAS VENTANAS SE MANTENDRÁN ABIERTAS
echo   (Aunque el backend se reinicie, el historial se queda)
echo ========================================================
timeout /t 5
exit