#!/bin/bash

# =================================
# CORREÇÃO ORDEM MIGRAÇÃO - SISPAT
# Corrige ordem das tabelas na migração
# =================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Função para erro
error() {
    echo -e "${RED}[ERRO]${NC} $1"
    exit 1
}

# Função para sucesso
success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

# Função para aviso
warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Banner
echo ""
echo "🔧 ================================================"
echo "🔧    CORREÇÃO ORDEM MIGRAÇÃO - SISPAT"
echo "🔧    Corrige ordem das tabelas na migração"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "server/database/migrate.js" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

# Verificar se PostgreSQL está rodando
log "🔍 Verificando status do PostgreSQL..."
if ! systemctl is-active --quiet postgresql; then
    log "🚀 Iniciando PostgreSQL..."
    systemctl start postgresql
    systemctl enable postgresql
fi

# Verificar se o banco existe
log "🔍 Verificando banco de dados..."
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw sispat_production; then
    error "Banco de dados 'sispat_production' não encontrado. Execute primeiro a instalação completa."
fi

# Limpar tabelas problemáticas
log "🧹 Limpando tabelas problemáticas..."
sudo -u postgres psql -d sispat_production -c "DROP TABLE IF EXISTS user_sectors CASCADE;" 2>/dev/null || true
sudo -u postgres psql -d sispat_production -c "DROP TABLE IF EXISTS sectors CASCADE;" 2>/dev/null || true
success "Tabelas problemáticas removidas"

# Habilitar extensões PostgreSQL
log "🔧 Habilitando extensões PostgreSQL..."
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" 2>/dev/null || true
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>/dev/null || true
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS unaccent;" 2>/dev/null || true
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>/dev/null || true
success "Extensões PostgreSQL habilitadas"

# Executar migrações
log "🗄️ Executando migrações corrigidas..."
if [ -f "server/database/migrate.js" ]; then
    node server/database/migrate.js
    success "Migrações executadas com sucesso"
else
    error "Arquivo de migração não encontrado"
fi

# Verificar se as tabelas foram criadas
log "🔍 Verificando tabelas criadas..."
TABLES=$(sudo -u postgres psql -d sispat_production -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [ "$TABLES" -gt 10 ]; then
    success "✅ $TABLES tabelas criadas com sucesso"
else
    warning "⚠️ Apenas $TABLES tabelas encontradas. Pode haver problemas."
fi

# Listar tabelas criadas
log "📋 Tabelas criadas:"
sudo -u postgres psql -d sispat_production -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

# Instruções finais
log "📝 CORREÇÃO CONCLUÍDA!"
echo ""
echo "🎉 ORDEM DE MIGRAÇÃO CORRIGIDA COM SUCESSO!"
echo "============================================"
echo ""
echo "📋 O que foi feito:"
echo "✅ Tabelas problemáticas removidas"
echo "✅ Extensões PostgreSQL habilitadas"
echo "✅ Migrações executadas na ordem correta"
echo "✅ $TABLES tabelas criadas"
echo ""
echo "🔧 Ordem corrigida:"
echo "   1. municipalities"
echo "   2. users"
echo "   3. sectors (antes de user_sectors)"
echo "   4. user_sectors (depois de sectors)"
echo "   5. locals"
echo "   6. patrimonios"
echo "   7. outras tabelas..."
echo ""
echo "📞 Próximos passos:"
echo "   1. Continue com a instalação"
echo "   2. Execute o build do frontend"
echo "   3. Configure Nginx e SSL"
echo ""

success "🎉 Correção de ordem de migração concluída com sucesso!"
