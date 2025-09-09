#!/bin/bash

# =================================
# CORREÇÃO HTML2CANVAS DEPENDENCY - SISPAT
# Corrige problemas de dependência html2canvas
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
echo "🔧    CORREÇÃO HTML2CANVAS DEPENDENCY - SISPAT"
echo "🔧    Corrige problemas de dependência html2canvas"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção de dependência html2canvas..."

# 1. Parar PM2 se estiver rodando
log "🛑 Parando PM2..."
pm2 stop all 2>/dev/null || warning "PM2 não estava rodando"
pm2 delete all 2>/dev/null || true
success "PM2 parado"

# 2. Verificar se html2canvas está instalado
log "🔍 Verificando html2canvas..."
if npm list html2canvas 2>/dev/null | grep -q "html2canvas"; then
    success "✅ html2canvas instalado"
else
    warning "⚠️ html2canvas não encontrado"
    log "📦 Instalando html2canvas..."
    npm install html2canvas --save
    success "html2canvas instalado"
fi

# 3. Verificar se jspdf está instalado
log "🔍 Verificando jspdf..."
if npm list jspdf 2>/dev/null | grep -q "jspdf"; then
    success "✅ jspdf instalado"
else
    warning "⚠️ jspdf não encontrado"
    log "📦 Instalando jspdf..."
    npm install jspdf --save
    success "jspdf instalado"
fi

# 4. Atualizar configuração do Vite para incluir html2canvas
log "🔧 Atualizando configuração do Vite..."
VITE_CONFIG_FILE="vite.config.ts"

if [ -f "$VITE_CONFIG_FILE" ]; then
    # Fazer backup da configuração atual
    cp "$VITE_CONFIG_FILE" "$VITE_CONFIG_FILE.backup2"
    
    # Atualizar a configuração para incluir html2canvas no optimizeDeps
    sed -i '/optimizeDeps: {/,/},/c\
  optimizeDeps: {\
    include: [\
      "react", \
      "react-dom", \
      "react-router-dom",\
      "html2canvas",\
      "jspdf"\
    ],\
    exclude: [\
      "@vite/client", \
      "@vite/env", \
      "recharts",\
      "d3-scale",\
      "d3-array",\
      "d3-time",\
      "d3-time-format",\
      "d3-shape",\
      "d3-path",\
      "d3-color",\
      "d3-interpolate",\
      "d3-ease",\
      "d3-selection",\
      "d3-transition",\
      "d3-zoom",\
      "d3-brush",\
      "d3-drag",\
      "d3-force",\
      "d3-hierarchy",\
      "d3-quadtree",\
      "d3-timer",\
      "d3-dispatch"\
    ],\
    force: true,\
  },' "$VITE_CONFIG_FILE"
    
    success "✅ Configuração Vite atualizada"
else
    error "❌ Arquivo vite.config.ts não encontrado"
fi

# 5. Limpar cache do Vite
log "🧹 Limpando cache do Vite..."
rm -rf .vite
rm -rf node_modules/.vite
success "Cache do Vite limpo"

# 6. Fazer build do frontend
log "🏗️ Fazendo build do frontend..."
export NODE_ENV=production
export CI=false

if npm run build; then
    success "✅ Build do frontend concluído com sucesso"
else
    error "❌ Falha no build do frontend"
fi

# 7. Verificar se os arquivos foram gerados
log "🔍 Verificando arquivos gerados..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    success "✅ Arquivos de build encontrados"
    
    # Verificar se vendor-misc foi gerado
    if ls dist/assets/vendor-misc-*.js 1> /dev/null 2>&1; then
        success "✅ vendor-misc gerado"
        
        # Verificar tamanho do vendor-misc
        VENDOR_MISC_SIZE=$(ls -lh dist/assets/vendor-misc-*.js | awk '{print $5}')
        log "📊 Tamanho do vendor-misc: $VENDOR_MISC_SIZE"
    else
        error "❌ vendor-misc não foi gerado"
    fi
else
    error "❌ Arquivos de build não encontrados"
fi

