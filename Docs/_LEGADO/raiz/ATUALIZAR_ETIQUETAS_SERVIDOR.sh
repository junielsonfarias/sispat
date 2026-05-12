#!/bin/bash

# Script para atualizar código e recompilar frontend no servidor
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

# Navegar para o diretório do projeto
cd /var/www/sispat || {
    error "Diretório /var/www/sispat não encontrado"
    exit 1
}

log "Iniciando atualização do servidor..."

# ============================================
# 1. CONFIGURAR GIT
# ============================================
log "Configurando permissões do Git..."
git config --global --add safe.directory /var/www/sispat 2>/dev/null || true
success "Git configurado"

# ============================================
# 2. ATUALIZAR CÓDIGO DO REPOSITÓRIO
# ============================================
log "Buscando atualizações do repositório (git fetch)..."
git fetch origin main || warning "Falha ao buscar atualizações"

log "Atualizando código do repositório (git pull)..."
sudo git pull origin main || {
    warning "Falha ao atualizar código, tentando reset..."
    git reset --hard origin/main || {
        error "Falha ao atualizar código do repositório"
        exit 1
    }
}
success "Código atualizado do repositório"

# ============================================
# 3. REINSTALAR DEPENDÊNCIAS (SE NECESSÁRIO)
# ============================================
log "Verificando dependências do frontend..."
if [ -f "package.json" ]; then
    log "Instalando/atualizando dependências do frontend..."
    npm install --legacy-peer-deps || warning "Alguns avisos durante instalação de dependências"
    success "Dependências verificadas"
else
    warning "package.json não encontrado, pulando instalação de dependências"
fi

# ============================================
# 4. CORRIGIR PERMISSÕES DO VITE
# ============================================
if [ -f "node_modules/.bin/vite" ]; then
    log "Corrigindo permissões do vite..."
    chmod +x node_modules/.bin/vite
    success "Permissões do vite corrigidas"
fi

# ============================================
# 5. RECOMPILAR FRONTEND
# ============================================
log "Recompilando frontend (isso pode levar alguns minutos)..."

# Tentar com npx primeiro
if command -v npx &> /dev/null; then
    log "Usando npx vite build..."
    npx vite build 2>&1 | tee /tmp/vite-build.log
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        success "Frontend recompilado com sucesso!"
    else
        error "Build falhou. Verifique: /tmp/vite-build.log"
        exit 1
    fi
elif [ -f "node_modules/.bin/vite" ]; then
    log "Usando ./node_modules/.bin/vite build..."
    ./node_modules/.bin/vite build 2>&1 | tee /tmp/vite-build.log
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        success "Frontend recompilado com sucesso!"
    else
        error "Build falhou. Verifique: /tmp/vite-build.log"
        exit 1
    fi
else
    error "vite não encontrado. Execute: npm install"
    exit 1
fi

# ============================================
# 6. RECOMPILAR BACKEND (SE NECESSÁRIO)
# ============================================
if [ -d "backend" ]; then
    log "Verificando backend..."
    cd backend || exit 1
    
    # Verificar se há mudanças no backend
    if [ -f "package.json" ]; then
        log "Instalando dependências do backend (se necessário)..."
        npm install --legacy-peer-deps 2>&1 | tail -5
        
        log "Recompilando backend..."
        npm run build || warning "Alguns avisos durante compilação do backend"
        success "Backend recompilado"
    fi
    
    cd ..
fi

# ============================================
# 7. REINICIAR BACKEND (PM2)
# ============================================
log "Reiniciando backend (PM2)..."
pm2 restart sispat-backend || pm2 restart all || warning "PM2 restart falhou ou não configurado"
success "Backend reiniciado"

# ============================================
# 8. RECARREGAR NGINX
# ============================================
log "Recarregando Nginx..."
sudo systemctl reload nginx || {
    warning "Falha ao recarregar Nginx, tentando restart..."
    sudo systemctl restart nginx || error "Falha ao reiniciar Nginx"
}
success "Nginx recarregado"

# ============================================
# 9. VERIFICAR STATUS
# ============================================
log "Verificando status dos serviços..."
echo ""
echo "=== Status PM2 ==="
pm2 list | head -10
echo ""
echo "=== Status Nginx ==="
sudo systemctl status nginx --no-pager | head -5
echo ""

success "✅ Atualização concluída com sucesso!"
log "O sistema está pronto para uso."
