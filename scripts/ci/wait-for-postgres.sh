#!/usr/bin/env bash
# Wait for the Postgres service to become ready before running CI tasks.
# Polls `pg_isready` every 2 seconds, up to 120 seconds total.
set -euo pipefail

HOST="127.0.0.1"
PORT="5432"
USER="postgres"
DB="requo"

MAX_ATTEMPTS=60
SLEEP_SECONDS=2

for attempt in $(seq 1 "${MAX_ATTEMPTS}"); do
  if pg_isready -h "${HOST}" -p "${PORT}" -U "${USER}" -d "${DB}" >/dev/null 2>&1; then
    echo "Postgres service at ${HOST}:${PORT}/${DB} is ready (after ${attempt} attempt(s))."
    exit 0
  fi
  sleep "${SLEEP_SECONDS}"
done

echo "error: Postgres service at ${HOST}:${PORT}/${DB} did not become ready within $((MAX_ATTEMPTS * SLEEP_SECONDS))s" >&2
exit 1
