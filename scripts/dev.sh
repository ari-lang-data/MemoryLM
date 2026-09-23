#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ── Backend ────────────────────────────────────────────────────────
cd "$ROOT"
source venv/bin/activate
set -a; source .env; set +a
HOST="${TS_HOST:-127.0.0.1}"
PORT="${PORT:-8000}"

if [[ -n "${TS_CERT_KEY:-}" && -n "${TS_CERT_CRT:-}" ]]; then
  uvicorn main:app --host "$HOST" --port "$PORT" --reload \
    --ssl-keyfile "$TS_CERT_KEY" --ssl-certfile "$TS_CERT_CRT" &
else
  uvicorn backend.main:app --host "$HOST" --port "$PORT" --reload &
fi
BACKEND_PID=$!
deactivate

# ── Frontend ───────────────────────────────────────────────────────
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend  (PID $BACKEND_PID) → $( [[ -n "${TS_CERT_KEY:-}" ]] && echo https || echo http )://$HOST:$PORT"
echo "Frontend (PID $FRONTEND_PID) → see Vite output above for the exact URL"
echo "Ctrl+C to stop both."
echo ""

wait