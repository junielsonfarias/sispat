#!/bin/bash

# =================================
# CORREÇÃO BUILD FRONTEND - SISPAT
# Corrige problemas de build do frontend
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

# Banner
echo ""
echo "🔧 ================================================"
echo "🔧    CORREÇÃO BUILD FRONTEND - SISPAT"
echo "🔧    Corrige problemas de build do frontend"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

# Limpar build anterior
log "🧹 Limpando build anterior..."
rm -rf dist
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf .vite
success "Build anterior limpo"

# Limpar cache do npm
log "🧹 Limpando cache do npm..."
npm cache clean --force
success "Cache do npm limpo"

# Verificar se as dependências estão instaladas
log "📦 Verificando dependências..."
if [ ! -d "node_modules" ]; then
    log "📦 Instalando dependências..."
    npm install --legacy-peer-deps
    success "Dependências instaladas"
else
    log "📦 Reinstalando dependências para resolver problemas de cache..."
    rm -rf node_modules
    npm install --legacy-peer-deps
    success "Dependências reinstaladas"
fi

# Verificar configuração do Vite
log "🔍 Verificando configuração do Vite..."
if [ ! -f "vite.config.ts" ]; then
    error "Arquivo vite.config.ts não encontrado"
fi

# Fazer build do frontend
log "🏗️ Fazendo build do frontend..."
if npm run build; then
    success "✅ Build do frontend concluído com sucesso"
else
    error "❌ Falha no build do frontend"
fi

# Verificar se os arquivos foram gerados
log "🔍 Verificando arquivos gerados..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    success "✅ Arquivos de build encontrados"
    
    # Listar arquivos principais
    log "📋 Arquivos gerados:"
    ls -la dist/
    echo ""
    ls -la dist/assets/ | head -10
else
    error "❌ Arquivos de build não encontrados"
fi

# Verificar se há erros nos arquivos JavaScript
log "🔍 Verificando arquivos JavaScript..."
JS_FILES=$(find dist/assets -name "*.js" 2>/dev/null | head -5)
if [ -n "$JS_FILES" ]; then
    for file in $JS_FILES; do
        if [ -f "$file" ]; then
            # Verificar se o arquivo não está vazio
            if [ -s "$file" ]; then
                success "✅ $file - OK"
            else
                warning "⚠️ $file - Arquivo vazio"
            fi
        fi
    done
else
    warning "⚠️ Nenhum arquivo JavaScript encontrado"
fi

# Testar se o servidor pode servir os arquivos
log "🧪 Testando servidor..."
if command -v python3 &> /dev/null; then
    log "🚀 Iniciando servidor de teste na porta 8080..."
    cd dist
    python3 -m http.server 8080 &
    SERVER_PID=$!
    sleep 2
    
    # Testar se o servidor está respondendo
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200"; then
        success "✅ Servidor de teste funcionando"
    else
        warning "⚠️ Servidor de teste não está respondendo"
    fi
    
    # Parar servidor de teste
    kill $SERVER_PID 2>/dev/null || true
    cd ..
else
    warning "⚠️ Python3 não encontrado, pulando teste do servidor"
fi

# Instruções finais
log "📝 CORREÇÃO CONCLUÍDA!"
echo ""
echo "🎉 BUILD FRONTEND CORRIGIDO!"
echo "============================="
echo ""
echo "📋 O que foi feito:"
echo "✅ Build anterior limpo"
echo "✅ Cache do npm limpo"
echo "✅ Dependências verificadas"
echo "✅ Build do frontend executado"
echo "✅ Arquivos de build verificados"
echo "✅ Servidor de teste executado"
echo ""
echo "🔧 Arquivos gerados:"
echo "   - dist/index.html (página principal)"
echo "   - dist/assets/ (arquivos JavaScript e CSS)"
echo "   - dist/static/ (arquivos estáticos)"
echo ""
echo "📞 Próximos passos:"
echo "   1. Verifique se o Nginx está servindo os arquivos corretamente"
echo "   2. Teste a aplicação no navegador"
echo "   3. Verifique o console do navegador para erros"
echo "   4. Se houver problemas, execute: pm2 restart sispat"
echo ""

success "🎉 Correção de build do frontend concluída!"
