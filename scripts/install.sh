#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Helpers ────────────────────────────────────────────────────────

install_python() {
  echo "python3 not found — attempting to install it..."

  if command -v apt-get >/dev/null 2>&1; then
    echo "Detected apt."
    sudo apt-get update
    sudo apt-get install -y python3 python3-venv python3-pip

  elif command -v dnf >/dev/null 2>&1; then
    echo "Detected dnf."
    sudo dnf install -y python3 python3-pip

  elif command -v yum >/dev/null 2>&1; then
    echo "Detected yum."
    sudo yum install -y python3 python3-pip

  elif command -v pacman >/dev/null 2>&1; then
    echo "Detected pacman."
    sudo pacman -Sy --needed --noconfirm python python-pip

  elif command -v zypper >/dev/null 2>&1; then
    echo "Detected zypper."
    sudo zypper install -y python3 python3-pip

  elif command -v apk >/dev/null 2>&1; then
    echo "Detected apk."
    sudo apk add python3 py3-pip

  elif command -v brew >/dev/null 2>&1; then
    echo "Detected Homebrew."
    brew install python

  else
    echo "Could not find a supported package manager."
    echo "Please install Python 3 manually and re-run this script."
    exit 1
  fi
}

# ── Python / backend ───────────────────────────────────────────────

cd "$ROOT/backend"

if ! command -v python3 >/dev/null 2>&1; then
  install_python
fi

if [ ! -d ".venv" ]; then
  echo "Creating backend virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate

python -m pip install --upgrade pip
python -m pip install -r requirements.txt

deactivate

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Created backend/.env — defaults to plain localhost; fill in TS_HOST / cert paths only if you're wiring up Tailscale."
fi

# ── Node / frontend ────────────────────────────────────────────────

cd "$ROOT/frontend"

if ! command -v node >/dev/null 2>&1; then
  if command -v nvm >/dev/null 2>&1; then
    echo "node not found — installing latest LTS via nvm..."
    nvm install --lts
  else
    echo "node not found, and nvm isn't installed either."
    echo "Install Node via nvm:"
    echo "https://github.com/nvm-sh/nvm#installing-and-updating"
    echo "Then re-run this script."
    exit 1
  fi
fi

npm install

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Created frontend/.env — same deal, blank is fine for a plain local run."
fi

echo ""
echo "Install complete. Run ./scripts/dev.sh to start both servers."