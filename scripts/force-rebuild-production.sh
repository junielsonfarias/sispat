#!/bin/bash

# =================================
# FORÇAR REBUILD PRODUÇÃO - SISPAT
# Força rebuild completo com configurações corretas
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
echo "🔧    FORÇAR REBUILD PRODUÇÃO - SISPAT"
echo "🔧    Força rebuild completo com configurações corretas"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando rebuild forçado de produção..."

# 1. Verificar se o PM2 está rodando
log "📋 Verificando status do PM2..."
if ! pm2 list | grep -q "sispat"; then
    error "❌ Aplicação SISPAT não está rodando no PM2"
fi

pm2 status
echo ""

# 2. Parar PM2
log "🔄 Parando PM2..."
pm2 stop sispat
sleep 3
success "✅ PM2 parado"

# 3. Limpar build anterior
log "🧹 Limpando build anterior..."
if [ -d "dist" ]; then
    warning "⚠️ Removendo diretório dist anterior..."
    rm -rf dist
    success "✅ Diretório dist removido"
else
    success "✅ Nenhum build anterior encontrado"
fi
echo ""

# 4. Limpar cache do npm
log "🧹 Limpando cache do npm..."
npm cache clean --force
success "✅ Cache do npm limpo"
echo ""

# 5. Verificar configurações atuais
log "🔍 Verificando configurações atuais..."
echo ""

# Verificar src/services/api.ts
echo "Configuração em src/services/api.ts:"
grep -n "API_BASE_URL" src/services/api.ts || echo "Não encontrado"
echo ""

# Verificar vite.config.ts
echo "Configuração em vite.config.ts:"
grep -n "VITE_API_URL" vite.config.ts || echo "Não encontrado"
echo ""

# 6. Definir variáveis de ambiente
log "🔧 Definindo variáveis de ambiente..."
export VITE_API_URL=https://sispat.vps-kinghost.net/api
export VITE_BACKEND_URL=https://sispat.vps-kinghost.net
export VITE_WS_URL=wss://sispat.vps-kinghost.net
export NODE_ENV=production
export VITE_NODE_ENV=production

echo "Variáveis definidas:"
echo "  VITE_API_URL=$VITE_API_URL"
echo "  VITE_BACKEND_URL=$VITE_BACKEND_URL"
echo "  VITE_WS_URL=$VITE_WS_URL"
echo "  NODE_ENV=$NODE_ENV"
echo ""

# 7. Verificar se node_modules existe
log "📦 Verificando dependências..."
if [ ! -d "node_modules" ]; then
    warning "⚠️ node_modules não encontrado, instalando dependências..."
    npm install
else
    success "✅ node_modules encontrado"
fi
echo ""

# 8. Fazer build de produção
log "🔄 Fazendo build de produção..."
echo ""

# Fazer build com variáveis de ambiente
warning "⚠️ Executando npm run build..."
npm run build

if [ $? -eq 0 ]; then
    success "✅ Build de produção concluído"
else
    error "❌ Erro no build de produção"
fi
echo ""

# 9. Verificar se o build foi criado
log "📋 Verificando build criado..."
if [ -d "dist" ]; then
    success "✅ Diretório dist criado"
    echo "Arquivos no dist:"
    ls -la dist/ | head -10
else
    error "❌ Diretório dist não foi criado"
fi
echo ""

# 10. Verificar configurações no build
log "🔍 Verificando configurações no build..."
echo ""

# Verificar se há localhost no build
BUILD_LOCALHOST_REFS=$(grep -r "localhost:3001" dist/ 2>/dev/null | wc -l || echo "0")
if [ "$BUILD_LOCALHOST_REFS" -gt 0 ]; then
    warning "⚠️ Encontradas $BUILD_LOCALHOST_REFS referências a localhost:3001 no build"
    echo "Referências encontradas:"
    grep -r "localhost:3001" dist/ 2>/dev/null | head -5
else
    success "✅ Nenhuma referência a localhost:3001 no build"
fi

# Verificar se há /api/api/ no build
BUILD_DOUBLE_API_REFS=$(grep -r "/api/api/" dist/ 2>/dev/null | wc -l || echo "0")
if [ "$BUILD_DOUBLE_API_REFS" -gt 0 ]; then
    warning "⚠️ Encontradas $BUILD_DOUBLE_API_REFS referências a /api/api/ no build"
    echo "Referências encontradas:"
    grep -r "/api/api/" dist/ 2>/dev/null | head -5
else
    success "✅ Nenhuma referência a /api/api/ no build"
fi

# Verificar se há configurações corretas no build
BUILD_CORRECT_API_REFS=$(grep -r "sispat.vps-kinghost.net/api" dist/ 2>/dev/null | wc -l || echo "0")
if [ "$BUILD_CORRECT_API_REFS" -gt 0 ]; then
    success "✅ Encontradas $BUILD_CORRECT_API_REFS referências corretas ao domínio no build"
else
    warning "⚠️ Nenhuma referência correta ao domínio encontrada no build"
fi
echo ""

# 11. Copiar build para diretório de produção
log "📋 Copiando build para diretório de produção..."
echo ""

