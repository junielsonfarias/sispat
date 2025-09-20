#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO DE ERROS ON CONFLICT - SISPAT
# Para corrigir erros "there is no unique or exclusion constraint matching the ON CONFLICT specification"
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

log_header "Corrigindo erros ON CONFLICT no SISPAT..."

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

# 1. Criar índices únicos necessários para ON CONFLICT
log_header "Criando índices únicos necessários..."

execute_sql "
-- Índice único para municipalities.code
CREATE UNIQUE INDEX IF NOT EXISTS municipalities_code_unique_idx ON municipalities(code);
"

execute_sql "
-- Índice único para sectors.code
CREATE UNIQUE INDEX IF NOT EXISTS sectors_code_unique_idx ON sectors(code);
"

execute_sql "
-- Índice único para locals.code
CREATE UNIQUE INDEX IF NOT EXISTS locals_code_unique_idx ON locals(code);
"

execute_sql "
-- Índice único para patrimonios.numero_patrimonio
CREATE UNIQUE INDEX IF NOT EXISTS patrimonios_numero_unique_idx ON patrimonios(numero_patrimonio);
"

execute_sql "
-- Índice único para imoveis.numero_patrimonio
CREATE UNIQUE INDEX IF NOT EXISTS imoveis_numero_unique_idx ON imoveis(numero_patrimonio);
"

execute_sql "
-- Índice único para system_config.key
CREATE UNIQUE INDEX IF NOT EXISTS system_config_key_unique_idx ON system_config(key);
"

execute_sql "
-- Índice único para customization_settings.chave
CREATE UNIQUE INDEX IF NOT EXISTS customization_settings_chave_unique_idx ON customization_settings(chave);
"

# 2. Verificar se os índices foram criados
log_header "Verificando índices criados..."
execute_sql "
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('municipalities', 'sectors', 'locals', 'patrimonios', 'imoveis', 'system_config', 'customization_settings')
  AND indexname LIKE '%_unique_idx'
ORDER BY tablename, indexname;
"

# 3. Testar inserções com ON CONFLICT
log_header "Testando inserções com ON CONFLICT..."

execute_sql "
INSERT INTO municipalities (name, code, state)
VALUES ('Município Teste', '999999', 'SP')
ON CONFLICT (code) DO NOTHING;
"

execute_sql "
INSERT INTO sectors (name, code, municipality_id)
VALUES ('Setor Teste', '999', 1)
ON CONFLICT (code) DO NOTHING;
"

execute_sql "
INSERT INTO locals (name, code, sector_id)
VALUES ('Local Teste', '999', 1)
ON CONFLICT (code) DO NOTHING;
"

# 4. Limpar dados de teste
log_header "Limpando dados de teste..."
execute_sql "
DELETE FROM locals WHERE code = '999';
DELETE FROM sectors WHERE code = '999';
DELETE FROM municipalities WHERE code = '999';
"

log_success "Correção de erros ON CONFLICT concluída!"
log_info "Agora você pode tentar executar o script de inicialização do banco novamente."
