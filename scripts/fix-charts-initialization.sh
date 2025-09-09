#!/bin/bash

# =================================
# CORREÇÃO INICIALIZAÇÃO CHARTS - SISPAT
# Corrige problemas de inicialização de charts
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
echo "🔧    CORREÇÃO INICIALIZAÇÃO CHARTS - SISPAT"
echo "🔧    Corrige problemas de inicialização de charts"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção de inicialização de charts..."

# 1. Parar PM2 se estiver rodando
log "🛑 Parando PM2..."
pm2 stop all 2>/dev/null || warning "PM2 não estava rodando"
pm2 delete all 2>/dev/null || true
success "PM2 parado"

# 2. Limpeza agressiva de cache e build
log "🧹 Limpeza agressiva de cache e build..."
rm -rf dist
rm -rf node_modules
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf .vite
rm -rf .cache
rm -f package-lock.json
rm -f pnpm-lock.yaml
success "Limpeza agressiva concluída"

# 3. Limpar cache do npm
log "🧹 Limpando cache do npm..."
npm cache clean --force
success "Cache do npm limpo"

# 4. Reinstalar dependências
log "📦 Reinstalando dependências..."
npm install --legacy-peer-deps --force
success "Dependências reinstaladas"

# 5. Verificar se recharts está instalado
log "🔍 Verificando instalação do recharts..."
if npm list recharts > /dev/null 2>&1; then
    success "✅ Recharts está instalado"
else
    warning "⚠️ Recharts não encontrado, instalando..."
    npm install recharts --legacy-peer-deps
    success "Recharts instalado"
fi

# 6. Verificar dependências D3
log "🔍 Verificando dependências D3..."
D3_DEPS=("d3-scale" "d3-array" "d3-time" "d3-time-format" "d3-shape" "d3-path" "d3-color" "d3-interpolate" "d3-ease")
for dep in "${D3_DEPS[@]}"; do
    if npm list "$dep" > /dev/null 2>&1; then
        success "✅ $dep está instalado"
    else
        warning "⚠️ $dep não encontrado, instalando..."
        npm install "$dep" --legacy-peer-deps
        success "$dep instalado"
    fi
done

# 7. Verificar configuração do Vite
log "🔍 Verificando configuração do Vite..."
if [ ! -f "vite.config.ts" ]; then
    error "Arquivo vite.config.ts não encontrado"
fi

# Verificar se a configuração tem as otimizações necessárias
if grep -q "recharts" vite.config.ts && grep -q "d3-" vite.config.ts; then
    success "✅ Configuração Vite otimizada para charts"
else
    warning "⚠️ Configuração Vite pode precisar de ajustes"
fi

# 8. Fazer build do frontend
log "🏗️ Fazendo build do frontend..."
if npm run build; then
    success "✅ Build do frontend concluído com sucesso"
else
    error "❌ Falha no build do frontend"
fi

# 9. Verificar se os arquivos foram gerados
log "🔍 Verificando arquivos gerados..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    success "✅ Arquivos de build encontrados"
    
    # Verificar se o arquivo de charts foi gerado
    if ls dist/assets/vendor-charts-*.js > /dev/null 2>&1; then
        success "✅ Arquivo vendor-charts gerado"
        CHART_FILE=$(ls dist/assets/vendor-charts-*.js | head -1)
        log "📄 Arquivo de charts: $CHART_FILE"
        
        # Verificar tamanho do arquivo
        FILE_SIZE=$(stat -c%s "$CHART_FILE" 2>/dev/null || stat -f%z "$CHART_FILE" 2>/dev/null || echo "0")
        if [ "$FILE_SIZE" -gt 1000 ]; then
            success "✅ Arquivo de charts tem tamanho adequado ($FILE_SIZE bytes)"
        else
            warning "⚠️ Arquivo de charts pode estar muito pequeno ($FILE_SIZE bytes)"
        fi
    else
        warning "⚠️ Arquivo vendor-charts não encontrado"
    fi
else
    error "❌ Arquivos de build não encontrados"
fi

# 10. Testar se o servidor pode servir os arquivos
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
        
        # Testar se o arquivo de charts está acessível
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/assets/vendor-charts-*.js | grep -q "200"; then
            success "✅ Arquivo de charts acessível via HTTP"
        else
            warning "⚠️ Arquivo de charts pode não estar acessível via HTTP"
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

# 11. Iniciar aplicação com PM2
log "🚀 Iniciando aplicação com PM2..."
if [ -f "ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs --env production
    pm2 save
    success "Aplicação iniciada com PM2"
else
    warning "⚠️ Arquivo ecosystem.config.cjs não encontrado"
fi

# Instruções finais
log "📝 CORREÇÃO CONCLUÍDA!"
echo ""
echo "🎉 INICIALIZAÇÃO DE CHARTS CORRIGIDA!"
echo "====================================="
echo ""
echo "📋 O que foi feito:"
echo "✅ PM2 parado e limpo"
echo "✅ Limpeza agressiva de cache e build"
echo "✅ Cache do npm limpo"
echo "✅ Dependências reinstaladas"
echo "✅ Recharts e D3 verificados/instalados"
echo "✅ Configuração Vite verificada"
echo "✅ Build do frontend executado"
echo "✅ Arquivos de build verificados"
echo "✅ Servidor de teste executado"
echo "✅ Aplicação iniciada com PM2"
echo ""
echo "🔧 Arquivos gerados:"
echo "   - dist/index.html (página principal)"
echo "   - dist/assets/vendor-charts-*.js (biblioteca de charts)"
echo "   - dist/assets/ (outros arquivos JavaScript e CSS)"
echo ""
echo "📞 Próximos passos:"
echo "   1. Teste a aplicação no navegador"
echo "   2. Verifique o console do navegador para erros"
echo "   3. Se houver problemas, execute: pm2 restart sispat"
echo "   4. Verifique os logs: pm2 logs sispat"
echo ""

success "🎉 Correção de inicialização de charts concluída!"
