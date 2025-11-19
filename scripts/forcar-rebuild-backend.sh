#!/bin/bash

# Script para forçar rebuild completo do backend
# Uso: ./scripts/forcar-rebuild-backend.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKEND_DIR="/var/www/sispat/backend"

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔧 Rebuild Forçado do Backend${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

cd "$BACKEND_DIR" || exit 1

# 1. Parar backend
echo -e "${BLUE}1. Parando backend...${NC}"
pm2 stop sispat-backend || true
sleep 3

# 2. Limpar cache e build
echo -e "${BLUE}2. Limpando cache e build anterior...${NC}"
rm -rf dist
rm -rf node_modules/.cache
rm -rf .tsbuildinfo 2>/dev/null || true
echo -e "${GREEN}✅ Cache limpo${NC}"

# 3. Rebuild
echo -e "${BLUE}3. Executando build...${NC}"
npm run build

# 4. Verificar se build foi bem-sucedido
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build falhou - diretório dist não encontrado${NC}"
    exit 1
fi

# 5. Verificar se correção está no código compilado
echo -e "${BLUE}4. Verificando código compilado...${NC}"
if grep -q "nameWithoutExt = 'image'" dist/middlewares/uploadMiddleware.js; then
    echo -e "${GREEN}✅ Correção encontrada no código compilado${NC}"
else
    echo -e "${RED}❌ Correção NÃO encontrada!${NC}"
    exit 1
fi

# 6. Iniciar backend
echo -e "${BLUE}5. Iniciando backend...${NC}"
pm2 start sispat-backend

# 7. Aguardar inicialização
sleep 3

# 8. Verificar status
echo -e "${BLUE}6. Verificando status...${NC}"
pm2 status | grep sispat-backend

echo ""
echo -e "${GREEN}✅ Rebuild concluído!${NC}"
echo ""
echo -e "${YELLOW}💡 Próximos passos:${NC}"
echo "1. Faça upload de uma nova imagem"
echo "2. Verifique se arquivo foi salvo como: image-{timestamp}-{random}.jpg"
echo "3. Verifique logs: pm2 logs sispat-backend --lines 20"


