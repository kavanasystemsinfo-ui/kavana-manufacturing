# Backend KAVANA MANUFACTURING

Backend modular para KAVANA Systems V3.

## Estado actual

- Express API inicial.
- Logger estructurado con Pino.
- Manejador de errores operacional.
- Conexión MongoDB preparada.
- Rutas base por dominio:
  - `health`
  - `auth`
  - `tenants`
  - `catalog`
  - `orders`
  - `inventory`
  - `production`
  - `quality`
  - `maintenance`
  - `analytics`
  - `intelligence`

## Arranque

```bash
cp .env.example .env
npm install
npm run dev
```

## Siguiente paso

Implementar modelos y servicios reales de:

1. Tenant
2. Usuario
3. Modelo de fabricación
4. Material
5. StockItem
6. Order
7. ProductionLog
8. MaterialConsumo
