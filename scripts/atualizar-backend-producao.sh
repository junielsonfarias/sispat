#!/bin/bash

# Script para atualizar apenas o backend em produção
# Uso: ./scripts/atualizar-backend-producao.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/var/www/sispat"
BACKEND_DIR="$PROJECT_DIR/backend"

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔧 Atualização do Backend${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Verificar diretório
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Diretório backend não encontrado: $BACKEND_DIR${NC}"
    exit 1
fi

cd "$BACKEND_DIR" || exit 1

# Verificar se é repositório Git
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Não é um repositório Git, pulando git pull${NC}"
else
    echo -e "${BLUE}📥 Atualizando código...${NC}"
    git pull origin main || echo -e "${YELLOW}⚠️  Git pull falhou ou não há atualizações${NC}"
fi

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependências...${NC}"
    npm install
fi

# Build
echo -e "${BLUE}🏗️  Executando build...${NC}"
npm run build

# Verificar build
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build falhou - diretório dist não encontrado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build concluído${NC}"

# Reiniciar PM2
if command -v pm2 &> /dev/null; then
    echo -e "${BLUE}🔄 Reiniciando backend...${NC}"
    if pm2 list | grep -q "sispat-backend"; then
        pm2 restart sispat-backend
        echo -e "${GREEN}✅ Backend reiniciado${NC}"
        
        echo ""
        echo -e "${BLUE}📊 Status:${NC}"
        pm2 status | grep sispat-backend
    else
        echo -e "${YELLOW}⚠️  Processo sispat-backend não encontrado no PM2${NC}"
        echo -e "${YELLOW}   Verifique com: pm2 list${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PM2 não encontrado${NC}"
fi

echo ""
echo -e "${GREEN}✅ Atualização do backend concluída!${NC}"
echo ""
echo -e "${YELLOW}📝 Próximos passos:${NC}"
echo "1. Verificar logs: pm2 logs sispat-backend --lines 20"
echo "2. Testar upload de nova imagem"
echo "3. Verificar se arquivo tem extensão: ls -lht /var/www/sispat/backend/uploads/ | head -3"

