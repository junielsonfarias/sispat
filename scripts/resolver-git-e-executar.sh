#!/bin/bash

# Script para resolver conflitos Git e executar limpeza de fotos
# Uso: ./scripts/resolver-git-e-executar.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd /var/www/sispat

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔧 Resolvendo Git e Limpando Fotos${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# 1. Resolver conflitos Git
echo -e "${BLUE}1. Resolvendo conflitos Git...${NC}"
git stash 2>/dev/null || true
git checkout -- scripts/setup-server.sh 2>/dev/null || true
git checkout -- scripts/*.sh 2>/dev/null || true
git pull origin main
echo -e "${GREEN}✅ Git atualizado${NC}"
echo ""

# 2. Dar permissões
echo -e "${BLUE}2. Configurando permissões...${NC}"
chmod +x scripts/*.sh 2>/dev/null || true
echo -e "${GREEN}✅ Permissões configuradas${NC}"
echo ""

# 3. Executar limpeza de fotos
echo -e "${BLUE}3. Executando limpeza de fotos inválidas...${NC}"
sudo ./scripts/limpar-fotos-invalidas.sh

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Processo Concluído!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

