#!/bin/bash

# Script para corrigir instalação do Vite e recompilar frontend
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

warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

log "Corrigindo instalação do Vite..."

cd /var/www/sispat || {
    error "Diretório /var/www/sispat não encontrado"
    exit 1
}

# ============================================
# 1. VERIFICAR SE VITE ESTÁ NO PACKAGE.JSON
# ============================================
log "1. Verificando se vite está no package.json..."
if grep -q "\"vite\"" package.json; then
    success "Vite encontrado no package.json"
else
    error "Vite NÃO está no package.json!"
    log "Adicionando vite às devDependencies..."
    npm install --save-dev vite@latest --legacy-peer-deps
fi

# ============================================
# 2. LIMPAR CACHE E NODE_MODULES
# ============================================
log "2. Limpando cache e reinstalando dependências..."
rm -rf node_modules/.vite 2>/dev/null || true
rm -rf .vite 2>/dev/null || true

# ============================================
# 3. INSTALAR DEPENDÊNCIAS COMPLETAS
# ============================================
log "3. Instalando todas as dependências..."
npm install --legacy-peer-deps 2>&1 | tee /tmp/npm-install-vite.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    success "Dependências instaladas"
else
    error "Falha ao instalar dependências"
    log "Verifique o log: /tmp/npm-install-vite.log"
    exit 1
fi

# ============================================
# 4. VERIFICAR SE VITE FOI INSTALADO
# ============================================
log "4. Verificando instalação do vite..."
if [ -f "node_modules/.bin/vite" ]; then
    success "Vite encontrado em node_modules/.bin/vite"
    chmod +x node_modules/.bin/vite
else
    error "Vite NÃO foi instalado!"
    log "Tentando instalação manual do vite..."
    npm install --save-dev vite @vitejs/plugin-react --legacy-peer-deps
    
    if [ -f "node_modules/.bin/vite" ]; then
        success "Vite instalado manualmente"
        chmod +x node_modules/.bin/vite
    else
        error "Falha ao instalar vite manualmente"
        exit 1
    fi
fi

# ============================================
# 5. RECOMPILAR FRONTEND
# ============================================
log "5. Recompilando frontend..."
npx vite build 2>&1 | tee /tmp/vite-build-final.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    success "Frontend recompilado com sucesso"
else
    error "Falha ao recompilar frontend"
    log "Verifique o log: /tmp/vite-build-final.log"
    log "Últimas 30 linhas do erro:"
    tail -30 /tmp/vite-build-final.log
    exit 1
fi

# ============================================
# 6. VERIFICAR ARQUIVOS GERADOS
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
# 7. LIMPAR CACHE DO NGINX E RECARREGAR
# ============================================
log "7. Limpando cache do Nginx..."
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
sudo systemctl reload nginx || {
    error "Falha ao recarregar Nginx"
    exit 1
}
success "Nginx recarregado e cache limpo"

success "✅ Frontend corrigido e recompilado com sucesso!"
log ""
log "📋 PRÓXIMOS PASSOS:"
log "1. Limpe o cache do navegador (Ctrl+Shift+Delete ou Ctrl+F5)"
log "2. Abra o console do navegador (F12)"
log "3. Procure pela mensagem: '🚀 [INVENTORY_CONTEXT] InventoryContext inicializado'"
log "4. Teste criar um inventário e envie os logs do console"
