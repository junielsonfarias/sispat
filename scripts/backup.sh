#!/bin/bash

# ===========================================
# SISPAT 2.0 - SCRIPT DE BACKUP AUTOMATIZADO
# ===========================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações
BACKUP_DIR="/var/backups/sispat"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
LOG_FILE="/var/log/sispat-backup.log"

# Configurações do banco
DB_NAME="sispat_prod"
DB_USER="sispat_user"
DB_HOST="localhost"
DB_PORT="5432"

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Função para verificar dependências
check_dependencies() {
    log "Verificando dependências..."
    
    local missing_deps=()
    
    if ! command -v pg_dump >/dev/null 2>&1; then
        missing_deps+=("postgresql-client")
    fi
    
    if ! command -v tar >/dev/null 2>&1; then
        missing_deps+=("tar")
    fi
    
    if ! command -v gzip >/dev/null 2>&1; then
        missing_deps+=("gzip")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Dependências faltando: ${missing_deps[*]}"
    fi
    
    success "Todas as dependências estão instaladas"
}

# Função para criar diretório de backup
create_backup_directory() {
    log "Criando diretório de backup..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        chmod 755 "$BACKUP_DIR"
        success "Diretório de backup criado: $BACKUP_DIR"
    else
        log "Diretório de backup já existe: $BACKUP_DIR"
    fi
}

# Função para backup do banco de dados
backup_database() {
    log "Iniciando backup do banco de dados..."
    
    local db_backup_file="$BACKUP_DIR/sispat_db_$DATE.sql"
    local db_backup_compressed="$db_backup_file.gz"
    
    # Verificar se o banco está acessível
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; then
        error "Banco de dados não está acessível"
    fi
    
    # Fazer backup do banco
    log "Executando pg_dump..."
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --no-password --format=plain --no-owner --no-privileges \
        > "$db_backup_file" 2>>"$LOG_FILE"; then
        
        success "Backup do banco criado: $db_backup_file"
        
        # Comprimir backup
        log "Comprimindo backup do banco..."
        if gzip "$db_backup_file"; then
            success "Backup do banco comprimido: $db_backup_compressed"
        else
            error "Falha ao comprimir backup do banco"
        fi
    else
        error "Falha ao criar backup do banco"
    fi
}

# Função para backup dos uploads
backup_uploads() {
    log "Iniciando backup dos uploads..."
    
    local uploads_dir="/var/www/sispat/backend/uploads"
    local uploads_backup="$BACKUP_DIR/sispat_uploads_$DATE.tar.gz"
    
    if [ ! -d "$uploads_dir" ]; then
        warning "Diretório de uploads não encontrado: $uploads_dir"
        return 0
    fi
    
    # Verificar se há arquivos para backup
    if [ -z "$(ls -A "$uploads_dir" 2>/dev/null)" ]; then
        log "Diretório de uploads está vazio, pulando backup"
        return 0
    fi
    
    # Criar backup dos uploads
    log "Criando backup dos uploads..."
    if tar -czf "$uploads_backup" -C "$(dirname "$uploads_dir")" "$(basename "$uploads_dir")" 2>>"$LOG_FILE"; then
        success "Backup dos uploads criado: $uploads_backup"
    else
        error "Falha ao criar backup dos uploads"
    fi
}

# Função para backup dos logs
backup_logs() {
    log "Iniciando backup dos logs..."
    
    local logs_dir="/var/log/sispat"
    local logs_backup="$BACKUP_DIR/sispat_logs_$DATE.tar.gz"
    
    if [ ! -d "$logs_dir" ]; then
        warning "Diretório de logs não encontrado: $logs_dir"
        return 0
    fi
    
    # Criar backup dos logs
    log "Criando backup dos logs..."
    if tar -czf "$logs_backup" -C "$(dirname "$logs_dir")" "$(basename "$logs_dir")" 2>>"$LOG_FILE"; then
        success "Backup dos logs criado: $logs_backup"
    else
        error "Falha ao criar backup dos logs"
    fi
}

