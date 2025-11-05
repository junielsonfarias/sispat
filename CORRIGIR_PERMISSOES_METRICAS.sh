#!/bin/bash

# Script para corrigir permissões das rotas de métricas
# Adiciona role 'supervisor' às permissões das rotas de métricas

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 CORRIGINDO PERMISSÕES DAS ROTAS DE MÉTRICAS${NC}"
echo ""

# 1. Navegar para o diretório do projeto
cd /var/www/sispat || {
    echo -e "${RED}❌ Erro: Diretório /var/www/sispat não encontrado${NC}"
    exit 1
}

echo -e "${YELLOW}📁 Diretório: $(pwd)${NC}"
echo ""

# 2. Atualizar código do repositório
echo -e "${YELLOW}📥 Atualizando código do repositório...${NC}"
git pull origin main || {
    echo -e "${YELLOW}⚠️  Git pull falhou, continuando com código local...${NC}"
}
echo ""

# 3. Verificar se o arquivo foi modificado
if [ -f "backend/src/routes/metricsRoutes.ts" ]; then
    echo -e "${GREEN}✅ Arquivo metricsRoutes.ts encontrado${NC}"
    
    # Verificar se supervisor está nas permissões
    if grep -q "authorize('admin', 'supervisor', 'superuser')" backend/src/routes/metricsRoutes.ts; then
        echo -e "${GREEN}✅ Permissões já atualizadas com 'supervisor'${NC}"
    else
        echo -e "${RED}❌ Permissões não estão atualizadas. Execute o git pull primeiro.${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Arquivo metricsRoutes.ts não encontrado${NC}"
    exit 1
fi
echo ""

# 4. Compilar o backend
echo -e "${YELLOW}🔨 Compilando backend...${NC}"
cd backend
npm run build || {
    echo -e "${RED}❌ Erro ao compilar backend${NC}"
    exit 1
}
echo -e "${GREEN}✅ Backend compilado com sucesso${NC}"
echo ""

# 5. Reiniciar backend (PM2)
echo -e "${YELLOW}🔄 Reiniciando backend (PM2)...${NC}"
pm2 restart sispat-backend || {
    echo -e "${YELLOW}⚠️  PM2 restart falhou, tentando start...${NC}"
    pm2 start backend/dist/index.js --name sispat-backend || true
}
echo ""

# 6. Aguardar backend iniciar
echo -e "${YELLOW}⏳ Aguardando backend iniciar (5 segundos)...${NC}"
sleep 5
echo ""

# 7. Verificar status do PM2
echo -e "${YELLOW}📊 Verificando status do PM2...${NC}"
if pm2 list | grep -q "sispat-backend.*online"; then
    echo -e "${GREEN}✅ Backend está online${NC}"
else
    echo -e "${YELLOW}⚠️  Backend pode não estar online. Verifique: pm2 logs sispat-backend${NC}"
fi
echo ""

# 8. Verificar se a API está respondendo
echo -e "${YELLOW}🔍 Testando endpoint de métricas...${NC}"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/metrics/health || echo "000")
if [ "$HEALTH_RESPONSE" = "200" ] || [ "$HEALTH_RESPONSE" = "401" ] || [ "$HEALTH_RESPONSE" = "403" ]; then
    echo -e "${GREEN}✅ API está respondendo (status: $HEALTH_RESPONSE)${NC}"
else
    echo -e "${YELLOW}⚠️  API pode não estar respondendo (status: $HEALTH_RESPONSE)${NC}"
fi
echo ""

# 9. Mostrar logs recentes
echo -e "${YELLOW}📋 Últimas linhas dos logs do backend:${NC}"
pm2 logs sispat-backend --lines 10 --nostream | tail -10 || echo "Não foi possível obter logs"
echo ""

# 10. Resumo
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ CORREÇÃO APLICADA COM SUCESSO!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "📝 O que foi corrigido:"
echo -e "   • Adicionado role 'supervisor' às permissões das rotas de métricas"
echo -e "   • Rotas atualizadas:"
echo -e "     - GET /api/metrics/system"
echo -e "     - GET /api/metrics/application"
echo -e "     - GET /api/metrics/summary"
echo -e "     - GET /api/metrics/history"
echo -e "     - GET /api/metrics/alerts"
echo -e "     - POST /api/metrics/alerts/:alertId/resolve"
echo -e "     - GET /api/metrics/export"
echo ""
echo -e "🧪 Próximos passos:"
echo -e "   1. Faça login como supervisor no sistema"
echo -e "   2. Acesse /admin/metrics"
echo -e "   3. Verifique se as métricas carregam corretamente"
echo ""
echo -e "🔍 Verificar logs:"
echo -e "   pm2 logs sispat-backend --lines 50"
echo ""

