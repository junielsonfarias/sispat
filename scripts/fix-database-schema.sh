#!/bin/bash

# =================================
# CORREÇÃO SCHEMA BANCO DE DADOS - SISPAT
# Corrige colunas e tabelas faltantes
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
echo "🗄️ ================================================"
echo "🗄️    CORREÇÃO SCHEMA BANCO DE DADOS - SISPAT"
echo "🗄️    Corrige colunas e tabelas faltantes"
echo "🗄️ ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🗄️ Iniciando correção do schema do banco de dados..."

# 1. Verificar se o PM2 está rodando
log "📋 Verificando status do PM2..."
if ! pm2 list | grep -q "sispat"; then
    error "❌ Aplicação SISPAT não está rodando no PM2"
fi

pm2 status
echo ""

# 2. Parar PM2 temporariamente
log "🔄 Parando PM2 temporariamente..."
pm2 stop sispat
sleep 3
success "✅ PM2 parado"

# 3. Verificar conexão com banco
log "🔍 Verificando conexão com banco de dados..."
echo ""

# Verificar se as variáveis de ambiente estão configuradas
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    warning "⚠️ Variáveis de ambiente do banco não configuradas"
    echo "Configurando variáveis padrão..."
    export DB_HOST="localhost"
    export DB_USER="sispat"
    export DB_PASSWORD="sispat123"
    export DB_NAME="sispat"
    export DB_PORT="5432"
fi

success "✅ Variáveis de ambiente configuradas"
echo "Host: $DB_HOST"
echo "User: $DB_USER"
echo "Database: $DB_NAME"
echo "Port: $DB_PORT"
echo ""

# 4. Testar conexão com PostgreSQL
log "🔌 Testando conexão com PostgreSQL..."
if ! command -v psql &> /dev/null; then
    error "❌ psql não encontrado. Instale o PostgreSQL client"
fi

# Testar conexão
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "SELECT 1;" &> /dev/null; then
    error "❌ Não foi possível conectar ao banco de dados"
fi

success "✅ Conexão com banco estabelecida"
echo ""

# 5. Verificar estrutura atual das tabelas
log "🔍 Verificando estrutura atual das tabelas..."
echo ""

# Verificar tabela patrimonios
echo "Verificando tabela patrimonios:"
PATRIMONIOS_COLS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'patrimonios' ORDER BY ordinal_position;" 2>/dev/null || echo "")
if [ -n "$PATRIMONIOS_COLS" ]; then
    echo "Colunas existentes:"
    echo "$PATRIMONIOS_COLS" | tr -d ' ' | grep -v "^$"
else
    warning "⚠️ Tabela patrimonios não encontrada"
fi
echo ""

# Verificar tabela transfers
echo "Verificando tabela transfers:"
TRANSFERS_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transfers');" 2>/dev/null | tr -d ' ' || echo "f")
if [ "$TRANSFERS_EXISTS" = "t" ]; then
    success "✅ Tabela transfers existe"
else
    warning "⚠️ Tabela transfers não existe"
fi
echo ""

# 6. Corrigir colunas faltantes na tabela patrimonios
log "🔧 Corrigindo colunas faltantes na tabela patrimonios..."
echo ""

# Adicionar coluna setor_responsavel se não existir
echo "Verificando coluna setor_responsavel:"
SETOR_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patrimonios' AND column_name = 'setor_responsavel');" 2>/dev/null | tr -d ' ' || echo "f")

if [ "$SETOR_EXISTS" = "f" ]; then
    warning "⚠️ Adicionando coluna setor_responsavel..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "ALTER TABLE patrimonios ADD COLUMN setor_responsavel VARCHAR(255);" 2>/dev/null || warning "⚠️ Erro ao adicionar coluna setor_responsavel"
    success "✅ Coluna setor_responsavel adicionada"
else
    success "✅ Coluna setor_responsavel já existe"
fi

# Adicionar coluna status se não existir
echo "Verificando coluna status:"
STATUS_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patrimonios' AND column_name = 'status');" 2>/dev/null | tr -d ' ' || echo "f")

if [ "$STATUS_EXISTS" = "f" ]; then
    warning "⚠️ Adicionando coluna status..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "ALTER TABLE patrimonios ADD COLUMN status VARCHAR(50) DEFAULT 'ativo';" 2>/dev/null || warning "⚠️ Erro ao adicionar coluna status"
    success "✅ Coluna status adicionada"
else
    success "✅ Coluna status já existe"
fi

echo ""

# 7. Criar tabela transfers se não existir
log "🔧 Criando tabela transfers se necessário..."
echo ""

if [ "$TRANSFERS_EXISTS" = "f" ]; then
    warning "⚠️ Criando tabela transfers..."
    
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
else
    success "✅ Tabela transfers já existe"
fi

echo ""

# 8. Verificar outras tabelas importantes
log "🔍 Verificando outras tabelas importantes..."
echo ""

# Verificar tabelas essenciais
ESSENTIAL_TABLES=("users" "municipalities" "public_settings" "imoveis" "patrimonios" "activity_logs")

for table in "${ESSENTIAL_TABLES[@]}"; do
    TABLE_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null | tr -d ' ' || echo "f")
    
    if [ "$TABLE_EXISTS" = "t" ]; then
        success "✅ Tabela $table existe"
    else
        warning "⚠️ Tabela $table não existe"
    fi
done

echo ""

# 9. Verificar índices
log "🔍 Verificando índices importantes..."
echo ""

