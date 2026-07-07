# Kavana V3 - Arquitectura Explicada para Negocio

## Estado del documento

- **Estado:** Documento comercial técnico actualizado con dual theme, guías de usuario, y OEE como módulo opcional.
- **Última actualización:** 2026-07-04.

## Por qué importa la arquitectura

La arquitectura de Kavana V3 no es un detalle técnico menor. Es la base que permite vender el producto como SaaS seguro, escalable y fiable.

## Multi-tenant

Cada cliente tiene su propio espacio lógico de datos. Esto permite operar muchos clientes sobre una misma plataforma sin mezclar información.

**Beneficio:** seguridad, escalabilidad y menor coste operativo.

## RLS

La base de datos aplica reglas automáticas para que cada consulta solo pueda ver los datos del cliente correcto.

**Beneficio:** reducción del riesgo de fuga de información.

## Offline-first

El operario puede registrar eventos aunque la red falle. El sistema guarda localmente y sincroniza después.

**Beneficio:** continuidad operativa en planta.

## Feature flags

Cada cliente puede tener activados solo los módulos que contrata.

**Beneficio:** producto modular y monetizable por planes.

## Custom fields

Cada sector puede añadir campos específicos sin modificar la estructura central.

**Beneficio:** adaptación a distintos clientes sin desarrollos costosos.

## UX de visión de túnel

La interfaz de operario muestra solo lo necesario para la acción actual.

**Beneficio:** menos errores, menos formación y mayor velocidad de uso.

## Identidad visual industrial

La interfaz HMI usa una paleta corporativa premium: azul medianoche para reducir fatiga visual, naranja Kavana para acciones principales y grises industriales para superficies secundarias.

**Beneficio:** experiencia de planta más profesional, consistente y alineada con marca.

## Dual Theme (Diferencial único)

Kavana V3 ofrece **dos estilos visuales** que coexisten:

- **Clásico ERP (GTA San Andreas essence):** Tablas, fondos claros, tipografía limpia — para supervisores veteranos y clientes legacy.
- **Moderno Kavana (GTA 5 graphics):** Tarjetas, fondos oscuros, gradientes — para operarios jóvenes y clientes innovadores.

El usuario elige su estilo preferido con un toggle flotante. La preferencia se persiste en localStorage.

**Beneficio:** adopción más rápida, menor resistencia al cambio, diferenciación competitiva vs Odoo/MESBook.

## Evidencia actual

- HMI táctil mínimo implementado.
- Logo corporativo integrado.
- Paleta visual industrial premium: azul medianoche, naranja Kavana y grises de soporte.
- Botones industriales de 64px.
- IndexedDB/Dexie para persistencia local.
- Cola FIFO para sincronización.
- Dead-letter para conflictos.
- API timeout de 4 segundos.
- Backend con validación de tenant e idempotencia offline.
- Tests iniciales de transiciones y cola offline.
- **138 tests passing.**
- **Build exitoso con sistema de temas dual.**

## Conclusión

Kavana V3 combina arquitectura empresarial con experiencia de usuario simple — **y respeta la diversidad de usuarios industriales con un sistema de temas dual**. Esa combinación es el principal diferencial comercial del proyecto.
