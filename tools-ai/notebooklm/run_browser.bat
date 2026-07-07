@echo off
setlocal

set "PROFILE_DIR=%~dp0chrome_profile"
if not exist "%PROFILE_DIR%" mkdir "%PROFILE_DIR%"

set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_EXE%" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_EXE%" (
  echo ERROR: No se encontro Google Chrome en las rutas habituales.
  echo Instala Chrome o ajusta CHROME_EXE en este lanzador.
  exit /b 1
)

echo Lanzando Chrome aislado para Kavana NotebookLM...
echo Perfil: %PROFILE_DIR%
echo CDP: http://localhost:9222

start "Kavana NotebookLM CDP Chrome" "%CHROME_EXE%" ^
  --remote-debugging-address=127.0.0.1 ^
  --remote-debugging-port=9222 ^
  --user-data-dir="%PROFILE_DIR%" ^
  --no-first-run ^
  --no-default-browser-check ^
  --disable-background-networking ^
  --disable-sync

echo Listo. Inicia sesion manualmente en Google solo en esta ventana.
