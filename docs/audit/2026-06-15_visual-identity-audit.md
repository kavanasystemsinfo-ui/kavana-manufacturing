# Kavana V3 - Auditoría 2026-06-15: Identidad visual corporativa

## Estado del documento

- **Última actualización:** 2026-07-04. Documentación actualizada con Fase 5.5.

## Alcance

Auditoría de la aplicación de la paleta corporativa Kavana al HMI offline-first y de la integración del logo corporativo.

## Decisión de diseño

Se ha adoptado una identidad visual industrial premium centrada en:

- Azul medianoche profundo para reducir fatiga visual en planta.
- Naranja Kavana como color principal de acción y acento.
- Grises industriales para paneles, bordes, inputs y etiquetas secundarias.
- Targets táctiles mínimos de 64px para cumplir el estándar HMI industrial.

## Archivos actualizados

| Archivo | Cambio |
|---|---|
| [`frontend/tailwind.config.js`](frontend/tailwind.config.js:1) | Paleta `kavana`, targets táctiles y sombra corporativa. |
| [`frontend/src/App.tsx`](frontend/src/App.tsx:1) | Integración de logo, colores corporativos y botones con tokens Kavana. |
| [`frontend/src/styles.css`](frontend/src/styles.css:1) | Fondo raíz alineado con `kavana.dark`. |
| [`frontend/src/vite-env.d.ts`](frontend/src/vite-env.d.ts:1) | Declaración TypeScript para importación de `logo.png`. |
| [`docs/technical/05_frontend-hmi-offline-first.md`](docs/technical/05_frontend-hmi-offline-first.md:1) | Documentación técnica de la paleta. |
| [`docs/commercial/02_portfolio-case-study.md`](docs/commercial/02_portfolio-case-study.md:1) | Evidencia comercial de identidad visual. |
| [`docs/commercial/03_sales-one-pager.md`](docs/commercial/03_sales-one-pager.md:1) | Diferencial comercial visual. |
| [`docs/commercial/05_architecture-for-business.md`](docs/commercial/05_architecture-for-business.md:1) | Explicación de valor de negocio de la identidad visual. |

## Riesgos

| Riesgo | Severidad | Decisión |
|---|---:|---|
| El logo en raíz queda fuera de `frontend/public` | Media | Aceptado temporalmente; si se prefiere convención Vite, mover a `frontend/public/logo.png` y ajustar import. |
| El naranja puede perder contraste sobre fondos oscuros | Media | Se usa sobre fondos oscuros con texto `kavana-dark` en botones y como acento/gradiente. |
| El rojo de stop no pertenece a la paleta corporativa | Baja | Se mantiene como señal universal de acción destructiva/finalización. |

## Recomendación

Mantener la paleta centralizada en Tailwind y no dispersar colores hexadecimales en componentes. Cualquier ajuste futuro debe hacerse en [`frontend/tailwind.config.js`](frontend/tailwind.config.js:1).
