#!/bin/bash

# Script para corrigir instalação do vite
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

log "Iniciando correção da instalação do vite..."

# ============================================
# 1. VERIFICAR SE VITE ESTÁ NO package.json
# ============================================
if ! grep -q '"vite"' package.json; then
    error "vite não encontrado no package.json!"
    exit 1
fi

success "vite encontrado no package.json"

# ============================================
# 2. LIMPAR INSTALAÇÃO ANTERIOR
# ============================================
log "Limpando instalação anterior..."

if [ -d "node_modules" ]; then
    log "Removendo node_modules..."
    rm -rf node_modules
    success "node_modules removido"
fi

if [ -f "package-lock.json" ]; then
    log "Removendo package-lock.json..."
    rm -f package-lock.json
    success "package-lock.json removido"
fi

# ============================================
# 3. REINSTALAR DEPENDÊNCIAS
# ============================================
log "Reinstalando dependências (isso pode levar alguns minutos)..."

npm install --legacy-peer-deps || {
    error "Falha ao instalar dependências"
    exit 1
}

success "Dependências reinstaladas"

# ============================================
# 4. VERIFICAR SE VITE FOI INSTALADO
# ============================================
log "Verificando instalação do vite..."

if [ -f "node_modules/.bin/vite" ]; then
    success "vite encontrado em node_modules/.bin/vite"
    chmod +x node_modules/.bin/vite
    success "Permissões do vite corrigidas"
elif [ -d "node_modules/vite" ]; then
    warning "vite instalado mas binário não encontrado em .bin"
    log "Verificando se npx funciona..."
    if command -v npx &> /dev/null; then
        success "npx está disponível"
    else
        error "npx não está disponível"
        exit 1
    fi
else
    error "vite não foi instalado corretamente"
    log "Tentando instalar vite explicitamente..."
    npm install vite --save-dev || {
        error "Falha ao instalar vite"
        exit 1
    }
fi

# ============================================
# 5. TESTAR BUILD
# ============================================
log "Testando build do frontend..."

# Tentar com npx primeiro
if command -v npx &> /dev/null; then
    log "Usando npx vite build..."
    npx vite build 2>&1 | tee /tmp/vite-build.log
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        success "Build realizado com sucesso!"
    else
        error "Build falhou. Verifique: /tmp/vite-build.log"
        exit 1
    fi
elif [ -f "node_modules/.bin/vite" ]; then
    log "Usando ./node_modules/.bin/vite build..."
    ./node_modules/.bin/vite build 2>&1 | tee /tmp/vite-build.log
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        success "Build realizado com sucesso!"
    else
        error "Build falhou. Verifique: /tmp/vite-build.log"
        exit 1
    fi
else
    error "Não foi possível encontrar o vite para executar o build"
    exit 1
fi

# ============================================
# 6. VERIFICAR ARQUIVOS GERADOS
# ============================================
if [ -f "dist/index.html" ] && [ -d "dist/assets" ]; then
    success "Arquivos de build gerados corretamente em dist/"
else
    error "Build completou mas arquivos não foram gerados"
    exit 1
fi

# ============================================
# 7. RECARREGAR NGINX
# ============================================
log "Recarregando Nginx..."
sudo systemctl reload nginx || {
    warning "Falha ao recarregar Nginx"
}

success "✅ Instalação do vite corrigida e frontend recompilado com sucesso!"
