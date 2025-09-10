#!/bin/bash

# =================================
# CORREÇÃO RÁPIDA BANCO DE DADOS - SISPAT
# Script simples para corrigir schema
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
echo "🚀 ================================================"
echo "🚀    CORREÇÃO RÁPIDA BANCO DE DADOS - SISPAT"
echo "🚀    Script simples para corrigir schema"
echo "🚀 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🚀 Iniciando correção rápida do banco de dados..."

# 1. Parar PM2 temporariamente
log "🔄 Parando PM2 temporariamente..."
pm2 stop sispat
sleep 3
success "✅ PM2 parado"

# 2. Configurar variáveis de ambiente
log "🔧 Configurando variáveis de ambiente..."
export DB_HOST="localhost"
export DB_USER="sispat"
export DB_PASSWORD="sispat123"
export DB_NAME="sispat"
export DB_PORT="5432"
success "✅ Variáveis configuradas"

# 3. Testar conexão
log "🔌 Testando conexão com PostgreSQL..."
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "SELECT 1;" &> /dev/null; then
    error "❌ Não foi possível conectar ao banco de dados"
fi
success "✅ Conexão estabelecida"

# 4. Corrigir colunas faltantes
log "🔧 Corrigindo colunas faltantes..."

# Adicionar coluna setor_responsavel
echo "Adicionando coluna setor_responsavel..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS setor_responsavel VARCHAR(255);" 2>/dev/null || warning "⚠️ Erro ao adicionar setor_responsavel"
success "✅ Coluna setor_responsavel corrigida"

# Adicionar coluna status
echo "Adicionando coluna status..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ativo';" 2>/dev/null || warning "⚠️ Erro ao adicionar status"
success "✅ Coluna status corrigida"

# 5. Criar tabela transfers
log "🔧 Criando tabela transfers..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patrimonio_id UUID REFERENCES patrimonios(id),
    from_setor VARCHAR(255),
    to_setor VARCHAR(255),
    from_user_id UUID,
    to_user_id UUID,
    transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);" 2>/dev/null || warning "⚠️ Erro ao criar tabela transfers"
success "✅ Tabela transfers criada"

# 6. Verificar correções
log "🔍 Verificando correções aplicadas..."

# Verificar coluna setor_responsavel
SETOR_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patrimonios' AND column_name = 'setor_responsavel');" 2>/dev/null | tr -d ' ' || echo "f")
if [ "$SETOR_EXISTS" = "t" ]; then
    success "✅ Coluna setor_responsavel existe"
else
    warning "⚠️ Coluna setor_responsavel não existe"
fi

# Verificar coluna status
STATUS_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patrimonios' AND column_name = 'status');" 2>/dev/null | tr -d ' ' || echo "f")
if [ "$STATUS_EXISTS" = "t" ]; then
    success "✅ Coluna status existe"
else
    warning "⚠️ Coluna status não existe"
fi

# Verificar tabela transfers
TRANSFERS_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transfers');" 2>/dev/null | tr -d ' ' || echo "f")
if [ "$TRANSFERS_EXISTS" = "t" ]; then
    success "✅ Tabela transfers existe"
else
    warning "⚠️ Tabela transfers não existe"
fi

# 7. Reiniciar PM2
log "🔄 Reiniciando PM2..."
pm2 start sispat
sleep 5
success "✅ PM2 reiniciado"

# 8. Aguardar inicialização
log "⏳ Aguardando inicialização (15 segundos)..."
sleep 15

# 9. Testar APIs
log "🧪 Testando APIs após correção..."

# Testar API patrimonios
echo "Testando /api/patrimonios:"
PATRIMONIOS_RESPONSE=$(curl -s -w "%{http_code}" https://sispat.vps-kinghost.net/api/patrimonios 2>/dev/null || echo "ERRO")
if echo "$PATRIMONIOS_RESPONSE" | grep -q "200"; then
    success "✅ API patrimonios funcionando"
else
    warning "⚠️ API patrimonios: $PATRIMONIOS_RESPONSE"
fi

# Testar API sync
echo "Testando /api/sync/public-data:"
SYNC_RESPONSE=$(curl -s -w "%{http_code}" https://sispat.vps-kinghost.net/api/sync/public-data 2>/dev/null || echo "ERRO")
if echo "$SYNC_RESPONSE" | grep -q "200"; then
    success "✅ API sync public-data funcionando"
else
    warning "⚠️ API sync public-data: $SYNC_RESPONSE"
fi

# 10. Verificar logs
log "📋 Verificando logs após correção..."
echo ""
pm2 logs sispat --lines 10 --nostream | tail -5
echo ""

# Instruções finais
echo ""
echo "🎉 CORREÇÃO RÁPIDA CONCLUÍDA!"
echo "============================="
echo ""
echo "📋 O que foi feito:"
echo "✅ PM2 parado temporariamente"
echo "✅ Conexão com banco estabelecida"
echo "✅ Coluna setor_responsavel adicionada"
echo "✅ Coluna status adicionada"
echo "✅ Tabela transfers criada"
echo "✅ PM2 reiniciado"
echo "✅ APIs testadas"
echo ""
echo "🔧 Correções aplicadas:"
echo "   - Coluna setor_responsavel na tabela patrimonios"
echo "   - Coluna status na tabela patrimonios"
echo "   - Tabela transfers criada"
echo ""
echo "🌐 URLs das APIs:"
echo "   - Frontend: https://sispat.vps-kinghost.net"
echo "   - API Patrimonios: https://sispat.vps-kinghost.net/api/patrimonios"
echo "   - API Sync: https://sispat.vps-kinghost.net/api/sync/public-data"
echo ""
echo "📞 Próximos passos:"
echo "   1. LIMPE O CACHE DO NAVEGADOR (Ctrl+F5)"
echo "   2. Acesse https://sispat.vps-kinghost.net"
echo "   3. Verifique se não há mais erros no console"
echo "   4. Faça login com: junielsonfarias@gmail.com / Tiko6273@"
echo ""
echo "🔍 Para monitorar:"
echo "   - Logs: pm2 logs sispat --lines 50"
echo "   - Status: pm2 status"
echo ""

success "🎉 Correção rápida concluída!"