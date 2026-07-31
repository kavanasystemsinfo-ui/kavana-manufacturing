# E2E Tests — Kavana Manufacturing

Suite de tests end-to-end con **Playwright** que verifican la interfaz de usuario real en un navegador Chromium headless.

## Arquitectura

```
e2e/
├── config.mjs          # Configuración de Playwright
├── mocks/
│   └── api.ts          # Mocks de todas las APIs del backend
└── specs/
    └── all.spec.ts     # 12 tests: login, paneles, theme
```

**Sin backend real.** Todas las llamadas API se interceptan en el navegador y se responden con datos mock. No necesitas Docker, PostgreSQL, Redis ni el backend NestJS corriendo.

## Requisitos

- Node.js >= 20
- Navegador Chromium (se instala automáticamente con `npx playwright install chromium`)

## Cómo ejecutar

```bash
# Terminal 1: Frontend (Vite dev server)
cd frontend && npx vite --host 0.0.0.0

# Terminal 2: Tests E2E
npm run test:e2e
```

## Tests disponibles (12)

### Login (4 tests)
| Test | Verifica |
|------|----------|
| Formulario con logo y campos | Logo KAVANA, inputs empresa/usuario/contraseña, botón Acceder |
| Escribir en campos | fill() y toHaveValue() en todos los inputs |
| Botón deshabilitado | El botón Acceder está deshabilitado con campos vacíos |
| Botón habilitado | El botón se habilita al rellenar todos los campos |

### Paneles (6 tests)
| Test | Verifica |
|------|----------|
| Operario: selección de órdenes | Pantalla "Seleccionar Orden" con buscador |
| Operario: click orden y formulario | Al hacer clic en una orden, aparece "Registrar Bloque de Tiempo" |
| Operario: campos del formulario | Campos Producidos, Defectos, Hora Inicio |
| Supervisor: panel carga | Panel de supervisión con título y botón "+ Nueva Orden" |
| Admin: tabs principales | Tabs: Usuarios, Puestos, Modelos, Órdenes |
| Admin: datos usuarios mock | Tabla con admin, operario1, supervisor |

### Theme Toggle (2 tests)
| Test | Verifica |
|------|----------|
| Por defecto classic | localStorage sin key → store devuelve 'classic' |
| Toggle cambia a moderno | Clic en "Moderno" → localStorage cambia a 'modern' |

## Cómo añadir un test

1. Añade el mock del endpoint en `e2e/mocks/api.ts`
2. Añade el test en `e2e/specs/all.spec.ts`
3. Ejecuta: `npm run test:e2e`

Los mocks usan regex para matchear solo rutas de API (no fuentes Vite):
```typescript
// Match /api/orders/available pero NO /src/api/...
await page.route(/\/api\/orders\/available($|\?)/, handler);
```

## Bugs encontrados gracias a E2E

- **`client.ts` / `admin.ts`**: `Authorization: *** ${token}\`\`` tenía `***` literal en vez de `` `Bearer ${token}` ``, causando error de sintaxis al cargar cualquier panel. Corregido.
