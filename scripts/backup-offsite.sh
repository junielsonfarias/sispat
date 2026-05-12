#!/bin/bash

# ===========================================
# SISPAT — Backup off-site para S3-compatible
# ===========================================
#
# Sincroniza /var/backups/sispat com um bucket remoto (S3, Backblaze B2,
# MinIO, R2, qualquer um suportado pelo rclone). Idempotente: roda só
# se rclone estiver instalado e configurado.
#
# Como configurar (uma vez):
#   1. apt install -y rclone
#   2. rclone config            # interativo — criar remote "sispat-offsite"
#                                  (escolher S3 / B2 / Backblaze / R2 etc.)
#   3. Definir variáveis em /var/www/sispat/backend/.env ou ambiente:
#        OFFSITE_REMOTE=sispat-offsite
#        OFFSITE_BUCKET=meu-bucket-sispat
#   4. Agendar em cron (sugestão: diário às 03:00, 1h depois do backup local):
#        0 3 * * * /var/www/sispat/scripts/backup-offsite.sh \
#          >> /var/log/sispat-backup-offsite.log 2>&1
#
# O que faz:
#   - Verifica que rclone está instalado e o remote existe
#   - Sincroniza /var/backups/sispat/ → remote:bucket/sispat/YYYY/MM/
#   - Aplica retenção remota (180 dias por padrão)
#
# Não roda se:
#   - rclone não instalado
#   - OFFSITE_REMOTE não definido
#   - OFFSITE_BUCKET não definido
# ===========================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_DIR="${BACKUP_DIR:-/var/backups/sispat}"
APP_DIR="${APP_DIR:-/var/www/sispat}"
OFFSITE_REMOTE="${OFFSITE_REMOTE:-}"
OFFSITE_BUCKET="${OFFSITE_BUCKET:-}"
OFFSITE_RETENTION_DAYS="${OFFSITE_RETENTION_DAYS:-180}"

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[ERRO]${NC} $1"; exit 1; }

# Carrega .env se as vars não estão no ambiente (uso via cron)
if [ -z "$OFFSITE_REMOTE" ] && [ -f "$APP_DIR/backend/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$APP_DIR/backend/.env" 2>/dev/null || true
    set +a
fi

log "=== SISPAT BACKUP OFF-SITE ==="

# Pré-checks
if ! command -v rclone >/dev/null 2>&1; then
    warn "rclone não está instalado (apt install rclone). Backup off-site desabilitado."
    exit 0
fi

if [ -z "$OFFSITE_REMOTE" ] || [ -z "$OFFSITE_BUCKET" ]; then
    warn "OFFSITE_REMOTE ou OFFSITE_BUCKET não definidos. Backup off-site desabilitado."
    warn "Configure em /var/www/sispat/backend/.env (ver header deste script)."
    exit 0
fi

if [ ! -d "$BACKUP_DIR" ]; then
    fail "BACKUP_DIR não existe: $BACKUP_DIR"
fi

if ! rclone listremotes | grep -q "^${OFFSITE_REMOTE}:$"; then
    fail "Remote '${OFFSITE_REMOTE}' não configurado no rclone. Rode 'rclone config'."
fi

YEAR=$(date +%Y)
MONTH=$(date +%m)
REMOTE_PATH="${OFFSITE_REMOTE}:${OFFSITE_BUCKET}/sispat/${YEAR}/${MONTH}"

log "Local:  $BACKUP_DIR"
log "Remoto: $REMOTE_PATH"
log "Retenção remota: $OFFSITE_RETENTION_DAYS dias"

# Copia incremental (nunca deleta no remoto por desincronização local)
if rclone copy "$BACKUP_DIR" "$REMOTE_PATH" \
    --transfers 4 --checkers 8 \
    --progress --stats-one-line \
    --include "sispat_*.{sql.gz,tar.gz}"; then
    success "Backup sincronizado para $REMOTE_PATH"
else
    fail "Falha ao sincronizar com $REMOTE_PATH"
fi

# Limpeza de backups antigos no remoto
if [ "$OFFSITE_RETENTION_DAYS" -gt 0 ] 2>/dev/null; then
    log "Limpando backups remotos > ${OFFSITE_RETENTION_DAYS} dias"
    rclone delete "${OFFSITE_REMOTE}:${OFFSITE_BUCKET}/sispat/" \
        --min-age "${OFFSITE_RETENTION_DAYS}d" \
        --include "sispat_*.{sql.gz,tar.gz}" \
        || warn "Falha ao limpar backups antigos no remoto (continuando)"
fi

success "Backup off-site concluído."
