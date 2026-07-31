# Azure Deployment Guide — Kavana Manufacturing v3

> Cómo desplegar Kavana Manufacturing v3 en Microsoft Azure.
> Basado en el stack: NestJS + PostgreSQL + Redis + React + AI Advisor (OpenAI).

---

## Índice

1. [Arquitectura objetivo](#1-arquitectura-objetivo)
2. [Servicios Azure necesarios](#2-servicios-azure-necesarios)
3. [Scripts de infraestructura](#3-scripts-de-infraestructura)
4. [Despliegue paso a paso](#4-despliegue-paso-a-paso)
5. [Costes estimados](#5-costes-estimados)
6. [CI/CD](#6-cicd)
7. [Post-migración](#7-post-migración)

---

## 1. Arquitectura objetivo

```
Usuario → Azure Front Door / DNS
              │
              ├── Azure Static Web Apps ─── Frontend React (Vite build)
              │         │
              │    Azure Container Apps ─── Backend NestJS (API)
              │         │
              │         ├── Azure Database for PostgreSQL Flexible
              │         ├── Azure Cache for Redis
              │         └── Azure OpenAI Service (AI Advisor)
              │
              └── Azure Monitor / App Insights ─── Observabilidad
```

## 2. Servicios Azure necesarios

| Servicio | Propósito | Tier mínimo | Coste estimado |
|----------|-----------|-------------|----------------|
| Azure Database for PostgreSQL Flexible | Base de datos multi-tenant con RLS | **Burstable B1ms** (1 vCPU, 2GB) | ~15€/mes |
| Azure Cache for Redis | Colas BullMQ + caché | **Basic C0** (250MB) | ~15€/mes |
| Azure Container Apps | Backend NestJS + Worker | **Consumption** (pago por uso) | ~10-20€/mes |
| Azure Static Web Apps | Frontend React | **Free** | 0€/mes |
| Azure OpenAI Service | AI Advisor (RAG + LLMs) | Pago por uso (estándar) | Variable (~5-20€/mes) |
| Azure Monitor / App Insights | OpenTelemetry, métricas | **Pay-as-you-go** | ~3€/mes |

**Coste total estimado: ~48-73€/mes** (producción mínima viable)

## 3. Scripts de infraestructura

```bash
# === 01-crear-recursos.sh ===
# Script base para crear infraestructura en Azure

RESOURCE_GROUP="kavana-manufacturing"
LOCATION="westeurope"
DB_PASSWORD="<generar-contraseña-segura>"

# Crear grupo de recursos
az group create --name $RESOURCE_GROUP --location $LOCATION

# PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name kavana-v3-db \
  --location $LOCATION \
  --admin-user kavana \
  --admin-password "$DB_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0 \
  --yes

# Crear base de datos
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name kavana-v3-db \
  --database-name kavana_v3

# Redis Cache
az redis create \
  --resource-group $RESOURCE_GROUP \
  --name kavana-v3-redis \
  --location $LOCATION \
  --sku Basic \
  --vm-size C0

# Container Registry (para imágenes Docker)
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name kavanav3registry \
  --sku Basic \
  --admin-enabled true

# Static Web Apps (frontend)
az staticwebapp create \
  --resource-group $RESOURCE_GROUP \
  --name kavana-v3-frontend \
  --location $LOCATION \
  --source /dev/null

echo "Recursos creados. Guarda las credenciales:"
echo "DB_HOST: kavana-v3-db.postgres.database.azure.com"
echo "DB_PASSWORD: $DB_PASSWORD"
echo "REDIS_HOST: kavana-v3-redis.redis.cache.windows.net"
```

## 4. Despliegue paso a paso

### 4.1 Backend (Azure Container Apps)

```bash
# === 02-deploy-backend.sh ===

RESOURCE_GROUP="kavana-manufacturing"
ACR_NAME="kavanav3registry"
IMAGE_NAME="kavana-v3-backend"
IMAGE_TAG=$(git rev-parse --short HEAD)

# Construir y pushear imagen
az acr build \
  --resource-group $RESOURCE_GROUP \
  --registry $ACR_NAME \
  --image $IMAGE_NAME:$IMAGE_TAG \
  --file backend/Dockerfile .

# Crear Container Apps environment
az containerapp env create \
  --resource-group $RESOURCE_GROUP \
  --name kavana-env \
  --location westeurope

# Desplegar backend
az containerapp create \
  --resource-group $RESOURCE_GROUP \
  --name kavana-v3-api \
  --environment kavana-env \
  --image $ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG \
  --target-port 3001 \
  --ingress external \
  --registry-server $ACR_NAME.azurecr.io \
  --env-vars \
    PORT=3001 \
    DATABASE_URL="postgresql://kavana:$DB_PASSWORD@kavana-v3-db.postgres.database.azure.com:5432/kavana_v3?sslmode=require" \
    REDIS_HOST="kavana-v3-redis.redis.cache.windows.net" \
    REDIS_PORT=6380 \
    REDIS_SSL=true \
    JWT_SECRET="$(openssl rand -base64 32)" \
    LLM_PROVIDER=azure \
    AZURE_OPENAI_ENDPOINT="https://kavana-openai.openai.azure.com" \
    AZURE_OPENAI_DEPLOYMENT="gpt-4o-mini"
```

### 4.2 Frontend (Azure Static Web Apps)

```bash
# === 03-deploy-frontend.sh ===

RESOURCE_GROUP="kavana-manufacturing"
STATIC_APP_NAME="kavana-v3-frontend"

# Construir frontend
cd frontend
npm ci
npm run build

# Desplegar a Static Web Apps usando SWA CLI
npx @azure/static-web-apps-cli deploy \
  --app-location . \
  --output-location dist \
  --resource-group $RESOURCE_GROUP \
  --name $STATIC_APP_NAME
```

### 4.3 Base de datos migraciones

```bash
# === 04-run-migrations.sh ===

# Ejecutar migraciones contra Azure PostgreSQL
for f in database/migrations/*.sql; do
  echo "Ejecutando: $f"
  PGPASSWORD="$DB_PASSWORD" psql \
    -h kavana-v3-db.postgres.database.azure.com \
    -U kavana \
    -d kavana_v3 \
    -f "$f"
done
```

## 5. Costes estimados

| Servicio | Plan | Coste/mes |
|----------|------|-----------|
| PostgreSQL Flexible | Burstable B1ms | 15€ |
| Redis Cache | Basic C0 | 15€ |
| Container Apps | Consumption | 15€* |
| Static Web Apps | Free | 0€ |
| Azure OpenAI | Std (estimado) | 10€* |
| Container Registry | Basic | 1€ |
| Monitor + Logs | PAYG | 3€ |
| **Total estimado** | | **~59€/mes** |

*Costes variables según uso

## 6. CI/CD

### GitHub Actions workflow

```yaml
# .github/workflows/deploy-azure.yml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - run: |
          az acr build --registry kavanav3registry --image kavana-v3-backend:${{ github.sha }} --file backend/Dockerfile .
          az containerapp update --name kavana-v3-api --image kavanav3registry.azurecr.io/kavana-v3-backend:${{ github.sha }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd frontend
          npm ci
          npm run build
      - uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: upload
          app_location: "/frontend"
          output_location: "/frontend/dist"
```

## 7. Post-migración

### Checklist de verificación

- [ ] Todos los tests pasan contra la nueva BD
- [ ] Frontend sirve correctamente desde Static Web Apps
- [ ] Backend responde en /health
- [ ] AI Advisor responde con proveedor Azure OpenAI
- [ ] Redis conectado y colas BullMQ funcionando
- [ ] OpenTelemetry enviando trazas a App Insights
- [ ] RLS funcionando multi-tenant
- [ ] DNS configurado (manufacturing.kavanasystems.com → Azure Front Door)
- [ ] SSL/TLS configurado
- [ ] Backups automáticos habilitados (PostgreSQL + Redis)

### Rollback plan

1. **Frontend:** Static Web Apps mantiene versiones anteriores — re部署 anterior
2. **Backend:** Revertir imagen en Container Apps a tag anterior
3. **BD:** PostgreSQL Point-in-Time Restore
4. **Completo:** Mantener docker-compose local funcionando como fallback

---

> Documento generado como parte del proceso AI-assisted engineering.
> Fecha: Julio 2026
> Proyecto: Kavana Manufacturing v3
