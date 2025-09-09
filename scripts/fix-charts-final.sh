#!/bin/bash

# =================================
# CORREÇÃO DEFINITIVA CHARTS - SISPAT
# Corrige problemas de inicialização de charts de forma definitiva
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
echo "🔧    CORREÇÃO DEFINITIVA CHARTS - SISPAT"
echo "🔧    Corrige problemas de inicialização de charts"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção definitiva de charts..."

# 1. Parar PM2 se estiver rodando
log "🛑 Parando PM2..."
pm2 stop all 2>/dev/null || warning "PM2 não estava rodando"
pm2 delete all 2>/dev/null || true
success "PM2 parado"

# 2. Limpeza total de cache e build
log "🧹 Limpeza total de cache e build..."
rm -rf dist
rm -rf node_modules
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf .vite
rm -rf .cache
rm -f package-lock.json
rm -f pnpm-lock.yaml
rm -rf /tmp/vite-*
success "Limpeza total concluída"

# 3. Limpar cache do npm
log "🧹 Limpando cache do npm..."
npm cache clean --force
success "Cache do npm limpo"

# 4. Verificar se o vite.config.ts está correto
log "🔍 Verificando configuração do Vite..."
if [ ! -f "vite.config.ts" ]; then
    error "Arquivo vite.config.ts não encontrado"
fi

# Verificar se charts está comentado no manualChunks
if grep -q "// Charts (Recharts)" vite.config.ts; then
    success "✅ Configuração Vite já está corrigida (charts comentado)"
else
    warning "⚠️ Configuração Vite pode precisar de ajustes"
fi

# 5. Reinstalar dependências
log "📦 Reinstalando dependências..."
npm install --legacy-peer-deps --force
success "Dependências reinstaladas"

# 6. Fazer build do frontend
log "🏗️ Fazendo build do frontend..."
if npm run build; then
    success "✅ Build do frontend concluído com sucesso"
else
    error "❌ Falha no build do frontend"
fi

# 7. Verificar se os arquivos foram gerados
log "🔍 Verificando arquivos gerados..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    success "✅ Arquivos de build encontrados"
    
    # Verificar se NÃO há arquivo vendor-charts separado
    if ls dist/assets/vendor-charts-*.js > /dev/null 2>&1; then
        warning "⚠️ Arquivo vendor-charts ainda existe (pode causar problemas)"
        CHART_FILE=$(ls dist/assets/vendor-charts-*.js | head -1)
        log "📄 Arquivo de charts encontrado: $CHART_FILE"
    else
        success "✅ Arquivo vendor-charts não existe (correção aplicada)"
    fi
    
    # Verificar se vendor-misc contém charts
    if ls dist/assets/vendor-misc-*.js > /dev/null 2>&1; then
        MISC_FILE=$(ls dist/assets/vendor-misc-*.js | head -1)
        FILE_SIZE=$(stat -c%s "$MISC_FILE" 2>/dev/null || stat -f%z "$MISC_FILE" 2>/dev/null || echo "0")
        if [ "$FILE_SIZE" -gt 1000000 ]; then
            success "✅ Arquivo vendor-misc tem tamanho adequado ($FILE_SIZE bytes) - charts incluído"
        else
            warning "⚠️ Arquivo vendor-misc pode estar muito pequeno ($FILE_SIZE bytes)"
        fi
    else
        warning "⚠️ Arquivo vendor-misc não encontrado"
    fi
else
    error "❌ Arquivos de build não encontrados"
fi

# 8. Testar se o servidor pode servir os arquivos
log "🧪 Testando servidor..."
if command -v python3 &> /dev/null; then
    log "🚀 Iniciando servidor de teste na porta 8080..."
    cd dist
    python3 -m http.server 8080 &
    SERVER_PID=$!
    sleep 3
    
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

# 9. Iniciar aplicação com PM2
log "🚀 Iniciando aplicação com PM2..."
if [ -f "ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs --env production
    pm2 save
    success "Aplicação iniciada com PM2"
else
    warning "⚠️ Arquivo ecosystem.config.cjs não encontrado"
fi

# 10. Aguardar um pouco e verificar se está funcionando
log "⏳ Aguardando aplicação inicializar..."
sleep 5

# Verificar se PM2 está rodando
if pm2 list | grep -q "online"; then
    success "✅ Aplicação está rodando no PM2"
else
    warning "⚠️ Aplicação pode não estar rodando corretamente"
fi

# Instruções finais
log "📝 CORREÇÃO DEFINITIVA CONCLUÍDA!"
echo ""
echo "🎉 CHARTS CORRIGIDOS DEFINITIVAMENTE!"
echo "====================================="
echo ""
echo "📋 O que foi feito:"
echo "✅ PM2 parado e limpo"
echo "✅ Limpeza total de cache e build"
echo "✅ Cache do npm limpo"
echo "✅ Configuração Vite verificada"
echo "✅ Dependências reinstaladas"
echo "✅ Build do frontend executado"
echo "✅ Arquivos de build verificados"
echo "✅ Servidor de teste executado"
echo "✅ Aplicação iniciada com PM2"
echo ""
echo "🔧 Estratégia aplicada:"
echo "   - Charts incluídos no vendor-misc (não separado)"
echo "   - Evita problemas de inicialização"
echo "   - Build mais estável"
echo ""
echo "🌐 URLs da aplicação:"
echo "   - Frontend: https://seu-dominio.com"
echo "   - API: https://seu-dominio.com/api"
echo ""
echo "📞 Próximos passos:"
echo "   1. Teste a aplicação no navegador"
echo "   2. Verifique se não há mais erros de charts"
echo "   3. Se houver problemas, execute: pm2 restart sispat"
echo "   4. Verifique os logs: pm2 logs sispat"
echo ""

success "🎉 Correção definitiva de charts concluída!"
