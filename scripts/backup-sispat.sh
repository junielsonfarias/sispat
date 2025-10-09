#!/bin/bash

# ============================================
# SISPAT 2.0 - SCRIPT DE BACKUP AUTOMÁTICO
# ============================================
# Descrição: Realiza backup completo do sistema
# Autor: SISPAT Team
# Data: 09/10/2025
# ============================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sispat}"
APP_DIR="${APP_DIR:-/var/www/sispat}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/sispat-backup.log"

# Configuração do banco
DB_CONTAINER="${DB_CONTAINER:-sispat-postgres}"
DB_NAME="${DB_NAME:-sispat_prod}"
DB_USER="${DB_USER:-postgres}"

# Função de log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[OK]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Verificar se está rodando como root ou com sudo
if [ "$EUID" -ne 0 ]; then 
    error "Este script deve ser executado como root ou com sudo"
fi

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"/{database,uploads,config,logs}

log "========================================="
log "INICIANDO BACKUP DO SISPAT"
log "========================================="
log "Data: $(date)"
log "Diretório de backup: $BACKUP_DIR"
log ""

# ============================================
# 1. BACKUP DO BANCO DE DADOS
# ============================================
log "[1/5] Realizando backup do banco de dados..."

if docker ps | grep -q "$DB_CONTAINER"; then
    BACKUP_DB_FILE="$BACKUP_DIR/database/db_${DATE}.sql"
    
    # Fazer dump do banco
    if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_DB_FILE" 2>/dev/null; then
        # Comprimir backup
        gzip "$BACKUP_DB_FILE"
        
        DB_SIZE=$(du -h "${BACKUP_DB_FILE}.gz" | cut -f1)
        success "Backup do banco concluído: ${BACKUP_DB_FILE}.gz ($DB_SIZE)"
    else
        error "Falha ao fazer backup do banco de dados"
    fi
else
    warning "Container PostgreSQL não está rodando, pulando backup do banco"
fi

# ============================================
# 2. BACKUP DOS UPLOADS
# ============================================
log "[2/5] Realizando backup dos uploads..."

if [ -d "$APP_DIR/backend/uploads" ]; then
    UPLOAD_COUNT=$(find "$APP_DIR/backend/uploads" -type f | wc -l)
    
    if [ "$UPLOAD_COUNT" -gt 0 ]; then
        BACKUP_UPLOAD_FILE="$BACKUP_DIR/uploads/uploads_${DATE}.tar.gz"
        
        if tar -czf "$BACKUP_UPLOAD_FILE" -C "$APP_DIR/backend" uploads 2>/dev/null; then
            UPLOAD_SIZE=$(du -h "$BACKUP_UPLOAD_FILE" | cut -f1)
            success "Backup de uploads concluído: $UPLOAD_COUNT arquivos ($UPLOAD_SIZE)"
        else
            warning "Falha ao fazer backup dos uploads"
        fi
    else
        log "Nenhum arquivo de upload para fazer backup"
    fi
else
    warning "Diretório de uploads não encontrado"
fi

# ============================================
# 3. BACKUP DAS CONFIGURAÇÕES
# ============================================
log "[3/5] Realizando backup das configurações..."

CONFIG_FILES=(
    "$APP_DIR/backend/.env"
    "$APP_DIR/.env"
    "$APP_DIR/backend/ecosystem.config.js"
    "$APP_DIR/backend/docker-compose.yml"
    "/etc/nginx/sites-available/sispat"
)

BACKUP_CONFIG_FILE="$BACKUP_DIR/config/config_${DATE}.tar.gz"
CONFIG_TEMP_DIR="/tmp/sispat-config-$$"

mkdir -p "$CONFIG_TEMP_DIR"

for config_file in "${CONFIG_FILES[@]}"; do
    if [ -f "$config_file" ]; then
        cp "$config_file" "$CONFIG_TEMP_DIR/" 2>/dev/null || true
    fi
done

if tar -czf "$BACKUP_CONFIG_FILE" -C "$CONFIG_TEMP_DIR" . 2>/dev/null; then
    CONFIG_COUNT=$(ls -1 "$CONFIG_TEMP_DIR" | wc -l)
    success "Backup de configurações concluído: $CONFIG_COUNT arquivos"
else
    warning "Falha ao fazer backup das configurações"
fi

rm -rf "$CONFIG_TEMP_DIR"

# ============================================
# 4. BACKUP DOS LOGS
# ============================================
log "[4/5] Realizando backup dos logs..."

if [ -d "$APP_DIR/backend/logs" ]; then
    LOG_COUNT=$(find "$APP_DIR/backend/logs" -name "*.log" | wc -l)
    
    if [ "$LOG_COUNT" -gt 0 ]; then
        BACKUP_LOG_FILE="$BACKUP_DIR/logs/logs_${DATE}.tar.gz"
        
        if tar -czf "$BACKUP_LOG_FILE" -C "$APP_DIR/backend" logs 2>/dev/null; then
            success "Backup de logs concluído: $LOG_COUNT arquivos"
        else
            warning "Falha ao fazer backup dos logs"
        fi
    fi
else
    log "Nenhum arquivo de log para fazer backup"
fi

# ============================================
# 5. LIMPEZA DE BACKUPS ANTIGOS
# ============================================
log "[5/5] Removendo backups antigos (>${RETENTION_DAYS} dias)..."

DELETED_COUNT=0

# Remover backups antigos de banco
if [ -d "$BACKUP_DIR/database" ]; then
    DELETED=$(find "$BACKUP_DIR/database" -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
    DELETED_COUNT=$((DELETED_COUNT + DELETED))
fi

# Remover backups antigos de uploads
if [ -d "$BACKUP_DIR/uploads" ]; then
    DELETED=$(find "$BACKUP_DIR/uploads" -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
    DELETED_COUNT=$((DELETED_COUNT + DELETED))
fi

# Remover backups antigos de config
if [ -d "$BACKUP_DIR/config" ]; then
    DELETED=$(find "$BACKUP_DIR/config" -name "config_*.tar.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
    DELETED_COUNT=$((DELETED_COUNT + DELETED))
fi

# Remover backups antigos de logs
if [ -d "$BACKUP_DIR/logs" ]; then
    DELETED=$(find "$BACKUP_DIR/logs" -name "logs_*.tar.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
    DELETED_COUNT=$((DELETED_COUNT + DELETED))
fi

if [ "$DELETED_COUNT" -gt 0 ]; then
    success "Removidos $DELETED_COUNT backups antigos"
else
    log "Nenhum backup antigo para remover"
fi

# ============================================
# RESUMO DO BACKUP
# ============================================
log ""
log "========================================="
log "BACKUP CONCLUÍDO COM SUCESSO"
log "========================================="
log "Data: $(date)"
log "Tempo decorrido: $SECONDS segundos"
log ""
log "Arquivos criados:"
ls -lh "$BACKUP_DIR"/{database,uploads,config,logs}/*_${DATE}* 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'
log ""
log "Espaço em disco usado pelos backups:"
du -sh "$BACKUP_DIR" | awk '{print "  Total: " $1}'
log "========================================="

# Enviar notificação (opcional)
if command -v mail &> /dev/null; then
    if [ -n "$ADMIN_EMAIL" ]; then
        echo "Backup do SISPAT concluído com sucesso em $(date)" | mail -s "SISPAT Backup - Sucesso" "$ADMIN_EMAIL"
    fi
fi

exit 0

