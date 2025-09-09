#!/bin/bash

# =================================
# CORREÇÃO DE DEPENDÊNCIAS NPM - SISPAT
# Resolve conflitos de dependências
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
echo "🔧    CORREÇÃO DE DEPENDÊNCIAS NPM - SISPAT"
echo "🔧    Resolve conflitos de dependências"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

# 1. Limpar cache do npm
log "🧹 Limpando cache do npm..."
npm cache clean --force
success "Cache do npm limpo"

# 2. Remover node_modules e package-lock.json
log "🗑️ Removendo node_modules e package-lock.json..."
rm -rf node_modules
rm -f package-lock.json
success "Arquivos removidos"

# 3. Instalar dependências com --legacy-peer-deps
log "📦 Instalando dependências com --legacy-peer-deps..."
npm install --legacy-peer-deps
success "Dependências instaladas com sucesso"

# 4. Verificar se a instalação foi bem-sucedida
log "🔍 Verificando instalação..."
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
    success "✅ Instalação verificada com sucesso"
else
    error "❌ Falha na verificação da instalação"
fi

# 5. Testar se o projeto pode ser buildado
log "🏗️ Testando build do projeto..."
if npm run build; then
    success "✅ Build do projeto executado com sucesso"
else
    warning "⚠️ Build falhou, mas dependências foram instaladas"
fi

# 6. Instruções finais
log "📝 CORREÇÃO CONCLUÍDA!"
echo ""
echo "🎉 DEPENDÊNCIAS CORRIGIDAS COM SUCESSO!"
echo "========================================"
echo ""
echo "📋 O que foi feito:"
echo "✅ Cache do npm limpo"
echo "✅ node_modules removido"
echo "✅ package-lock.json removido"
echo "✅ Dependências reinstaladas com --legacy-peer-deps"
echo "✅ Instalação verificada"
echo ""
echo "🔧 Comandos úteis:"
echo "   - npm run dev (desenvolvimento)"
echo "   - npm run build (produção)"
echo "   - npm start (iniciar aplicação)"
echo ""
echo "📞 Se ainda houver problemas:"
echo "   1. Verifique os logs: npm install --legacy-peer-deps --verbose"
echo "   2. Tente: npm install --force"
echo "   3. Verifique a versão do Node.js: node --version"
echo ""

success "🎉 Correção de dependências concluída com sucesso!"
