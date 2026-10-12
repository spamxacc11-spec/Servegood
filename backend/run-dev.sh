#!/usr/bin/env sh
# Starts the backend with the variables from backend/.env (macOS/Linux).
# Usage, from the backend folder:  ./run-dev.sh
set -e
cd "$(dirname "$0")"
if [ ! -f .env ]; then
  echo "backend/.env not found. Copy .env.example to .env and fill it in." >&2
  exit 1
fi
set -a
. ./.env
set +a
exec ./mvnw spring-boot:run
