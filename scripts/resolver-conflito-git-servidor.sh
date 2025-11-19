#!/bin/bash

# Script para resolver conflitos Git no servidor
# Uso: ./scripts/resolver-conflito-git-servidor.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔧 Resolvendo Conflitos Git${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

cd /var/www/sispat

# Verificar status
echo -e "${BLUE}1. Verificando status do Git...${NC}"
git status --short

echo ""
echo -e "${YELLOW}⚠️  Há mudanças locais que conflitam com o repositório${NC}"
echo ""

# Descartar mudanças locais em scripts
echo -e "${BLUE}2. Descartando mudanças locais em scripts...${NC}"
git checkout -- scripts/*.sh 2>/dev/null || true
echo -e "${GREEN}✅ Mudanças locais descartadas${NC}"

# Agora fazer pull
echo ""
echo -e "${BLUE}3. Fazendo pull do repositório...${NC}"
git pull origin main

echo ""
echo -e "${GREEN}✅ Conflitos resolvidos!${NC}"

