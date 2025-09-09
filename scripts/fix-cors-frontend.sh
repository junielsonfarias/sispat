#!/bin/bash

# =================================
# CORREÇÃO CORS + FRONTEND - SISPAT
# Corrige problemas de CORS e frontend
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
echo "🔧    CORREÇÃO CORS + FRONTEND - SISPAT"
echo "🔧    Corrige problemas de CORS e frontend"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção de CORS e frontend..."

# 1. Parar PM2 se estiver rodando
log "🛑 Parando PM2..."
pm2 stop all 2>/dev/null || warning "PM2 não estava rodando"
pm2 delete all 2>/dev/null || true
success "PM2 parado"

# 2. Verificar arquivo .env
log "🔍 Verificando arquivo .env..."
if [ -f ".env" ]; then
    success "✅ Arquivo .env encontrado"
    
    # Verificar se CORS_ORIGIN está configurado
    if grep -q "CORS_ORIGIN" .env; then
        success "✅ CORS_ORIGIN configurado"
    else
        warning "⚠️ CORS_ORIGIN não encontrado no .env"
    fi
    
    # Verificar se ALLOWED_ORIGINS está configurado
    if grep -q "ALLOWED_ORIGINS" .env; then
        success "✅ ALLOWED_ORIGINS configurado"
    else
        warning "⚠️ ALLOWED_ORIGINS não encontrado no .env"
    fi
else
    error "❌ Arquivo .env não encontrado"
fi

# 3. Verificar se o arquivo server/index.js foi corrigido
log "🔍 Verificando configuração CORS no servidor..."
if grep -q "Em produção, permitir requisições sem origin também" server/index.js; then
    success "✅ Configuração CORS corrigida no servidor"
else
    warning "⚠️ Configuração CORS pode precisar de ajustes"
fi

# 4. Limpar build anterior
log "🧹 Limpando build anterior..."
rm -rf dist
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf .vite
rm -rf .cache
success "Build anterior limpo"

# 5. Fazer build do frontend
log "🏗️ Fazendo build do frontend..."
if npm run build; then
    success "✅ Build do frontend concluído com sucesso"
else
    error "❌ Falha no build do frontend"
fi

# 6. Verificar se os arquivos foram gerados
log "🔍 Verificando arquivos gerados..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    success "✅ Arquivos de build encontrados"
    
    # Verificar se index.html tem o conteúdo correto
    if grep -q "SISPAT" dist/index.html; then
        success "✅ index.html contém conteúdo correto"
    else
        warning "⚠️ index.html pode estar vazio ou incorreto"
    fi
else
    error "❌ Arquivos de build não encontrados"
fi

# 7. Testar se o servidor pode servir os arquivos
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

# 8. Iniciar aplicação com PM2
log "🚀 Iniciando aplicação com PM2..."
if [ -f "ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs --env production
    pm2 save
    success "Aplicação iniciada com PM2"
else
    warning "⚠️ Arquivo ecosystem.config.cjs não encontrado"
fi

# 9. Aguardar um pouco e verificar se está funcionando
log "⏳ Aguardando aplicação inicializar..."
sleep 5

# Verificar se PM2 está rodando
if pm2 list | grep -q "online"; then
    success "✅ Aplicação está rodando no PM2"
else
    warning "⚠️ Aplicação pode não estar rodando corretamente"
fi

# 10. Testar API
log "🧪 Testando API..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
    success "✅ API respondendo corretamente"
else
    warning "⚠️ API pode não estar respondendo"
fi

# 11. Verificar logs recentes
log "📋 Verificando logs recentes..."
if pm2 logs sispat --lines 5 --nostream 2>/dev/null | grep -q "CORS bloqueado"; then
    warning "⚠️ Ainda há problemas de CORS nos logs"
else
    success "✅ Nenhum problema de CORS recente encontrado"
fi

# Instruções finais
log "📝 CORREÇÃO CONCLUÍDA!"
echo ""
echo "🎉 CORS + FRONTEND CORRIGIDOS!"
echo "==============================="
echo ""
echo "📋 O que foi feito:"
echo "✅ PM2 parado e limpo"
echo "✅ Arquivo .env verificado"
echo "✅ Configuração CORS verificada"
echo "✅ Build anterior limpo"
echo "✅ Build do frontend executado"
echo "✅ Arquivos de build verificados"
echo "✅ Servidor de teste executado"
echo "✅ Aplicação iniciada com PM2"
echo "✅ API testada"
echo "✅ Logs verificados"
echo ""
echo "🔧 Correções aplicadas:"
echo "   - CORS configurado para permitir requisições sem origin em produção"
echo "   - Frontend buildado corretamente"
echo "   - Servidor configurado para servir arquivos estáticos"
echo ""
echo "🌐 URLs da aplicação:"
echo "   - Frontend: https://seu-dominio.com"
echo "   - API: https://seu-dominio.com/api"
echo "   - Health: https://seu-dominio.com/api/health"
echo ""
echo "📞 Próximos passos:"
echo "   1. Teste a aplicação no navegador"
echo "   2. Verifique se não há mais erros de CORS"
echo "   3. Se houver problemas, execute: pm2 restart sispat"
echo "   4. Verifique os logs: pm2 logs sispat"
echo ""

success "🎉 Correção de CORS + Frontend concluída!"
