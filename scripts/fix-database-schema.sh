#!/bin/bash

# =============================================================================
# SCRIPT PARA CORRIGIR ESQUEMA DO BANCO - SISPAT
# Adiciona colunas faltantes e corrige índices
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

log_header "Corrigindo esquema do banco de dados SISPAT..."

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

# Verificar se o banco existe
log_info "Verificando conexão com o banco..."
if ! PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1; then
    log_error "Não foi possível conectar ao banco de dados $DB_NAME"
    exit 1
fi

log_success "Conexão com o banco estabelecida"

# Adicionar coluna deleted_at nas tabelas patrimonios e imoveis se não existir
log_header "Adicionando coluna deleted_at..."

log_info "Verificando se a coluna deleted_at existe na tabela patrimonios..."
if ! PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "\d patrimonios" | grep -q "deleted_at"; then
    log_info "Adicionando coluna deleted_at na tabela patrimonios..."
    execute_sql "ALTER TABLE patrimonios ADD COLUMN deleted_at TIMESTAMP;"
    log_success "Coluna deleted_at adicionada na tabela patrimonios"
else
    log_info "Coluna deleted_at já existe na tabela patrimonios"
fi

log_info "Verificando se a coluna deleted_at existe na tabela imoveis..."
if ! PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "\d imoveis" | grep -q "deleted_at"; then
    log_info "Adicionando coluna deleted_at na tabela imoveis..."
    execute_sql "ALTER TABLE imoveis ADD COLUMN deleted_at TIMESTAMP;"
    log_success "Coluna deleted_at adicionada na tabela imoveis"
else
    log_info "Coluna deleted_at já existe na tabela imoveis"
fi

# Verificar se as colunas two_factor existem na tabela users
log_info "Verificando colunas 2FA na tabela users..."
if ! PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "\d users" | grep -q "two_factor_secret"; then
    log_info "Adicionando colunas 2FA na tabela users..."
    execute_sql "ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);"
    execute_sql "ALTER TABLE users ADD COLUMN two_factor_backup_codes TEXT;"
    log_success "Colunas 2FA adicionadas na tabela users"
else
    log_info "Colunas 2FA já existem na tabela users"
fi

# Criar índices para deleted_at
log_header "Criando índices para deleted_at..."

log_info "Criando índice para deleted_at na tabela patrimonios..."
execute_sql "CREATE INDEX IF NOT EXISTS idx_patrimonios_deleted_at ON patrimonios(deleted_at);"

log_info "Criando índice para deleted_at na tabela imoveis..."
execute_sql "CREATE INDEX IF NOT EXISTS idx_imoveis_deleted_at ON imoveis(deleted_at);"

# Verificar se todos os índices necessários existem
log_header "Verificando índices únicos..."

execute_sql "
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('users', 'municipalities', 'sectors', 'locals', 'patrimonios', 'imoveis', 'system_config', 'customization_settings')
  AND indexname LIKE '%_unique_idx'
ORDER BY tablename, indexname;
"

log_success "Esquema do banco corrigido com sucesso!"

log_info "💡 Próximos passos:"
log_info "   1. Reinicie o PM2: pm2 restart all"
log_info "   2. Teste a aplicação: curl http://localhost:3001/api/health"
log_info "   3. Acesse a aplicação no navegador"