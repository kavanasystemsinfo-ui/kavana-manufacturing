# docs/ai/outputs - salida por defecto de NotebookLM

Esta carpeta es la salida por defecto de `notebook_bridge.py` en el flujo V3.

## Riesgo

Si Google Drive sincroniza los Markdown generados por `notebook_bridge.py`, NotebookLM puede ingerirlos como nuevas fuentes en la siguiente iteración. Eso crea un bucle de realimentación: resúmenes antiguos se convierten en contexto nuevo, duplican información y saturan la ventana del modelo.

## Política

- Usar por defecto: `docs/ai/outputs/`.
- Revisar manualmente el Markdown antes de convertirlo en documentación oficial.
- No añadir outputs automáticos como fuentes permanentes del cuaderno.
- Para evitar el bucle de Drive, usa `KAVANA_NOTEBOOKLM_OUTPUT_DIR` o `--output-dir` apuntando a una carpeta local fuera de Drive, por ejemplo `tools-ai/notebooklm/outputs/`.
- Si necesitas analizar una salida concreta, añadir esa URL externa o archivo específico de forma temporal y limpiarlo con `--clean-temp-sources`.