# Função para backup da configuração
backup_config() {
    log "Iniciando backup da configuração..."
    
    local config_backup="$BACKUP_DIR/sispat_config_$DATE.tar.gz"
    local config_files=(
        "/var/www/sispat/backend/.env"
        "/etc/nginx/sites-available/sispat"
        "/etc/systemd/system/sispat-backend.service"
        "/etc/logrotate.d/sispat"
    )
    
    # Criar diretório temporário para configurações
    local temp_dir=$(mktemp -d)
    
    # Copiar arquivos de configuração
    for config_file in "${config_files[@]}"; do
        if [ -f "$config_file" ]; then
            cp "$config_file" "$temp_dir/"
            log "Configuração copiada: $config_file"
        else
            warning "Arquivo de configuração não encontrado: $config_file"
        fi
    done
    
    # Criar backup das configurações
    if tar -czf "$config_backup" -C "$temp_dir" . 2>>"$LOG_FILE"; then
        success "Backup da configuração criado: $config_backup"
    else
        error "Falha ao criar backup da configuração"
    fi
    
    # Limpar diretório temporário
    rm -rf "$temp_dir"
}

# Função para verificar integridade do backup
verify_backup() {
    log "Verificando integridade dos backups..."
    
    local backup_files=(
        "$BACKUP_DIR/sispat_db_$DATE.sql.gz"
        "$BACKUP_DIR/sispat_uploads_$DATE.tar.gz"
        "$BACKUP_DIR/sispat_logs_$DATE.tar.gz"
        "$BACKUP_DIR/sispat_config_$DATE.tar.gz"
    )
    
    for backup_file in "${backup_files[@]}"; do
        if [ -f "$backup_file" ]; then
            # Verificar se o arquivo não está corrompido
            if gzip -t "$backup_file" 2>/dev/null || tar -tzf "$backup_file" >/dev/null 2>&1; then
                local size=$(du -h "$backup_file" | cut -f1)
                success "Backup verificado: $(basename "$backup_file") ($size)"
            else
                error "Backup corrompido: $backup_file"
            fi
        else
            warning "Backup não encontrado: $backup_file"
        fi
    done
}

# Função para limpeza de backups antigos
cleanup_old_backups() {
    log "Limpando backups antigos (mais de $RETENTION_DAYS dias)..."
    
    local deleted_count=0
    
    # Limpar backups do banco
    while IFS= read -r -d '' file; do
        rm -f "$file"
        deleted_count=$((deleted_count + 1))
        log "Backup antigo removido: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "sispat_db_*.sql.gz" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    # Limpar backups de uploads
    while IFS= read -r -d '' file; do
        rm -f "$file"
        deleted_count=$((deleted_count + 1))
        log "Backup antigo removido: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "sispat_uploads_*.tar.gz" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    # Limpar backups de logs
    while IFS= read -r -d '' file; do
        rm -f "$file"
        deleted_count=$((deleted_count + 1))
        log "Backup antigo removido: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "sispat_logs_*.tar.gz" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    # Limpar backups de configuração
    while IFS= read -r -d '' file; do
        rm -f "$file"
        deleted_count=$((deleted_count + 1))
        log "Backup antigo removido: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "sispat_config_*.tar.gz" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    if [ $deleted_count -gt 0 ]; then
        success "$deleted_count backups antigos removidos"
    else
        log "Nenhum backup antigo encontrado"
    fi
}

