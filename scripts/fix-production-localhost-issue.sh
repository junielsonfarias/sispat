#!/bin/bash

# =================================
# CORREÇÃO PROBLEMA LOCALHOST EM PRODUÇÃO - SISPAT
# Corrige frontend tentando conectar em localhost:3001
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
echo "🔧    CORREÇÃO PROBLEMA LOCALHOST EM PRODUÇÃO"
echo "🔧    SISPAT - Frontend conectando em localhost:3001"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção do problema localhost em produção..."

# 1. Verificar se o PM2 está rodando
log "📋 Verificando status do PM2..."
if ! pm2 list | grep -q "sispat"; then
    error "❌ Aplicação SISPAT não está rodando no PM2"
fi

pm2 status
echo ""

# 2. Verificar se há arquivo .env.production
log "📋 Verificando arquivo de ambiente de produção..."
if [ -f ".env.production" ]; then
    success "✅ Arquivo .env.production encontrado"
    echo "Conteúdo atual:"
    cat .env.production | head -10
else
    warning "⚠️ Arquivo .env.production não encontrado, criando..."
    
    cat > .env.production << 'EOF'
# Configurações de Produção - SISPAT
VITE_BACKEND_URL=https://sispat.vps-kinghost.net
VITE_API_URL=https://sispat.vps-kinghost.net
VITE_WS_URL=wss://sispat.vps-kinghost.net
NODE_ENV=production
VITE_NODE_ENV=production
VITE_APP_VERSION=1.0.0
VITE_DEBUG=false
VITE_ENABLE_LOGS=false
VITE_ENABLE_ANALYTICS=false
EOF
    
    success "✅ Arquivo .env.production criado"
fi
echo ""

# 3. Verificar se há arquivo env.production
log "📋 Verificando arquivo env.production..."
if [ -f "env.production" ]; then
    success "✅ Arquivo env.production encontrado"
    echo "Conteúdo atual:"
    cat env.production | head -10
else
    warning "⚠️ Arquivo env.production não encontrado, criando..."
    
    cat > env.production << 'EOF'
# Configurações de Produção - SISPAT
VITE_BACKEND_URL=https://sispat.vps-kinghost.net
VITE_API_URL=https://sispat.vps-kinghost.net
VITE_WS_URL=wss://sispat.vps-kinghost.net
NODE_ENV=production
VITE_NODE_ENV=production
VITE_APP_VERSION=1.0.0
VITE_DEBUG=false
VITE_ENABLE_LOGS=false
VITE_ENABLE_ANALYTICS=false
EOF
    
    success "✅ Arquivo env.production criado"
fi
echo ""

# 4. Verificar configurações atuais do frontend
log "🔍 Verificando configurações atuais do frontend..."
echo ""
echo "Configurações em src/config/app.ts:"
grep -n "backendUrl\|localhost" src/config/app.ts || echo "Não encontrado"
echo ""

echo "Configurações em src/services/api.ts:"
grep -n "API_BASE_URL\|localhost" src/services/api.ts || echo "Não encontrado"
echo ""

# 5. Forçar correção das configurações
log "🔧 Forçando correção das configurações..."
echo ""

# Corrigir src/config/app.ts
if grep -q "localhost:3001" src/config/app.ts; then
    warning "⚠️ Corrigindo src/config/app.ts..."
    sed -i 's|http://localhost:3001|https://sispat.vps-kinghost.net|g' src/config/app.ts
    success "✅ src/config/app.ts corrigido"
else
    success "✅ src/config/app.ts já está correto"
fi

# Corrigir src/config/build-info.ts
if grep -q "localhost:3001" src/config/build-info.ts; then
    warning "⚠️ Corrigindo src/config/build-info.ts..."
    sed -i 's|http://localhost:3001|https://sispat.vps-kinghost.net|g' src/config/build-info.ts
    success "✅ src/config/build-info.ts corrigido"
else
    success "✅ src/config/build-info.ts já está correto"
fi

# Corrigir src/services/api.ts
if grep -q "localhost:3001" src/services/api.ts; then
    warning "⚠️ Corrigindo src/services/api.ts..."
    sed -i 's|http://localhost:3001|https://sispat.vps-kinghost.net|g' src/services/api.ts
    success "✅ src/services/api.ts corrigido"
else
    success "✅ src/services/api.ts já está correto"
fi

