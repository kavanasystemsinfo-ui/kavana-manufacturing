# tools-ai / NotebookLM Bridge V3

`tools-ai/` es una herramienta interna para orquestar Roo Code con Google NotebookLM mediante CDP y Playwright. No forma parte del backend, frontend ni database de Kavana Manufacturing.

## Archivos

- [`notebooklm/run_browser.bat`](notebooklm/run_browser.bat:1): lanza Chrome en modo depuración en `localhost:9222` con perfil aislado.
- [`notebooklm/notebook_bridge.py`](notebooklm/notebook_bridge.py:1): puente de automatización V3 con Playwright.
- [`notebooklm/requirements.txt`](notebooklm/requirements.txt:1): dependencia Python principal.
- [`notebooklm/chrome_profile/`](notebooklm/chrome_profile:1): perfil de Chrome creado en la primera ejecución.

## Instalación

```bat
cd tools-ai\notebooklm
py -3 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

## Flujo V3

El flujo V3 reutiliza un cuaderno permanente de NotebookLM. No crea cuadernos ni sube archivos locales en cada ciclo.

1. Roo Code detecta una duda técnica o necesidad de investigación externa.
2. Ejecuta `notebook_bridge.py` con `--notebook-url` y `--add-source-url`.
3. El script añade la fuente externa como temporal.
4. Usa Fast Research por defecto para cuidar la cuota diaria; Deep Research solo se activa con `--research-mode deep`.
5. Envía un prompt al chat o acciona artefactos.
6. Extrae Markdown a `docs/ai/outputs/` por defecto.
6. Escribe un manifiesto de sesión en la misma carpeta de salida.
7. Roo Code se detiene y presenta el plan.
8. Solo si el desarrollador escribe explícitamente `procede`, se permite modificar código.
9. Tras implementar y validar localmente, se ejecuta `--clean-temp-sources`.

## Primera prueba manual

1. Ejecuta:

   ```bat
   cd tools-ai\notebooklm
   run_browser.bat
   ```

2. En la ventana nueva de Chrome, inicia sesión manualmente con la cuenta de Google que usará NotebookLM.
3. Abre NotebookLM y confirma que el cuaderno permanente de Kavana Manufacturing está disponible.
4. El script ya tiene configurado por defecto este cuaderno: `https://notebooklm.google.com/notebook/a8ef67a8-896b-463e-a522-eaae826b3b79`.

## Parámetros útiles

```bat
.venv\Scripts\python notebook_bridge.py --help
```

Opciones principales:

- `--cdp-endpoint`: por defecto `http://localhost:9222`.
- `--notebook-url`: por defecto `https://notebooklm.google.com/notebook/a8ef67a8-896b-463e-a522-eaae826b3b79`.
- `--notebook-title`: fallback para buscar el cuaderno si no se pasa URL.
- `--add-source-url URL`: añade una fuente externa temporal. Puede repetirse.
- `--source-mode`: `website` por defecto, o `pasted`.
- `--research-mode`: `fast` por defecto para ahorrar cuota; `deep` solo para investigación extensa.
- `--chat-prompt`: prompt para enviar al chat de NotebookLM.
- `--artifact`: `chat`, `flashcards`, `quiz`, `audio` o `all`. Puede repetirse.
- `--audio-prompt`: instrucción para personalizar la guía de audio.
- `--output-dir`: carpeta de salida; por defecto `docs/ai/outputs/`. Usa `KAVANA_NOTEBOOKLM_OUTPUT_DIR` para redirigir a caché local.
- `--session-file`: manifiesto JSON de sesión; por defecto va junto al Markdown.
- `--clean-temp-sources`: limpia fuentes temporales registradas.
- `--cleanup-urls URL`: limpia una URL concreta. Puede repetirse.

## Ejemplo 1: investigación externa con Human-in-the-Loop

