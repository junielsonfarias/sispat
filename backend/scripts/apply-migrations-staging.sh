#!/bin/bash

# ============================================================================
# SCRIPT: Aplicar Migrations em Staging
# Versão: v2.0.5
# Data: 2025-10-11
# ============================================================================
# 
# Este script aplica as migrations de forma segura:
# 1. ResponsibleSectors → IDs
# 2. Normalização de campos duplicados
#
# ============================================================================

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-sispat_staging}"
DB_USER="${DB_USER:-postgres}"

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  SISPAT - Aplicar Migrations Staging  ║${NC}"
echo -e "${GREEN}║           Versão 2.0.5                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Verificar se está em staging
echo -e "${YELLOW}⚠️  ATENÇÃO: Este script aplica migrations irreversíveis!${NC}"
echo -e "${YELLOW}⚠️  Ambiente: ${DB_NAME}${NC}"
echo ""
read -p "Tem certeza que deseja continuar? (sim/não): " confirm

if [ "$confirm" != "sim" ]; then
    echo -e "${RED}❌ Operação cancelada pelo usuário.${NC}"
    exit 1
fi

# Verificar se psql está instalado
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql não encontrado. Instale o PostgreSQL client.${NC}"
    exit 1
fi

# Testar conexão
echo -e "${GREEN}🔍 Testando conexão com o banco...${NC}"
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}❌ Não foi possível conectar ao banco de dados.${NC}"
    echo "   Host: $DB_HOST:$DB_PORT"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"
    exit 1
fi
echo -e "${GREEN}✅ Conexão bem-sucedida!${NC}"
echo ""

# Criar backup antes de aplicar migrations
echo -e "${GREEN}📦 Criando backup completo...${NC}"
BACKUP_FILE="backup_before_migrations_$(date +%Y%m%d_%H%M%S).sql"
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"
echo ""

# Aplicar Migration 1: ResponsibleSectors → IDs
echo -e "${GREEN}🔄 Aplicando Migration 1: ResponsibleSectors → IDs${NC}"
echo "   Arquivo: 03_responsible_sectors_ids.sql"
echo ""

MIGRATION_1="../migrations-plan/03_responsible_sectors_ids.sql"

if [ ! -f "$MIGRATION_1" ]; then
    echo -e "${RED}❌ Arquivo de migration não encontrado: $MIGRATION_1${NC}"
    exit 1
fi

read -p "Aplicar Migration 1? (sim/não): " apply1

if [ "$apply1" = "sim" ]; then
    echo -e "${GREEN}⚙️  Executando...${NC}"
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_1"; then
        echo -e "${GREEN}✅ Migration 1 aplicada com sucesso!${NC}"
    else
        echo -e "${RED}❌ Erro ao aplicar Migration 1.${NC}"
        echo -e "${YELLOW}💾 Backup disponível: $BACKUP_FILE${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⏭️  Migration 1 pulada.${NC}"
fi
echo ""

# Aplicar Migration 2: Normalização de campos
echo -e "${GREEN}🔄 Aplicando Migration 2: Normalização de Campos${NC}"
echo "   Arquivo: 02_normalizar_campos_duplicados.sql"
echo ""

MIGRATION_2="../migrations-plan/02_normalizar_campos_duplicados.sql"

if [ ! -f "$MIGRATION_2" ]; then
    echo -e "${RED}❌ Arquivo de migration não encontrado: $MIGRATION_2${NC}"
    exit 1
fi

read -p "Aplicar Migration 2? (sim/não): " apply2

if [ "$apply2" = "sim" ]; then
    echo -e "${GREEN}⚙️  Executando...${NC}"
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_2"; then
        echo -e "${GREEN}✅ Migration 2 aplicada com sucesso!${NC}"
    else
        echo -e "${RED}❌ Erro ao aplicar Migration 2.${NC}"
        echo -e "${YELLOW}💾 Backup disponível: $BACKUP_FILE${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⏭️  Migration 2 pulada.${NC}"
fi
echo ""

# Verificar integridade
echo -e "${GREEN}🔍 Verificando integridade do banco...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
-- Verificar usuários com responsibleSectorIds
SELECT 
  'Users com responsibleSectorIds' as check_name,
  COUNT(*) as total,
  COUNT(CASE WHEN array_length("responsibleSectorIds", 1) > 0 THEN 1 END) as with_ids
FROM users;

-- Verificar patrimônios com FKs
SELECT 
  'Patrimonios com FKs' as check_name,
  COUNT(*) as total,
  COUNT("sectorId") as with_sector_fk,
  COUNT("tipoId") as with_tipo_fk
FROM patrimonios;
EOF
echo -e "${GREEN}✅ Verificação concluída!${NC}"
echo ""

# Resumo final
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         MIGRATIONS APLICADAS!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Backup: $BACKUP_FILE${NC}"
echo -e "${GREEN}✅ Database: $DB_NAME${NC}"
echo ""
echo -e "${YELLOW}📋 PRÓXIMOS PASSOS:${NC}"
echo "1. Testar aplicação em staging"
echo "2. Validar por 1 semana"
echo "3. Se OK, aplicar em produção"
echo ""
echo -e "${YELLOW}🔄 ROLLBACK (se necessário):${NC}"
echo "   PGPASSWORD=\$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
echo ""

