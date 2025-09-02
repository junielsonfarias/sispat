#!/bin/bash

# =================================
# CORREÇÃO RÁPIDA - ERRO EXPORT NO DEPLOY
# SISPAT - Sistema de Patrimônio
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

log "🔧 CORREÇÃO RÁPIDA - Erro Export no Deploy..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

# 1. Verificar se o build foi criado
log "📋 Verificando se o build foi criado..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    success "✅ Build encontrado e válido"
else
    error "❌ Build não encontrado ou inválido"
fi

# 2. Verificar arquivo .env.production
log "📋 Verificando arquivo .env.production..."
if [ -f ".env.production" ]; then
    success "✅ Arquivo .env.production encontrado"
    
    # Verificar se há linhas problemáticas
    if grep -q "NODE_ENV=production" .env.production; then
        log "⚠️ NODE_ENV=production encontrado - removendo..."
        sed -i '/NODE_ENV=production/d' .env.production
        success "NODE_ENV=production removido"
    fi
    
    # Verificar se há caracteres especiais problemáticos
    if grep -q "\\+%s" .env.production; then
        log "⚠️ Caracteres especiais encontrados - corrigindo..."
        sed -i 's/\\+%s//g' .env.production
        success "Caracteres especiais corrigidos"
    fi
else
    error "❌ Arquivo .env.production não encontrado"
fi

# 3. Tentar iniciar o backend manualmente
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
    
    # Salvar configuração
    pm2 save
    success "✅ Configuração PM2 salva"
    
else
    warning "⚠️ PM2 não encontrado"
fi

# 4. Verificar se a aplicação está rodando
log "🔍 Verificando status da aplicação..."
if command -v pm2 &> /dev/null; then
    echo ""
    echo "📊 STATUS PM2:"
    echo "=============="
    pm2 status
    echo ""
    
    echo "📋 LOGS RECENTES:"
    echo "=================="
    pm2 logs --lines 10
    echo ""
fi

# 5. Verificar portas
log "🔌 Verificando portas..."
if netstat -tlnp 2>/dev/null | grep -q ":3001"; then
    success "✅ Porta 3001 (backend) está ativa"
else
    warning "⚠️ Porta 3001 não está ativa"
fi

# 6. Testar endpoints
log "🌐 Testando endpoints..."
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    success "✅ Backend respondendo em /api/health"
else
    warning "⚠️ Backend não está respondendo em /api/health"
fi

# 7. Instruções para continuar
log "📝 Próximos passos:"
echo ""
echo "🔧 AGORA VOCÊ PODE CONTINUAR COM A INSTALAÇÃO:"
echo "================================================"
echo ""
echo "1. Configure o Nginx:"
echo "   sudo nano /etc/nginx/sites-available/sispat"
echo ""
echo "2. Ative o site:"
echo "   sudo ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/"
echo "   sudo rm -f /etc/nginx/sites-enabled/default"
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo ""
echo "3. Configure SSL:"
echo "   sudo certbot --nginx -d sispat.vps-kinghost.net"
echo ""

success "🎉 Correção do erro export concluída!"
success "✅ Agora você pode continuar com a instalação do SISPAT!"
