#!/bin/bash

# ============================================
# SISPAT 2.0 - SCRIPT DE RESTAURAÇÃO
# ============================================
# Descrição: Restaura backup do sistema
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

# Configuração do banco
DB_CONTAINER="${DB_CONTAINER:-sispat-postgres}"
DB_NAME="${DB_NAME:-sispat_prod}"
DB_USER="${DB_USER:-postgres}"

# Função de log
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    error "Este script deve ser executado como root ou com sudo"
fi

echo ""
echo "========================================="
echo "  SISPAT 2.0 - RESTAURAÇÃO DE BACKUP"
echo "========================================="
echo ""

# ============================================
# LISTAR BACKUPS DISPONÍVEIS
# ============================================

log "Backups disponíveis:"
echo ""

# Backups de banco
echo -e "${BLUE}BANCO DE DADOS:${NC}"
if [ -d "$BACKUP_DIR/database" ]; then
    DB_BACKUPS=($(ls -t "$BACKUP_DIR/database"/db_*.sql.gz 2>/dev/null))
    
    if [ ${#DB_BACKUPS[@]} -eq 0 ]; then
        echo "  Nenhum backup encontrado"
    else
        for i in "${!DB_BACKUPS[@]}"; do
            BACKUP_FILE="${DB_BACKUPS[$i]}"
            BACKUP_DATE=$(basename "$BACKUP_FILE" | sed 's/db_\(.*\)\.sql\.gz/\1/')
            BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
            FORMATTED_DATE=$(echo "$BACKUP_DATE" | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)_\([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
            echo "  [$((i+1))] $FORMATTED_DATE ($BACKUP_SIZE)"
        done
    fi
else
    echo "  Diretório não encontrado"
fi

echo ""
echo -e "${BLUE}UPLOADS:${NC}"
if [ -d "$BACKUP_DIR/uploads" ]; then
    UPLOAD_BACKUPS=($(ls -t "$BACKUP_DIR/uploads"/uploads_*.tar.gz 2>/dev/null))
    
    if [ ${#UPLOAD_BACKUPS[@]} -eq 0 ]; then
        echo "  Nenhum backup encontrado"
    else
        for i in "${!UPLOAD_BACKUPS[@]}"; do
            BACKUP_FILE="${UPLOAD_BACKUPS[$i]}"
            BACKUP_DATE=$(basename "$BACKUP_FILE" | sed 's/uploads_\(.*\)\.tar\.gz/\1/')
            BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
            FORMATTED_DATE=$(echo "$BACKUP_DATE" | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)_\([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
            echo "  [$((i+1))] $FORMATTED_DATE ($BACKUP_SIZE)"
        done
    fi
else
    echo "  Diretório não encontrado"
fi

echo ""
echo "========================================="
echo ""

# ============================================
# SELEÇÃO DO BACKUP
# ============================================

read -p "$(echo -e ${YELLOW}Deseja restaurar o backup? [s/N]:${NC}) " confirm
if [[ ! "$confirm" =~ ^[Ss]$ ]]; then
    log "Operação cancelada pelo usuário"
    exit 0
fi

echo ""
read -p "$(echo -e ${YELLOW}Escolha o número do backup de BANCO para restaurar [1-${#DB_BACKUPS[@]}]:${NC}) " db_choice

if [ -z "$db_choice" ] || [ "$db_choice" -lt 1 ] || [ "$db_choice" -gt ${#DB_BACKUPS[@]} ]; then
    error "Escolha inválida"
fi

SELECTED_DB_BACKUP="${DB_BACKUPS[$((db_choice-1))]}"

echo ""
read -p "$(echo -e ${YELLOW}Escolha o número do backup de UPLOADS para restaurar [1-${#UPLOAD_BACKUPS[@]}]:${NC}) " upload_choice

if [ -z "$upload_choice" ] || [ "$upload_choice" -lt 1 ] || [ "$upload_choice" -gt ${#UPLOAD_BACKUPS[@]} ]; then
    error "Escolha inválida"
fi

SELECTED_UPLOAD_BACKUP="${UPLOAD_BACKUPS[$((upload_choice-1))]}"

# ============================================
# CONFIRMAÇÃO FINAL
# ============================================

echo ""
echo -e "${RED}⚠️  ATENÇÃO: ESTA OPERAÇÃO É IRREVERSÍVEL!${NC}"
echo ""
echo "Arquivos que serão restaurados:"
echo "  - Banco: $(basename "$SELECTED_DB_BACKUP")"
echo "  - Uploads: $(basename "$SELECTED_UPLOAD_BACKUP")"
echo ""
read -p "$(echo -e ${RED}Confirma a restauração? Digite 'RESTAURAR' para continuar:${NC}) " final_confirm

if [ "$final_confirm" != "RESTAURAR" ]; then
    log "Operação cancelada"
    exit 0
fi

# ============================================
# RESTAURAÇÃO
# ============================================

echo ""
log "Iniciando restauração..."

# 1. Parar aplicação
log "[1/4] Parando aplicação..."
pm2 stop sispat-backend 2>/dev/null || true
success "Aplicação parada"

# 2. Restaurar banco de dados
log "[2/4] Restaurando banco de dados..."
if docker ps | grep -q "$DB_CONTAINER"; then
    # Descomprimir backup
    TEMP_SQL="/tmp/restore_${RANDOM}.sql"
    gunzip -c "$SELECTED_DB_BACKUP" > "$TEMP_SQL"
    
    # Restaurar
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$TEMP_SQL"
    
    rm "$TEMP_SQL"
    success "Banco de dados restaurado"
else
    error "Container PostgreSQL não está rodando"
fi

# 3. Restaurar uploads
log "[3/4] Restaurando uploads..."
if [ -d "$APP_DIR/backend" ]; then
    # Fazer backup dos uploads atuais
    if [ -d "$APP_DIR/backend/uploads" ]; then
        mv "$APP_DIR/backend/uploads" "$APP_DIR/backend/uploads.old.$$"
        warning "Uploads antigos movidos para uploads.old.$$"
    fi
    
    # Restaurar do backup
    tar -xzf "$SELECTED_UPLOAD_BACKUP" -C "$APP_DIR/backend"
    
    success "Uploads restaurados"
else
    error "Diretório da aplicação não encontrado"
fi

# 4. Reiniciar aplicação
log "[4/4] Reiniciando aplicação..."
pm2 restart sispat-backend
success "Aplicação reiniciada"

echo ""
echo "========================================="
echo -e "${GREEN}RESTAURAÇÃO CONCLUÍDA COM SUCESSO!${NC}"
echo "========================================="
echo ""
log "Verifique se o sistema está funcionando corretamente"
log "Acesse: https://seu-dominio.com"
echo ""

exit 0

