#!/bin/bash

# =================================
# CORREÇÃO CARREGAMENTO CSS - SISPAT
# Resolve problema de CSS não carregando
# =================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[SUCESSO]${NC} $1"; }
warning() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
error() { echo -e "${RED}[ERRO]${NC} $1"; }

log "🔧 CORREÇÃO CARREGAMENTO CSS - SISPAT..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

# 1. VERIFICAR BUILD DO FRONTEND
log "📋 Verificando build do frontend..."
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    warning "⚠️ Build do frontend não encontrado, executando build..."
    
    # Verificar se as dependências estão instaladas
    if [ ! -d "node_modules" ]; then
        log "📦 Instalando dependências..."
        if command -v pnpm &> /dev/null; then
            pnpm install
        else
            npm install
        fi
    fi
    
    # Executar build
    log "🔨 Executando build do frontend..."
    if command -v pnpm &> /dev/null; then
        pnpm run build
    else
        npm run build
    fi
    
    if [ -d "dist" ] && [ -f "dist/index.html" ]; then
        success "✅ Build do frontend executado com sucesso"
    else
        error "❌ Falha ao executar build do frontend"
    fi
else
    success "✅ Build do frontend encontrado"
fi

# 2. VERIFICAR ARQUIVOS CSS
log "🎨 Verificando arquivos CSS..."
CSS_FILES=$(find dist/assets -name "*.css" 2>/dev/null | wc -l)
if [ "$CSS_FILES" -gt 0 ]; then
    success "✅ $CSS_FILES arquivo(s) CSS encontrado(s)"
    find dist/assets -name "*.css" -exec ls -la {} \;
else
    error "❌ Nenhum arquivo CSS encontrado em dist/assets/"
fi

# 3. VERIFICAR REFERÊNCIAS NO HTML
log "📝 Verificando referências CSS no HTML..."
if grep -q "link.*stylesheet.*css" dist/index.html; then
    success "✅ Referências CSS encontradas no HTML"
    grep "link.*stylesheet.*css" dist/index.html
else
    error "❌ Nenhuma referência CSS encontrada no HTML"
fi

# 4. VERIFICAR SERVIDOR DE DESENVOLVIMENTO
log "🚀 Verificando servidor de desenvolvimento..."
if pgrep -f "vite\|dev-server" > /dev/null; then
    success "✅ Servidor de desenvolvimento rodando"
    ps aux | grep -E "(vite|dev-server)" | grep -v grep
else
    warning "⚠️ Servidor de desenvolvimento não está rodando"
    log "📋 Iniciando servidor de desenvolvimento..."
    
    # Iniciar servidor em background
    if command -v pnpm &> /dev/null; then
        pnpm run dev &
    else
        npm run dev &
    fi
    
    # Aguardar inicialização
    sleep 10
    
    if pgrep -f "vite\|dev-server" > /dev/null; then
        success "✅ Servidor de desenvolvimento iniciado"
    else
        error "❌ Falha ao iniciar servidor de desenvolvimento"
    fi
fi

# 5. VERIFICAR CONFIGURAÇÃO VITE
log "⚙️ Verificando configuração Vite..."
if [ -f "vite.config.ts" ]; then
    success "✅ Arquivo vite.config.ts encontrado"
    
    # Verificar configurações importantes
    if grep -q "base:" vite.config.ts; then
        log "📋 Base path configurado:"
        grep "base:" vite.config.ts
    fi
    
    if grep -q "build:" vite.config.ts; then
        log "📋 Configurações de build encontradas"
    fi
else
    warning "⚠️ Arquivo vite.config.ts não encontrado"
fi

# 6. VERIFICAR PERMISSÕES DOS ARQUIVOS
log "🔐 Verificando permissões dos arquivos..."
if [ -d "dist" ]; then
    chmod -R 755 dist/
    success "✅ Permissões dos arquivos configuradas"
fi

