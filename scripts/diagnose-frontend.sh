#!/bin/bash

# =================================
# DIAGNÓSTICO FRONTEND - SISPAT
# Verifica status completo do frontend
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
echo "🔍 ================================================"
echo "🔍    DIAGNÓSTICO FRONTEND - SISPAT"
echo "🔍    Verifica status completo do frontend"
echo "🔍 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
    exit 1
fi

log "🔍 Iniciando diagnóstico completo do frontend..."

# 1. Verificar status do PM2
log "📊 Verificando status do PM2..."
echo ""
pm2 list
echo ""

# 2. Verificar logs recentes do PM2
log "📋 Verificando logs recentes do PM2..."
echo ""
pm2 logs sispat --lines 20 --nostream
echo ""

# 3. Verificar se o diretório dist existe
log "📁 Verificando diretório dist..."
if [ -d "dist" ]; then
    success "✅ Diretório dist existe"
    
    # Verificar arquivos principais
    if [ -f "dist/index.html" ]; then
        success "✅ index.html encontrado"
    else
        error "❌ index.html não encontrado"
    fi
    
    # Verificar assets
    if [ -d "dist/assets" ]; then
        success "✅ Diretório assets existe"
        
        # Listar arquivos assets
        log "📄 Arquivos em dist/assets:"
        ls -la dist/assets/ | head -10
        
        # Verificar vendor-misc
        if ls dist/assets/vendor-misc-*.js 1> /dev/null 2>&1; then
            success "✅ vendor-misc encontrado"
            VENDOR_MISC_SIZE=$(ls -lh dist/assets/vendor-misc-*.js | awk '{print $5}')
            log "📊 Tamanho do vendor-misc: $VENDOR_MISC_SIZE"
        else
            error "❌ vendor-misc não encontrado"
        fi
        
        # Verificar se há arquivos de chart
        if ls dist/assets/vendor-charts-*.js 1> /dev/null 2>&1; then
            warning "⚠️ vendor-charts encontrado (pode causar problemas)"
        else
            success "✅ vendor-charts não encontrado (correto)"
        fi
    else
        error "❌ Diretório assets não encontrado"
    fi
else
    error "❌ Diretório dist não existe"
fi

# 4. Verificar configuração do Vite
log "⚙️ Verificando configuração do Vite..."
if [ -f "vite.config.ts" ]; then
    success "✅ vite.config.ts encontrado"
    
    # Verificar se html2canvas está no optimizeDeps.include
    if grep -q "html2canvas" vite.config.ts; then
        success "✅ html2canvas configurado no Vite"
    else
        warning "⚠️ html2canvas não configurado no Vite"
    fi
    
    # Verificar se jspdf está no optimizeDeps.include
    if grep -q "jspdf" vite.config.ts; then
        success "✅ jspdf configurado no Vite"
    else
        warning "⚠️ jspdf não configurado no Vite"
    fi
else
    error "❌ vite.config.ts não encontrado"
fi

# 5. Verificar dependências instaladas
log "📦 Verificando dependências..."
if npm list html2canvas 2>/dev/null | grep -q "html2canvas"; then
    success "✅ html2canvas instalado"
else
    warning "⚠️ html2canvas não instalado"
fi

if npm list jspdf 2>/dev/null | grep -q "jspdf"; then
    success "✅ jspdf instalado"
else
    warning "⚠️ jspdf não instalado"
fi