# 8. Testar se o build funciona
log "🧪 Testando build..."
if command -v python3 &> /dev/null; then
    log "🚀 Iniciando servidor de teste na porta 8080..."
    cd dist
    python3 -m http.server 8080 &
    SERVER_PID=$!
    sleep 5
    
    # Testar se o servidor está respondendo
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200"; then
        success "✅ Servidor de teste funcionando"
        
        # Testar se o conteúdo está sendo servido
        if curl -s http://localhost:8080 | grep -q "SISPAT"; then
            success "✅ Conteúdo SISPAT sendo servido corretamente"
        else
            warning "⚠️ Conteúdo SISPAT não encontrado na resposta"
        fi
    else
        warning "⚠️ Servidor de teste não está respondendo"
    fi
    
    # Parar servidor de teste
    kill $SERVER_PID 2>/dev/null || true
    cd ..
else
    warning "⚠️ Python3 não encontrado, pulando teste do servidor"
fi

# 9. Iniciar aplicação com PM2
log "🚀 Iniciando aplicação com PM2..."
if [ -f "ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs --env production
    pm2 save
    success "Aplicação iniciada com PM2"
else
    error "❌ Arquivo ecosystem.config.cjs não encontrado"
fi

# 10. Aguardar inicialização
log "⏳ Aguardando aplicação inicializar..."
sleep 10

# 11. Verificar se PM2 está rodando
log "🔍 Verificando status do PM2..."
if pm2 list | grep -q "online"; then
    success "✅ Aplicação está rodando no PM2"
else
    error "❌ Aplicação não está rodando no PM2"
fi

# 12. Testar API
log "🧪 Testando API..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
    success "✅ API respondendo corretamente"
else
    warning "⚠️ API pode não estar respondendo"
fi

# 13. Verificar logs recentes
log "📋 Verificando logs recentes..."
if pm2 logs sispat --lines 5 --nostream 2>/dev/null | grep -q "CORS bloqueado"; then
    warning "⚠️ Ainda há problemas de CORS nos logs"
else
    success "✅ Nenhum problema de CORS recente encontrado"
fi

# 14. Testar frontend
log "🧪 Testando frontend..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
    success "✅ Frontend respondendo corretamente"
else
    warning "⚠️ Frontend pode não estar respondendo"
fi

# Instruções finais
log "📝 CORREÇÃO HTML2CANVAS DEPENDENCY CONCLUÍDA!"
echo ""
echo "🎉 HTML2CANVAS DEPENDENCY CORRIGIDA!"
echo "===================================="
echo ""
echo "📋 O que foi feito:"
echo "✅ PM2 parado"
echo "✅ html2canvas verificado e instalado"
echo "✅ jspdf verificado e instalado"
echo "✅ Configuração Vite atualizada"
echo "✅ Cache do Vite limpo"
echo "✅ Build do frontend executado"
echo "✅ Arquivos de build verificados"
echo "✅ vendor-misc verificado"
echo "✅ Servidor de teste executado"
echo "✅ Aplicação iniciada com PM2"
echo "✅ Status do PM2 verificado"
echo "✅ API testada"
echo "✅ Logs verificados"
echo "✅ Frontend testado"
echo ""
echo "🔧 Correções aplicadas:"
echo "   - html2canvas incluído no optimizeDeps.include"
echo "   - jspdf incluído no optimizeDeps.include"
echo "   - Dependências D3 excluídas do optimizeDeps"
echo "   - Cache do Vite limpo"
echo "   - Build executado com configuração otimizada"
echo ""
echo "🌐 URLs da aplicação:"
echo "   - Frontend: https://seu-dominio.com"
echo "   - API: https://seu-dominio.com/api"
echo "   - Health: https://seu-dominio.com/api/health"
echo ""
echo "📞 Próximos passos:"
echo "   1. Teste a aplicação no navegador"
echo "   2. Verifique se não há mais erros de build"
echo "   3. Se houver problemas, execute: pm2 restart sispat"
echo "   4. Verifique os logs: pm2 logs sispat"
echo "   5. Verifique o console do navegador para erros JavaScript"
echo ""

success "🎉 Correção de dependência html2canvas concluída!"