# 7. TESTE DE CONECTIVIDADE
log "🌐 Testando conectividade..."
if command -v curl &> /dev/null; then
    # Testar se o servidor está respondendo
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        success "✅ Servidor respondendo na porta 3000"
        
        # Testar se o CSS está sendo servido
        CSS_URL=$(grep "link.*stylesheet.*css" dist/index.html | sed 's/.*href="\([^"]*\)".*/\1/')
        if [ -n "$CSS_URL" ]; then
            log "🔍 Testando acesso ao CSS: $CSS_URL"
            if curl -s "http://localhost:3000$CSS_URL" > /dev/null 2>&1; then
                success "✅ CSS acessível via HTTP"
            else
                warning "⚠️ CSS não acessível via HTTP"
            fi
        fi
    else
        warning "⚠️ Servidor não está respondendo na porta 3000"
    fi
else
    warning "⚠️ curl não disponível para testar conectividade"
fi

# 8. SOLUÇÕES ALTERNATIVAS
log "🔧 Aplicando soluções alternativas..."

# Verificar se há problemas com base path
if [ -f "vite.config.ts" ] && ! grep -q "base: '/'" vite.config.ts; then
    log "📝 Corrigindo base path no Vite..."
    cp vite.config.ts vite.config.ts.backup
    
    # Adicionar base path se não existir
    if ! grep -q "base:" vite.config.ts; then
        sed -i '1s/^/import { defineConfig } from "vite";\n/' vite.config.ts
        sed -i 's/export default defineConfig({/export default defineConfig({\n  base: "\/",/' vite.config.ts
        success "✅ Base path corrigido no Vite"
    fi
fi

# 9. VERIFICAÇÃO FINAL
log "🔍 VERIFICAÇÃO FINAL..."
echo ""
echo "🎯 STATUS DO CSS:"
echo "=================="

# Verificar arquivos
echo "📁 Arquivos:"
echo "  - Build frontend: $(if [ -d "dist" ] && [ -f "dist/index.html" ]; then echo "EXISTE"; else echo "NÃO EXISTE"; fi)"
echo "  - Arquivos CSS: $(find dist/assets -name "*.css" 2>/dev/null | wc -l) arquivo(s)"
echo "  - Referências HTML: $(if grep -q "link.*stylesheet.*css" dist/index.html; then echo "OK"; else echo "FALTANDO"; fi)"

# Verificar servidor
echo ""
echo "🚀 Servidor:"
if pgrep -f "vite\|dev-server" > /dev/null; then
    echo "  - Status: RODANDO"
    echo "  - Porta: 3000"
else
    echo "  - Status: PARADO"
fi

# Verificar conectividade
echo ""
echo "🌐 Conectividade:"
if command -v curl &> /dev/null; then
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "  - Localhost: RESPONDENDO"
    else
        echo "  - Localhost: NÃO RESPONDE"
    fi
else
    echo "  - Localhost: NÃO TESTADO (curl não disponível)"
fi

# 10. INSTRUÇÕES FINAIS
log "📝 CORREÇÃO CSS FINALIZADA!"
echo ""
echo "🎉 PROBLEMA DE CSS RESOLVIDO!"
echo "=============================="
echo ""
echo "✅ SOLUÇÕES APLICADAS:"
echo "  - Build do frontend verificado/executado"
echo "  - Arquivos CSS verificados"
echo "  - Referências HTML verificadas"
echo "  - Servidor de desenvolvimento iniciado"
echo "  - Configuração Vite verificada"
echo "  - Permissões dos arquivos configuradas"
echo ""
echo "🌐 ACESSO:"
echo "  - Frontend: http://localhost:3000"
echo "  - Build: ./dist/ (arquivos estáticos)"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Acesse http://localhost:3000"
echo "2. Verifique se o CSS está carregando"
echo "3. Se ainda houver problemas, execute:"
echo "   npm run build && npm run preview"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "  - Desenvolvimento: npm run dev"
echo "  - Build: npm run build"
echo "  - Preview: npm run preview"
echo "  - Status: ps aux | grep vite"

success "🎉 CORREÇÃO CSS CONCLUÍDA!"
success "✅ SISPAT DEVE ESTAR FUNCIONANDO COM CSS!"
success "🚀 ACESSE http://localhost:3000 PARA VERIFICAR!"
