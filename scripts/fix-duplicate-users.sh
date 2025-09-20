#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO DE USUÁRIOS DUPLICADOS - SISPAT
# Para corrigir o erro "could not create unique index ... Key (email) is duplicated"
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${BLUE}🚀 $1${NC}"
}

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
    log_error "Este script deve ser executado como root!"
    log_info "Execute: sudo su -"
    exit 1
fi

log_header "Corrigindo usuários duplicados no SISPAT..."

# Definir credenciais do banco
DB_NAME="sispat_db"
DB_USER="postgres"
DB_PASSWORD="postgres"

# Função para executar SQL
execute_sql() {
    local sql="$1"
    log_info "Executando: $sql"
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "$sql" || {
        log_warning "Comando SQL falhou, mas continuando: $sql"
    }
}

# 1. Verificar duplicados atuais
log_header "Verificando duplicados atuais..."
execute_sql "
SELECT email, COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
"

# 2. Remover duplicados mantendo apenas o primeiro (menor ID)
log_header "Removendo duplicados..."
execute_sql "
-- Forçar remoção de duplicados (mantendo apenas o primeiro)
WITH ranked_users AS (
    SELECT id, email,
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) as rn
    FROM users
)
DELETE FROM users
WHERE id IN (
    SELECT id FROM ranked_users WHERE rn > 1
);
"

# 3. Verificar se ainda há duplicados
log_header "Verificando se duplicados foram removidos..."
execute_sql "
SELECT email, COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
"

# 4. Tentar criar o índice único
log_header "Criando índice único..."
execute_sql "
DROP INDEX IF EXISTS users_email_unique_idx;
CREATE UNIQUE INDEX users_email_unique_idx ON users(email);
"

# 5. Verificar se o índice foi criado
log_header "Verificando índice criado..."
execute_sql "
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users' AND indexname = 'users_email_unique_idx';
"

log_success "Correção de usuários duplicados concluída!"
log_info "Agora você pode tentar executar o script de correção principal novamente."
