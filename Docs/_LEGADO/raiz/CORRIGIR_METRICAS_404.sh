#!/bin/bash

# Script para corrigir erro 404 nas rotas de métricas
# Verifica se as rotas estão registradas e recompila/reinicia o backend

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔍 DIAGNÓSTICO E CORREÇÃO: ROTAS DE MÉTRICAS (404)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# 1. Navegar para o diretório do projeto
cd /var/www/sispat || {
    echo -e "${RED}❌ Erro: Diretório /var/www/sispat não encontrado${NC}"
    exit 1
}

echo -e "${GREEN}📁 Diretório: $(pwd)${NC}"
echo ""

# 2. Verificar se o arquivo metricsRoutes.ts existe
echo -e "${YELLOW}1️⃣ Verificando arquivo metricsRoutes.ts...${NC}"
if [ -f "backend/src/routes/metricsRoutes.ts" ]; then
    echo -e "${GREEN}✅ Arquivo encontrado${NC}"
    
    # Verificar se supervisor está nas permissões
    if grep -q "authorize('admin', 'supervisor', 'superuser')" backend/src/routes/metricsRoutes.ts; then
        echo -e "${GREEN}✅ Permissões atualizadas com 'supervisor'${NC}"
    else
        echo -e "${YELLOW}⚠️  Permissões não incluem 'supervisor'${NC}"
    fi
else
    echo -e "${RED}❌ Arquivo metricsRoutes.ts não encontrado${NC}"
    exit 1
fi
echo ""

# 3. Verificar se a rota está registrada no index.ts
echo -e "${YELLOW}2️⃣ Verificando registro da rota no index.ts...${NC}"
if grep -q "app.use('/api/metrics', metricsRoutes)" backend/src/index.ts; then
    echo -e "${GREEN}✅ Rota registrada no index.ts${NC}"
else
    echo -e "${RED}❌ Rota NÃO encontrada no index.ts${NC}"
    echo -e "${YELLOW}   Verificando se existe import...${NC}"
    if grep -q "metricsRoutes" backend/src/index.ts; then
        echo -e "${YELLOW}   Import encontrado, mas app.use não encontrado${NC}"
    else
        echo -e "${RED}   Import também não encontrado!${NC}"
    fi
fi
echo ""

# 4. Atualizar código do repositório
echo -e "${YELLOW}3️⃣ Atualizando código do repositório...${NC}"
git pull origin main || {
    echo -e "${YELLOW}⚠️  Git pull falhou, continuando com código local...${NC}"
}
echo ""

# 5. Verificar se há mudanças não commitadas
echo -e "${YELLOW}4️⃣ Verificando status do Git...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Há mudanças não commitadas${NC}"
    git status --short
else
    echo -e "${GREEN}✅ Nenhuma mudança pendente${NC}"
fi
echo ""

# 6. Verificar dependências
echo -e "${YELLOW}5️⃣ Verificando dependências do backend...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules não encontrado, instalando dependências...${NC}"
    npm install --production || npm install
fi
echo -e "${GREEN}✅ Dependências verificadas${NC}"
echo ""

# 7. Limpar build anterior
echo -e "${YELLOW}6️⃣ Limpando build anterior...${NC}"
rm -rf dist/ || true
echo -e "${GREEN}✅ Build anterior removido${NC}"
echo ""

# 8. Compilar o backend
echo -e "${YELLOW}7️⃣ Compilando backend...${NC}"
npm run build || {
    echo -e "${RED}❌ Erro ao compilar backend${NC}"
    echo -e "${YELLOW}   Verificando erros de TypeScript...${NC}"
    npx tsc --noEmit 2>&1 | head -20 || true
    exit 1
}
echo -e "${GREEN}✅ Backend compilado com sucesso${NC}"
echo ""

# 9. Verificar se o arquivo compilado existe
echo -e "${YELLOW}8️⃣ Verificando arquivo compilado...${NC}"
if [ -f "dist/index.js" ]; then
    echo -e "${GREEN}✅ dist/index.js encontrado${NC}"
    
    # Verificar se a rota está no arquivo compilado
    if grep -q "/api/metrics" dist/index.js; then
        echo -e "${GREEN}✅ Rota /api/metrics encontrada no código compilado${NC}"
    else
        echo -e "${RED}❌ Rota /api/metrics NÃO encontrada no código compilado${NC}"
    fi
else
    echo -e "${RED}❌ dist/index.js não encontrado após compilação${NC}"
    exit 1
fi
echo ""