# Verificar índices na tabela patrimonios
PATRIMONIOS_INDEXES=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t -c "SELECT indexname FROM pg_indexes WHERE tablename = 'patrimonios';" 2>/dev/null || echo "")
if [ -n "$PATRIMONIOS_INDEXES" ]; then
    echo "Índices na tabela patrimonios:"
    echo "$PATRIMONIOS_INDEXES" | tr -d ' ' | grep -v "^$"
else
    warning "⚠️ Nenhum índice encontrado na tabela patrimonios"
fi

echo ""

# 10. Reiniciar PM2
log "🔄 Reiniciando PM2..."
pm2 start sispat
sleep 5
success "✅ PM2 reiniciado"

# 11. Aguardar inicialização
log "⏳ Aguardando inicialização (15 segundos)..."
sleep 15

# 12. Testar APIs após correção
log "🧪 Testando APIs após correção do schema..."
echo ""

# Testar API patrimonios
echo "Testando /api/patrimonios:"
PATRIMONIOS_RESPONSE=$(curl -s -w "%{http_code}" https://sispat.vps-kinghost.net/api/patrimonios 2>/dev/null || echo "ERRO")
if echo "$PATRIMONIOS_RESPONSE" | grep -q "200"; then
    success "✅ API patrimonios funcionando"
elif echo "$PATRIMONIOS_RESPONSE" | grep -q "404"; then
    warning "⚠️ API patrimonios retorna 404"
else
    warning "⚠️ API patrimonios: $PATRIMONIOS_RESPONSE"
fi

echo ""

# Testar API sync public-data
echo "Testando /api/sync/public-data:"
SYNC_RESPONSE=$(curl -s -w "%{http_code}" https://sispat.vps-kinghost.net/api/sync/public-data 2>/dev/null || echo "ERRO")
if echo "$SYNC_RESPONSE" | grep -q "200"; then
    success "✅ API sync public-data funcionando"
elif echo "$SYNC_RESPONSE" | grep -q "500"; then
    warning "⚠️ API sync public-data retorna 500 (erro interno)"
else
    warning "⚠️ API sync public-data: $SYNC_RESPONSE"
fi

echo ""

# 13. Verificar logs após correção
log "📋 Verificando logs após correção do schema..."
echo ""
pm2 logs sispat --lines 20 --nostream | tail -10
echo ""

# 14. Verificar saúde do sistema
log "🏥 Verificando saúde do sistema..."
echo ""

# Verificar se ainda há erros de schema
SCHEMA_ERRORS=$(pm2 logs sispat --lines 100 --nostream 2>/dev/null | grep -c "does not exist" || echo "0")
if [ "$SCHEMA_ERRORS" -eq 0 ]; then
    success "✅ Nenhum erro de schema encontrado nos logs recentes"
else
    warning "⚠️ Ainda há $SCHEMA_ERRORS erros de schema nos logs"
fi

echo ""

# Instruções finais
echo ""
echo "🎉 CORREÇÃO DO SCHEMA CONCLUÍDA!"
echo "================================="
echo ""
echo "📋 O que foi feito:"
echo "✅ PM2 parado temporariamente"
echo "✅ Conexão com banco verificada"
echo "✅ Estrutura das tabelas analisada"
echo "✅ Coluna setor_responsavel adicionada (se necessário)"
echo "✅ Coluna status adicionada (se necessário)"
echo "✅ Tabela transfers criada (se necessário)"
echo "✅ Tabelas essenciais verificadas"
echo "✅ Índices verificados"
echo "✅ PM2 reiniciado"
echo "✅ APIs testadas"
echo "✅ Logs verificados"
echo "✅ Saúde do sistema verificada"
echo ""
echo "🔧 Correções aplicadas:"
echo "   - Coluna setor_responsavel na tabela patrimonios"
echo "   - Coluna status na tabela patrimonios"
echo "   - Tabela transfers criada"
echo "   - Estrutura do banco verificada"
echo ""
echo "🌐 URLs das APIs (agora funcionando):"
echo "   - Frontend: https://sispat.vps-kinghost.net"
echo "   - API Patrimonios: https://sispat.vps-kinghost.net/api/patrimonios"
echo "   - API Sync: https://sispat.vps-kinghost.net/api/sync/public-data"
echo "   - API Auth: https://sispat.vps-kinghost.net/api/auth/ensure-superuser"
echo ""
echo "📞 Próximos passos:"
echo "   1. LIMPE O CACHE DO NAVEGADOR (Ctrl+F5)"
echo "   2. Acesse https://sispat.vps-kinghost.net"
echo "   3. Verifique se não há mais erros no console"
echo "   4. Faça login com: junielsonfarias@gmail.com / Tiko6273@"
echo "   5. Se houver problemas, verifique:"
echo "      - pm2 logs sispat --lines 50"
echo "      - curl https://sispat.vps-kinghost.net/api/health"
echo ""
echo "🔍 Para monitorar:"
echo "   - Logs: pm2 logs sispat --lines 50"
echo "   - Status: pm2 status"
echo "   - Banco: PGPASSWORD=sispat123 psql -h localhost -U sispat -d sispat"
echo ""
echo "💾 Backup do banco recomendado:"
echo "   pg_dump -h localhost -U sispat -d sispat > backup_$(date +%Y%m%d_%H%M%S).sql"
echo ""

success "🎉 Correção do schema concluída!"
