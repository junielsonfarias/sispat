#!/bin/bash

# Script para atualizar e recompilar o frontend
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

log "Iniciando atualização do frontend..."

# ============================================
# 1. ATUALIZAR CÓDIGO
# ============================================
log "Atualizando código do repositório..."
git pull origin main || {
    warning "Falha ao atualizar (pode já estar atualizado)"
}

# ============================================
# 2. INSTALAR DEPENDÊNCIAS
# ============================================
log "Instalando/atualizando dependências..."
npm install || {
    error "Falha ao instalar dependências"
    exit 1
}

# ============================================
# 3. CORRIGIR PERMISSÕES DO VITE
# ============================================
log "Corrigindo permissões do vite..."
if [ -f "node_modules/.bin/vite" ]; then
    chmod +x node_modules/.bin/vite
    success "Permissões do vite corrigidas"
else
    warning "Arquivo vite não encontrado em node_modules/.bin/vite"
    log "Tentando instalar vite globalmente..."
    npm install -g vite || {
        warning "Falha ao instalar vite globalmente, continuando..."
    }
fi

# ============================================
# 4. RECOMPILAR FRONTEND
# ============================================
log "Recompilando frontend..."

# Tentar usar npx primeiro (mais confiável)
if command -v npx &> /dev/null; then
    log "Usando npx vite build..."
    npx vite build || {
        error "Falha ao recompilar frontend com npx"
        exit 1
    }
elif [ -f "node_modules/.bin/vite" ]; then
    log "Usando ./node_modules/.bin/vite build..."
    ./node_modules/.bin/vite build || {
        error "Falha ao recompilar frontend"
        exit 1
    }
else
    error "Vite não encontrado. Tente executar: npm install"
    exit 1
fi

# ============================================
# 5. VERIFICAR SE BUILD FOI BEM SUCEDIDO
# ============================================
if [ -f "dist/index.html" ] && [ -d "dist/assets" ]; then
    success "Frontend recompilado com sucesso!"
    log "Arquivos gerados em: dist/"
else
    error "Build completou mas arquivos não foram gerados corretamente"
    exit 1
fi

# ============================================
# 6. RECARREGAR NGINX
# ============================================
log "Recarregando Nginx..."
sudo systemctl reload nginx || {
    warning "Falha ao recarregar Nginx (pode não ser necessário)"
}

success "✅ Frontend atualizado e recompilado com sucesso!"