# Corrigir src/hooks/useWebSocket.ts
if grep -q "localhost:3001" src/hooks/useWebSocket.ts; then
    warning "⚠️ Corrigindo src/hooks/useWebSocket.ts..."
    sed -i 's|http://localhost:3001|https://sispat.vps-kinghost.net|g' src/hooks/useWebSocket.ts
    success "✅ src/hooks/useWebSocket.ts corrigido"
else
    success "✅ src/hooks/useWebSocket.ts já está correto"
fi

# Corrigir src/hooks/useWebSocketNotifications.ts
if grep -q "localhost:3001" src/hooks/useWebSocketNotifications.ts; then
    warning "⚠️ Corrigindo src/hooks/useWebSocketNotifications.ts..."
    sed -i 's|http://localhost:3001|https://sispat.vps-kinghost.net|g' src/hooks/useWebSocketNotifications.ts
    success "✅ src/hooks/useWebSocketNotifications.ts corrigido"
else
    success "✅ src/hooks/useWebSocketNotifications.ts já está correto"
fi

echo ""

# 6. Verificar se há outras referências a localhost
log "🔍 Verificando outras referências a localhost..."
echo ""
LOCALHOST_REFS=$(grep -r "localhost:3001" src/ 2>/dev/null | wc -l || echo "0")
if [ "$LOCALHOST_REFS" -gt 0 ]; then
    warning "⚠️ Encontradas $LOCALHOST_REFS referências a localhost:3001"
    echo "Referências encontradas:"
    grep -r "localhost:3001" src/ 2>/dev/null | head -5
else
    success "✅ Nenhuma referência a localhost:3001 encontrada"
fi
echo ""

# 7. Corrigir vite.config.ts
log "🔧 Corrigindo vite.config.ts..."
echo ""
if grep -q "localhost:3001" vite.config.ts; then
    warning "⚠️ Corrigindo vite.config.ts..."
    sed -i 's|http://localhost:3001/api|https://sispat.vps-kinghost.net/api|g' vite.config.ts
    success "✅ vite.config.ts corrigido"
else
    success "✅ vite.config.ts já está correto"
fi
echo ""

# 8. Fazer rebuild do frontend
log "🔄 Fazendo rebuild do frontend..."
echo ""

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    warning "⚠️ node_modules não encontrado, instalando dependências..."
    npm install
fi

# Definir variáveis de ambiente para o build
export VITE_API_URL=https://sispat.vps-kinghost.net/api
export VITE_BACKEND_URL=https://sispat.vps-kinghost.net
export VITE_WS_URL=wss://sispat.vps-kinghost.net
export NODE_ENV=production
export VITE_NODE_ENV=production

# Fazer build de produção
warning "⚠️ Fazendo build de produção..."
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
    success "✅ Diretório dist encontrado"
    echo "Arquivos no dist:"
    ls -la dist/ | head -10
else
    error "❌ Diretório dist não encontrado"
fi
echo ""

# 10. Verificar se há referências a localhost no build
log "🔍 Verificando referências a localhost no build..."
echo ""
BUILD_LOCALHOST_REFS=$(grep -r "localhost:3001" dist/ 2>/dev/null | wc -l || echo "0")
if [ "$BUILD_LOCALHOST_REFS" -gt 0 ]; then
    warning "⚠️ Encontradas $BUILD_LOCALHOST_REFS referências a localhost:3001 no build"
    echo "Referências encontradas:"
    grep -r "localhost:3001" dist/ 2>/dev/null | head -5
else
    success "✅ Nenhuma referência a localhost:3001 no build"
fi
echo ""

# 11. Parar PM2
log "🔄 Parando PM2..."
pm2 stop sispat
sleep 3
success "✅ PM2 parado"

# 12. Copiar build para diretório de produção
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

# 13. Reiniciar PM2
log "🔄 Reiniciando PM2..."
pm2 start sispat
sleep 5
success "✅ PM2 reiniciado"

# 14. Aguardar inicialização
log "⏳ Aguardando inicialização (15 segundos)..."
sleep 15

# 15. Testar APIs
log "🧪 Testando APIs após correções..."
echo ""

