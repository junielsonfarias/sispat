#!/bin/bash

# Script para verificar configuração completa do Nginx
# Uso: ./scripts/verificar-nginx-config-completo.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔍 Verificação Completa do Nginx${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Encontrar arquivo de configuração
NGINX_CONFIG=""
if [ -f "/etc/nginx/sites-enabled/sispat" ]; then
    NGINX_CONFIG="/etc/nginx/sites-enabled/sispat"
elif [ -f "/etc/nginx/sites-available/sispat" ]; then
    NGINX_CONFIG="/etc/nginx/sites-available/sispat"
else
    NGINX_CONFIG=$(find /etc/nginx -name "*sispat*" -type f 2>/dev/null | head -1)
fi

if [ -z "$NGINX_CONFIG" ]; then
    echo -e "${RED}❌ Arquivo de configuração Nginx não encontrado!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Arquivo de configuração: $NGINX_CONFIG${NC}"
echo ""

# 1. Verificar configuração /uploads
echo -e "${BLUE}1. Verificando configuração /uploads...${NC}"
if grep -q "location /uploads" "$NGINX_CONFIG"; then
    echo -e "${GREEN}✅ Configuração /uploads encontrada${NC}"
    echo ""
    echo -e "${BLUE}Configuração atual:${NC}"
    grep -A 6 "location /uploads" "$NGINX_CONFIG"
    
    # Verificar se alias termina com /
    if grep -A 2 "location /uploads" "$NGINX_CONFIG" | grep "alias" | grep -q "/$"; then
        echo -e "${GREEN}✅ Alias termina com / (correto)${NC}"
    else
        echo -e "${RED}❌ Alias NÃO termina com / (incorreto!)${NC}"
    fi
else
    echo -e "${RED}❌ Configuração /uploads NÃO encontrada!${NC}"
fi

# 2. Verificar configuração /api
echo ""
echo -e "${BLUE}2. Verificando configuração /api...${NC}"
if grep -q "location /api" "$NGINX_CONFIG"; then
    echo -e "${GREEN}✅ Configuração /api encontrada${NC}"
    echo ""
    echo -e "${BLUE}Configuração atual:${NC}"
    grep -A 5 "location /api" "$NGINX_CONFIG"
else
    echo -e "${YELLOW}⚠️  Configuração /api não encontrada${NC}"
fi

# 3. Verificar ordem das rotas (importante!)
echo ""
echo -e "${BLUE}3. Verificando ordem das rotas...${NC}"
echo -e "${YELLOW}⚠️  A ordem das rotas é importante!${NC}"
echo -e "${YELLOW}   /api deve vir ANTES de /uploads para não interceptar /api/upload${NC}"
echo ""

# Encontrar linhas das rotas
UPLOADS_LINE=$(grep -n "location /uploads" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
API_LINE=$(grep -n "location /api" "$NGINX_CONFIG" | head -1 | cut -d: -f1)

if [ -n "$UPLOADS_LINE" ] && [ -n "$API_LINE" ]; then
    if [ "$API_LINE" -lt "$UPLOADS_LINE" ]; then
        echo -e "${GREEN}✅ Ordem correta: /api vem antes de /uploads${NC}"
    else
        echo -e "${RED}❌ Ordem INCORRETA: /uploads vem antes de /api!${NC}"
        echo -e "${RED}   Isso pode causar problemas com /api/upload${NC}"
    fi
    echo -e "   Linha /api: $API_LINE"
    echo -e "   Linha /uploads: $UPLOADS_LINE"
fi

# 4. Verificar se há location /api/upload específico
echo ""
echo -e "${BLUE}4. Verificando se há rota específica /api/upload...${NC}"
if grep -q "location /api/upload" "$NGINX_CONFIG"; then
    echo -e "${YELLOW}⚠️  Rota específica /api/upload encontrada${NC}"
    grep -A 5 "location /api/upload" "$NGINX_CONFIG"
else
    echo -e "${GREEN}✅ Sem rota específica /api/upload (usa /api geral)${NC}"
fi

# 5. Testar sintaxe
echo ""
echo -e "${BLUE}5. Testando sintaxe do Nginx...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe está correta${NC}"
else
    echo -e "${RED}❌ Erro na sintaxe!${NC}"
    sudo nginx -t
fi

# 6. Verificar se arquivo existe
echo ""
echo -e "${BLUE}6. Verificando arquivo de teste...${NC}"
TEST_FILE=$(ls -t /var/www/sispat/backend/uploads | grep -E "\.(jpg|jpeg|png|gif|webp)$" | head -1)
if [ -n "$TEST_FILE" ]; then
    echo -e "   Arquivo: $TEST_FILE"
    if [ -f "/var/www/sispat/backend/uploads/$TEST_FILE" ]; then
        echo -e "${GREEN}   ✅ Arquivo existe no servidor${NC}"
        
        # Testar acesso HTTP
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://sispat.vps-kinghost.net/uploads/$TEST_FILE" 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}   ✅ Arquivo acessível via HTTP (200)${NC}"
        else
            echo -e "${RED}   ❌ Arquivo NÃO acessível via HTTP (código: $HTTP_CODE)${NC}"
        fi
    fi
fi

# 7. Verificar logs
echo ""
echo -e "${BLUE}7. Verificando logs recentes...${NC}"
if [ -f "/var/log/nginx/error.log" ]; then
    echo -e "${BLUE}Últimas linhas do error.log:${NC}"
    sudo tail -5 /var/log/nginx/error.log | grep -i "upload\|404\|permission" || echo "   Nenhum erro relevante"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  💡 Recomendações${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo "Se as imagens retornam 404:"
echo "  1. Verifique se o alias termina com /"
echo "  2. Verifique se o caminho do alias está correto"
echo "  3. Execute: sudo systemctl reload nginx"
echo ""
echo "Se DELETE retorna 405:"
echo "  1. Verifique se /api vem ANTES de /uploads na configuração"
echo "  2. Verifique se o backend está rodando: pm2 status"
echo "  3. Verifique logs do backend: pm2 logs sispat-backend"

