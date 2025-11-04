#!/bin/bash

# Script para verificar erros de inicialização do backend
# Autor: GPT-4

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== VERIFICANDO INICIALIZAÇÃO DO BACKEND ===${NC}\n"

cd /var/www/sispat || exit 1

# 1. Ver logs completos (não apenas erro)
echo -e "${BLUE}1. ÚLTIMOS LOGS COMPLETOS (stdout + stderr):${NC}"
pm2 logs sispat-backend --lines 30 --nostream

echo ""
echo -e "${BLUE}2. STATUS DO PM2:${NC}"
pm2 describe sispat-backend | head -30

echo ""
echo -e "${BLUE}3. VERIFICANDO SE ESTÁ ESCUTANDO NA PORTA 3000:${NC}"
if ss -tuln 2>/dev/null | grep -q ":3000" || netstat -tuln 2>/dev/null | grep -q ":3000"; then
    echo -e "${GREEN}✓ Algo está escutando na porta 3000${NC}"
    ss -tuln | grep ":3000" || netstat -tuln | grep ":3000"
else
    echo -e "${RED}✗ Nada está escutando na porta 3000${NC}"
fi

echo ""
echo -e "${BLUE}4. TESTANDO HEALTH CHECK:${NC}"
curl -s http://localhost:3000/api/health || echo -e "${RED}✗ Health check falhou${NC}"

echo ""
echo -e "${BLUE}5. VERIFICANDO PROCESSO NODE:${NC}"
ps aux | grep -E "node.*dist/index.js" | grep -v grep || echo -e "${YELLOW}Nenhum processo Node encontrado${NC}"

echo ""
echo -e "${BLUE}6. TENTANDO EXECUTAR MANUALMENTE (10 segundos):${NC}"
cd backend || exit 1

# Parar PM2 temporariamente
pm2 stop sispat-backend 2>/dev/null
sleep 2

# Carregar .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Executar diretamente
echo -e "${YELLOW}Executando: node dist/index.js${NC}"
timeout 10 node dist/index.js 2>&1 || {
    echo ""
    echo -e "${RED}Erro ao executar!${NC}"
}

echo ""
echo -e "${BLUE}Reiniciando no PM2...${NC}"
pm2 restart sispat-backend
