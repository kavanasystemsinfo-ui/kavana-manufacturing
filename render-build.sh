#!/usr/bin/env bash
# =============================================================================
# Kavana Manufacturing — Script de despliegue para Render
# =============================================================================
set -euo pipefail

echo "=== Kavana Manufacturing — Render build ==="
cd "$(dirname "$0")/.."

# Instalar dependencias desde raíz del workspace
echo "[1/3] Instalando dependencias..."
npm install

# Build del backend
echo "[2/3] Compilando backend..."
cd backend
npx tsc -p tsconfig.build.json --skipLibCheck
cd ..

# Ejecutar migraciones de base de datos
if [ -n "${DATABASE_URL:-}" ]; then
  echo "[3/3] Migraciones BD..."
  node database/scripts/run-postgres-smoke.js 2>&1 || echo "⚠️ Migraciones fallaron — verifica DATABASE_URL"
fi

echo "=== Build completado ==="
