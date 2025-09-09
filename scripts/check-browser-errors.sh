#!/bin/bash

# =================================
# VERIFICAÇÃO ERROS BROWSER - SISPAT
# Verifica possíveis erros do frontend
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
echo "🔍    VERIFICAÇÃO ERROS BROWSER - SISPAT"
echo "🔍    Verifica possíveis erros do frontend"
echo "🔍 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
    exit 1
fi

log "🔍 Verificando possíveis erros do frontend..."

# 1. Verificar se há arquivos de build
log "📁 Verificando arquivos de build..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    success "✅ Arquivos de build encontrados"
    
    # Verificar se index.html tem conteúdo válido
    if grep -q "<!DOCTYPE html>" dist/index.html; then
        success "✅ index.html válido"
    else
        error "❌ index.html inválido"
    fi
    
    # Verificar se há referências para arquivos JS
    JS_FILES=$(grep -o 'src="[^"]*\.js"' dist/index.html | wc -l)
    if [ $JS_FILES -gt 0 ]; then
        success "✅ $JS_FILES arquivo(s) JS referenciado(s)"
    else
        error "❌ Nenhum arquivo JS referenciado"
    fi
    
    # Verificar se há referências para arquivos CSS
    CSS_FILES=$(grep -o 'href="[^"]*\.css"' dist/index.html | wc -l)
    if [ $CSS_FILES -gt 0 ]; then
        success "✅ $CSS_FILES arquivo(s) CSS referenciado(s)"
    else
        warning "⚠️ Nenhum arquivo CSS referenciado"
    fi
else
    error "❌ Arquivos de build não encontrados"
    exit 1
fi

