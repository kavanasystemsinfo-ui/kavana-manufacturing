# Skill: Kavana V3 - Documentación, Auditoría y Portfolio Comercial

## Propósito

Usar esta skill cuando el usuario escriba el comando especial `$d`.

El comando `$d` activa la función de **documentar y auditar continuamente** el proyecto Kavana V3. No debe interpretarse como una petición genérica de documentación, sino como una orden de actualización controlada del registro técnico, arquitectónico, comercial y de auditoría del proyecto.

## Cuándo activarla

Activar automáticamente cuando el mensaje del usuario contenga exactamente `$d` o inicie con `$d`.

Ejemplos válidos:

- `$d`
- `$d actualiza la documentación técnica`
- `$d documenta el estado actual del proyecto`
- `$d genera resumen comercial`
- `$d audita arquitectura y crea informe`

## Comportamiento obligatorio al recibir `$d`

Al recibir `$d`, ejecutar el siguiente flujo:

1. **Leer contexto arquitectónico**
   - Consultar siempre las reglas globales en [`.clinerules`](.clinerules:1).
   - Consultar el roadmap maestro en [`ROADMAP.md`](ROADMAP.md:1).
   - Consultar la documentación maestra existente bajo [`root/`](root/01_MASTER_INFRA_PostgreSQL_MultiTenancy_y_RLS.md:1).
   - Consultar las skills relevantes según el área afectada.
   - Revisar los archivos técnicos modificados recientemente o afectados por la última iteración.

2. **Auditar el estado actual**
   - Revisar estructura de carpetas.
   - Identificar archivos nuevos, eliminados o modificados si el usuario aporta contexto o si el entorno lo permite.
   - Detectar inconsistencias entre código, SQL, documentación y reglas Kavana V3.
   - Verificar cumplimiento de:
     - `tenant_id` obligatorio.
     - RLS activado y forzado.
     - Claves primarias compuestas `(tenant_id, id)`.
     - Claves foráneas compuestas.
     - Índices únicos locales por tenant.
     - Backend seguro con JWT RS256/JWKS.
     - `AsyncLocalStorage.run()` y prohibición de `enterWith()`.
     - `SET LOCAL` dentro de transacción, prohibido `SET SESSION` con PgBouncer Transaction Pooling.
     - Feature flags JSONB.
     - HMI táctil 64px.
     - Offline-First con IndexedDB/Dexie.js.
     - API calls con `AbortController` y timeout de 4s.
     - **Dual Theme:** Variante moderna + clásica para cada panel.
     - **Documentation Loop:** Verificar que cada cambio de código tenga documentación asociada.

3. **Documentation Loop (OBLIGATORIO)**
   - **Regla:** Un cambio sin documentación es un cambio incompleto.
   - Después de cada cambio de código que pase tests, verificar/actualizar documentación en este orden:
     1. `docs/roadmap.md` — Estado de fase y conteo de tests.
     2. `docs/decisions-log.md` — Si hubo decisión técnica.
     3. `docs/technical/XX_<doc-afectado>.md` — Documento técnico afectado.
     4. `docs/audit/changelog.md` — Si es funcionalidad nueva.
     5. `docs/commercial/*.md` — Si afecta valor de negocio.
     6. `CONTRIBUTING.md` — Si se introdujeron nuevas convenciones.
   - **Checklist:**
     - [ ] ¿Qué se cambió?
     - [ ] ¿Por qué se cambió?
     - [ ] ¿Qué tests se agregaron/modificaron?
     - [ ] ¿Cómo se valida el cambio?
     - [ ] ¿Qué riesgos pendientes quedan?

4. **Actualizar documentación técnica**
   - Mantener documentación con nivel de consultora IT senior.
   - Registrar decisiones, arquitectura, riesgos, dependencias, roadmap, estándares y evidencias.
   - Usar lenguaje técnico, preciso y trazable.
   - Cada documento debe incluir:
     - Objetivo.
     - Alcance.
     - Supuestos.
     - Decisiones tomadas.
     - Impacto en arquitectura.
     - Riesgos.
     - Estado.
     - Última actualización.

