#!/bin/bash

# Script completo para corrigir Nginx e recompilar backend
# Uso: ./scripts/corrigir-tudo-servidor.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔧 Correção Completa do Sistema${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# 1. Atualizar código
echo -e "${BLUE}1. Atualizando código do repositório...${NC}"
cd /var/www/sispat
git pull origin main
echo -e "${GREEN}✅ Código atualizado${NC}"
echo ""

# 2. Limpar Nginx
echo -e "${BLUE}2. Limpando configuração do Nginx...${NC}"
chmod +x scripts/limpar-nginx-completo.sh
sudo ./scripts/limpar-nginx-completo.sh
echo ""

# 3. Recompilar backend
echo -e "${BLUE}3. Recompilando backend...${NC}"
cd /var/www/sispat/backend
npm run build
echo -e "${GREEN}✅ Backend recompilado${NC}"
echo ""

# 4. Reiniciar PM2
echo -e "${BLUE}4. Reiniciando backend PM2...${NC}"
pm2 stop sispat-backend 2>/dev/null || true
pm2 delete sispat-backend 2>/dev/null || true
pm2 start ecosystem.config.js --env production --name sispat-backend --user www-data
pm2 save
echo -e "${GREEN}✅ Backend reiniciado${NC}"
echo ""

# 5. Verificar status
echo -e "${BLUE}5. Verificando status...${NC}"
pm2 status
echo ""
pm2 logs sispat-backend --lines 10 --nostream || true
echo ""

echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Correção Concluída!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

