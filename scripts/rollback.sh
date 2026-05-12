#!/bin/bash

# ===========================================
# SISPAT 2.0 - ROLLBACK
# ===========================================
#
# Reverte o deploy atual para um commit anterior e (opcionalmente) restaura
# o backup do banco. Pensado para uso na VPS Linux com PM2 + Nginx + Postgres
# instalados pelo install.sh.
#
# Uso:
#   sudo ./rollback.sh                       # rollback para o commit anterior (HEAD~1)
#   sudo ./rollback.sh <commit-sha>          # rollback para sha específico
#   sudo ./rollback.sh --with-db             # também restaura backup mais recente do DB
#   sudo ./rollback.sh <sha> --with-db
#   sudo ./rollback.sh --list                # lista commits e backups disponíveis
#   sudo ./rollback.sh --dry-run             # mostra o que faria sem aplicar
#
# Pressupostos (alinhados com install.sh e scripts/backup.sh):
#   APP_DIR     = /var/www/sispat
#   BACKUP_DIR  = /var/backups/sispat
#   DB_NAME     = sispat_prod
#   DB_USER     = sispat_user
#   PM2_PROCESS = sispat-backend
# ===========================================

set -euo pipefail

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações (sobrescreva via env se necessário)
APP_DIR="${APP_DIR:-/var/www/sispat}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sispat}"
DB_NAME="${DB_NAME:-sispat_prod}"
DB_USER="${DB_USER:-sispat_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
PM2_PROCESS="${PM2_PROCESS:-sispat-backend}"
LOG_FILE="${LOG_FILE:-/var/log/sispat-rollback.log}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/api/health}"

# Flags
TARGET_COMMIT=""
WITH_DB=0
DRY_RUN=0
LIST_ONLY=0

# ----- helpers -----
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}
success() {
    echo -e "${GREEN}[OK]${NC} $1" | tee -a "$LOG_FILE"
}
warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}
fail() {
    echo -e "${RED}[ERRO]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}
run() {
    if [ "$DRY_RUN" = "1" ]; then
        echo -e "${YELLOW}[dry-run]${NC} $*"
    else
        log "→ $*"
        eval "$@"
    fi
}

# ----- parsing de args -----
parse_args() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --with-db)
                WITH_DB=1
                ;;
            --dry-run)
                DRY_RUN=1
                ;;
            --list)
                LIST_ONLY=1
                ;;
            -h|--help)
                grep -E '^#' "$0" | head -25 | sed 's/^# \{0,1\}//'
                exit 0
                ;;
            -*)
                fail "Flag desconhecida: $1"
                ;;
            *)
                if [ -z "$TARGET_COMMIT" ]; then
                    TARGET_COMMIT="$1"
                else
                    fail "Argumento extra: $1"
                fi
                ;;
        esac
        shift
    done
}

# ----- pré-checagens -----
preflight() {
    if [ "$EUID" -ne 0 ] && [ "$DRY_RUN" != "1" ]; then
        fail "Execute como root (sudo)."
    fi

    [ -d "$APP_DIR" ] || fail "APP_DIR não existe: $APP_DIR"
    [ -d "$APP_DIR/.git" ] || fail "$APP_DIR não é um repositório git."

    for cmd in git pm2 nginx psql gunzip curl; do
        command -v "$cmd" >/dev/null 2>&1 || fail "Dependência ausente: $cmd"
    done
}

# ----- listagem informativa -----
list_state() {
    log "Estado atual:"
    echo "  APP_DIR: $APP_DIR"
    echo "  HEAD atual: $(git -C "$APP_DIR" rev-parse --short HEAD) — $(git -C "$APP_DIR" log -1 --pretty=format:'%s')"
    echo ""
    echo "Últimos 10 commits:"
    git -C "$APP_DIR" log --oneline -10
    echo ""
    echo "Backups de banco disponíveis (5 mais recentes):"
    ls -1t "$BACKUP_DIR"/sispat_db_*.sql.gz 2>/dev/null | head -5 || echo "  (nenhum)"
    echo ""
    echo "Backups de uploads disponíveis (3 mais recentes):"
    ls -1t "$BACKUP_DIR"/sispat_uploads_*.tar.gz 2>/dev/null | head -3 || echo "  (nenhum)"
}

# ----- backup-antes-de-mexer -----
snapshot_current() {
    local stamp
    stamp="rollback-pre-$(date +%Y%m%d_%H%M%S)"
    local cur
    cur="$(git -C "$APP_DIR" rev-parse HEAD)"
    log "Salvando referência do estado atual em tag local: $stamp → $cur"
    run "git -C '$APP_DIR' tag -f '$stamp' '$cur' >/dev/null"
    echo "$stamp"
}