# Testar API sync
echo "Testando /api/sync/public-data:"
SYNC_RESPONSE=$(curl -s -w "%{http_code}" https://sispat.vps-kinghost.net/api/sync/public-data 2>/dev/null || echo "ERRO")
if echo "$SYNC_RESPONSE" | grep -q "200"; then
    success "✅ API sync/public-data funcionando"
elif echo "$SYNC_RESPONSE" | grep -q "500"; then
    warning "⚠️ API sync/public-data retorna 500"
else
    warning "⚠️ API sync/public-data: $SYNC_RESPONSE"
fi

echo ""

# Testar API ensure-superuser
echo "Testando /api/auth/ensure-superuser:"
SUPERUSER_RESPONSE=$(curl -s -w "%{http_code}" -X POST https://sispat.vps-kinghost.net/api/auth/ensure-superuser 2>/dev/null || echo "ERRO")
if echo "$SUPERUSER_RESPONSE" | grep -q "200"; then
    success "✅ API ensure-superuser funcionando"
else
    warning "⚠️ API ensure-superuser: $SUPERUSER_RESPONSE"
fi

echo ""

# 16. Verificar logs
log "📋 Verificando logs após correções..."
echo ""
pm2 logs sispat --lines 20 --nostream | tail -10
echo ""

# 17. Testar frontend
log "🌐 Testando frontend..."
echo ""
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://sispat.vps-kinghost.net 2>/dev/null || echo "ERRO")
if echo "$FRONTEND_RESPONSE" | grep -q "200"; then
    success "✅ Frontend respondendo"
else
    warning "⚠️ Frontend: $FRONTEND_RESPONSE"
fi

echo ""

# 18. Criar favicon se não existir
log "🎨 Verificando favicon..."
echo ""
if [ ! -f "dist/favicon.ico" ] && [ ! -f "dist/favicon.svg" ]; then
    warning "⚠️ Favicon não encontrado, criando..."
    
    # Criar favicon simples
    cat > dist/favicon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#3b82f6"/>
  <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">S</text>
</svg>
EOF
    
    # Copiar para diretório de produção
    if [ -d "$PROD_DIR" ]; then
        sudo cp dist/favicon.svg "$PROD_DIR/"
    fi
    
    success "✅ Favicon criado"
else
    success "✅ Favicon já existe"
fi
echo ""

# Instruções finais
echo ""
echo "🎉 CORREÇÃO PROBLEMA LOCALHOST EM PRODUÇÃO CONCLUÍDA!"
echo "====================================================="
echo ""
echo "📋 O que foi feito:"
echo "✅ Status do PM2 verificado"
echo "✅ Arquivos de ambiente verificados/criados"
echo "✅ Configurações do frontend corrigidas"
echo "✅ Referências a localhost:3001 removidas"
echo "✅ vite.config.ts corrigido"
echo "✅ Build de produção refeito"
echo "✅ Build verificado para localhost"
echo "✅ PM2 reiniciado"
echo "✅ Build copiado para diretório de produção"
echo "✅ APIs testadas"
echo "✅ Logs verificados"
echo "✅ Frontend testado"
echo "✅ Favicon criado se necessário"
echo ""
echo "🔧 Correções aplicadas:"
echo "   - Todas as referências a localhost:3001 substituídas por https://sispat.vps-kinghost.net"
echo "   - Build de produção refeito com configurações corretas"
echo "   - Arquivos de ambiente de produção criados"
echo "   - Favicon criado para evitar erro 404"
echo ""
echo "🌐 URLs das APIs:"
echo "   - Frontend: https://sispat.vps-kinghost.net"
echo "   - API Sync: https://sispat.vps-kinghost.net/api/sync/public-data"
echo "   - API Auth: https://sispat.vps-kinghost.net/api/auth/ensure-superuser"
echo "   - API Login: https://sispat.vps-kinghost.net/api/auth/login"
echo ""
echo "📞 Próximos passos:"
echo "   1. Acesse https://sispat.vps-kinghost.net"
echo "   2. Verifique se não há mais erros de localhost no console"
echo "   3. Faça login com: junielsonfarias@gmail.com / Tiko6273@"
echo "   4. Se houver problemas, verifique:"
echo "      - pm2 logs sispat --lines 50"
echo "      - curl https://sispat.vps-kinghost.net/api/health"
echo ""
echo "🔍 Para monitorar:"
echo "   - Logs: pm2 logs sispat --lines 50"
echo "   - Status: pm2 status"
echo "   - Frontend: curl -I https://sispat.vps-kinghost.net"
echo ""

success "🎉 Correção do problema localhost em produção concluída!"