4. **Actualizar documentación comercial / portfolio**
   - Mantener documentación orientada a usuario, cliente y venta.
   - Explicar el proyecto como portfolio profesional de alto nivel.
   - Traducir decisiones técnicas complejas a beneficios de negocio.
   - Resaltar:
     - SaaS multi-tenant.
     - Seguridad y aislamiento de datos.
     - Modularidad.
     - UX industrial.
     - Offline-first.
     - Escalabilidad.
     - Capacidad de adaptación cross-sector.
   - Evitar tecnicismos innecesarios, salvo que aporten valor comercial.

5. **Registrar trazabilidad**
   - Actualizar un registro de cambios.
   - Registrar decisiones arquitectónicas.
   - Registrar riesgos y mitigaciones.
   - Registrar deuda técnica.
   - Registrar próximos pasos.

6. **No modificar código salvo petición explícita**
   - `$d` documenta y audita.
   - No crear código de aplicación por defecto.
   - Sí puede crear o actualizar archivos `.md`, `.json` y documentación auxiliar.
   - Si detecta que falta un archivo técnico crítico, debe documentarlo como deuda o brecha, no inventar implementación.

## Estructura de documentación recomendada

Crear y mantener la siguiente estructura:

```text
docs/
  technical/
    00_architecture-overview.md
    01_multi-tenancy-rls-audit.md
    02_backend-auth-context.md
    03_feature-flags-modularity.md
    04_core-mes-production.md
    05_frontend-hmi-offline-first.md
    06_admin-governance-custom-fields.md
    07_security-qa-audit.md
    08_architecture-decisions.md
    09_technical-debt.md
    10_project-roadmap.md
  commercial/
    00_executive-summary.md
    01_product-positioning.md
    02_portfolio-case-study.md
    03_sales-one-pager.md
    04_feature-benefits-matrix.md
    05_architecture-for-business.md
  audit/
    0000-01-01_initial-audit.md
    changelog.md
```

## Reglas de estilo técnico

- Escribir en español.
- Usar tono profesional de arquitectura de software.
- Referenciar archivos con enlaces relativos cuando sea posible.
- No afirmar que una funcionalidad existe si solo está documentada.
- Diferenciar claramente entre:
  - **Implementado**
  - **Diseñado**
  - **Pendiente**
  - **Riesgo**
  - **Deuda técnica**
- No ocultar brechas.
- No inventar código, endpoints, tablas o flujos no existentes.

## Reglas de estilo comercial

- Escribir en español.
- Usar tono orientado a negocio, cliente y portfolio profesional.
- Explicar Kavana V3 como una solución MES SaaS moderna.
- Destacar beneficios medibles:
  - Reducción de fricción operativa.
  - Aislamiento de datos entre clientes.
  - Resiliencia ante caídas de red.
  - Escalabilidad modular.
  - UX industrial táctil.
  - Capacidad cross-sector.
- No hacer promesas comerciales que no estén soportadas por implementación o diseño documentado.
## Checklist de auditoría `$d`

- [ ] Se leyeron las reglas globales.
- [ ] Se leyó el roadmap maestro [`ROADMAP.md`](ROADMAP.md:1).
- [ ] Se identificó la fase activa del roadmap.
- [ ] Se revisaron documentos maestros relevantes.
- [ ] Se revisó el estado del repositorio.
- [ ] Se detectaron brechas entre diseño e implementación.
- [ ] Se actualizó documentación técnica.
- [ ] Se actualizó documentación comercial.
- [ ] Se actualizó changelog.
- [ ] Se registraron riesgos.
- [ ] Se registraron próximos pasos.
- [ ] Se evitó modificar código de aplicación sin petición explícita.

## Resultado esperado

Cada ejecución de `$d` debe dejar el proyecto con una documentación más completa, trazable y alineada con los estándares de una gran consultora IT, manteniendo además un portfolio comercial profesional que pueda utilizarse para presentar Kavana V3 a clientes o inversores. Además, debe revisar el roadmap maestro para confirmar que el trabajo avanza en el orden correcto.

