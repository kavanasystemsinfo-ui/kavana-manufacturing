# Dossier de demo — KAVANA Manufacturing

Qué es este proyecto, qué demuestra y cómo comprobarlo uno mismo sin fiarse de
la palabra de nadie. Pensado para enseñarlo (entrevista, cliente, LinkedIn) y
para que cualquiera pueda verificarlo en el navegador en dos minutos.

## 1. Qué es

Un **MES** (Manufacturing Execution System) multi-tenant para una fábrica de
placas solares: órdenes de fabricación, partes de trabajo, paradas, puestos,
operarios, incidencias, trazabilidad y OEE. Nace de años de trabajo real en
fábrica: reproduce el flujo que hoy se hace con papel, Excel y un ERP que nadie
sabe usar, pero con una interfaz que un operario de planta entiende sin manual.

- **Demo navegable**: `https://www.manufacturing.kavanasystems.com/demo`
- **API en vivo**: `https://www.manufacturing.kavanasystems.com/api/v1/health`
- **Stack**: NestJS + PostgreSQL (Neon) + Redis en el backend; React + Vite +
  Tailwind en el frontend; Docker en local; Render y Vercel en producción.

## 2. Qué demuestra

### Producto
- **Tres roles de verdad**: operario (parte su trabajo), supervisor (tablero de
  órdenes, incidencias, OEE) y administrador de planta (catálogos, usuarios,
  puestos). No son pantallas decorativas: cada rol tiene su flujo cerrado.
- **Tablero kanban usable**: arrastrar una tarjeta cambia el estado de la orden
  y persiste en base de datos.
- **OEE por puesto** calculado desde los partes reales (disponibilidad,
  rendimiento, calidad), no de una fórmula pintada en el frontend.
- **Multi-tenant con aislamiento efectivo**: dos plantas no se ven entre sí ni
  por API ni por base de datos (políticas RLS y rol de aplicación sin permisos
  directos sobre las tablas).
- **Wizard de alta de cliente**: crear planta, módulos y su administrador en
  tres pasos, y ese administrador entra de verdad a su planta.

### Negocio
- **El problema está elegido desde dentro**: los 9 minutos que tarda un operario
  en rellenar un parte en papel son el producto. Cada pantalla ataca una pérdida
  concreta (tiempo perdido, órdenes sin trazar, paradas sin motivo).
- **Se puede vender por planta**: el coste por planta es marginal (una fila en
  `tenants` y un subdominio), no una instalación por cliente.
- **Demo pública con datos vivos**: la fábrica demo se regenera cada madrugada a
  las 06:00 UTC (partes y órdenes del día), cierra las órdenes que quedaron
  abiertas de días anteriores y caduca a las 24 horas lo que crea un visitante.
  La demo nunca enseña una pantalla vacía ni un histórico muerto.

### Ingeniería
- **Pruebas como condición, no como adorno**: 582 pruebas de backend, 207 de
  frontend y 13 de navegador (E2E) end-to-end contra la aplicación real.
- **CI con 6 trabajos** en GitHub Actions (lint, typecheck, test, e2e,
  tamaño de imágenes Docker, build).
- **Despliegue automático**: push a `main` → Render (API) y Vercel (web), con
  verificación de salud después.
- **La demo se defiende sola**: en el tenant público el borrado está bloqueado
  (403) y solo se permite cambiar el estado de órdenes e incidencias, así que un
  visitante no puede dejar la demo sin datos. Verificado con un script
  (`scripts/verificar_blindaje_demo.py`, 10 comprobaciones).

## 3. Guion de demo (5 minutos)

1. **El problema (30 s).** Un parte en papel tarda 9 minutos, no se sabe qué
   puesto paró ni por qué, y el OEE se estima a ojo.
2. **El operario (1,5 min).** Entrar como operario: sus órdenes del día, botón
   de inicio y fin, motivo de parada en un toque, cantidad producida. Móvil
   primero: es donde está el operario, con guantes y prisa.
3. **El supervisor (1,5 min).** Tablero de órdenes: arrastrar una tarjeta de
   Pendiente a En Progreso, recargar la página y ver que se ha quedado. Añadir
   una incidencia y ver que aparece en la lista.
4. **El OEE (1 min).** Abrir OEE del día y enseñar de dónde sale cada número
   (partes reales del turno, no una estimación).
5. **Plataforma (30 s).** El wizard de alta: crear planta, módulos y admin en
   tres pasos. Cerrar con que la demo se limpia sola cada madrugada y que el
   visitante no puede romperla.

## 4. Cómo verificarlo sin fiarse

```bash
# La API está viva
curl -s -o /dev/null -w '%{http_code}\n' https://www.manufacturing.kavanasystems.com/api/v1/health

# Logotipo y app cargan
curl -s -o /dev/null -w '%{http_code}\n' https://www.manufacturing.kavanasystems.com/

# La demo pública responde
curl -s -o /dev/null -w '%{http_code}\n' https://www.manufacturing.kavanasystems.com/demo
```

El flujo completo se reproduce en local con un comando (Docker) y la suite de
navegador prueba el arrastre de tarjetas contra la aplicación real, no contra
mocks. Las credenciales de la demo se facilitan a quien la va a probar.

## 5. Evidencias medidas (29/09/2026)

- Órdenes en la planta demo: **1.227** (510 en los últimos 90 días).
- Partes de trabajo: **1.259** repartidos en **92 días** de histórico.
- Planta: **15 puestos**, **10 operarios**, 1 supervisor, 1 administrador.
- Incidencias registradas: **21**.
- Pruebas: **582** backend, **207** frontend, **13** E2E (esta última pasada en
  2 minutos, sin reintentos).
- Verificación del blindaje de la demo: **10/10** en verde.
- Demo del día regenerada: **12 órdenes** y **54 partes** del día en curso.

## 6. Límites, dichos a la cara

- **No es producción real**: no hay clientes de pago ni datos de una fábrica
  real. Los datos de la planta demo son simulados, con forma realista (turnos,
  paradas, mermas) pero generados.
- **Un cliente de verdad requeriría**: alta de usuarios por invitación, copias
  de seguridad y plan de recuperación, auditoría de accesos, integración con su
  ERP y soporte. Nada de eso está fingido aquí.
- **Hay un fallo abierto y documentado**: un 401 puntual en el login del
  administrador recién creado por el wizard, no reproducido en 25 intentos, con
  las hipótesis descartadas por escrito en el roadmap del proyecto.
- **Lo que sí es real**: el código, las pruebas, el aislamiento entre plantas, el
  despliegue automático y que la demo pública aguanta lo que le haga un
  visitante.
