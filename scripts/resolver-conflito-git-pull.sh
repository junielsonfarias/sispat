#!/bin/bash

# Script para resolver conflitos de Git no servidor
# Uso: ./scripts/resolver-conflito-git-pull.sh

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

# 1. Verificar status
echo -e "${BLUE}1. Verificando status do Git...${NC}"
git status --short
echo ""

# 2. Descartar mudanças locais nos scripts
echo -e "${BLUE}2. Descartando mudanças locais nos scripts...${NC}"
git checkout -- scripts/limpar-nginx-completo.sh 2>/dev/null || true
git checkout -- scripts/corrigir-nginx-*.sh 2>/dev/null || true
git checkout -- scripts/*.sh 2>/dev/null || true
echo -e "${GREEN}✅ Mudanças locais descartadas${NC}"
echo ""

# 3. Fazer pull
echo -e "${BLUE}3. Fazendo pull do repositório...${NC}"
git pull origin main
echo -e "${GREEN}✅ Pull concluído${NC}"
echo ""

# 4. Dar permissão de execução
echo -e "${BLUE}4. Dando permissão de execução aos scripts...${NC}"
chmod +x scripts/*.sh 2>/dev/null || true
echo -e "${GREEN}✅ Permissões configuradas${NC}"
echo ""

echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Conflitos Resolvidos!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

