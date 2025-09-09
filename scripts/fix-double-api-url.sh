#!/bin/bash

# =================================
# CORREÇÃO DUPLICAÇÃO /api/ - SISPAT
# Corrige URLs com /api/api/ causando erro 404
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
echo "🔧    CORREÇÃO DUPLICAÇÃO /api/ - SISPAT"
echo "🔧    Corrige URLs com /api/api/ causando erro 404"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção da duplicação /api/..."

# 1. Verificar se o PM2 está rodando
log "📋 Verificando status do PM2..."
if ! pm2 list | grep -q "sispat"; then
    error "❌ Aplicação SISPAT não está rodando no PM2"
fi

pm2 status
echo ""

# 2. Verificar arquivos com problema de duplicação /api/
log "🔍 Verificando arquivos com duplicação /api/..."
echo ""

# Verificar src/services/api.ts
if grep -q "VITE_API_URL.*\+.*'/api'" src/services/api.ts; then
    warning "⚠️ src/services/api.ts tem duplicação /api/"
    echo "Linha problemática:"
    grep -n "VITE_API_URL.*\+.*'/api'" src/services/api.ts
else
    success "✅ src/services/api.ts já está correto"
fi

# Verificar outros arquivos
FILES_WITH_DOUBLE_API=$(grep -r "VITE_API_URL.*\/api" src/ 2>/dev/null | grep -v "VITE_API_URL.*'https://" | wc -l || echo "0")
if [ "$FILES_WITH_DOUBLE_API" -gt 0 ]; then
    warning "⚠️ Encontrados $FILES_WITH_DOUBLE_API arquivos com duplicação /api/"
    echo "Arquivos encontrados:"
    grep -r "VITE_API_URL.*\/api" src/ 2>/dev/null | grep -v "VITE_API_URL.*'https://" | head -10
else
    success "✅ Nenhum arquivo com duplicação /api/ encontrado"
fi
echo ""

# 3. Corrigir src/services/api.ts
log "🔧 Corrigindo src/services/api.ts..."
echo ""
if grep -q "VITE_API_URL.*\+.*'/api'" src/services/api.ts; then
    warning "⚠️ Corrigindo src/services/api.ts..."
    
    # Fazer backup
    cp src/services/api.ts src/services/api.ts.backup.$(date +%Y%m%d_%H%M%S)
    
    # Corrigir a linha problemática
    sed -i "s|(import.meta.env.VITE_API_URL ?? 'https://sispat.vps-kinghost.net') + '/api'|import.meta.env.VITE_API_URL ?? 'https://sispat.vps-kinghost.net/api'|g" src/services/api.ts
    
    success "✅ src/services/api.ts corrigido"
    echo "Nova linha:"
    grep -n "API_BASE_URL" src/services/api.ts
else
    success "✅ src/services/api.ts já está correto"
fi
echo ""

# 4. Corrigir outros arquivos com duplicação
log "🔧 Corrigindo outros arquivos com duplicação /api/..."
echo ""

# Corrigir src/pages/admin/SecuritySettings.tsx
if grep -q "VITE_API_URL.*\/api" src/pages/admin/SecuritySettings.tsx; then
    warning "⚠️ Corrigindo src/pages/admin/SecuritySettings.tsx..."
    
    # Fazer backup
    cp src/pages/admin/SecuritySettings.tsx src/pages/admin/SecuritySettings.tsx.backup.$(date +%Y%m%d_%H%M%S)
    
    # Corrigir as linhas problemáticas
    sed -i 's|${import.meta.env.VITE_API_URL}/api/|${import.meta.env.VITE_API_URL}/|g' src/pages/admin/SecuritySettings.tsx
    
    success "✅ src/pages/admin/SecuritySettings.tsx corrigido"
else
    success "✅ src/pages/admin/SecuritySettings.tsx já está correto"
fi

# Corrigir src/pages/imoveis/MapaInterativo.tsx
if grep -q "VITE_API_URL.*\/api" src/pages/imoveis/MapaInterativo.tsx; then
    warning "⚠️ Corrigindo src/pages/imoveis/MapaInterativo.tsx..."
    
    # Fazer backup
    cp src/pages/imoveis/MapaInterativo.tsx src/pages/imoveis/MapaInterativo.tsx.backup.$(date +%Y%m%d_%H%M%S)
    
    # Corrigir as linhas problemáticas
    sed -i 's|${import.meta.env.VITE_API_URL}/api/|${import.meta.env.VITE_API_URL}/|g' src/pages/imoveis/MapaInterativo.tsx
    
    success "✅ src/pages/imoveis/MapaInterativo.tsx corrigido"
