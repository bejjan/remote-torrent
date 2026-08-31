#!/bin/sh
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
  COMPOSE_DIR=$SCRIPT_DIR
elif [ -f "$SCRIPT_DIR/../docker-compose.yml" ]; then
  COMPOSE_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
else
  echo "docker-compose.yml not found in $SCRIPT_DIR or its parent." >&2
  exit 1
fi

cd "$COMPOSE_DIR"

NO_CACHE=0
if [ "${1:-}" = "--no-cache" ]; then
  NO_CACHE=1
fi

echo "Stopping Torro in $COMPOSE_DIR ..."
sudo docker compose down

if [ "$NO_CACHE" -eq 1 ]; then
  echo "Building torro:latest (--no-cache) ..."
  sudo docker compose build --no-cache
else
  echo "Building torro:latest ..."
  sudo docker compose build
fi

echo "Starting Torro ..."
sudo docker compose up -d --force-recreate

echo "Done."
