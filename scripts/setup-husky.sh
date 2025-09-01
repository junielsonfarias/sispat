#!/bin/bash

# =================================
# SCRIPT DE CONFIGURAÇÃO DO HUSKY
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

log "🔧 Configurando Husky para produção..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz do projeto"
fi

# Verificar se o Husky está nas dependências
if ! grep -q "husky" package.json; then
    error "Husky não encontrado nas dependências do package.json"
fi

# 1. Instalar Husky globalmente se necessário
if ! command -v husky &> /dev/null; then
    log "📦 Instalando Husky globalmente..."
    npm install -g husky
    success "Husky instalado globalmente"
else
    log "✅ Husky já está instalado globalmente"
fi

# 2. Configurar variáveis de ambiente
NODE_ENV=production
CI=false

# 3. Instalar dependências
log "📦 Instalando dependências..."
pnpm install --frozen-lockfile

# 4. Configurar Husky
log "🔧 Configurando Husky..."
npx husky install

# 5. Verificar configuração
if [ -f ".husky/pre-commit" ]; then
    success "Husky configurado com sucesso"
    log "📋 Hooks disponíveis:"
    ls -la .husky/
    
    # Verificar permissões dos hooks
    log "🔐 Configurando permissões dos hooks..."
    chmod +x .husky/*
    success "Permissões configuradas"
    
    # Testar hook de pre-commit
    log "🧪 Testando hook de pre-commit..."
    if [ -x ".husky/pre-commit" ]; then
        success "Hook de pre-commit está executável"
    else
        error "Hook de pre-commit não está executável"
    fi
    
else
    error "Falha ao configurar Husky - arquivo .husky/pre-commit não encontrado"
fi

# 6. Verificar se o script pre-commit.js existe
if [ -f "scripts/pre-commit.js" ]; then
    success "Script pre-commit.js encontrado"
    
    # Tornar executável
    chmod +x scripts/pre-commit.js
    success "Script pre-commit.js tornou-se executável"
else
    error "Script pre-commit.js não encontrado"
fi

# 7. Verificar dependências do script pre-commit
log "🔍 Verificando dependências do script pre-commit..."
if grep -q "chalk" scripts/pre-commit.js; then
    if ! grep -q "chalk" package.json; then
        warning "Chalk não encontrado nas dependências - pode causar problemas"
        log "💡 Instalando chalk..."
        pnpm add chalk
        success "Chalk instalado"
    else
        success "Chalk já está nas dependências"
    fi
fi

log "🎉 Configuração do Husky concluída com sucesso!"
success "Husky está configurado e funcionando em produção"
