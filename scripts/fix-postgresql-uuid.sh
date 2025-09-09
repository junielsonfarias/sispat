#!/bin/bash

# =================================
# CORREÇÃO POSTGRESQL UUID - SISPAT
# Habilita extensão pgcrypto para gen_random_uuid()
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
echo "🔧    CORREÇÃO POSTGRESQL UUID - SISPAT"
echo "🔧    Habilita extensão pgcrypto"
echo "🔧 ================================================"
echo ""

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

# Habilitar extensão pgcrypto
log "🔧 Habilitando extensão pgcrypto..."
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# Verificar se a extensão foi habilitada
log "🔍 Verificando extensão pgcrypto..."
if sudo -u postgres psql -d sispat_production -c "SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto';" | grep -q "1 row"; then
    success "✅ Extensão pgcrypto habilitada com sucesso"
else
    error "❌ Falha ao habilitar extensão pgcrypto"
fi

# Testar função gen_random_uuid
log "🧪 Testando função gen_random_uuid..."
if sudo -u postgres psql -d sispat_production -c "SELECT gen_random_uuid();" > /dev/null 2>&1; then
    success "✅ Função gen_random_uuid funcionando"
else
    error "❌ Função gen_random_uuid não está funcionando"
fi

# Habilitar outras extensões úteis
log "🔧 Habilitando extensões adicionais..."
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS unaccent;"
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

success "✅ Extensões adicionais habilitadas"

# Verificar todas as extensões
log "📋 Extensões habilitadas:"
sudo -u postgres psql -d sispat_production -c "SELECT extname, extversion FROM pg_extension ORDER BY extname;"

# Instruções finais
log "📝 CORREÇÃO CONCLUÍDA!"
echo ""
echo "🎉 POSTGRESQL UUID CORRIGIDO COM SUCESSO!"
echo "=========================================="
echo ""
echo "📋 O que foi feito:"
echo "✅ PostgreSQL verificado e iniciado"
echo "✅ Extensão pgcrypto habilitada"
echo "✅ Função gen_random_uuid testada"
echo "✅ Extensões adicionais habilitadas"
echo ""
echo "🔧 Extensões habilitadas:"
echo "   - pgcrypto (gen_random_uuid)"
echo "   - uuid-ossp (uuid_generate_v4)"
echo "   - unaccent (busca sem acentos)"
echo "   - pg_trgm (busca por similaridade)"
echo ""
echo "📞 Próximos passos:"
echo "   1. Execute as migrações: node server/database/migrate.js"
echo "   2. Continue com a instalação"
echo ""

success "🎉 Correção PostgreSQL UUID concluída com sucesso!"
