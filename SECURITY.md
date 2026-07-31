# Seguridad — Kavana Manufacturing

## Gestión de Secretos

No hay contraseñas, tokens ni claves en el repositorio. Todas las credenciales se configuran mediante variables de entorno.

```
backend/.env.example     ← Template de variables necesarias
```

## Autenticación y Autorización

- **JWT** con firma HMAC (configurable via `JWT_SECRET`)
- **Roles:** `global_admin` → `tenant_admin` → `supervisor` → `operator`
- **Contexto de tenant** inyectado en cada request via `AsyncLocalStorage`
- **Guards de NestJS** verifican rol + tenant antes de cada operación

## Aislamiento Multi-Tenant

- **Row Level Security (RLS)** en PostgreSQL — cada tenant solo ve sus filas
- El enforcement se hace en la base de datos, no solo en código de aplicación
- Las policies RLS se aplican a todas las tablas del schema `public`

## Offline-First

- Los datos locales (IndexedDB) están aislados por tenant
- La sincronización se hace sobre HTTPS con token JWT
- No se almacenan credenciales en localStorage (solo el token JWT)

## API

- CORS configurado por entorno
- Rate limiting por IP (configurable)
- Todas las rutas protegidas requieren autenticación excepto login

## Dependencias

- Dependencias auditadas regularmente (`npm audit`)
- Sin dependencias de runtime innecesarias
- TypeScript estricto: tipos seguros en toda la codebase

---

**Para reportar una vulnerabilidad:** abre un issue en GitHub con el tag `security`.
