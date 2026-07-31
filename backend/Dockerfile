# =============================================================================
# Kavana Manufacturing v3 — Backend Dockerfile
# Multi-stage build optimizado para producción
# =============================================================================

FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos del workspace
COPY package.json package-lock.json ./
COPY backend/ ./backend/

# Instalar dependencias y build
RUN npm install && \
    cd backend && \
    npx tsc -p tsconfig.build.json --skipLibCheck 2>&1

# Producción
FROM node:20-alpine
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/node_modules ./node_modules

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

USER app
EXPOSE 3001
CMD ["node", "dist/main.js"]
