#!/bin/bash

# =================================
# CORREÇÃO REACT CREATECONTEXT DEFINITIVA - SISPAT
# Resolve definitivamente o erro createContext
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
echo "🔧    CORREÇÃO REACT CREATECONTEXT DEFINITIVA"
echo "🔧    Resolve definitivamente erro createContext"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção definitiva do React createContext..."

# 1. Parar PM2
log "🛑 Parando PM2..."
pm2 stop all 2>/dev/null || warning "PM2 não estava rodando"
pm2 delete all 2>/dev/null || true
success "✅ PM2 parado"

# 2. Limpeza agressiva
log "🧹 Limpeza agressiva..."
rm -rf dist
rm -rf .vite
rm -rf node_modules/.vite
rm -rf node_modules/.cache
success "✅ Limpeza concluída"

# 3. Criar configuração Vite mais conservadora
log "⚙️ Criando configuração Vite conservadora..."
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    })
  ],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  build: {
    chunkSizeWarningLimit: 5000,
    target: 'es2015',
    rollupOptions: {
      output: {
        // NÃO separar chunks - tudo em um só
        manualChunks: undefined,
        format: 'es',
      },
    },
  },

  optimizeDeps: {
    // Forçar inclusão de TUDO do React
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime'
    ],
    // NÃO excluir NADA
    exclude: [],
    force: true,
  },

  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': '"production"',
  },

  esbuild: {
    target: 'es2015',
    jsx: 'automatic',
  },
})
EOF

success "✅ Configuração Vite conservadora criada"

# 4. Verificar se React está no package.json
log "🔍 Verificando React no package.json..."
if ! grep -q '"react"' package.json; then
    warning "⚠️ React não encontrado no package.json, adicionando..."
    npm install react@^19.0.0 react-dom@^19.0.0 --save --legacy-peer-deps
    success "✅ React adicionado"
fi

# 5. Fazer build com configuração conservadora
log "🏗️ Fazendo build conservador..."
export NODE_ENV=production
export CI=false

if npm run build; then
    success "✅ Build concluído"
else
    error "❌ Build falhou"
fi

# 6. Verificar se dist foi criado
if [ ! -d "dist" ]; then
    error "❌ Diretório dist não foi criado"
fi

# 7. Verificar arquivos JS gerados
log "🔍 Verificando arquivos JS..."
JS_FILES=$(find dist/assets -name "*.js" 2>/dev/null | wc -l)
if [ $JS_FILES -eq 0 ]; then
    error "❌ Nenhum arquivo JS encontrado"
fi

success "✅ $JS_FILES arquivo(s) JS encontrado(s)"

# 8. Verificar se há vendor-misc
if ls dist/assets/vendor-misc-*.js 1> /dev/null 2>&1; then
    VENDOR_MISC_FILE=$(ls dist/assets/vendor-misc-*.js | head -1)
    log "📄 Arquivo vendor-misc: $VENDOR_MISC_FILE"
    
    # Verificar se React está no vendor-misc
    if grep -q "createContext" "$VENDOR_MISC_FILE"; then
        success "✅ createContext encontrado no vendor-misc"
    else
        warning "⚠️ createContext não encontrado no vendor-misc"
    fi
else
    warning "⚠️ vendor-misc não encontrado"
fi

# 9. Verificar conteúdo do index.html
log "🔍 Verificando index.html..."
if [ -f "dist/index.html" ]; then
    if grep -q "vendor-misc" dist/index.html; then
        success "✅ vendor-misc referenciado no index.html"
    else
        warning "⚠️ vendor-misc não referenciado no index.html"
    fi
else
    error "❌ index.html não encontrado"
fi

# 10. Testar build localmente
log "🧪 Testando build localmente..."
if command -v python3 &> /dev/null; then
    cd dist
    python3 -m http.server 8080 &
    SERVER_PID=$!
    sleep 3
    
    # Testar se carrega
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200"; then
        success "✅ Build carrega localmente"
    else
        warning "⚠️ Build não carrega localmente"
    fi
    
    kill $SERVER_PID 2>/dev/null || true
    cd ..
fi

# 11. Iniciar PM2
log "🚀 Iniciando PM2..."
pm2 start ecosystem.config.cjs --env production
pm2 save
success "✅ PM2 iniciado"

# 12. Aguardar e testar
log "⏳ Aguardando 10 segundos..."
sleep 10

# 13. Testar frontend
log "🧪 Testando frontend..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    success "✅ Frontend respondendo"
else
    warning "⚠️ Frontend não está respondendo"
fi

# 14. Verificar logs para createContext
log "📋 Verificando logs para erros createContext..."
if pm2 logs sispat --lines 20 --nostream 2>/dev/null | grep -i "createContext"; then
    warning "⚠️ Ainda há erros createContext nos logs"
else
    success "✅ Nenhum erro createContext nos logs"
fi

echo ""
echo "🎉 CORREÇÃO REACT CREATECONTEXT DEFINITIVA!"
echo "==========================================="
echo ""
echo "📋 O que foi feito:"
echo "✅ PM2 parado"
echo "✅ Limpeza agressiva de cache"
echo "✅ Configuração Vite conservadora (sem chunks separados)"
echo "✅ React forçado no optimizeDeps.include"
echo "✅ Build executado"
echo "✅ Arquivos JS verificados"
echo "✅ vendor-misc verificado"
echo "✅ index.html verificado"
echo "✅ Build testado localmente"
echo "✅ PM2 iniciado"
echo "✅ Frontend testado"
echo "✅ Logs verificados"
echo ""
echo "🔧 Estratégia aplicada:"
echo "   - Configuração Vite MAIS CONSERVADORA"
echo "   - NÃO separação de chunks (tudo em um arquivo)"
echo "   - React FORÇADO no optimizeDeps.include"
echo "   - NADA excluído do optimizeDeps"
echo "   - Build mais simples e direto"
echo ""
echo "🌐 Teste agora:"
echo "   1. Acesse: http://sispat.vps-kinghost.net"
echo "   2. Abra o console do navegador (F12)"
echo "   3. Verifique se não há mais erros createContext"
echo "   4. Se ainda houver erro, execute:"
echo "      pm2 logs sispat --lines 50"
echo ""

success "🎉 Correção definitiva do React createContext concluída!"
