# ADR-011: Spec OpenAPI generada desde código, sin @nestjs/swagger

**Estado**: Aceptada (2026-09-24)
**Contexto**: Tarea 3.4 del plan de auditoría (contract tests OpenAPI).
**Revisar si**: se añade class-validator al stack, se quiere Swagger UI, o el
frontend genera su cliente desde la spec.

## Contexto

El plan pedía "contract tests OpenAPI (spec desde código + validación)". El
backend valida todos los bodies con **zod** dentro de cada método del
controller (`CreateOrderDtoSchema.parse(body)`…): no hay un solo DTO de
class-validator en el repo. La vía estándar (`@nestjs/swagger` +
DocumentBuilder) lee los DTOs de class-validator vía `emitDecoratorMetadata`,
así que aquí generaría schemas vacíos para TODOS los endpoints: una spec
mentirosa que además pesaría en la imagen Docker (el job `docker-size` del CI
vigila 600 MB y Swagger UI solo son ~15 MB de assets servidos en una ruta
pública).

## Decisión

1. **La spec se genera desde los metadatos de ruta de Nest** (`PATH_METADATA`,
   `METHOD_METADATA`) recorriendo los 16 controllers, y los request bodies se
   publican desde el **zod real que cada endpoint valida** (`BODY_SCHEMAS` en
   `backend/src/openapi/body-schemas.ts`), convertido con `zod-to-json-schema`
   (0 dependencias). Endpoint y documentación no pueden divergir en silencio:
   el contract test compara el schema publicado contra el zod y exige
   equivalencia exacta.
2. **Contract test** (`openapi-contract.spec.ts`, 95 tests): cubre los 89
   endpoints de los 16 controllers contra la spec (`it.each` sobre la
   enumeración por metadatos), unicidad de operationId, bodies zod
   equivalentes, y que las rutas públicas del guard constan sin `security`.
3. **Servida** en `/docs` (HTML de cortesía) y `/docs.json` (documento
   OpenAPI 3.0.3 puro) — con los rewrites de Vercel la URL pública es
   `https://www.manufacturing.kavanasystems.com/api/docs`. Ruta pública por
   diseño (`PUBLIC_ROUTES` del guard): es de solo lectura y no expone datos
   de tenant.
4. `npm run test:contract` en backend y raíz.

## Consecuencias

- Un controller nuevo rompe el CI hasta que se documenta: ese es el objetivo
  (mismo patrón que `roles-contract.spec.ts`).
- Los handlers que validan propiedades sueltas del body (amount, pieces,
  enabled, types, quality/costs) y materials declaran su contrato **literal**
  en `LITERAL_BODIES`: sin zod de objeto completo no hay fuente automática.
- **Deuda conocida**: `materials` no valida nada (`POST /materials` y
  `PATCH /materials/:id` llegan con `data: any` al servicio). Su contrato en
  la spec es el observado del frontend. El zod de materials y su migración a
  `BODY_SCHEMAS` queda como tarea pendiente del roadmap.
- `METHOD_METADATA` de Nest es **numérico** (0=GET…4=PATCH), no un string:
  falló en silencio produciendo una spec vacía (63 rutas perdidas). Detectado
  por el propio contract test al fallar el umbral "más de 60 rutas".

## Alternativas descartadas

- `@nestjs/swagger`: schemas vacíos con DTOs zod (razón principal) y peso en
  imagen para una UI que nadie consume internamente.
- Spec escrita a mano (openapi.yaml): caduca en cuanto cambia un controller;
  exactamente lo que el contract test existe para evitar.
- `z.toJSONSchema()` nativo de zod: disponible desde zod v4; el repo va en
  zod 3.25.76. Migrar zod para esto sería un camión para cargar un bocadillo.
