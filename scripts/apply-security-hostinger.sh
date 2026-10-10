#!/usr/bin/env bash
# Execute manualmente no VPS, após seguir docs/APLICAR_SEGURANCA_CRM.md.
set -euo pipefail
repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$repo_dir"
[[ -f .env && -f docker-compose.yml ]] || { echo 'Faltam .env ou docker-compose.yml neste projeto.' >&2; exit 1; }
command -v docker >/dev/null
docker compose version >/dev/null
docker compose --env-file .env config --quiet
case "${1:-}" in
  build) docker compose --env-file .env build crmevopixel ;;
  activate) docker compose --env-file .env up -d --no-deps --no-build --force-recreate crmevopixel ;;
  *) echo 'Uso: bash scripts/apply-security-hostinger.sh build|activate' >&2; exit 1 ;;
esac
# Não executa SQL, remove volumes, reinicia proxy ou altera outros serviços.