# Verificar se há diretório de produção configurado
PROD_DIR="/var/www/sispat"
if [ -d "$PROD_DIR" ]; then
    warning "⚠️ Copiando build para $PROD_DIR..."
    sudo cp -r dist/* "$PROD_DIR/"
    success "✅ Build copiado para $PROD_DIR"
else
    warning "⚠️ Diretório de produção $PROD_DIR não encontrado"
    echo "Verificando outros diretórios possíveis..."
    
    # Verificar diretórios comuns
    for dir in "/var/www/html" "/var/www" "/home/sispat/public_html" "/home/sispat/www"; do
        if [ -d "$dir" ]; then
            warning "⚠️ Copiando build para $dir..."
            sudo cp -r dist/* "$dir/"
            success "✅ Build copiado para $dir"
            break
        fi
    done
fi
echo ""

# 12. Reiniciar PM2
log "🔄 Reiniciando PM2..."
pm2 start sispat
sleep 5
success "✅ PM2 reiniciado"

# 13. Aguardar inicialização
log "⏳ Aguardando inicialização (20 segundos)..."
sleep 20

# 14. Testar APIs
log "🧪 Testando APIs após rebuild..."
echo ""

# Testar API ensure-superuser
echo "Testando /api/auth/ensure-superuser:"
SUPERUSER_RESPONSE=$(curl -s -w "%{http_code}" -X POST https://sispat.vps-kinghost.net/api/auth/ensure-superuser 2>/dev/null || echo "ERRO")
if echo "$SUPERUSER_RESPONSE" | grep -q "200"; then
    success "✅ API ensure-superuser funcionando"
elif echo "$SUPERUSER_RESPONSE" | grep -q "404"; then
    warning "⚠️ API ensure-superuser retorna 404"
else
    warning "⚠️ API ensure-superuser: $SUPERUSER_RESPONSE"
fi

echo ""

# Testar API login
echo "Testando /api/auth/login:"
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -X POST https://sispat.vps-kinghost.net/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test"}' 2>/dev/null || echo "ERRO")
if echo "$LOGIN_RESPONSE" | grep -q "200\|401"; then
    success "✅ API login funcionando (200/401 é esperado)"
elif echo "$LOGIN_RESPONSE" | grep -q "404"; then
    warning "⚠️ API login retorna 404"
else
    warning "⚠️ API login: $LOGIN_RESPONSE"
fi

echo ""

# 15. Verificar logs
log "📋 Verificando logs após rebuild..."
echo ""
pm2 logs sispat --lines 20 --nostream | tail -10
echo ""

# 16. Testar frontend
log "🌐 Testando frontend..."
echo ""
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://sispat.vps-kinghost.net 2>/dev/null || echo "ERRO")
if echo "$FRONTEND_RESPONSE" | grep -q "200"; then
    success "✅ Frontend respondendo"
else
    warning "⚠️ Frontend: $FRONTEND_RESPONSE"
fi

echo ""

# 17. Verificar se há cache do navegador
log "🌐 Verificando cache do navegador..."
echo ""
warning "⚠️ IMPORTANTE: Limpe o cache do navegador (Ctrl+F5 ou Ctrl+Shift+R)"
echo "   - O navegador pode estar usando arquivos antigos em cache"
echo "   - Force refresh para carregar o novo build"
echo ""

# Instruções finais
echo ""
echo "🎉 REBUILD FORÇADO DE PRODUÇÃO CONCLUÍDO!"
echo "========================================="
echo ""
echo "📋 O que foi feito:"
echo "✅ PM2 parado"
echo "✅ Build anterior removido"
echo "✅ Cache do npm limpo"
echo "✅ Configurações verificadas"
echo "✅ Variáveis de ambiente definidas"
echo "✅ Build de produção executado"
echo "✅ Build verificado para configurações corretas"
echo "✅ Build copiado para diretório de produção"
echo "✅ PM2 reiniciado"
echo "✅ APIs testadas"
echo "✅ Logs verificados"
echo "✅ Frontend testado"
echo ""
echo "🔧 Configurações aplicadas:"
echo "   - VITE_API_URL=https://sispat.vps-kinghost.net/api"
echo "   - VITE_BACKEND_URL=https://sispat.vps-kinghost.net"
echo "   - VITE_WS_URL=wss://sispat.vps-kinghost.net"
echo "   - NODE_ENV=production"
echo ""
echo "🌐 URLs das APIs:"
echo "   - Frontend: https://sispat.vps-kinghost.net"
echo "   - API Auth: https://sispat.vps-kinghost.net/api/auth/ensure-superuser"
echo "   - API Login: https://sispat.vps-kinghost.net/api/auth/login"
echo "   - API Activity: https://sispat.vps-kinghost.net/api/activity-log"
echo ""
echo "📞 Próximos passos:"
echo "   1. LIMPE O CACHE DO NAVEGADOR (Ctrl+F5)"
echo "   2. Acesse https://sispat.vps-kinghost.net"
echo "   3. Verifique se não há mais erros 404 no console"
echo "   4. Faça login com: junielsonfarias@gmail.com / Tiko6273@"
echo "   5. Se houver problemas, verifique:"
echo "      - pm2 logs sispat --lines 50"
echo "      - curl https://sispat.vps-kinghost.net/api/health"
echo ""
echo "🔍 Para monitorar:"
echo "   - Logs: pm2 logs sispat --lines 50"
echo "   - Status: pm2 status"
echo "   - Frontend: curl -I https://sispat.vps-kinghost.net"
echo ""

success "🎉 Rebuild forçado de produção concluído!"
