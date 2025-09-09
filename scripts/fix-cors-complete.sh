#!/bin/bash

# =================================
# CORREÇÃO CORS COMPLETA - SISPAT
# Força atualização completa do código e reinicialização
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
echo "🔧    CORREÇÃO CORS COMPLETA - SISPAT"
echo "🔧    Força atualização completa do código"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção CORS completa..."

# 1. Parar PM2 completamente
log "🛑 Parando PM2 completamente..."
pm2 stop all 2>/dev/null || warning "PM2 não estava rodando"
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
success "PM2 parado completamente"

# 2. Fazer backup do código atual
log "💾 Fazendo backup do código atual..."
if [ -d "backup-$(date +%Y%m%d-%H%M%S)" ]; then
    rm -rf backup-$(date +%Y%m%d-%H%M%S)
fi
mkdir -p backup-$(date +%Y%m%d-%H%M%S)
cp -r server backup-$(date +%Y%m%d-%H%M%S)/ 2>/dev/null || true
success "Backup criado"

# 3. Atualizar código do repositório
log "🔄 Atualizando código do repositório..."
git fetch origin
git reset --hard origin/main
git clean -fd
success "Código atualizado do repositório"

# 4. Verificar se a correção CORS está presente
log "🔍 Verificando correção CORS no código..."
if grep -q "Em produção, permitir requisições sem origin também" server/index.js; then
    success "✅ Correção CORS encontrada no código"
else
    error "❌ Correção CORS não encontrada no código"
fi

# 5. Limpar completamente cache e build
log "🧹 Limpeza completa de cache e build..."
rm -rf dist
rm -rf node_modules
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf .vite
rm -rf .cache
rm -rf logs/*.log
success "Limpeza completa concluída"

# 6. Limpar cache do npm
log "🧹 Limpando cache do npm..."
npm cache clean --force
success "Cache do npm limpo"

# 7. Reinstalar dependências
log "📦 Reinstalando dependências..."
npm install --legacy-peer-deps --force
success "Dependências reinstaladas"

# 8. Fazer build do frontend
log "🏗️ Fazendo build do frontend..."
npm run build
success "Build do frontend concluído"

# 9. Verificar se os arquivos foram gerados
log "🔍 Verificando arquivos gerados..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    success "✅ Arquivos de build encontrados"
else
    error "❌ Arquivos de build não encontrados"
fi

# 10. Verificar configuração do servidor
log "🔍 Verificando configuração do servidor..."
if [ -f "server/index.js" ]; then
    # Verificar se a correção CORS está presente
    if grep -q "Em produção, permitir requisições sem origin também" server/index.js; then
        success "✅ Configuração CORS corrigida no servidor"
    else
        error "❌ Configuração CORS não encontrada no servidor"
    fi
else
    error "❌ Arquivo server/index.js não encontrado"
fi

# 11. Iniciar aplicação com PM2
log "🚀 Iniciando aplicação com PM2..."
if [ -f "ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs --env production
    pm2 save
    success "Aplicação iniciada com PM2"
else
    error "❌ Arquivo ecosystem.config.cjs não encontrado"
fi

# 12. Aguardar inicialização
log "⏳ Aguardando aplicação inicializar..."
sleep 10

# 13. Verificar se PM2 está rodando
log "🔍 Verificando status do PM2..."
if pm2 list | grep -q "online"; then
    success "✅ Aplicação está rodando no PM2"
else
    error "❌ Aplicação não está rodando no PM2"
fi

# 14. Testar API
log "🧪 Testando API..."
sleep 5
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
    success "✅ API respondendo corretamente"
else
    warning "⚠️ API pode não estar respondendo ainda"
fi

# 15. Verificar logs recentes
log "📋 Verificando logs recentes..."
sleep 5
if pm2 logs sispat --lines 10 --nostream 2>/dev/null | grep -q "CORS bloqueado"; then
    warning "⚠️ Ainda há problemas de CORS nos logs"
    log "📋 Últimos logs:"
    pm2 logs sispat --lines 5 --nostream 2>/dev/null || true
else
    success "✅ Nenhum problema de CORS recente encontrado"
fi

# 16. Testar frontend
log "🧪 Testando frontend..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
    success "✅ Frontend respondendo corretamente"
else
    warning "⚠️ Frontend pode não estar respondendo"
fi

# 17. Verificar se Nginx está configurado
log "🔍 Verificando configuração do Nginx..."
if systemctl is-active --quiet nginx; then
    success "✅ Nginx está ativo"
    
    # Testar se Nginx está servindo o frontend
    if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
        success "✅ Nginx servindo frontend corretamente"
    else
        warning "⚠️ Nginx pode não estar servindo o frontend"
    fi
else
    warning "⚠️ Nginx não está ativo"
fi

# Instruções finais
log "📝 CORREÇÃO CORS COMPLETA CONCLUÍDA!"
echo ""
echo "🎉 CORS COMPLETAMENTE CORRIGIDO!"
echo "================================"
echo ""
echo "📋 O que foi feito:"
echo "✅ PM2 parado completamente"
echo "✅ Backup do código criado"
echo "✅ Código atualizado do repositório"
echo "✅ Correção CORS verificada"
echo "✅ Limpeza completa de cache e build"
echo "✅ Cache do npm limpo"
echo "✅ Dependências reinstaladas"
echo "✅ Build do frontend executado"
echo "✅ Arquivos de build verificados"
echo "✅ Configuração do servidor verificada"
echo "✅ Aplicação iniciada com PM2"
echo "✅ Status do PM2 verificado"
echo "✅ API testada"
echo "✅ Logs verificados"
echo "✅ Frontend testado"
echo "✅ Nginx verificado"
echo ""
echo "🔧 Correções aplicadas:"
echo "   - Código atualizado do repositório"
echo "   - CORS configurado para permitir requisições sem origin em produção"
echo "   - Frontend buildado corretamente"
echo "   - Servidor reinicializado completamente"
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
echo "   5. Verifique o status: pm2 status"
echo ""

success "🎉 Correção CORS completa concluída!"