```bat
.venv\Scripts\python notebook_bridge.py ^
  --notebook-url "https://notebooklm.google.com/notebook/a8ef67a8-896b-463e-a522-eaae826b3b79" ^
  --add-source-url "https://cloud.google.com/architecture/pgbouncer" ^
  --source-mode website ^
  --research-mode fast ^
  --artifact chat ^
  --chat-prompt "Resume riesgos y decisiones de arquitectura para usar PgBouncer en Kavana Manufacturing con multi-tenancy, RLS y tenant_id."
```

Revisa el Markdown generado en la carpeta que el script imprima al finalizar. Por defecto:

```text
docs/ai/outputs/
```

El manifiesto queda en la misma carpeta como `notebooklm_session_latest.json`.

## Política de investigación

Fast Research es el modo por defecto de `notebook_bridge.py` porque protege la cuota diaria de Deep Research. Para dudas técnicas concretas, Fast Research suele ser suficiente si el prompt incluye nombres de librerías, métodos exactos, errores de consola y decisiones de arquitectura.

Usa `--research-mode deep` solo cuando el problema sea abierto, abstracto o requiera explorar varias fuentes antes de sintetizar.

## Ejemplo 2: guía de audio sobre arquitectura Kavana

```bat
.venv\Scripts\python notebook_bridge.py ^
  --notebook-url "https://notebooklm.google.com/notebook/a8ef67a8-896b-463e-a522-eaae826b3b79" ^
  --artifact audio ^
  --audio-prompt "Genera una guia de audio enfocada en multi-tenancy, RLS con tenant_id, PgBouncer, HMI offline-first y seguridad industrial de Kavana Manufacturing."
```

## Ejemplo 3: limpieza de fuentes temporales

Después de implementar y validar localmente el plan aprobado:

```bat
.venv\Scripts\python notebook_bridge.py ^
  --notebook-url "https://notebooklm.google.com/notebook/a8ef67a8-896b-463e-a522-eaae826b3b79" ^
  --clean-temp-sources
```

O limpiar URLs concretas:

```bat
.venv\Scripts\python notebook_bridge.py ^
  --notebook-url "https://notebooklm.google.com/notebook/a8ef67a8-896b-463e-a522-eaae826b3b79" ^
  --cleanup-urls "https://cloud.google.com/architecture/pgbouncer"
```

## Política de outputs

Por defecto, los Markdown automáticos se guardan en `docs/ai/outputs/` para revisión humana.
Puedes sobrescribirlo con `KAVANA_NOTEBOOKLM_OUTPUT_DIR` o con `--output-dir`.

```bat
.venv\Scripts\python notebook_bridge.py --output-dir "../../tools-ai/notebooklm/outputs"
```

Si usas la carpeta local `tools-ai/notebooklm/outputs/`, evitas que Google Drive sincronice outputs automáticos y los reingiera como fuentes nuevas.
Si usas `docs/ai/outputs/`, revisa y aprueba manualmente antes de convertir el contenido en documentación oficial.

El script añade una instrucción de modo de investigación al prompt del chat, pero no fuerza automáticamente la interfaz de NotebookLM si Google cambia el selector del botón de investigación. La trazabilidad queda registrada en el manifiesto y en el Markdown como `research_mode`.

## Controles de seguridad

- CDP solo escucha en `127.0.0.1:9222`.
- El perfil de Chrome está aislado del Chrome diario.
- El script usa selectores semánticos, no clases CSS internas.
- Las fuentes temporales se registran en el manifiesto de sesión.
- La limpieza solo elimina URLs registradas como temporales; las fuentes oficiales de Drive permanecen intactas.
- Las salidas se guardan localmente con marca de tiempo para revisión humana.
- La limpieza de fuentes temporales es tolerante a fallos: si Google cambia el DOM, el manifiesto queda como `manual_cleanup_required`.
- NotebookLM no se considera fuente de verdad hasta que un humano valide y mueva el contenido a documentación oficial.
- Roo Code debe esperar `procede` antes de modificar código fuente.
