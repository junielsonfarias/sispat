#!/bin/bash

# =================================
# CORREÇÃO RÁPIDA - ERRO DE BUILD VITE
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

log "🔧 CORREÇÃO RÁPIDA - Erro de Build Vite..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

# 1. Verificar versão do Vite
log "📋 Verificando versão do Vite..."
VITE_VERSION=$(grep '"vite"' package.json | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo "não encontrado")
log "Versão do Vite: $VITE_VERSION"

# 2. Limpar cache e node_modules
log "🧹 Limpando cache e dependências..."
rm -rf node_modules
rm -rf dist
rm -f pnpm-lock.yaml
success "Cache limpo"

# 3. Reinstalar dependências
log "📦 Reinstalando dependências..."
pnpm install
success "Dependências reinstaladas"

# 4. Tentar build novamente
log "🔨 Tentando build novamente..."
if pnpm run build; then
    success "✅ Build realizado com sucesso!"
else
    warning "⚠️ Build falhou, tentando alternativa..."
    
    # 5. Tentar build com npm
    log "📦 Tentando build com npm..."
    if npm run build; then
        success "✅ Build com npm realizado com sucesso!"
    else
        error "❌ Build falhou mesmo com npm"
    fi
fi

# 6. Verificar se o build foi criado
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    success "✅ Diretório dist criado com sucesso!"
    log "📁 Conteúdo do diretório dist:"
    ls -la dist/
else
    error "❌ Diretório dist não foi criado ou está vazio"
fi

# 7. Instruções para continuar
log "📝 Próximos passos:"
echo ""
echo "🔧 AGORA VOCÊ PODE CONTINUAR COM A INSTALAÇÃO:"
echo "================================================"
echo ""
echo "1. Execute o deploy novamente:"
echo "   ./scripts/deploy-production-simple.sh"
echo ""
echo "2. Ou configure o Nginx manualmente:"
echo "   sudo nano /etc/nginx/sites-available/sispat"
echo ""
echo "3. Ative o site:"
echo "   sudo ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/"
echo "   sudo rm -f /etc/nginx/sites-enabled/default"
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo ""

success "🎉 Correção do erro de build concluída!"
success "✅ Agora você pode continuar com a instalação do SISPAT!"
