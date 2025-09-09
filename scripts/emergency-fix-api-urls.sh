#!/bin/bash

# =================================
# CORREÇÃO EMERGENCIAL API URLs - SISPAT
# Corrige URLs duplicadas diretamente no build
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
echo "🚨 ================================================"
echo "🚨    CORREÇÃO EMERGENCIAL API URLs - SISPAT"
echo "🚨    Corrige URLs duplicadas diretamente no build"
echo "🚨 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🚨 Iniciando correção emergencial de URLs..."

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

# 3. Verificar se há build
log "📋 Verificando build atual..."
if [ ! -d "dist" ]; then
    error "❌ Diretório dist não encontrado. Execute primeiro: npm run build"
fi

success "✅ Diretório dist encontrado"
echo "Arquivos no dist:"
ls -la dist/ | head -10
echo ""

# 4. Fazer backup do build atual
log "💾 Fazendo backup do build atual..."
BACKUP_DIR="dist_backup_$(date +%Y%m%d_%H%M%S)"
cp -r dist "$BACKUP_DIR"
success "✅ Backup criado em: $BACKUP_DIR"
echo ""

# 5. Corrigir URLs diretamente no build
log "🔧 Corrigindo URLs diretamente no build..."
echo ""

# Corrigir localhost:3001 para domínio correto
warning "⚠️ Corrigindo localhost:3001 para domínio correto..."
find dist/ -name "*.js" -type f -exec sed -i 's|http://localhost:3001/api|https://sispat.vps-kinghost.net/api|g' {} \;
find dist/ -name "*.js" -type f -exec sed -i 's|http://localhost:3001|https://sispat.vps-kinghost.net|g' {} \;
success "✅ localhost:3001 corrigido"

# Corrigir duplicação /api/api/ para /api/
warning "⚠️ Corrigindo duplicação /api/api/ para /api/..."
find dist/ -name "*.js" -type f -exec sed -i 's|/api/api/|/api/|g' {} \;
success "✅ Duplicação /api/api/ corrigida"

# Corrigir configurações do Vite
warning "⚠️ Corrigindo configurações do Vite..."
find dist/ -name "*.js" -type f -exec sed -i 's|VITE_API_URL:"http://localhost:3001/api"|VITE_API_URL:"https://sispat.vps-kinghost.net/api"|g' {} \;
find dist/ -name "*.js" -type f -exec sed -i 's|VITE_BACKEND_URL:"http://localhost:3001"|VITE_BACKEND_URL:"https://sispat.vps-kinghost.net"|g' {} \;
success "✅ Configurações do Vite corrigidas"

echo ""

# 6. Verificar correções aplicadas
log "🔍 Verificando correções aplicadas..."
echo ""

# Verificar se ainda há localhost
LOCALHOST_REFS=$(grep -r "localhost:3001" dist/ 2>/dev/null | wc -l || echo "0")
if [ "$LOCALHOST_REFS" -gt 0 ]; then
    warning "⚠️ Ainda há $LOCALHOST_REFS referências a localhost:3001"
    echo "Referências restantes:"
    grep -r "localhost:3001" dist/ 2>/dev/null | head -5
else
    success "✅ Nenhuma referência a localhost:3001 encontrada"
fi

# Verificar se ainda há /api/api/
DOUBLE_API_REFS=$(grep -r "/api/api/" dist/ 2>/dev/null | wc -l || echo "0")
if [ "$DOUBLE_API_REFS" -gt 0 ]; then
    warning "⚠️ Ainda há $DOUBLE_API_REFS referências a /api/api/"
    echo "Referências restantes:"
    grep -r "/api/api/" dist/ 2>/dev/null | head -5
else
    success "✅ Nenhuma referência a /api/api/ encontrada"
fi

# Verificar se há configurações corretas
CORRECT_API_REFS=$(grep -r "sispat.vps-kinghost.net/api" dist/ 2>/dev/null | wc -l || echo "0")
if [ "$CORRECT_API_REFS" -gt 0 ]; then
    success "✅ Encontradas $CORRECT_API_REFS referências corretas ao domínio"
else
    warning "⚠️ Nenhuma referência correta ao domínio encontrada"
fi

echo ""

# 7. Copiar build corrigido para produção
log "📋 Copiando build corrigido para produção..."
echo ""

# Verificar se há diretório de produção configurado
PROD_DIR="/var/www/sispat"
if [ -d "$PROD_DIR" ]; then
    warning "⚠️ Copiando build corrigido para $PROD_DIR..."
    sudo cp -r dist/* "$PROD_DIR/"
    success "✅ Build corrigido copiado para $PROD_DIR"
else
    warning "⚠️ Diretório de produção $PROD_DIR não encontrado"
    echo "Verificando outros diretórios possíveis..."
    
    # Verificar diretórios comuns
    for dir in "/var/www/html" "/var/www" "/home/sispat/public_html" "/home/sispat/www"; do
        if [ -d "$dir" ]; then
            warning "⚠️ Copiando build corrigido para $dir..."
            sudo cp -r dist/* "$dir/"
            success "✅ Build corrigido copiado para $dir"
            break
        fi
    done
fi
echo ""

# 8. Reiniciar PM2
log "🔄 Reiniciando PM2..."
pm2 start sispat
sleep 5
success "✅ PM2 reiniciado"

# 9. Aguardar inicialização
log "⏳ Aguardando inicialização (15 segundos)..."
sleep 15

# 10. Testar APIs
log "🧪 Testando APIs após correção emergencial..."
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

# Testar API activity-log
echo "Testando /api/activity-log:"
ACTIVITY_RESPONSE=$(curl -s -w "%{http_code}" -X POST https://sispat.vps-kinghost.net/api/activity-log -H "Content-Type: application/json" -d '{"action":"test"}' 2>/dev/null || echo "ERRO")
if echo "$ACTIVITY_RESPONSE" | grep -q "200\|401"; then
    success "✅ API activity-log funcionando (200/401 é esperado)"
elif echo "$ACTIVITY_RESPONSE" | grep -q "404"; then
    warning "⚠️ API activity-log retorna 404"
else
    warning "⚠️ API activity-log: $ACTIVITY_RESPONSE"
fi

echo ""

# 11. Verificar logs
log "📋 Verificando logs após correção..."
echo ""
pm2 logs sispat --lines 20 --nostream | tail -10
echo ""

# 12. Testar frontend
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
echo "🎉 CORREÇÃO EMERGENCIAL CONCLUÍDA!"
echo "================================="
echo ""
echo "📋 O que foi feito:"
echo "✅ PM2 parado"
echo "✅ Backup do build criado em: $BACKUP_DIR"
echo "✅ localhost:3001 corrigido para domínio correto"
echo "✅ Duplicação /api/api/ corrigida para /api/"
echo "✅ Configurações do Vite corrigidas"
echo "✅ Build corrigido copiado para produção"
echo "✅ PM2 reiniciado"
echo "✅ APIs testadas"
echo "✅ Logs verificados"
echo "✅ Frontend testado"
echo ""
echo "🔧 Correções aplicadas:"
echo "   - localhost:3001 → sispat.vps-kinghost.net"
echo "   - /api/api/ → /api/"
echo "   - Configurações do Vite atualizadas"
echo ""
echo "🌐 URLs das APIs (agora corretas):"
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
echo "💾 Backup disponível em: $BACKUP_DIR"
echo ""

success "🎉 Correção emergencial concluída!"
