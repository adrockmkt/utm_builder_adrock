#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/utm_builder}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/utm_builder-${TIMESTAMP}.dump"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
pg_dump "${DATABASE_URL}" --format=custom --file="${FILE}"
find "${BACKUP_DIR}" -name 'utm_builder-*.dump' -mtime "+${RETENTION_DAYS}" -delete

echo "Backup created: ${FILE}"
