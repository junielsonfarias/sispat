#!/bin/bash

# =================================
# CORREÇÃO RÁPIDA - ERRO TERSER VITE
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

log "🔧 CORREÇÃO RÁPIDA - Erro Terser Vite..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

# 1. Verificar se o .env.production tem NODE_ENV
log "📋 Verificando arquivo .env.production..."
if [ -f ".env.production" ] && grep -q "NODE_ENV=production" .env.production; then
    log "⚠️ NODE_ENV=production encontrado no .env.production - removendo..."
    sed -i '/NODE_ENV=production/d' .env.production
    success "NODE_ENV=production removido do .env.production"
fi

# 2. Instalar terser como dependência de desenvolvimento
log "📦 Instalando terser como dependência..."
if pnpm add -D terser; then
    success "Terser instalado com pnpm"
elif npm install --save-dev terser; then
    success "Terser instalado com npm"
else
    warning "⚠️ Falha ao instalar terser, continuando sem..."
fi

# 3. Verificar se o vite.config.ts está correto
log "🔍 Verificando vite.config.ts..."
if grep -q "minify.*esbuild" vite.config.ts; then
    success "✅ vite.config.ts configurado corretamente com esbuild"
else
    warning "⚠️ vite.config.ts pode não estar configurado corretamente"
fi

# 4. Limpar cache do build
log "🧹 Limpando cache de build..."
rm -rf dist
rm -rf .vite
success "Cache de build limpo"

# 5. Tentar build novamente
log "🔨 Tentando build novamente..."
if pnpm run build; then
    success "✅ Build realizado com sucesso!"
elif npm run build; then
    success "✅ Build com npm realizado com sucesso!"
else
    error "❌ Build falhou mesmo após correções"
fi

# 6. Verificar se o build foi criado
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    success "✅ Diretório dist criado com sucesso!"
    log "📁 Conteúdo do diretório dist:"
    ls -la dist/
    
    # Verificar tamanho dos arquivos
    log "📊 Tamanho dos arquivos de build:"
    du -sh dist/*
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

success "🎉 Correção do erro Terser concluída!"
success "✅ Agora você pode continuar com a instalação do SISPAT!"
