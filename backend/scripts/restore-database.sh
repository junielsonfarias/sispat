#!/bin/bash

# ===========================================
# SISPAT 2.0 - SCRIPT DE RESTORE DO BACKUP
# ===========================================

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configurações
DB_NAME="${DB_NAME:-sispat_prod}"
DB_USER="${DB_USER:-sispat_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sispat}"

# Funções de log
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Listar backups disponíveis
list_backups() {
    log_info "Backups disponíveis:"
    echo ""
    
    ls -lh "$BACKUP_DIR"/sispat_backup_*.sql.gz 2>/dev/null | \
        awk '{print "  " NR ". " $9 " (" $5 " - " $6 " " $7 ")"}'
    
    echo ""
}

# Restaurar backup
restore_backup() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        log_error "Arquivo de backup não encontrado: $backup_file"
        exit 1
    fi
    
    log_warn "⚠️  ATENÇÃO: Esta operação irá SOBRESCREVER o banco de dados atual!"
    log_warn "Database: $DB_NAME"
    log_warn "Backup: $backup_file"
    echo ""
    read -p "Tem certeza? Digite 'SIM' para confirmar: " confirm
    
    if [ "$confirm" != "SIM" ]; then
        log_info "Operação cancelada"
        exit 0
    fi
    
    log_info "Iniciando restore..."
    
    # Descompactar e restaurar
    gunzip -c "$backup_file" | \
        PGPASSWORD=$DB_PASSWORD psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME"
    
    if [ $? -eq 0 ]; then
        log_info "✅ Restore concluído com sucesso!"
        log_info "Reinicie a aplicação para garantir que tudo está funcionando"
        exit 0
    else
        log_error "❌ Falha ao restaurar backup!"
        exit 1
    fi
}

# Main
main() {
    echo "============================================="
    echo "  SISPAT 2.0 - RESTORE DE BACKUP"
    echo "============================================="
    echo ""
    
    # Listar backups
    list_backups
    
    # Pedir arquivo de backup
    if [ -z "$1" ]; then
        read -p "Digite o caminho completo do backup ou número: " backup_input
        
        # Se é um número, pegar da lista
        if [[ "$backup_input" =~ ^[0-9]+$ ]]; then
            backup_file=$(ls "$BACKUP_DIR"/sispat_backup_*.sql.gz 2>/dev/null | sed -n "${backup_input}p")
        else
            backup_file=$backup_input
        fi
    else
        backup_file=$1
    fi
    
    # Restaurar
    restore_backup "$backup_file"
}

main "$@"

