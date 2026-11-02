# ADR-013: Dos diseños de panel con un solo cerebro; temas de pantalla aplazados

**Estado**: Aceptada (2026-11-02)
**Contexto**: Rediseño del panel de operario (cola de órdenes, registro rápido, paradas, cierre de turno).
**Revisar si**: un cliente real pide trabajar a pleno sol o con pantallas con reflejos, o si cada función nueva vuelve a copiarse en los dos diseños.

## Contexto

El panel de operario existe en dos diseños a propósito:

- **Clásico**: sobrio y claro, modernizado respecto a lo que se espera de un programa de producción.
- **Moderno**: oscuro, grande y táctil, pensado como sello de identidad (app de consumo, no software industrial de siempre).

El operario elige con el selector «Diseño: Clásico / Moderno». Hasta ahora cada función nueva se escribía dos veces, una por pantalla.

## Decisión

1. **La lógica es una sola.** Hooks (`useOperatorPanel`, `useOperatorActions`), almacén y utilidades puras (resúmenes, redondeo de horas, calculadoras, cierre de turno) se comparten. Los componentes nuevos reciben el diseño como parámetro (`variant`).
2. **Cada diseño solo decide cómo se ve.** Las dos pantallas completas componen los mismos bloques con su aspecto.
3. **La paridad se vigila en el CI.** `frontend/src/paridad-disenos.spec.ts` lee las dos pantallas y falla si una deja de incluir alguna función del panel o registra bloques por su cuenta.
4. **Los nombres son corrientes**, sin jerga de la casa: «Clásico» / «Moderno» (antes «Kavana»), «Por enviar», «Con error», «Eficiencia».

## Aplazado: separar diseño y tema de pantalla

Hoy el diseño y el brillo van unidos: Clásico es siempre claro y Moderno siempre oscuro. Separarlos en dos ejes independientes (diseño × tema claro / oscuro / alto contraste, con variables de color) obligaría a tocar los colores de unos cuarenta componentes.

**No se implementa en el MVP.** El caso que lo justificaría es real (pantallas viejas y pequeñas, reflejo del sol en nave), pero no hay todavía un cliente que lo pida, y los dos diseños actuales ya cubren claro y oscuro.

## Consecuencias

- Una función nueva se escribe una vez; el coste de mantener dos diseños baja a su capa visual.
- Un operario con sol de cara no puede combinar el estilo Moderno con un tema claro. Se asume por ahora.
- Si se retoma: variables de diseño por tema (`docs/design-tokens.md`), un selector «Pantalla: Clara / Oscura / Alto contraste» y empezar por el panel de operario.
