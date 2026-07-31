# Deployment — Kavana Manufacturing

Guía para desplegar **Kavana Manufacturing** en producción.

## Stack

| Capa | Servicio |
|------|----------|
| Frontend (React SPA) | **Vercel** → `manufacturing.kavanasystems.com` |
| Backend (NestJS API) | **Render** → `kavana-api.onrender.com` |
| Base de datos | **Render PostgreSQL** o **Supabase** |
| Redis (colas BullMQ) | **Upstash** (gratis) |

---

## Fase 1 — Backend en Render

### 1.1 Crear servicio Web

1. Ir a [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Conectar repositorio GitHub (`kavanasystemsinfo-ui/kavana-systems-v3`)
3. Configurar:

| Campo | Valor |
|-------|-------|
| **Name** | `kavana-manufacturing-api` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npx tsc -p backend/tsconfig.build.json --skipLibCheck` |
| **Start Command** | `node backend/dist/main.js` |
| **Health Check Path** | `/health` |
| **Plan** | `Starter` (~7€/mes) o `Free` (duerme tras inactividad) |

### 1.2 Añadir PostgreSQL

Render Dashboard → **New** → **PostgreSQL**
| Campo | Valor |
|-------|-------|
| **Name** | `kavana-db` |
| **Plan** | `Free` (90 días, 1GB) |

Al crearse, copiar la **Internal Database URL** → pegarla como variable de entorno en el Web Service.

### 1.3 Añadir Redis (Upstash)

1. Ir a [Upstash Console](https://console.upstash.com) → **Create Database**
2. Región: `West Europe` (cerca de Render)
3. Plan: **Free** (256MB)
4. Copiar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`

### 1.4 Variables de entorno en Render

| Variable | Valor | Notas |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | Internal URL de Render PostgreSQL |
| `REDIS_HOST` | de Upstash | Host del Redis |
| `REDIS_PORT` | `6379` | Puerto estándar |
| `REDIS_PASSWORD` | de Upstash | Token de conexión |
| `JWT_SECRET` | *** aleatoria | `openssl rand -hex 32` |
| `ALLOW_MOCK_AUTH` | `true` | Para que funcione sin login real |
| `FRONTEND_ORIGIN` | `https://manufacturing.kavanasystems.com` | CORS |
| `METRICS_PORT` | `9464` | Opcional, observabilidad |
| `LLM_PROVIDER` | `openrouter` (o el que uses) | Solo si usas AI Advisor |

### 1.5 Probar backend

```bash
curl https://kavana-api.onrender.com/health
# → {"status":"ok"}
```

---

## Fase 2 — Frontend en Vercel

### 2.1 Configurar proyecto

1. Ir a [Vercel Dashboard](https://vercel.com) → **Add New** → **Project**
2. Importar repositorio GitHub
3. Configurar:

| Campo | Valor |
|-------|-------|
| **Framework Preset** | `Vite` |
| **Root Directory** | `frontend/` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `cd .. && npm install` |

### 2.2 Añadir dominio

1. Settings → **Domains** → `manufacturing.kavanasystems.com`
2. Añadir registro CNAME en tu DNS:
   - **Type:** `CNAME`
   - **Name:** `manufacturing`
   - **Value:** `cname.vercel-dns.com`

### 2.3 Actualizar vercel.json con la URL de Render

Editar `vercel.json` en la raíz del repo:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://kavana-api.onrender.com/$1" },
    { "source": "/production/(.*)", "destination": "https://kavana-api.onrender.com/production/$1" },
    { "source": "/tenant/(.*)", "destination": "https://kavana-api.onrender.com/tenant/$1" },
    { "source": "/oee/(.*)", "destination": "https://kavana-api.onrender.com/oee/$1" },
    { "source": "/quality/(.*)", "destination": "https://kavana-api.onrender.com/quality/$1" },
    { "source": "/cost/(.*)", "destination": "https://kavana-api.onrender.com/costs/$1" },
    { "source": "/health", "destination": "https://kavana-api.onrender.com/health" },
    { "source": "/ai-advisor/(.*)", "destination": "https://kavana-api.onrender.com/ai-advisor/$1" },
    { "source": "/global-admin/(.*)", "destination": "https://kavana-api.onrender.com/global-admin/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Reemplazar `kavana-api.onrender.com` con la URL real que asigne Render.

### 2.4 Seed de datos

```bash
# Ejecutar migraciones contra la BD de Render
DATABASE_URL=postgresql://... node database/scripts/run-postgres-smoke.js

# Crear tenant + admin (si los scripts de seed existen, ejecutarlos)
```

---

## Fase 3 — Verificación

```bash
# 1. Health check del backend
curl https://kavana-api.onrender.com/health

# 2. Login desde el frontend
open https://manufacturing.kavanasystems.com

# 3. Probar mock auth
curl -H "Authorization: Bearer mock-token" https://kavana-api.onrender.com/tenant/capabilities
```

---

## Costes mensuales estimados

| Servicio | Plan | Coste |
|----------|------|-------|
| Vercel | Hobby | Gratis |
| Render Web Service | Starter | ~7€/mes |
| Render PostgreSQL | Free (90 días) | Gratis |
| Upstash Redis | Free | Gratis |
| **Total** | | **~7€/mes** |

Si quieres coste cero: Render Free tier (se duerme a los 15 min sin actividad, se despierta al recibir request — tarda ~30s el primer hit).
