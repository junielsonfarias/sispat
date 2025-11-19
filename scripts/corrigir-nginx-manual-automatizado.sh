#!/bin/bash

# Script para corrigir Nginx usando método mais direto
# Uso: ./scripts/corrigir-nginx-manual-automatizado.sh

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
echo -e "${BLUE}  🔧 Correção Manual Automatizada${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Fazer backup
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"
echo ""

# 1. Mostrar configurações atuais
echo -e "${BLUE}1. Configurações /uploads encontradas:${NC}"
grep -n "location.*/uploads" "$NGINX_CONFIG" || echo "   Nenhuma encontrada"
echo ""

# 2. Remover usando awk (mais confiável)
echo -e "${BLUE}2. Removendo TODAS as configurações /uploads usando awk...${NC}"

sudo awk '
BEGIN { skip = 0; brace_count = 0 }
/location.*\/uploads/ {
    skip = 1
    brace_count = gsub(/{/, "&") - gsub(/}/, "&")
    next
}
skip {
    brace_count += gsub(/{/, "&") - gsub(/}/, "&")
    if (brace_count <= 0) {
        skip = 0
        brace_count = 0
    }
    next
}
{ print }
' "$NGINX_CONFIG" > /tmp/nginx_config_clean

sudo mv /tmp/nginx_config_clean "$NGINX_CONFIG"

echo -e "${GREEN}✅ Configurações removidas${NC}"
echo ""

# 3. Verificar se foi removido
echo -e "${BLUE}3. Verificando remoção...${NC}"
UPLOADS_COUNT=$(grep -c "location.*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
if [ "$UPLOADS_COUNT" != "0" ]; then
    echo -e "${RED}❌ Ainda há configurações /uploads!${NC}"
    grep -n "location.*/uploads" "$NGINX_CONFIG"
    echo ""
    echo -e "${YELLOW}Tentando método alternativo...${NC}"
    
    # Método alternativo: remover linha por linha
    while grep -q "location.*/uploads" "$NGINX_CONFIG"; do
        LINE=$(grep -n "location.*/uploads" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
        # Remover bloco começando nesta linha até encontrar }
        sudo sed -i "${LINE},/^[[:space:]]*}/d" "$NGINX_CONFIG"
    done
    
    UPLOADS_COUNT=$(grep -c "location.*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
    if [ "$UPLOADS_COUNT" != "0" ]; then
        echo -e "${RED}❌ Falha ao remover. Edite manualmente.${NC}"
        echo -e "${YELLOW}Linhas a remover:${NC}"
        grep -n "location.*/uploads" "$NGINX_CONFIG"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Nenhuma configuração /uploads restante${NC}"
echo ""

# 4. Adicionar APENAS UMA configuração
echo -e "${BLUE}4. Adicionando configuração /uploads correta...${NC}"
UPLOADS_DIR="/var/www/sispat/backend/uploads"

# Verificar se já existe antes de adicionar
if ! grep -q "location.*/uploads" "$NGINX_CONFIG"; then
    # Encontrar location ~* e inserir ANTES dele
    if grep -q "location ~\*" "$NGINX_CONFIG"; then
        # Inserir ANTES do location ~*
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
        echo -e "${GREEN}✅ Configuração adicionada ANTES do location ~*${NC}"
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
else
    echo -e "${YELLOW}⚠️  Já existe uma configuração /uploads${NC}"
fi
echo ""

# 5. Verificar duplicatas
echo -e "${BLUE}5. Verificando duplicatas finais...${NC}"
UPLOADS_COUNT=$(grep -c "location.*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
if [ "$UPLOADS_COUNT" -gt 1 ]; then
    echo -e "${RED}❌ Ainda há duplicatas!${NC}"
    grep -n "location.*/uploads" "$NGINX_CONFIG"
    echo ""
    echo -e "${YELLOW}Removendo duplicatas...${NC}"
    # Manter apenas a primeira, remover as outras
    FIRST_LINE=$(grep -n "location.*/uploads" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    # Remover todas exceto a primeira (de trás para frente)
    grep -n "location.*/uploads" "$NGINX_CONFIG" | tail -n +2 | cut -d: -f1 | tac | while read line; do
        # Remover bloco começando nesta linha
        sudo sed -i "${line},/^[[:space:]]*}/d" "$NGINX_CONFIG"
    done
    UPLOADS_COUNT=$(grep -c "location.*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
fi

if [ "$UPLOADS_COUNT" -eq 1 ]; then
    echo -e "${GREEN}✅ Apenas uma configuração /uploads encontrada${NC}"
elif [ "$UPLOADS_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Nenhuma configuração /uploads encontrada${NC}"
    echo -e "${BLUE}Adicionando agora...${NC}"
    if grep -q "location ~\*" "$NGINX_CONFIG"; then
        sudo sed -i "/location ~\*/i\\
\\
    location ^~ /uploads {\\
        alias $UPLOADS_DIR/;\\
        expires 1y;\\
        add_header Cache-Control \"public\";\\
        access_log off;\\
    }\\
" "$NGINX_CONFIG"
    fi
else
    echo -e "${RED}❌ Número incorreto: $UPLOADS_COUNT${NC}"
    grep -n "location.*/uploads" "$NGINX_CONFIG"
    exit 1
fi
echo ""

# 6. Verificar sintaxe
echo -e "${BLUE}6. Verificando sintaxe...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe está correta${NC}"
    
    # Mostrar configuração final
    echo ""
    echo -e "${BLUE}7. Configuração final /uploads:${NC}"
    grep -A 6 "location.*/uploads" "$NGINX_CONFIG" || echo "   Nenhuma encontrada"
    echo ""
    
    # Recarregar Nginx
    echo -e "${BLUE}8. Recarregando Nginx...${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx recarregado${NC}"
    
    # Testar acesso
    echo ""
    echo -e "${BLUE}9. Testando acesso...${NC}"
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

