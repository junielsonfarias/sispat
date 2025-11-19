#!/bin/bash

# Script para corrigir definitivamente o alias do Nginx
# Uso: ./scripts/corrigir-nginx-alias-definitivo.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔧 Correção Definitiva do Alias Nginx${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Encontrar arquivo de configuração
NGINX_CONFIG="/etc/nginx/sites-enabled/sispat"
if [ ! -f "$NGINX_CONFIG" ]; then
    NGINX_CONFIG="/etc/nginx/sites-available/sispat"
fi

if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${RED}❌ Arquivo de configuração não encontrado!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Arquivo: $NGINX_CONFIG${NC}"
echo ""

# Fazer backup
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"
echo ""

# Verificar configuração atual
echo -e "${BLUE}1. Verificando configuração atual...${NC}"
echo ""
echo -e "${BLUE}Configuração /uploads:${NC}"
grep -A 6 "location /uploads" "$NGINX_CONFIG" || echo "   Não encontrada"
echo ""

# Remover configuração antiga
echo -e "${BLUE}2. Removendo configuração antiga...${NC}"
sudo sed -i '/location \/uploads/,/^[[:space:]]*}/d' "$NGINX_CONFIG"
echo -e "${GREEN}✅ Configuração antiga removida${NC}"
echo ""

# Adicionar configuração correta
echo -e "${BLUE}3. Adicionando configuração correta...${NC}"
UPLOADS_DIR="/var/www/sispat/backend/uploads"

# Encontrar onde inserir (após location /api)
if grep -q "location /api" "$NGINX_CONFIG"; then
    # Inserir após location /api
    sudo sed -i "/location \/api\//,/^[[:space:]]*}/ {
        /^[[:space:]]*}/a\\
\\
    # Arquivos estáticos (uploads) - DEVE vir DEPOIS de /api\\
    location /uploads {\\
        alias $UPLOADS_DIR/;\\
        expires 1y;\\
        add_header Cache-Control \"public\";\\
        access_log off;\\
    }
        }" "$NGINX_CONFIG"
else
    # Se não há /api, adicionar antes do fechamento do server block
    sudo sed -i "/^[[:space:]]*}/i\\
\\
    # Arquivos estáticos (uploads)\\
    location /uploads {\\
        alias $UPLOADS_DIR/;\\
        expires 1y;\\
        add_header Cache-Control \"public\";\\
        access_log off;\\
    }\\
" "$NGINX_CONFIG"
fi

echo -e "${GREEN}✅ Configuração adicionada${NC}"
echo ""

# Verificar configuração adicionada
echo -e "${BLUE}4. Verificando configuração adicionada...${NC}"
echo ""
grep -A 6 "location /uploads" "$NGINX_CONFIG"
echo ""

# Verificar sintaxe
echo -e "${BLUE}5. Verificando sintaxe...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe está correta${NC}"
    
    # Recarregar Nginx
    echo ""
    echo -e "${BLUE}6. Recarregando Nginx...${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx recarregado${NC}"
    
    # Testar acesso
    echo ""
    echo -e "${BLUE}7. Testando acesso...${NC}"
    sleep 2
    TEST_FILE=$(ls -t "$UPLOADS_DIR" | grep -E "\.(jpg|jpeg|png|gif|webp)$" | head -1)
    if [ -n "$TEST_FILE" ]; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://sispat.vps-kinghost.net/uploads/$TEST_FILE" 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}✅ Arquivo acessível via HTTP (200)${NC}"
            echo -e "   URL: https://sispat.vps-kinghost.net/uploads/$TEST_FILE"
        else
            echo -e "${YELLOW}⚠️  Código HTTP: $HTTP_CODE${NC}"
            echo -e "   Verifique logs: sudo tail -f /var/log/nginx/error.log"
        fi
    fi
else
    echo -e "${RED}❌ Erro na sintaxe!${NC}"
    sudo nginx -t
    echo ""
    echo -e "${YELLOW}Restaurando backup...${NC}"
    sudo cp "$BACKUP_FILE" "$NGINX_CONFIG"
    exit 1
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Correção Concluída!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