# Função para gerar relatório de backup
generate_backup_report() {
    log "Gerando relatório de backup..."
    
    local report_file="$BACKUP_DIR/backup_report_$DATE.txt"
    
    {
        echo "=== RELATÓRIO DE BACKUP SISPAT - $(date) ==="
        echo ""
        
        echo "=== INFORMAÇÕES DO BACKUP ==="
        echo "Data/Hora: $(date)"
        echo "Diretório: $BACKUP_DIR"
        echo "Retenção: $RETENTION_DAYS dias"
        echo ""
        
        echo "=== ARQUIVOS DE BACKUP CRIADOS ==="
        ls -lh "$BACKUP_DIR"/*_$DATE.* 2>/dev/null || echo "Nenhum arquivo encontrado"
        echo ""
        
        echo "=== TAMANHO TOTAL DOS BACKUPS ==="
        du -sh "$BACKUP_DIR" 2>/dev/null || echo "Não foi possível calcular"
        echo ""
        
        echo "=== ESPAÇO EM DISCO ==="
        df -h "$BACKUP_DIR" 2>/dev/null || echo "Não foi possível obter informações"
        echo ""
        
        echo "=== BACKUPS DISPONÍVEIS ==="
        echo "Banco de dados:"
        ls -lh "$BACKUP_DIR"/sispat_db_*.sql.gz 2>/dev/null | tail -5 || echo "Nenhum backup de banco encontrado"
        echo ""
        echo "Uploads:"
        ls -lh "$BACKUP_DIR"/sispat_uploads_*.tar.gz 2>/dev/null | tail -5 || echo "Nenhum backup de uploads encontrado"
        echo ""
        echo "Logs:"
        ls -lh "$BACKUP_DIR"/sispat_logs_*.tar.gz 2>/dev/null | tail -5 || echo "Nenhum backup de logs encontrado"
        echo ""
        echo "Configuração:"
        ls -lh "$BACKUP_DIR"/sispat_config_*.tar.gz 2>/dev/null | tail -5 || echo "Nenhum backup de configuração encontrado"
        
    } > "$report_file"
    
    success "Relatório de backup gerado: $report_file"
}

# Função para restaurar backup
restore_backup() {
    local backup_type="$1"
    local backup_date="$2"
    
    if [ -z "$backup_type" ] || [ -z "$backup_date" ]; then
        error "Uso: restore_backup <tipo> <data> (ex: restore_backup db 20240101_120000)"
    fi
    
    log "Iniciando restauração do backup $backup_type de $backup_date..."
    
    case "$backup_type" in
        "db")
            local backup_file="$BACKUP_DIR/sispat_db_$backup_date.sql.gz"
            if [ -f "$backup_file" ]; then
                log "Restaurando banco de dados..."
                gunzip -c "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
                success "Banco de dados restaurado"
            else
                error "Arquivo de backup não encontrado: $backup_file"
            fi
            ;;
        "uploads")
            local backup_file="$BACKUP_DIR/sispat_uploads_$backup_date.tar.gz"
            if [ -f "$backup_file" ]; then
                log "Restaurando uploads..."
                tar -xzf "$backup_file" -C /
                success "Uploads restaurados"
            else
                error "Arquivo de backup não encontrado: $backup_file"
            fi
            ;;
        *)
            error "Tipo de backup inválido: $backup_type (use: db, uploads)"
            ;;
    esac
}

# Função principal
main() {
    log "=== SISPAT 2.0 BACKUP SCRIPT ==="
    
    case "${1:-backup}" in
        "backup")
            check_dependencies
            create_backup_directory
            backup_database
            backup_uploads
            backup_logs
            backup_config
            verify_backup
            cleanup_old_backups
            generate_backup_report
            success "Backup completo concluído com sucesso!"
            ;;
        "restore")
            restore_backup "$2" "$3"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "report")
            generate_backup_report
            ;;
        *)
            echo "Uso: $0 {backup|restore|cleanup|report}"
            echo ""
            echo "Comandos:"
            echo "  backup                    - Backup completo (padrão)"
            echo "  restore <tipo> <data>     - Restaurar backup específico"
            echo "  cleanup                   - Limpar backups antigos"
            echo "  report                    - Gerar relatório de backup"
            echo ""
            echo "Exemplos:"
            echo "  $0 backup"
            echo "  $0 restore db 20240101_120000"
            echo "  $0 restore uploads 20240101_120000"
            echo "  $0 cleanup"
            echo "  $0 report"
            exit 1
            ;;
    esac
}

# Executar função principal
main "$@"