# 10. Verificar PM2
echo -e "${YELLOW}9️⃣ Verificando status do PM2...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 list || echo -e "${YELLOW}⚠️  PM2 não está rodando${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 não encontrado${NC}"
fi
echo ""

# 11. Parar backend se estiver rodando
echo -e "${YELLOW}🔟 Parando backend (PM2)...${NC}"
pm2 stop sispat-backend 2>/dev/null || echo -e "${YELLOW}⚠️  Backend não estava rodando${NC}"
sleep 2
echo ""

# 12. Reiniciar backend
echo -e "${YELLOW}1️⃣1️⃣ Reiniciando backend (PM2)...${NC}"
cd /var/www/sispat/backend
pm2 start ecosystem.config.js --env production || pm2 restart sispat-backend || {
    echo -e "${YELLOW}⚠️  Tentando iniciar manualmente...${NC}"
    pm2 start dist/index.js --name sispat-backend || true
}
echo ""

# 13. Aguardar backend iniciar
echo -e "${YELLOW}1️⃣2️⃣ Aguardando backend iniciar (5 segundos)...${NC}"
sleep 5
echo ""

# 14. Verificar status do PM2
echo -e "${YELLOW}1️⃣3️⃣ Verificando status do PM2...${NC}"
if pm2 list | grep -q "sispat-backend.*online"; then
    echo -e "${GREEN}✅ Backend está online${NC}"
else
    echo -e "${RED}❌ Backend NÃO está online${NC}"
    echo -e "${YELLOW}   Verificando logs...${NC}"
    pm2 logs sispat-backend --lines 20 --nostream | tail -20 || true
fi
echo ""

# 15. Testar endpoint de métricas
echo -e "${YELLOW}1️⃣4️⃣ Testando endpoint /api/metrics/health...${NC}"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/metrics/health 2>/dev/null || echo "000")
echo -e "   Status HTTP: ${HEALTH_RESPONSE}"

if [ "$HEALTH_RESPONSE" = "200" ] || [ "$HEALTH_RESPONSE" = "401" ] || [ "$HEALTH_RESPONSE" = "403" ]; then
    echo -e "${GREEN}✅ Endpoint está respondendo (status $HEALTH_RESPONSE)${NC}"
    if [ "$HEALTH_RESPONSE" = "401" ] || [ "$HEALTH_RESPONSE" = "403" ]; then
        echo -e "${YELLOW}   ⚠️  Endpoint requer autenticação (normal)${NC}"
    fi
elif [ "$HEALTH_RESPONSE" = "404" ]; then
    echo -e "${RED}❌ Endpoint retornou 404 - Rota não encontrada${NC}"
    echo -e "${YELLOW}   Verificando logs do backend...${NC}"
    pm2 logs sispat-backend --lines 30 --nostream | grep -i "metrics\|route" | tail -10 || true
else
    echo -e "${YELLOW}⚠️  Endpoint retornou status $HEALTH_RESPONSE${NC}"
fi
echo ""

# 16. Testar endpoint de summary (requer autenticação)
echo -e "${YELLOW}1️⃣5️⃣ Testando endpoint /api/metrics/summary (sem auth)...${NC}"
SUMMARY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/metrics/summary 2>/dev/null || echo "000")
echo -e "   Status HTTP: ${SUMMARY_RESPONSE}"

if [ "$SUMMARY_RESPONSE" = "401" ] || [ "$SUMMARY_RESPONSE" = "403" ]; then
    echo -e "${GREEN}✅ Endpoint encontrado e protegido (status $SUMMARY_RESPONSE)${NC}"
    echo -e "${GREEN}   Isso significa que a rota existe!${NC}"
elif [ "$SUMMARY_RESPONSE" = "404" ]; then
    echo -e "${RED}❌ Endpoint retornou 404 - Rota não encontrada${NC}"
else
    echo -e "${YELLOW}⚠️  Endpoint retornou status $SUMMARY_RESPONSE${NC}"
fi
echo ""

# 17. Mostrar logs recentes
echo -e "${YELLOW}1️⃣6️⃣ Últimas linhas dos logs do backend:${NC}"
pm2 logs sispat-backend --lines 15 --nostream | tail -15 || echo "Não foi possível obter logs"
echo ""

# 18. Resumo
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 RESUMO${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "✅ Ações executadas:"
echo -e "   • Verificação do arquivo metricsRoutes.ts"
echo -e "   • Verificação do registro da rota no index.ts"
echo -e "   • Atualização do código (git pull)"
echo -e "   • Compilação do backend"
echo -e "   • Reinicialização do PM2"
echo ""
echo -e "🧪 Testes realizados:"
echo -e "   • /api/metrics/health: Status $HEALTH_RESPONSE"
echo -e "   • /api/metrics/summary: Status $SUMMARY_RESPONSE"
echo ""
if [ "$SUMMARY_RESPONSE" = "401" ] || [ "$SUMMARY_RESPONSE" = "403" ]; then
    echo -e "${GREEN}✅ CORREÇÃO APLICADA COM SUCESSO!${NC}"
    echo -e "${GREEN}   As rotas estão funcionando. O erro 401/403 é esperado sem autenticação.${NC}"
    echo -e "${GREEN}   Teste acessando /admin/metrics no frontend após fazer login.${NC}"
elif [ "$SUMMARY_RESPONSE" = "404" ]; then
    echo -e "${RED}❌ PROBLEMA PERSISTENTE${NC}"
    echo -e "${YELLOW}   A rota ainda retorna 404. Verifique:${NC}"
    echo -e "   1. Os logs do backend (pm2 logs sispat-backend)"
    echo -e "   2. Se o PM2 está realmente rodando a versão compilada"
    echo -e "   3. Se há erros na compilação"
else
    echo -e "${YELLOW}⚠️  STATUS INCONCLUSIVO${NC}"
    echo -e "   Verifique os logs para mais detalhes"
fi
echo ""
echo -e "🔍 Comandos úteis:"
echo -e "   pm2 logs sispat-backend --lines 50"
echo -e "   pm2 restart sispat-backend"
echo -e "   curl -H 'Authorization: Bearer TOKEN' http://localhost:3000/api/metrics/summary"
echo ""