# ----- rollback de código -----
rollback_code() {
    local target="$1"

    if ! git -C "$APP_DIR" cat-file -e "${target}^{commit}" 2>/dev/null; then
        fail "Commit alvo inválido: $target"
    fi

    log "Fazendo fetch para garantir refs atualizadas..."
    run "git -C '$APP_DIR' fetch --all --tags --quiet"

    log "Checkout do alvo: $target ($(git -C "$APP_DIR" log -1 --pretty=format:'%s' "$target"))"
    run "git -C '$APP_DIR' checkout --detach '$target'"

    # Backend
    log "Instalando deps e buildando backend..."
    run "cd '$APP_DIR/backend' && npm ci --omit=dev"
    run "cd '$APP_DIR/backend' && npx prisma generate"
    run "cd '$APP_DIR/backend' && npm run build"
    # Não roda 'prisma migrate deploy' aqui — schema pode estar à frente; restaurar
    # DB via --with-db se o rollback exigir reverter migrations.

    # Frontend
    log "Instalando deps e buildando frontend..."
    run "cd '$APP_DIR' && pnpm install --frozen-lockfile"
    run "cd '$APP_DIR' && pnpm run build"
}

# ----- restart serviços -----
restart_services() {
    log "Reiniciando PM2 ($PM2_PROCESS)..."
    run "pm2 restart '$PM2_PROCESS' --update-env"
    run "pm2 save"

    log "Testando e recarregando Nginx..."
    run "nginx -t"
    run "systemctl reload nginx"
}

# ----- restore opcional do DB -----
restore_database() {
    local latest
    latest="$(ls -1t "$BACKUP_DIR"/sispat_db_*.sql.gz 2>/dev/null | head -1 || true)"
    [ -n "$latest" ] || fail "Nenhum backup de banco em $BACKUP_DIR"

    warn "DB restore irá SOBRESCREVER $DB_NAME com: $(basename "$latest")"
    if [ "$DRY_RUN" != "1" ]; then
        read -r -p "Confirma o restore do banco? Digite 'SIM' para prosseguir: " ans
        [ "$ans" = "SIM" ] || fail "Restore cancelado pelo operador."
    fi

    log "Restaurando banco a partir de $latest"
    run "gunzip -c '$latest' | psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME'"
    success "Banco restaurado."
}

# ----- health check pós-rollback -----
health_check() {
    log "Aguardando backend responder em $HEALTH_URL ..."
    local tries=0
    until curl -fsS "$HEALTH_URL" >/dev/null 2>&1; do
        tries=$((tries + 1))
        if [ "$tries" -gt 30 ]; then
            warn "Health check falhou após 30 tentativas. Revise pm2 logs $PM2_PROCESS."
            return 1
        fi
        sleep 2
    done
    success "Backend respondendo OK."
}

# ----- main -----
main() {
    parse_args "$@"

    mkdir -p "$(dirname "$LOG_FILE")"
    log "=== SISPAT ROLLBACK ==="
    [ "$DRY_RUN" = "1" ] && warn "Modo DRY RUN: nenhuma alteração será aplicada"

    preflight

    if [ "$LIST_ONLY" = "1" ]; then
        list_state
        exit 0
    fi

    # default: HEAD~1
    if [ -z "$TARGET_COMMIT" ]; then
        TARGET_COMMIT="$(git -C "$APP_DIR" rev-parse HEAD~1)"
        log "Sem alvo informado — usando commit anterior: $TARGET_COMMIT"
    fi

    list_state
    log "Alvo do rollback: $TARGET_COMMIT"
    log "Banco será restaurado? $([ "$WITH_DB" = "1" ] && echo SIM || echo não)"

    if [ "$DRY_RUN" != "1" ]; then
        read -r -p "Prosseguir com o rollback? (s/N) " yn
        [[ "$yn" =~ ^[Ss]$ ]] || fail "Cancelado pelo operador."
    fi

    snapshot_current >/dev/null
    rollback_code "$TARGET_COMMIT"

    if [ "$WITH_DB" = "1" ]; then
        restore_database
    fi

    restart_services
    health_check || warn "Sistema pode estar instável — investigar."

    success "Rollback concluído."
    log "Estado atual: $(git -C "$APP_DIR" rev-parse --short HEAD) — $(git -C "$APP_DIR" log -1 --pretty=format:'%s')"
    log "Para voltar: git -C $APP_DIR checkout <tag rollback-pre-...> e rebuild."
}

main "$@"
