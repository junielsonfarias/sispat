#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO COMPLETA DE DUPLICADOS - SISPAT
# Remove duplicados de todas as tabelas antes de criar índices únicos
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

log_header "Corrigindo TODOS os duplicados no SISPAT..."

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

# 1. Remover duplicados da tabela users
log_header "Removendo duplicados de users..."
execute_sql "
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

# 2. Remover duplicados da tabela municipalities
log_header "Removendo duplicados de municipalities..."
execute_sql "
WITH ranked_municipalities AS (
    SELECT id, code,
           ROW_NUMBER() OVER (PARTITION BY code ORDER BY id) as rn
    FROM municipalities
)
DELETE FROM municipalities
WHERE id IN (
    SELECT id FROM ranked_municipalities WHERE rn > 1
);
"

# 3. Remover duplicados da tabela sectors
log_header "Removendo duplicados de sectors..."
execute_sql "
WITH ranked_sectors AS (
    SELECT id, code,
           ROW_NUMBER() OVER (PARTITION BY code ORDER BY id) as rn
    FROM sectors
)
DELETE FROM sectors
WHERE id IN (
    SELECT id FROM ranked_sectors WHERE rn > 1
);
"

# 4. Remover duplicados da tabela locals
log_header "Removendo duplicados de locals..."
execute_sql "
WITH ranked_locals AS (
    SELECT id, code,
           ROW_NUMBER() OVER (PARTITION BY code ORDER BY id) as rn
    FROM locals
)
DELETE FROM locals
WHERE id IN (
    SELECT id FROM ranked_locals WHERE rn > 1
);
"

# 5. Remover duplicados da tabela patrimonios
log_header "Removendo duplicados de patrimonios..."
execute_sql "
WITH ranked_patrimonios AS (
    SELECT id, numero_patrimonio,
           ROW_NUMBER() OVER (PARTITION BY numero_patrimonio ORDER BY id) as rn
    FROM patrimonios
)
DELETE FROM patrimonios
WHERE id IN (
    SELECT id FROM ranked_patrimonios WHERE rn > 1
);
"

# 6. Remover duplicados da tabela imoveis
log_header "Removendo duplicados de imoveis..."
execute_sql "
WITH ranked_imoveis AS (
    SELECT id, numero_patrimonio,
           ROW_NUMBER() OVER (PARTITION BY numero_patrimonio ORDER BY id) as rn
    FROM imoveis
)
DELETE FROM imoveis
WHERE id IN (
    SELECT id FROM ranked_imoveis WHERE rn > 1
);
"

# 7. Remover duplicados da tabela system_config
log_header "Removendo duplicados de system_config..."
execute_sql "
WITH ranked_system_config AS (
    SELECT id, key,
           ROW_NUMBER() OVER (PARTITION BY key ORDER BY id) as rn
    FROM system_config
)
DELETE FROM system_config
WHERE id IN (
    SELECT id FROM ranked_system_config WHERE rn > 1
);
"

# 8. Remover duplicados da tabela customization_settings
log_header "Removendo duplicados de customization_settings..."
execute_sql "
WITH ranked_customization AS (
    SELECT id, chave,
           ROW_NUMBER() OVER (PARTITION BY chave ORDER BY id) as rn
    FROM customization_settings
)
DELETE FROM customization_settings
WHERE id IN (
    SELECT id FROM ranked_customization WHERE rn > 1
);
"

# 9. Verificar se ainda há duplicados
log_header "Verificando duplicados restantes..."
execute_sql "
SELECT 'users' as tabela, email as chave, COUNT(*) as count FROM users GROUP BY email HAVING COUNT(*) > 1
UNION ALL
SELECT 'municipalities' as tabela, code as chave, COUNT(*) as count FROM municipalities GROUP BY code HAVING COUNT(*) > 1
UNION ALL
SELECT 'sectors' as tabela, code as chave, COUNT(*) as count FROM sectors GROUP BY code HAVING COUNT(*) > 1
UNION ALL
SELECT 'locals' as tabela, code as chave, COUNT(*) as count FROM locals GROUP BY code HAVING COUNT(*) > 1
UNION ALL
SELECT 'patrimonios' as tabela, numero_patrimonio as chave, COUNT(*) as count FROM patrimonios GROUP BY numero_patrimonio HAVING COUNT(*) > 1
UNION ALL
SELECT 'imoveis' as tabela, numero_patrimonio as chave, COUNT(*) as count FROM imoveis GROUP BY numero_patrimonio HAVING COUNT(*) > 1
UNION ALL
SELECT 'system_config' as tabela, key as chave, COUNT(*) as count FROM system_config GROUP BY key HAVING COUNT(*) > 1
UNION ALL
SELECT 'customization_settings' as tabela, chave as chave, COUNT(*) as count FROM customization_settings GROUP BY chave HAVING COUNT(*) > 1;
"

# 10. Criar todos os índices únicos
log_header "Criando índices únicos..."
execute_sql "
-- Remover índices existentes se houver
DROP INDEX IF EXISTS users_email_unique_idx;
DROP INDEX IF EXISTS municipalities_code_unique_idx;
DROP INDEX IF EXISTS sectors_code_unique_idx;
DROP INDEX IF EXISTS locals_code_unique_idx;
DROP INDEX IF EXISTS patrimonios_numero_unique_idx;
DROP INDEX IF EXISTS imoveis_numero_unique_idx;
DROP INDEX IF EXISTS system_config_key_unique_idx;
DROP INDEX IF EXISTS customization_settings_chave_unique_idx;
"

execute_sql "
-- Criar índices únicos
CREATE UNIQUE INDEX users_email_unique_idx ON users(email);
CREATE UNIQUE INDEX municipalities_code_unique_idx ON municipalities(code);
CREATE UNIQUE INDEX sectors_code_unique_idx ON sectors(code);
CREATE UNIQUE INDEX locals_code_unique_idx ON locals(code);
CREATE UNIQUE INDEX patrimonios_numero_unique_idx ON patrimonios(numero_patrimonio);
CREATE UNIQUE INDEX imoveis_numero_unique_idx ON imoveis(numero_patrimonio);
CREATE UNIQUE INDEX system_config_key_unique_idx ON system_config(key);
CREATE UNIQUE INDEX customization_settings_chave_unique_idx ON customization_settings(chave);
"

# 11. Verificar índices criados
log_header "Verificando índices criados..."
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

log_success "Correção completa de duplicados concluída!"
log_info "Agora você pode tentar executar o script de inicialização do banco novamente."
