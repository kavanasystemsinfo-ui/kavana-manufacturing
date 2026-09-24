import { Controller, Get, Header } from '@nestjs/common';
import { buildOpenApiDocument, type OpenApiDocument } from './build-openapi-document.js';

/**
 * Sirve la spec OpenAPI generada desde código (tarea 3.4).
 *
 * GET /docs      → página HTML mínima con el listado de rutas.
 * GET /docs.json → el documento OpenAPI 3 puro, para herramientas.
 *
 * Rutas elegidas para encajar con los rewrites de Vercel: el frontend sirve
 * /api/(.*) → backend $1, así que la URL pública es
 * https://www.manufacturing.kavanasystems.com/api/docs y la spec pura
 * /api/docs.json. En Render directo son /docs y /docs.json.
 *
 * Sin Swagger UI: el paquete pesa ~15 MB, la ruta es pública y la spec la
 * consumen herramientas, no personas; una página propia de ~3 KB basta y el
 * job de tamaño de imagen del CI se mantiene en verde.
 *
 * Solo lectura, sin datos de tenant: publica por diseño (PUBLIC_ROUTES).
 */
@Controller()
export class ApiDocsController {
  @Get('docs.json')
  @Header('Cache-Control', 'public, max-age=300')
  serveJson(): OpenApiDocument {
    return buildOpenApiDocument();
  }

  @Get('docs')
  @Header('Content-Type', 'text/html; charset=utf-8')
  serveHtml(): string {
    const doc = buildOpenApiDocument();
    const rutas = Object.entries(doc.paths)
      .flatMap(([path, item]) =>
        Object.entries(item).map(
          ([verb, op]) =>
            `<tr><td><code>${verb.toUpperCase()}</code></td><td><code>${path}</code></td><td>${(op as { summary: string }).summary}</td></tr>`,
        ),
      )
      .join('\n');
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Kavana Manufacturing API — spec</title>
<style>
body{font-family:system-ui,sans-serif;margin:2rem;background:#f7f7fb;color:#1a1a2e}
h1{font-size:1.4rem} code{background:#eef;padding:.1rem .3rem;border-radius:.3rem}
table{border-collapse:collapse;width:100%;background:#fff;font-size:.85rem}
td,th{border:1px solid #ddd;padding:.35rem .5rem;text-align:left}
th{background:#e9e9f4} details{margin:1rem 0} pre{background:#fff;padding:1rem;overflow:auto}
a{color:#6d28d9}
</style>
</head>
<body>
<h1>Kavana Manufacturing — spec OpenAPI</h1>
<p>Documento completo en <a href="/docs.json"><code>/docs.json</code></a>
(OpenAPI 3.0.3, generado desde los metadatos de Nest y los DTOs zod del backend).</p>
<table><thead><tr><th>Verbo</th><th>Ruta</th><th>Resumen</th></tr></thead>
<tbody>
${rutas}
</tbody></table>
<details><summary>JSON completo</summary><pre>${JSON.stringify(doc, null, 1)}</pre></details>
</body>
</html>`;
  }
}
