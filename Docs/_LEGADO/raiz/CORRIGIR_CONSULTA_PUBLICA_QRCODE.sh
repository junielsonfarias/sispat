#!/bin/bash

echo "🔧 CORRIGINDO CONSULTA PÚBLICA VIA QR CODE"
echo "========================================"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Diretório do projeto
cd /var/www/sispat || exit 1

echo "📥 1. Atualizando código do repositório..."
git pull origin main
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao atualizar código${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Código atualizado${NC}"
echo ""

echo "🔨 2. Recompilando backend..."
cd backend
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao compilar backend${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend recompilado${NC}"
echo ""

echo "🔄 3. Reiniciando backend (PM2)..."
pm2 restart sispat-backend
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  PM2 restart falhou, tentando start...${NC}"
    pm2 start sispat-backend || true
fi
echo -e "${GREEN}✅ Backend reiniciado${NC}"
echo ""

echo "🎨 4. Recompilando frontend..."
cd ..
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao compilar frontend${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend recompilado${NC}"
echo ""

echo "🔄 5. Recarregando Nginx..."
sudo nginx -s reload
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Erro ao recarregar Nginx${NC}"
else
    echo -e "${GREEN}✅ Nginx recarregado${NC}"
fi
echo ""

echo "🧹 6. Limpando cache..."
rm -rf node_modules/.vite dist/.vite
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
echo -e "${GREEN}✅ Cache limpo${NC}"
echo ""

echo "========================================"
echo -e "${GREEN}✅ CORREÇÕES APLICADAS COM SUCESSO!${NC}"
echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo "   1. Teste escanear um QR code de etiqueta"
echo "   2. Verifique se a página de consulta pública carrega"
echo "   3. Confirme que todos os dados estão sendo exibidos"
echo ""
