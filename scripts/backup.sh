#!/usr/bin/env bash
# Backs up the SQLite database and uploaded photos from the workshop-data
# Docker volume into a timestamped tarball under ./data/backups (or wherever
# BACKUP_DIR points, if this is run outside Docker against a local ./data dir).
#
# Usage:
#   ./scripts/backup.sh
#
# Restore:
#   1. docker compose down
#   2. Extract the tarball's ./database and ./uploads back into the
#      workshop-data volume (e.g. via a temporary container, or
#      `docker run --rm -v workshop-data:/data -v $(pwd):/backup alpine \
#         tar xzf /backup/<file>.tar.gz -C /data`)
#   3. docker compose up -d

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./data/backups}"
OUT_FILE="${BACKUP_DIR}/workshop-backup-${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

if docker volume inspect workshop-data > /dev/null 2>&1; then
  echo "Backing up from Docker volume 'workshop-data'..."
  docker run --rm \
    -v workshop-data:/data:ro \
    -v "$(pwd)/${BACKUP_DIR}":/backup \
    alpine \
    tar czf "/backup/workshop-backup-${TIMESTAMP}.tar.gz" -C /data database uploads
else
  echo "Docker volume not found — backing up local ./data directory instead..."
  tar czf "$OUT_FILE" -C ./data database uploads
fi

echo "Backup written to ${OUT_FILE}"
