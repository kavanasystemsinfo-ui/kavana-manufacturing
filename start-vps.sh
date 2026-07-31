#!/bin/bash
# =========================================================
# 🏭 KAVANA V3 — Arranque rápido (VPS)
# =========================================================
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo "⏹️  Parando servicios..."
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "⏳ Verificando .env..."
if [ ! -f "$ROOT_DIR/backend/.env" ]; then
    cp "$ROOT_DIR/backend/.env.example" "$ROOT_DIR/backend/.env"
    echo "⚠️  Crea backend/.env con DATABASE_URL, JWT_PUBLIC_KEY y ALLOW_MOCK_AUTH"
fi

echo "🚀 Arrancando backend..."
cd "$ROOT_DIR/backend"
npm run dev &
BACKEND_PID=$!

echo "🚀 Arrancando frontend..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ KAVANA V3 corriendo"
echo "═══════════════════════════════════════════"
echo ""
echo "Frontend:   http://167.233.97.71:5173"
echo "Backend:    http://167.233.97.71:3001"
echo "Health:     http://167.233.97.71:3001/health"
echo ""
echo "Press Ctrl+C to stop"
echo "═══════════════════════════════════════════"

wait
