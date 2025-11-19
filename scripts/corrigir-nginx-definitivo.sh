#!/bin/bash

# Script para corrigir definitivamente o Nginx - versão simplificada
# Uso: ./scripts/corrigir-nginx-definitivo.sh

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
echo -e "${BLUE}  🔧 Correção Definitiva do Nginx${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Fazer backup
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"
echo ""

# 1. Remover TODAS as configurações /uploads usando Python (mais confiável)
echo -e "${BLUE}1. Removendo todas as configurações /uploads...${NC}"
python3 << 'PYTHON_SCRIPT'
import re
import sys

config_file = "/etc/nginx/sites-enabled/sispat"
with open(config_file, 'r') as f:
    content = f.read()

# Remover todas as configurações location /uploads (incluindo ^~)
# Padrão: location [^~]* /uploads { ... }
pattern = r'location\s+\^~\s+/uploads\s*\{[^}]*\}[^\n]*\n?'
content = re.sub(pattern, '', content, flags=re.MULTILINE | re.DOTALL)

pattern = r'location\s+/uploads\s*\{[^}]*\}[^\n]*\n?'
content = re.sub(pattern, '', content, flags=re.MULTILINE | re.DOTALL)

# Remover linhas vazias múltiplas
content = re.sub(r'\n{3,}', '\n\n', content)

with open(config_file, 'w') as f:
    f.write(content)

print("✅ Configurações /uploads removidas")
PYTHON_SCRIPT

echo ""

# 2. Remover alias incorreto do location ~*
echo -e "${BLUE}2. Removendo alias incorreto do location ~*...${NC}"
sudo sed -i '/location ~\*/,/^[[:space:]]*}/{
    /alias \/var\/www\/sispat\/backend\/uploads\/;/d
}' "$NGINX_CONFIG"
echo -e "${GREEN}✅ Alias incorreto removido${NC}"
echo ""

# 3. Adicionar configuração correta com ^~
echo -e "${BLUE}3. Adicionando configuração /uploads com ^~...${NC}"
UPLOADS_DIR="/var/www/sispat/backend/uploads"

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
echo ""

# 4. Verificar se há duplicatas
echo -e "${BLUE}4. Verificando duplicatas...${NC}"
UPLOADS_COUNT=$(grep -c "location.*/uploads" "$NGINX_CONFIG" || echo "0")
if [ "$UPLOADS_COUNT" -gt 1 ]; then
    echo -e "${RED}❌ Ainda há duplicatas!${NC}"
    grep -n "location.*/uploads" "$NGINX_CONFIG"
    exit 1
else
    echo -e "${GREEN}✅ Nenhuma duplicata encontrada${NC}"
fi
echo ""

# 5. Verificar sintaxe
echo -e "${BLUE}5. Verificando sintaxe...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe está correta${NC}"
    
    # Mostrar configuração final
    echo ""
    echo -e "${BLUE}6. Configuração final /uploads:${NC}"
    grep -A 6 "location.*/uploads" "$NGINX_CONFIG"
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

