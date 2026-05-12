#!/bin/bash

# Script para instalar TODAS as dependências do frontend
# Autor: GPT-4

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

log "Instalando todas as dependências do frontend..."

cd /var/www/sispat || {
    error "Diretório /var/www/sispat não encontrado"
    exit 1
}

# ============================================
# 1. INSTALAR DEPENDÊNCIAS DE DESENVOLVIMENTO
# ============================================
log "1. Instalando dependências de desenvolvimento (tailwindcss, postcss, etc)..."
npm install --save-dev \
  tailwindcss \
  postcss \
  autoprefixer \
  vite \
  @vitejs/plugin-react \
  typescript \
  @types/node \
  @types/react \
  @types/react-dom \
  --legacy-peer-deps

if [ $? -eq 0 ]; then
    success "Dependências de desenvolvimento instaladas"
else
    error "Falha ao instalar dependências de desenvolvimento"
    exit 1
fi

# ============================================
# 2. INSTALAR TODAS AS DEPENDÊNCIAS
# ============================================
log "2. Instalando todas as dependências..."
npm install --legacy-peer-deps

if [ $? -eq 0 ]; then
    success "Todas as dependências instaladas"
else
    error "Falha ao instalar dependências"
    exit 1
fi

# ============================================
# 3. VERIFICAR INSTALAÇÕES CRÍTICAS
# ============================================
log "3. Verificando instalações críticas..."

CHECK_FAILED=0

if [ ! -f "node_modules/.bin/vite" ]; then
    error "Vite não encontrado!"
    CHECK_FAILED=1
else
    success "Vite instalado"
    chmod +x node_modules/.bin/vite
fi

if [ ! -d "node_modules/tailwindcss" ]; then
    error "Tailwindcss não encontrado!"
    CHECK_FAILED=1
else
    success "Tailwindcss instalado"
fi

if [ ! -d "node_modules/postcss" ]; then
    error "PostCSS não encontrado!"
    CHECK_FAILED=1
else
    success "PostCSS instalado"
fi

if [ $CHECK_FAILED -eq 1 ]; then
    error "Algumas dependências críticas não foram instaladas!"
    exit 1
fi

# ============================================
# 4. RECOMPILAR FRONTEND
# ============================================
log "4. Recompilando frontend..."
npx vite build 2>&1 | tee /tmp/vite-build-completo.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    success "Frontend recompilado com sucesso"
else
    error "Falha ao recompilar frontend"
    log "Últimas 50 linhas do erro:"
    tail -50 /tmp/vite-build-completo.log
    exit 1
fi

# ============================================
# 5. VERIFICAR ARQUIVOS GERADOS
# ============================================
if [ -f "dist/index.html" ] && [ -d "dist/assets" ]; then
    success "Arquivos de build gerados corretamente"
    log "Arquivos JS gerados:"
    ls -lh dist/assets/*.js 2>/dev/null | head -5 | awk '{print "  " $9 " (" $5 ")"}'
else
    error "Build completou mas arquivos não foram gerados"
    exit 1
fi

# ============================================
# 6. RECARREGAR NGINX
# ============================================
log "6. Recarregando Nginx..."
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
sudo systemctl reload nginx || {
    error "Falha ao recarregar Nginx"
    exit 1
}
success "Nginx recarregado e cache limpo"

success "✅ Frontend instalado e recompilado com sucesso!"
log ""
log "📋 PRÓXIMOS PASSOS:"
log "1. Limpe o cache do navegador (Ctrl+Shift+Delete ou Ctrl+F5)"
log "2. Abra o console do navegador (F12)"
log "3. Procure pela mensagem: '🚀 [INVENTORY_CONTEXT] InventoryContext inicializado'"
log "4. Teste criar um inventário e envie os logs do console"
