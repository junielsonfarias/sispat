#!/bin/bash

# ===========================================
# SISPAT 2.0 - SCRIPT DE BACKUP AUTOMÁTICO
# ===========================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações (ajustar conforme seu ambiente)
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sispat}"
DB_NAME="${DB_NAME:-sispat_prod}"
DB_USER="${DB_USER:-sispat_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Data e hora atual
DATE=$(date +%Y%m%d_%H%M%S)
DAY=$(date +%A)
BACKUP_FILE="$BACKUP_DIR/sispat_backup_$DATE.sql.gz"
BACKUP_FILE_DAILY="$BACKUP_DIR/daily/sispat_backup_$DAY.sql.gz"

# ===========================================
# FUNÇÕES
# ===========================================

# Função para log
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Função para criar diretórios
create_directories() {
    log_info "Criando diretórios de backup..."
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$BACKUP_DIR/daily"
    mkdir -p "$BACKUP_DIR/weekly"
    mkdir -p "$BACKUP_DIR/monthly"
}

# Função para fazer backup
perform_backup() {
    log_info "Iniciando backup do banco de dados..."
    log_info "Database: $DB_NAME"
    log_info "Arquivo: $BACKUP_FILE"
    
    # Fazer backup com pg_dump
    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        --verbose \
        | gzip > "$BACKUP_FILE"
    
    # Verificar se backup foi criado
    if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
        local size=$(du -h "$BACKUP_FILE" | cut -f1)
        log_info "✅ Backup criado com sucesso: $BACKUP_FILE ($size)"
        return 0
    else
        log_error "❌ Falha ao criar backup!"
        return 1
    fi
}

# Função para backup diário (sobrescreve backup do mesmo dia da semana)
perform_daily_backup() {
    log_info "Criando backup diário (rotativo)..."
    
    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        | gzip > "$BACKUP_FILE_DAILY"
    
    if [ $? -eq 0 ]; then
        log_info "✅ Backup diário criado: $BACKUP_FILE_DAILY"
    fi
}

# Função para limpar backups antigos
cleanup_old_backups() {
    log_info "Limpando backups antigos (> $RETENTION_DAYS dias)..."
    
    local count=$(find "$BACKUP_DIR" -name "sispat_backup_*.sql.gz" -mtime +$RETENTION_DAYS | wc -l)
    
    if [ $count -gt 0 ]; then
        find "$BACKUP_DIR" -name "sispat_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
        log_info "🗑️  $count backup(s) antigo(s) removido(s)"
    else
        log_info "Nenhum backup antigo para remover"
    fi
}

# Função para verificar integridade do backup
verify_backup() {
    local backup_file=$1
    log_info "Verificando integridade do backup..."
    
    # Verificar se arquivo está corrompido
    gunzip -t "$backup_file" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log_info "✅ Backup íntegro e válido"
        return 0
    else
        log_error "❌ Backup corrompido!"
        return 1
    fi
}

# Função para enviar backup para cloud (opcional)
upload_to_cloud() {
    if [ -n "$AWS_S3_BUCKET" ]; then
        log_info "Enviando backup para S3..."
        aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            log_info "✅ Backup enviado para S3"
        else
            log_warn "⚠️  Falha ao enviar para S3"
        fi
    fi
}

# Função para enviar notificação
send_notification() {
    local status=$1
    local message=$2
    
    if [ "$status" = "success" ]; then
        log_info "📧 Enviando notificação de sucesso..."
    else
        log_error "📧 Enviando notificação de falha..."
    fi
    
    # Webhook (opcional - Slack, Discord, etc)
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"$message\"}" \
            2>/dev/null
    fi
}

# ===========================================
# EXECUÇÃO PRINCIPAL
# ===========================================

main() {
    echo "============================================="
    echo "  SISPAT 2.0 - BACKUP AUTOMÁTICO"
    echo "============================================="
    echo ""
    
    # Verificar se pg_dump está instalado
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump não encontrado. Instale o PostgreSQL client."
        exit 1
    fi
    
    # Criar diretórios
    create_directories
    
    # Fazer backup
    if perform_backup; then
        # Verificar integridade
        if verify_backup "$BACKUP_FILE"; then
            # Backup diário rotativo
            perform_daily_backup
            
            # Limpar backups antigos
            cleanup_old_backups
            
            # Upload para cloud (se configurado)
            upload_to_cloud
            
            # Notificação de sucesso
            send_notification "success" "✅ Backup do SISPAT concluído com sucesso em $(date)"
            
            log_info ""
            log_info "============================================="
            log_info "  ✅ BACKUP CONCLUÍDO COM SUCESSO!"
            log_info "============================================="
            exit 0
        else
            send_notification "error" "❌ Backup do SISPAT falhou - arquivo corrompido em $(date)"
            exit 1
        fi
    else
        send_notification "error" "❌ Backup do SISPAT falhou em $(date)"
        exit 1
    fi
}

# Executar
main