# 2. Verificar arquivos JavaScript
log "📄 Verificando arquivos JavaScript..."
if [ -d "dist/assets" ]; then
    # Verificar se há arquivos JS
    JS_COUNT=$(find dist/assets -name "*.js" | wc -l)
    if [ $JS_COUNT -gt 0 ]; then
        success "✅ $JS_COUNT arquivo(s) JS encontrado(s)"
        
        # Verificar tamanho dos arquivos
        log "📊 Tamanhos dos arquivos JS:"
        ls -lh dist/assets/*.js | awk '{print "   " $5 " - " $9}'
        
        # Verificar se há arquivos muito grandes (>5MB)
        LARGE_FILES=$(find dist/assets -name "*.js" -size +5M | wc -l)
        if [ $LARGE_FILES -gt 0 ]; then
            warning "⚠️ $LARGE_FILES arquivo(s) JS muito grande(s) (>5MB)"
        fi
        
        # Verificar se há arquivos muito pequenos (<1KB)
        SMALL_FILES=$(find dist/assets -name "*.js" -size -1k | wc -l)
        if [ $SMALL_FILES -gt 0 ]; then
            warning "⚠️ $SMALL_FILES arquivo(s) JS muito pequeno(s) (<1KB)"
        fi
    else
        error "❌ Nenhum arquivo JS encontrado"
    fi
else
    error "❌ Diretório assets não encontrado"
fi

# 3. Verificar se há erros comuns nos arquivos JS
log "🔍 Verificando erros comuns nos arquivos JS..."
if [ -d "dist/assets" ]; then
    # Verificar se há referências para 'ee' (erro de inicialização)
    if grep -r "Cannot access 'ee' before initialization" dist/assets/ 2>/dev/null; then
        error "❌ Erro 'Cannot access ee before initialization' encontrado"
    else
        success "✅ Nenhum erro 'ee' encontrado"
    fi
    
    # Verificar se há referências para 'P' (erro de inicialização)
    if grep -r "Cannot access 'P' before initialization" dist/assets/ 2>/dev/null; then
        error "❌ Erro 'Cannot access P before initialization' encontrado"
    else
        success "✅ Nenhum erro 'P' encontrado"
    fi
    
    # Verificar se há referências para 'w' (erro de inicialização)
    if grep -r "Cannot access 'w' before initialization" dist/assets/ 2>/dev/null; then
        error "❌ Erro 'Cannot access w before initialization' encontrado"
    else
        success "✅ Nenhum erro 'w' encontrado"
    fi
fi

# 4. Verificar se há problemas de CORS
log "🌐 Verificando problemas de CORS..."
# Simular uma requisição para verificar CORS
CORS_RESPONSE=$(curl -s -I -H "Origin: http://localhost:3000" http://localhost:3001/api/health 2>/dev/null || echo "ERRO")
if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    success "✅ CORS configurado corretamente"
else
    warning "⚠️ CORS pode não estar configurado"
fi

# 5. Verificar se há problemas de rede
log "🔌 Verificando conectividade..."
# Testar se a aplicação está respondendo
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
    success "✅ Aplicação respondendo na porta 3001"
else
    error "❌ Aplicação não está respondendo na porta 3001"
fi

# 6. Verificar se há problemas de memória
log "💾 Verificando uso de memória..."
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
if (( $(echo "$MEMORY_USAGE > 90" | bc -l) )); then
    warning "⚠️ Uso de memória alto: ${MEMORY_USAGE}%"
else
    success "✅ Uso de memória normal: ${MEMORY_USAGE}%"
fi

# 7. Verificar se há problemas de CPU
log "🖥️ Verificando uso de CPU..."
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    warning "⚠️ Uso de CPU alto: ${CPU_USAGE}%"
else
    success "✅ Uso de CPU normal: ${CPU_USAGE}%"
fi

# 8. Verificar logs do PM2 para erros
log "📋 Verificando logs do PM2 para erros..."
PM2_ERRORS=$(pm2 logs sispat --lines 50 --nostream 2>/dev/null | grep -i "error\|erro\|fail\|exception" | wc -l)
if [ $PM2_ERRORS -gt 0 ]; then
    warning "⚠️ $PM2_ERRORS erro(s) encontrado(s) nos logs do PM2"
    log "📄 Últimos erros encontrados:"
    pm2 logs sispat --lines 50 --nostream 2>/dev/null | grep -i "error\|erro\|fail\|exception" | tail -5
else
    success "✅ Nenhum erro encontrado nos logs do PM2"
fi

# 9. Verificar se há problemas de build
log "🏗️ Verificando se há problemas de build..."
# Verificar se o build foi feito recentemente
if [ -f "dist/index.html" ]; then
    BUILD_TIME=$(stat -c %Y dist/index.html)
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - BUILD_TIME))
    
    if [ $TIME_DIFF -lt 3600 ]; then
        success "✅ Build recente (menos de 1 hora)"
    else
        warning "⚠️ Build antigo (mais de 1 hora)"
    fi
fi

# 10. Verificar se há problemas de dependências
log "📦 Verificando dependências..."
if [ -f "package.json" ]; then
    # Verificar se há dependências problemáticas
    if grep -q "html2canvas" package.json; then
        success "✅ html2canvas listado no package.json"
    else
        warning "⚠️ html2canvas não listado no package.json"
    fi
    
    if grep -q "jspdf" package.json; then
        success "✅ jspdf listado no package.json"
    else
        warning "⚠️ jspdf não listado no package.json"
    fi
fi

# Resumo da verificação
echo ""
echo "📋 ================================================"
echo "📋    RESUMO DA VERIFICAÇÃO"
echo "📋 ================================================"
echo ""

# Contar problemas encontrados
PROBLEMS=0

if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "❌ Arquivos de build não encontrados"
    PROBLEMS=$((PROBLEMS + 1))
fi

if [ -d "dist/assets" ]; then
    JS_COUNT=$(find dist/assets -name "*.js" | wc -l)
    if [ $JS_COUNT -eq 0 ]; then
        echo "❌ Nenhum arquivo JS encontrado"
        PROBLEMS=$((PROBLEMS + 1))
    fi
fi

if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
    echo "❌ Aplicação não está respondendo"
    PROBLEMS=$((PROBLEMS + 1))
fi

if [ $PROBLEMS -eq 0 ]; then
    success "🎉 Nenhum problema crítico encontrado!"
    echo ""
    echo "✅ Frontend parece estar funcionando corretamente:"
    echo "   - Arquivos de build encontrados"
    echo "   - Arquivos JS presentes"
    echo "   - Aplicação respondendo"
    echo ""
    echo "🔍 Para verificar erros no navegador:"
    echo "   1. Abra o navegador"
    echo "   2. Acesse a aplicação"
    echo "   3. Pressione F12 para abrir DevTools"
    echo "   4. Vá para a aba Console"
    echo "   5. Verifique se há erros em vermelho"
else
    warning "⚠️ $PROBLEMS problema(s) encontrado(s)"
    echo ""
    echo "🔧 Próximos passos recomendados:"
    echo "   1. Execute: ./scripts/fix-html2canvas-complete.sh"
    echo "   2. Reinicie a aplicação: pm2 restart sispat"
    echo "   3. Verifique os logs: pm2 logs sispat"
    echo "   4. Verifique o console do navegador"
fi

echo ""
log "🔍 Verificação de erros do browser concluída!"
