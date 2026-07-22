# =============================================================================
# Kavana Manufacturing v3 — Backend Dockerfile
# Multi-stage build: dependencies → build → production (optimizado para Azure)
# =============================================================================

# ---- Stage 1: Dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install ONLY backend dependencies (production + dev for build)
RUN npm ci --workspace=backend --include-workspace-root --omit=dev=false

# ---- Stage 2: Build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app /app
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY tsconfig*.json ./

# Build backend
RUN npm run build --workspace=backend 2>&1 || \
    (cd backend && npx tsc -p tsconfig.json)

# ---- Stage 3: Production ----
FROM node:20-alpine AS production
WORKDIR /app

# Crear usuario no-root
RUN addgroup -S app && adduser -S app -G app

# Copiar artefactos de build
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/package.json ./
COPY --from=build /app/node_modules ./node_modules

# Solo dependencias de producción
RUN npm ci --omit=dev --ignore-scripts 2>/dev/null || true

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

USER app
EXPOSE 3001
CMD ["node", "dist/main.js"]