# 6. Testar conectividade da API
log "🌐 Testando conectividade da API..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
    success "✅ API respondendo corretamente"
    
    # Testar resposta da API
    API_RESPONSE=$(curl -s http://localhost:3001/api/health)
    log "📄 Resposta da API: $API_RESPONSE"
else
    error "❌ API não está respondendo"
fi

# 7. Testar frontend
log "🌐 Testando frontend..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
    success "✅ Frontend respondendo corretamente"
    
    # Verificar se o conteúdo contém SISPAT
    FRONTEND_CONTENT=$(curl -s http://localhost:3001 | head -20)
    if echo "$FRONTEND_CONTENT" | grep -q "SISPAT"; then
        success "✅ Conteúdo SISPAT encontrado no frontend"
    else
        warning "⚠️ Conteúdo SISPAT não encontrado no frontend"
    fi
else
    error "❌ Frontend não está respondendo"
fi

# 8. Verificar configuração do Nginx
log "⚙️ Verificando configuração do Nginx..."
if [ -f "/etc/nginx/sites-enabled/sispat" ]; then
    success "✅ Configuração Nginx encontrada"
    
    # Verificar se está configurado corretamente
    if grep -q "proxy_pass http://localhost:3001" /etc/nginx/sites-enabled/sispat; then
        success "✅ Proxy reverso configurado"
    else
        warning "⚠️ Proxy reverso pode não estar configurado"
    fi
else
    warning "⚠️ Configuração Nginx não encontrada"
fi

# 9. Verificar status do Nginx
log "📊 Verificando status do Nginx..."
if systemctl is-active --quiet nginx; then
    success "✅ Nginx está rodando"
else
    error "❌ Nginx não está rodando"
fi

# 10. Verificar logs do Nginx
log "📋 Verificando logs recentes do Nginx..."
if [ -f "/var/log/nginx/error.log" ]; then
    log "📄 Últimas 10 linhas do error.log:"
    tail -10 /var/log/nginx/error.log
else
    warning "⚠️ Log de erro do Nginx não encontrado"
fi

# 11. Verificar uso de memória e CPU
log "📊 Verificando uso de recursos..."
echo ""
echo "💾 Uso de memória:"
free -h
echo ""
echo "🖥️ Uso de CPU:"
top -bn1 | grep "Cpu(s)"
echo ""

# 12. Verificar processos Node.js
log "🔍 Verificando processos Node.js..."
ps aux | grep node | grep -v grep || warning "⚠️ Nenhum processo Node.js encontrado"

# 13. Verificar portas em uso
log "🔌 Verificando portas em uso..."
netstat -tlnp | grep -E ":(3001|80|443)" || warning "⚠️ Portas principais não encontradas"

# 14. Testar build se necessário
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    log "🏗️ Diretório dist não encontrado, tentando fazer build..."
    if npm run build; then
        success "✅ Build executado com sucesso"
    else
        error "❌ Falha no build"
    fi
fi

# Resumo do diagnóstico
echo ""
echo "📋 ================================================"
echo "📋    RESUMO DO DIAGNÓSTICO"
echo "📋 ================================================"
echo ""

# Contar problemas encontrados
PROBLEMS=0

if ! pm2 list | grep -q "online"; then
    echo "❌ PM2 não está rodando"
    PROBLEMS=$((PROBLEMS + 1))
fi

if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "❌ Build do frontend não encontrado"
    PROBLEMS=$((PROBLEMS + 1))
fi

if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
    echo "❌ API não está respondendo"
    PROBLEMS=$((PROBLEMS + 1))
fi

if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
    echo "❌ Frontend não está respondendo"
    PROBLEMS=$((PROBLEMS + 1))
fi

if [ $PROBLEMS -eq 0 ]; then
    success "🎉 Nenhum problema crítico encontrado!"
    echo ""
    echo "✅ Sistema funcionando corretamente:"
    echo "   - PM2 rodando"
    echo "   - Build do frontend OK"
    echo "   - API respondendo"
    echo "   - Frontend respondendo"
else
    warning "⚠️ $PROBLEMS problema(s) encontrado(s)"
    echo ""
    echo "🔧 Próximos passos recomendados:"
    echo "   1. Verifique os logs: pm2 logs sispat"
    echo "   2. Reinicie a aplicação: pm2 restart sispat"
    echo "   3. Se necessário, execute script de correção"
    echo "   4. Verifique o console do navegador para erros JavaScript"
fi

echo ""
log "🔍 Diagnóstico do frontend concluído!"
