# Frontend KAVANA MANUFACTURING

Frontend React + Vite + TailwindCSS para KAVANA Systems V3.

## Estado actual

- Login placeholder.
- Layout industrial por rol.
- Rutas iniciales para:
  - Operario
  - Supervisor
  - Gerencia
  - Administración
- Cliente Axios centralizado.
- Contextos de autenticación y UI.

## Arranque

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Siguiente paso

Integrar los componentes rescatados de V2:

1. `MaterialScanner`
2. `CoilCalculator`
3. `BlueprintViewer`
4. `SupervisorDashboard`
5. `AndonBoard`
6. `ManagementDashboard`
