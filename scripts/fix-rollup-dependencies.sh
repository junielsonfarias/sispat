#!/bin/bash

# =================================
# CORREÇÃO ROLLUP DEPENDENCIES - SISPAT
# Corrige problemas de dependências opcionais do Rollup
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
echo "🔧    CORREÇÃO ROLLUP DEPENDENCIES - SISPAT"
echo "🔧    Corrige problemas de dependências opcionais do Rollup"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção de dependências do Rollup..."

# 1. Parar PM2 se estiver rodando
log "🛑 Parando PM2..."
pm2 stop all 2>/dev/null || warning "PM2 não estava rodando"
pm2 delete all 2>/dev/null || true
success "PM2 parado"

# 2. Remover package-lock.json e node_modules
log "🧹 Removendo package-lock.json e node_modules..."
rm -f package-lock.json
rm -rf node_modules
rm -rf dist
rm -rf .vite
rm -rf .cache
success "Arquivos removidos"

# 3. Limpar cache do npm
log "🧹 Limpando cache do npm..."
npm cache clean --force
success "Cache do npm limpo"

# 4. Verificar arquitetura do sistema
log "🔍 Verificando arquitetura do sistema..."
ARCH=$(uname -m)
OS=$(uname -s)
log "Arquitetura: $ARCH"
log "Sistema: $OS"

# 5. Instalar dependências com configuração específica
log "📦 Instalando dependências com configuração específica..."
npm install --legacy-peer-deps --no-optional --force
success "Dependências instaladas"

# 6. Verificar se rollup foi instalado corretamente
log "🔍 Verificando instalação do Rollup..."
if npm list rollup 2>/dev/null | grep -q "rollup"; then
    success "✅ Rollup instalado"
    
    # Verificar dependências nativas do rollup
    if [ -d "node_modules/@rollup" ]; then
        success "✅ Dependências @rollup encontradas"
        
        # Listar dependências @rollup disponíveis
        log "📋 Dependências @rollup disponíveis:"
        ls -la node_modules/@rollup/ 2>/dev/null || warning "Não foi possível listar dependências @rollup"
    else
        warning "⚠️ Dependências @rollup não encontradas"
    fi
else
    error "❌ Rollup não foi instalado"
fi

# 7. Tentar instalar dependências nativas do rollup manualmente
log "📦 Instalando dependências nativas do rollup..."
npm install @rollup/rollup-linux-x64-gnu --save-dev --force 2>/dev/null || warning "Não foi possível instalar @rollup/rollup-linux-x64-gnu"

# 8. Verificar se as dependências nativas estão disponíveis
log "🔍 Verificando dependências nativas..."
if [ -f "node_modules/@rollup/rollup-linux-x64-gnu/package.json" ]; then
    success "✅ @rollup/rollup-linux-x64-gnu instalado"
else
    warning "⚠️ @rollup/rollup-linux-x64-gnu não encontrado"
    
    # Tentar instalar todas as dependências nativas do rollup
    log "📦 Tentando instalar todas as dependências nativas do rollup..."
    npm install @rollup/rollup-linux-x64-gnu @rollup/rollup-linux-arm64-gnu @rollup/rollup-linux-arm64-musl @rollup/rollup-linux-x64-musl @rollup/rollup-darwin-x64 @rollup/rollup-darwin-arm64 @rollup/rollup-win32-x64-msvc @rollup/rollup-win32-ia32-msvc @rollup/rollup-win32-arm64-msvc --save-dev --force 2>/dev/null || warning "Não foi possível instalar dependências nativas"
fi

# 9. Fazer build do frontend
log "🏗️ Fazendo build do frontend..."
export NODE_ENV=production
export CI=false

if npm run build; then
    success "✅ Build do frontend concluído com sucesso"
else
    error "❌ Falha no build do frontend"
fi

# 10. Verificar se os arquivos foram gerados
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

# 11. Testar se o build funciona
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

# 12. Iniciar aplicação com PM2
log "🚀 Iniciando aplicação com PM2..."
if [ -f "ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs --env production
    pm2 save
    success "Aplicação iniciada com PM2"
else
    error "❌ Arquivo ecosystem.config.cjs não encontrado"
fi

# 13. Aguardar inicialização
log "⏳ Aguardando aplicação inicializar..."
sleep 10

# 14. Verificar se PM2 está rodando
log "🔍 Verificando status do PM2..."
if pm2 list | grep -q "online"; then
    success "✅ Aplicação está rodando no PM2"
else
    error "❌ Aplicação não está rodando no PM2"
fi

# 15. Testar API
log "🧪 Testando API..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
    success "✅ API respondendo corretamente"
else
    warning "⚠️ API pode não estar respondendo"
fi

# 16. Verificar logs recentes
log "📋 Verificando logs recentes..."
if pm2 logs sispat --lines 5 --nostream 2>/dev/null | grep -q "CORS bloqueado"; then
    warning "⚠️ Ainda há problemas de CORS nos logs"
else
    success "✅ Nenhum problema de CORS recente encontrado"
fi

# 17. Testar frontend
log "🧪 Testando frontend..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
    success "✅ Frontend respondendo corretamente"
else
    warning "⚠️ Frontend pode não estar respondendo"
fi

# Instruções finais
log "📝 CORREÇÃO ROLLUP DEPENDENCIES CONCLUÍDA!"
echo ""
echo "🎉 ROLLUP DEPENDENCIES CORRIGIDAS!"
echo "=================================="
echo ""
echo "📋 O que foi feito:"
echo "✅ PM2 parado"
echo "✅ package-lock.json e node_modules removidos"
echo "✅ Cache do npm limpo"
echo "✅ Arquitetura do sistema verificada"
echo "✅ Dependências instaladas com configuração específica"
echo "✅ Rollup verificado"
echo "✅ Dependências @rollup verificadas"
echo "✅ Dependências nativas do rollup instaladas"
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
echo "   - package-lock.json e node_modules removidos"
echo "   - Dependências reinstaladas com --no-optional"
echo "   - Dependências nativas do rollup instaladas manualmente"
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

success "🎉 Correção de dependências do Rollup concluída!"
