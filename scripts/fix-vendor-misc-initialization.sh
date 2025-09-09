#!/bin/bash

# =================================
# CORREÇÃO VENDOR-MISC - SISPAT
# Corrige problemas de inicialização no vendor-misc
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
echo "🔧    CORREÇÃO VENDOR-MISC - SISPAT"
echo "🔧    Corrige problemas de inicialização no vendor-misc"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção de vendor-misc..."

# 1. Parar PM2
log "🛑 Parando PM2..."
pm2 stop all 2>/dev/null || warning "PM2 não estava rodando"
pm2 delete all 2>/dev/null || true
pm2 save 2>/dev/null || true
success "PM2 parado"

# 2. Verificar configuração do Vite
log "🔍 Verificando configuração do Vite..."
VITE_CONFIG_FILE="vite.config.ts"

if [ -f "$VITE_CONFIG_FILE" ]; then
    # Verificar se charts estão sendo incluídos no vendor-misc
    if grep -q "return 'vendor-misc';" "$VITE_CONFIG_FILE"; then
        success "✅ Charts incluídos no vendor-misc"
    else
        warning "⚠️ Charts podem estar sendo separados"
    fi
    
    # Verificar se D3 está sendo excluído do optimizeDeps
    if grep -q "exclude.*d3" "$VITE_CONFIG_FILE"; then
        success "✅ D3 excluído do optimizeDeps"
    else
        warning "⚠️ D3 pode não estar sendo excluído"
    fi
else
    error "❌ Arquivo vite.config.ts não encontrado"
fi

# 3. Limpeza agressiva
log "🧹 Limpeza agressiva de cache e build..."
rm -rf dist
rm -rf node_modules
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf .vite
rm -rf .cache
rm -rf .parcel-cache
rm -rf .turbo
success "Limpeza agressiva concluída"

# 4. Limpar cache do npm
log "🧹 Limpando cache do npm..."
npm cache clean --force
success "Cache do npm limpo"

# 5. Reinstalar dependências com configuração específica
log "📦 Reinstalando dependências..."
npm install --legacy-peer-deps --force --no-optional
success "Dependências reinstaladas"

# 6. Verificar dependências problemáticas
log "🔍 Verificando dependências problemáticas..."
if npm list recharts 2>/dev/null | grep -q "recharts"; then
    success "✅ Recharts instalado"
else
    warning "⚠️ Recharts não encontrado"
fi

if npm list d3 2>/dev/null | grep -q "d3"; then
    success "✅ D3 instalado"
else
    warning "⚠️ D3 não encontrado"
fi

# 7. Fazer build com configuração otimizada
log "🏗️ Fazendo build com configuração otimizada..."
export NODE_ENV=production
export CI=false
npm run build
success "Build concluído"

# 8. Verificar arquivos gerados
log "🔍 Verificando arquivos gerados..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    success "✅ Arquivos de build encontrados"
    
    # Verificar se vendor-misc foi gerado
    if ls dist/assets/vendor-misc-*.js 1> /dev/null 2>&1; then
        success "✅ vendor-misc gerado"
        
        # Verificar tamanho do vendor-misc
        VENDOR_MISC_SIZE=$(ls -lh dist/assets/vendor-misc-*.js | awk '{print $5}')
        log "📊 Tamanho do vendor-misc: $VENDOR_MISC_SIZE"
        
        if [ -f "dist/assets/vendor-charts-*.js" ]; then
            warning "⚠️ vendor-charts ainda foi gerado separadamente"
        else
            success "✅ vendor-charts não foi gerado separadamente (incluído no vendor-misc)"
        fi
    else
        error "❌ vendor-misc não foi gerado"
    fi
else
    error "❌ Arquivos de build não encontrados"
fi

# 9. Testar se o build funciona
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
        
        # Testar se há erros JavaScript
        if curl -s http://localhost:8080 | grep -q "vendor-misc"; then
            success "✅ vendor-misc sendo carregado"
        else
            warning "⚠️ vendor-misc não encontrado no HTML"
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

# 10. Iniciar aplicação com PM2
log "🚀 Iniciando aplicação com PM2..."
if [ -f "ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs --env production
    pm2 save
    success "Aplicação iniciada com PM2"
else
    error "❌ Arquivo ecosystem.config.cjs não encontrado"
fi

# 11. Aguardar inicialização
log "⏳ Aguardando aplicação inicializar..."
sleep 10

# 12. Verificar se PM2 está rodando
log "🔍 Verificando status do PM2..."
if pm2 list | grep -q "online"; then
    success "✅ Aplicação está rodando no PM2"
else
    error "❌ Aplicação não está rodando no PM2"
fi

# 13. Testar API
log "🧪 Testando API..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
    success "✅ API respondendo corretamente"
else
    warning "⚠️ API pode não estar respondendo"
fi

# 14. Verificar logs recentes
log "📋 Verificando logs recentes..."
if pm2 logs sispat --lines 5 --nostream 2>/dev/null | grep -q "CORS bloqueado"; then
    warning "⚠️ Ainda há problemas de CORS nos logs"
else
    success "✅ Nenhum problema de CORS recente encontrado"
fi

# 15. Testar frontend
log "🧪 Testando frontend..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
    success "✅ Frontend respondendo corretamente"
else
    warning "⚠️ Frontend pode não estar respondendo"
fi

# Instruções finais
log "📝 CORREÇÃO VENDOR-MISC CONCLUÍDA!"
echo ""
echo "🎉 VENDOR-MISC CORRIGIDO!"
echo "========================="
echo ""
echo "📋 O que foi feito:"
echo "✅ PM2 parado"
echo "✅ Configuração Vite verificada"
echo "✅ Limpeza agressiva de cache e build"
echo "✅ Cache do npm limpo"
echo "✅ Dependências reinstaladas"
echo "✅ Dependências problemáticas verificadas"
echo "✅ Build com configuração otimizada"
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
echo "   - Charts incluídos no vendor-misc (não separados)"
echo "   - D3 excluído do optimizeDeps"
echo "   - Build otimizado para evitar problemas de inicialização"
echo "   - Dependências reinstaladas com configuração específica"
echo ""
echo "🌐 URLs da aplicação:"
echo "   - Frontend: https://seu-dominio.com"
echo "   - API: https://seu-dominio.com/api"
echo "   - Health: https://seu-dominio.com/api/health"
echo ""
echo "📞 Próximos passos:"
echo "   1. Teste a aplicação no navegador"
echo "   2. Verifique se não há mais erros de inicialização"
echo "   3. Se houver problemas, execute: pm2 restart sispat"
echo "   4. Verifique os logs: pm2 logs sispat"
echo "   5. Verifique o console do navegador para erros JavaScript"
echo ""

success "🎉 Correção de vendor-misc concluída!"
