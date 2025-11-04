#!/bin/bash

# Script para continuar atualização de inventários após git reset
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

log "Continuando atualização de inventários..."

cd /var/www/sispat || {
    error "Diretório /var/www/sispat não encontrado"
    exit 1
}

# ============================================
# 1. INSTALAR DEPENDÊNCIAS DO FRONTEND
# ============================================
log "1. Verificando dependências do frontend..."
npm install --legacy-peer-deps || {
    warning "Falha ao instalar dependências"
}

# Corrigir permissões do vite
if [ -f "node_modules/.bin/vite" ]; then
    chmod +x node_modules/.bin/vite
    success "Permissões do vite corrigidas"
fi

success "Dependências do frontend verificadas"

# ============================================
# 2. RECOMPILAR FRONTEND
# ============================================
log "2. Recompilando frontend (npx vite build)..."
npx vite build 2>&1 | tee /tmp/vite-build-inventarios.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    success "Frontend recompilado com sucesso"
else
    error "Falha ao recompilar frontend"
    log "Verifique os logs em: /tmp/vite-build-inventarios.log"
    exit 1
fi

# ============================================
# 3. VERIFICAR ARQUIVOS GERADOS
# ============================================
if [ -f "dist/index.html" ] && [ -d "dist/assets" ]; then
    success "Arquivos de build gerados corretamente em dist/"
    log "Arquivos JS gerados:"
    ls -lh dist/assets/*.js 2>/dev/null | head -5 | awk '{print "  " $9 " (" $5 ")"}'
else
    error "Build completou mas arquivos não foram gerados"
    exit 1
fi

# ============================================
# 4. LIMPAR CACHE DO NGINX E RECARREGAR
# ============================================
log "4. Limpando cache do Nginx..."
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
sudo systemctl reload nginx || {
    error "Falha ao recarregar Nginx"
    exit 1
}
success "Nginx recarregado e cache limpo"

# ============================================
# 5. VERIFICAÇÃO FINAL
# ============================================
log "5. Verificando status dos serviços..."

pm2 list | grep -q "sispat-backend" && success "Backend PM2 está rodando" || error "Backend PM2 não está rodando"

if netstat -tuln 2>/dev/null | grep -q ":3000 " || ss -tuln 2>/dev/null | grep -q ":3000 "; then
    success "Porta 3000 está em uso (backend)"
else
    warning "Porta 3000 não está em uso"
fi

sudo systemctl is-active --quiet nginx && success "Nginx está ativo" || error "Nginx não está ativo"

success "✅ Atualização concluída com sucesso!"
log ""
log "📋 PRÓXIMOS PASSOS:"
log ""
log "⚠️  IMPORTANTE: LIMPE O CACHE DO NAVEGADOR!"
log "   - Chrome/Edge: Ctrl+Shift+Delete → Limpar cache e cookies"
log "   - Ou: Ctrl+F5 (hard refresh)"
log "   - Ou: F12 → Network → marque 'Disable cache' → recarregue"
log ""
log "1. Abra o navegador e vá para a página de inventários"
log "2. Abra o Console do Desenvolvedor (F12 → Console)"
log "3. Procure pela mensagem: '🚀 [INVENTORY_CONTEXT] InventoryContext inicializado'"
log "   Se NÃO aparecer, o código não foi atualizado no navegador!"
log ""
log "4. Tente criar um novo inventário"
log "5. Verifique os logs no console que começam com:"
log "   - 🚀 [INVENTORY_CONTEXT]"
log "   - 🔍 [DEBUG]"
log "   - ✅ [DEBUG]"
log "   - ❌ [ERROR]"
log ""
log "6. Envie TODOS os logs do console para análise"