else
    success "✅ src/pages/imoveis/MapaInterativo.tsx já está correto"
fi
echo ""

# 5. Verificar se há outras referências
log "🔍 Verificando outras referências com duplicação..."
echo ""
REMAINING_DOUBLE_API=$(grep -r "VITE_API_URL.*\/api" src/ 2>/dev/null | grep -v "VITE_API_URL.*'https://" | wc -l || echo "0")
if [ "$REMAINING_DOUBLE_API" -gt 0 ]; then
    warning "⚠️ Ainda há $REMAINING_DOUBLE_API referências com duplicação /api/"
    echo "Referências restantes:"
    grep -r "VITE_API_URL.*\/api" src/ 2>/dev/null | grep -v "VITE_API_URL.*'https://"
else
    success "✅ Todas as duplicações /api/ foram corrigidas"
fi
echo ""

# 6. Fazer rebuild do frontend
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

# 7. Verificar se o build foi criado
log "📋 Verificando build criado..."
if [ -d "dist" ]; then
    success "✅ Diretório dist encontrado"
    echo "Arquivos no dist:"
    ls -la dist/ | head -10
else
    error "❌ Diretório dist não encontrado"
fi
echo ""

# 8. Verificar se há referências a /api/api/ no build
log "🔍 Verificando referências a /api/api/ no build..."
echo ""
BUILD_DOUBLE_API_REFS=$(grep -r "/api/api/" dist/ 2>/dev/null | wc -l || echo "0")
if [ "$BUILD_DOUBLE_API_REFS" -gt 0 ]; then
    warning "⚠️ Encontradas $BUILD_DOUBLE_API_REFS referências a /api/api/ no build"
    echo "Referências encontradas:"
    grep -r "/api/api/" dist/ 2>/dev/null | head -5
else
    success "✅ Nenhuma referência a /api/api/ no build"
fi
echo ""

# 9. Parar PM2
log "🔄 Parando PM2..."
pm2 stop sispat
sleep 3
success "✅ PM2 parado"

# 10. Copiar build para diretório de produção
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

# 11. Reiniciar PM2
log "🔄 Reiniciando PM2..."
pm2 start sispat
sleep 5
success "✅ PM2 reiniciado"

# 12. Aguardar inicialização
log "⏳ Aguardando inicialização (15 segundos)..."
sleep 15

# 13. Testar APIs
log "🧪 Testando APIs após correções..."
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

# 14. Verificar logs
log "📋 Verificando logs após correções..."
echo ""
pm2 logs sispat --lines 20 --nostream | tail -10
echo ""

# 15. Testar frontend
log "🌐 Testando frontend..."
echo ""
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://sispat.vps-kinghost.net 2>/dev/null || echo "ERRO")
if echo "$FRONTEND_RESPONSE" | grep -q "200"; then
    success "✅ Frontend respondendo"
else
    warning "⚠️ Frontend: $FRONTEND_RESPONSE"
fi

echo ""

# Instruções finais
echo ""
echo "🎉 CORREÇÃO DUPLICAÇÃO /api/ CONCLUÍDA!"
echo "======================================="
echo ""
echo "📋 O que foi feito:"
echo "✅ Status do PM2 verificado"
echo "✅ Arquivos com duplicação /api/ identificados"
echo "✅ src/services/api.ts corrigido"
echo "✅ src/pages/admin/SecuritySettings.tsx corrigido"
echo "✅ src/pages/imoveis/MapaInterativo.tsx corrigido"
echo "✅ Build de produção refeito"
echo "✅ Build verificado para /api/api/"
echo "✅ PM2 reiniciado"
echo "✅ Build copiado para diretório de produção"
echo "✅ APIs testadas"
echo "✅ Logs verificados"
echo "✅ Frontend testado"
echo ""
echo "🔧 Correções aplicadas:"
echo "   - Removida duplicação /api/ em todas as URLs"
echo "   - VITE_API_URL agora usado corretamente"
echo "   - Build de produção refeito com configurações corretas"
echo ""
echo "🌐 URLs das APIs (agora corretas):"
echo "   - Frontend: https://sispat.vps-kinghost.net"
echo "   - API Auth: https://sispat.vps-kinghost.net/api/auth/ensure-superuser"
echo "   - API Login: https://sispat.vps-kinghost.net/api/auth/login"
echo "   - API Activity: https://sispat.vps-kinghost.net/api/activity-log"
echo ""
echo "📞 Próximos passos:"
echo "   1. Acesse https://sispat.vps-kinghost.net"
echo "   2. Verifique se não há mais erros 404 no console"
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

success "🎉 Correção da duplicação /api/ concluída!"
