#!/bin/bash

# Script para corrigir definitivamente o Nginx usando ^~ para precedência
# Uso: ./scripts/corrigir-nginx-uploads-final.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NGINX_CONFIG="/etc/nginx/sites-enabled/sispat"
if [ ! -f "$NGINX_CONFIG" ]; then
    NGINX_CONFIG="/etc/nginx/sites-available/sispat"
fi

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔧 Correção Final do Nginx${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Fazer backup
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"
echo ""

# 1. Remover todas as configurações /uploads
echo -e "${BLUE}1. Removendo configurações /uploads antigas...${NC}"
sudo sed -i '/location \/uploads/,/^[[:space:]]*}/d' "$NGINX_CONFIG"
echo -e "${GREEN}✅ Configurações antigas removidas${NC}"
echo ""

# 2. Remover alias incorreto do location ~*
echo -e "${BLUE}2. Corrigindo location ~* (removendo alias incorreto)...${NC}"
# Remover linha com alias dentro do location ~*
sudo sed -i '/location ~\*/,/^[[:space:]]*}/{
    /alias \/var\/www\/sispat\/backend\/uploads\/;/d
}' "$NGINX_CONFIG"
echo -e "${GREEN}✅ Alias incorreto removido${NC}"
echo ""

# 3. Adicionar location /uploads com ^~ (precedência sobre regex)
echo -e "${BLUE}3. Adicionando location /uploads com ^~ (precedência)...${NC}"
UPLOADS_DIR="/var/www/sispat/backend/uploads"

# Inserir ANTES do location ~*
if grep -q "location ~\*" "$NGINX_CONFIG"; then
    # Usar ^~ para dar precedência sobre regex
    sudo sed -i "/location ~\*/i\\
\\
    # Arquivos estáticos (uploads) - ^~ garante precedência sobre regex\\
    location ^~ /uploads {\\
        alias $UPLOADS_DIR/;\\
        expires 1y;\\
        add_header Cache-Control \"public\";\\
        access_log off;\\
    }\\
" "$NGINX_CONFIG"
    echo -e "${GREEN}✅ Configuração adicionada com ^~ (precedência sobre regex)${NC}"
else
    # Se não há location ~*, inserir após /api
    if grep -q "location /api" "$NGINX_CONFIG"; then
        sudo sed -i "/location \/api\//,/^[[:space:]]*}/ {
            /^[[:space:]]*}/a\\
\\
    # Arquivos estáticos (uploads)\\
    location ^~ /uploads {\\
        alias $UPLOADS_DIR/;\\
        expires 1y;\\
        add_header Cache-Control \"public\";\\
        access_log off;\\
    }
        }" "$NGINX_CONFIG"
        echo -e "${GREEN}✅ Configuração adicionada após /api${NC}"
    fi
fi
echo ""

# 4. Verificar sintaxe
echo -e "${BLUE}4. Verificando sintaxe...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe está correta${NC}"
    
    # Mostrar configuração final
    echo ""
    echo -e "${BLUE}5. Configuração final /uploads:${NC}"
    sudo grep -A 6 "location.*/uploads" "$NGINX_CONFIG"
    echo ""
    
    echo -e "${BLUE}6. Configuração location ~*:${NC}"
    sudo grep -A 6 "location ~\*" "$NGINX_CONFIG" | head -7
    echo ""
    
    # Recarregar Nginx
    echo -e "${BLUE}7. Recarregando Nginx...${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx recarregado${NC}"
    
    # Testar acesso
    echo ""
    echo -e "${BLUE}8. Testando acesso...${NC}"
    sleep 3
    TEST_FILE=$(ls -t /var/www/sispat/backend/uploads | grep -E "\.(jpg|jpeg|png|gif|webp)$" | head -1)
    if [ -n "$TEST_FILE" ]; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://sispat.vps-kinghost.net/uploads/$TEST_FILE" 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}   ✅ Arquivo acessível via HTTP (200)${NC}"
            echo -e "   URL: https://sispat.vps-kinghost.net/uploads/$TEST_FILE"
        else
            echo -e "${YELLOW}   ⚠️  Código HTTP: $HTTP_CODE${NC}"
            echo -e "${BLUE}   Verifique logs: sudo tail -5 /var/log/nginx/error.log${NC}"
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
echo ""
echo -e "${BLUE}O que foi feito:${NC}"
echo "  1. Removido alias incorreto do location ~*"
echo "  2. Adicionado location ^~ /uploads (precedência sobre regex)"
echo "  3. Garantido que /uploads seja processado antes de ~*"

