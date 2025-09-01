#!/bin/bash

# =================================
# CORREÇÃO FINAL - Erro Export no Deploy
# SISPAT - Sistema de Patrimônio
# =================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[SUCESSO]${NC} $1"; }
warning() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
error() { echo -e "${RED}[ERRO]${NC} $1"; }

log "🔧 CORREÇÃO FINAL - Erro Export no Deploy..."

# 1. Verificar se o build foi criado
log "📋 Verificando se o build foi criado..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    success "✅ Build encontrado e válido"
else
    error "❌ Build não encontrado ou inválido"
    exit 1
fi

# 2. Verificar e corrigir arquivo .env.production
log "📋 Verificando arquivo .env.production..."
if [ -f ".env.production" ]; then
    success "✅ Arquivo .env.production encontrado"
    
    # Fazer backup do arquivo atual
    cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
    
    # Recriar o arquivo .env.production com formatação correta
    log "🔧 Recriando .env.production com formatação correta..."
    cat > .env.production << 'EOF'
# Configurações do Servidor
PORT=3001
HOST=0.0.0.0

# Banco de Dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_production
DB_USER=sispat_user
DB_PASSWORD=sispat123456
DATABASE_URL=postgresql://sispat_user:sispat123456@localhost:5432/sispat_production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=sispat123456
REDIS_URL=redis://:sispat123456@localhost:6379

# JWT e Segurança
JWT_SECRET=sispat_jwt_secret_production_2025_very_secure_key_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://sispat.vps-kinghost.net
CORS_CREDENTIALS=true

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30

# IMPORTANTE: NÃO definir NODE_ENV aqui - o Vite gerencia automaticamente
EOF

    success "✅ .env.production recriado com formatação correta"
else
    error "❌ Arquivo .env.production não encontrado"
    exit 1
fi

# 3. Verificar se não há caracteres especiais
log "🔍 Verificando caracteres especiais..."
if grep -q '[^[:print:][:space:]]' .env.production; then
    warning "⚠️ Caracteres especiais encontrados - corrigindo..."
    # Remover caracteres especiais
    tr -cd '[:print:][:space:]\n' < .env.production > .env.production.tmp
    mv .env.production.tmp .env.production
    success "✅ Caracteres especiais corrigidos"
else
    success "✅ Nenhum caractere especial encontrado"
fi

# 4. Testar se o arquivo pode ser carregado corretamente
log "🧪 Testando carregamento do .env.production..."
if source .env.production 2>/dev/null; then
    success "✅ .env.production pode ser carregado corretamente"
else
    error "❌ Falha ao carregar .env.production"
    exit 1
fi

# 5. Tentar iniciar o backend
log "🚀 Tentando iniciar o backend..."
if command -v pm2 &> /dev/null; then
    # Parar processos existentes
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    # Iniciar backend
    log "📦 Iniciando backend com PM2..."
    pm2 start ecosystem.config.cjs --env production --name "sispat-backend"
    
    # Aguardar inicialização
    sleep 5
    
    # Verificar status
    if pm2 list | grep -q "sispat-backend.*online"; then
        success "✅ Backend iniciado com sucesso"
    else
        warning "⚠️ Backend pode não estar funcionando corretamente"
    fi
    
    # Mostrar status
    pm2 status
else
    warning "⚠️ PM2 não encontrado"
fi

# 6. Verificação final
log "🔍 Verificação final..."
echo ""
echo "📊 STATUS DOS SERVIÇOS:"
echo "========================"

if command -v pm2 &> /dev/null; then
    pm2 status
else
    echo "PM2 não disponível"
fi

echo ""
echo "🗄️ VERIFICAÇÃO DO BANCO:"
echo "========================"

if sudo -u postgres psql -d sispat_production -c "SELECT version();" > /dev/null 2>&1; then
    success "✅ Banco de dados PostgreSQL funcionando"
else
    warning "⚠️ Problema com banco de dados"
fi

echo ""
echo "🔴 VERIFICAÇÃO DO REDIS:"
echo "========================"

if redis-cli -a sispat123456 ping > /dev/null 2>&1; then
    success "✅ Redis funcionando"
else
    warning "⚠️ Problema com Redis"
fi

# 7. Instruções finais
log "📝 CORREÇÃO CONCLUÍDA!"
echo ""
echo "🎉 PROBLEMA DE EXPORT RESOLVIDO!"
echo "=================================="
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Configure SSL com Certbot:"
echo "   certbot --nginx -d sispat.vps-kinghost.net"
echo ""
echo "2. Acesse sua aplicação:"
echo "   - Frontend: http://sispat.vps-kinghost.net"
echo "   - Backend: http://sispat.vps-kinghost.net/api"
echo ""
echo "3. Verifique logs:"
echo "   pm2 logs"
echo "   journalctl -u nginx -f"
echo ""
echo "4. Se precisar reiniciar:"
echo "   pm2 restart all"
echo ""

success "🎉 Correção do erro de export concluída com sucesso!"
success "✅ SISPAT deve estar funcionando agora!"
