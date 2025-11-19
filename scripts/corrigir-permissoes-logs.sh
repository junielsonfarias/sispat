#!/bin/bash

# Script para corrigir permissões de logs e uploads
# Execute no servidor Linux via SSH

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔧 Correção de Permissões${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Diretórios
LOGS_DIR="/var/www/sispat/backend/logs"
UPLOADS_DIR="/var/www/sispat/backend/uploads"
BACKEND_DIR="/var/www/sispat/backend"

# 1. Corrigir permissões do diretório de logs
echo -e "${BLUE}1. Corrigindo permissões do diretório de logs...${NC}"
if [ -d "$LOGS_DIR" ]; then
    sudo chown -R www-data:www-data "$LOGS_DIR"
    sudo chmod -R 755 "$LOGS_DIR"
    echo -e "${GREEN}✅ Permissões de logs corrigidas${NC}"
else
    echo -e "${YELLOW}⚠️  Diretório de logs não existe, criando...${NC}"
    sudo mkdir -p "$LOGS_DIR"
    sudo chown -R www-data:www-data "$LOGS_DIR"
    sudo chmod -R 755 "$LOGS_DIR"
    echo -e "${GREEN}✅ Diretório de logs criado com permissões corretas${NC}"
fi

# 2. Corrigir permissões do diretório uploads
echo ""
echo -e "${BLUE}2. Corrigindo permissões do diretório uploads...${NC}"
if [ -d "$UPLOADS_DIR" ]; then
    sudo chown -R www-data:www-data "$UPLOADS_DIR"
    sudo find "$UPLOADS_DIR" -type f -exec chmod 644 {} \;
    sudo find "$UPLOADS_DIR" -type d -exec chmod 755 {} \;
    echo -e "${GREEN}✅ Permissões de uploads corrigidas${NC}"
else
    echo -e "${YELLOW}⚠️  Diretório uploads não existe, criando...${NC}"
    sudo mkdir -p "$UPLOADS_DIR"
    sudo chown -R www-data:www-data "$UPLOADS_DIR"
    sudo chmod -R 755 "$UPLOADS_DIR"
    echo -e "${GREEN}✅ Diretório uploads criado com permissões corretas${NC}"
fi

# 3. Parar backend atual (se estiver rodando)
echo ""
echo -e "${BLUE}3. Parando backend atual...${NC}"
if pm2 list | grep -q "sispat-backend"; then
    pm2 stop sispat-backend
    pm2 delete sispat-backend
    echo -e "${GREEN}✅ Backend parado${NC}"
else
    echo -e "${YELLOW}⚠️  Backend não está rodando no PM2${NC}"
fi

# 4. Reiniciar backend
echo ""
echo -e "${BLUE}4. Reiniciando backend...${NC}"
cd "$BACKEND_DIR"

if [ ! -f "ecosystem.config.js" ]; then
    echo -e "${RED}❌ Arquivo ecosystem.config.js não encontrado em $BACKEND_DIR${NC}"
    exit 1
fi

if [ ! -f "dist/index.js" ]; then
    echo -e "${YELLOW}⚠️  Backend não compilado. Compilando...${NC}"
    npm run build
fi

pm2 start ecosystem.config.js --env production
pm2 save

echo -e "${GREEN}✅ Backend reiniciado${NC}"

# 5. Verificar status
echo ""
echo -e "${BLUE}5. Verificando status...${NC}"
pm2 status

echo ""
echo -e "${BLUE}6. Verificando permissões finais...${NC}"
echo -e "${BLUE}Logs:${NC}"
ls -la "$LOGS_DIR" | head -5

echo ""
echo -e "${BLUE}Uploads:${NC}"
ls -la "$UPLOADS_DIR" | head -5

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Correção concluída!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Para ver logs:${NC}"
echo -e "  pm2 logs sispat-backend --lines 50"

