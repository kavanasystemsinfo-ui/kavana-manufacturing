# Registro de señales de revisión — ADRs por proyecto

Registro transversal (opción "tabla única" aceptada por Jorge 2026-08-25) que
centraliza qué vigilar de cada decisión documentada, SIN tocar los ADRs
originales. Complementa la sección 4 del Engineering Standard: las decisiones
nuevas llevan su señal dentro del ADR; este registro es el índice vivo para
saber de un vistazo qué podría obligar a revisar cada decisión.

Reglas:
- Solo se registran señales REALES (las que ya están escritas en un ADR o se
  formalizan aquí desde el contexto del proyecto). No se inventa nada.
- Los ADRs antiguos NO se reescriben retroactivamente (regla 2026-08-25):
  este registro es el lugar donde su señal puede quedar anotada cuando la
  decisión revive o se formaliza.
- Cuando un ADR nuevo se crea, su señal se escribe en el ADR y se copia aquí.
- Tipo: **automatizable** = tiene fuente consultable (precio, benchmark,
  versión) y se puede alertar cuando el contexto deja de cumplirse.
  **ritual** = contexto de negocio o prioridades, requiere revisión periódica.

---

## KAVANA Steelworks

| ADR | Decisión | Qué vigilar | Dónde comprobarlo | Dispara la revisión | Tipo |
|---|---|---|---|---|---|
| ADR-002 | PostgreSQL sobre MongoDB | Necesidades de datos no relacionales a gran volumen (telemetría de planta, series temporales) y coste operativo de la BD | Requisitos de nuevas funcionalidades y métricas de coste/rendimiento en producción | Un caso recurrente fuerza el modelo relacional (EAV o JSONB masivo) o el coste deja de justificarse | Automatizable + ritual |

## KAVANA RouteAI

| ADR | Decisión | Qué vigilar | Dónde comprobarlo | Dispara la revisión | Tipo |
|---|---|---|---|---|---|
| ADR-004 | Costes centralizados por tipo de combustible | Precio del combustible y cambios en la flota (tipos o consumos) | Configuración "Costes" de la Torre de Control y mercado de combustible | Cambia el precio publicado o un vehículo se sale del coste genérico | Automatizable (precio consultable) |
| ADR-007 | Blindaje de la demo (histórico inmutable + datos de visitante 24h) | Acumulación de datos de visitante o contaminación del histórico demo | BD de la demo, logs del cron de limpieza | Los datos de visitante dejan de expirar o el histórico demo se altera | Ritual (política demo) |

## Kavana Warehouse

| ADR | Decisión | Qué vigilar | Dónde comprobarlo | Dispara la revisión | Tipo |
|---|---|---|---|---|---|
| (pendientes) | — | Pendiente de formalizar: aplicar la regla cuando una decisión revive | — | — | — |

## Kavana Manufacturing

| ADR | Decisión | Qué vigilar | Dónde comprobarlo | Dispara la revisión | Tipo |
|---|---|---|---|---|---|
| (pendientes) | — | Pendiente de formalizar: aplicar la regla cuando una decisión revive | — | — | — |

---

*Registro vivo. Se actualiza cuando un ADR nuevo lleva señal o una decisión
vieja vuelve a estar activa (con fecha y transparencia).*