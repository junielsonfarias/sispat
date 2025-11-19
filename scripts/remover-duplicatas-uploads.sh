#!/bin/bash

# Script para remover todas as configurações /uploads duplicadas
# Uso: ./scripts/remover-duplicatas-uploads.sh

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
echo -e "${BLUE}  🔧 Removendo Duplicatas /uploads${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Fazer backup
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"
echo ""

# Contar quantas configurações /uploads existem
COUNT=$(grep -c "location.*/uploads" "$NGINX_CONFIG" || echo "0")
echo -e "${BLUE}1. Configurações /uploads encontradas: $COUNT${NC}"

if [ "$COUNT" -gt 1 ]; then
    echo -e "${YELLOW}   ⚠️  Há duplicatas!${NC}"
    
    # Mostrar todas as ocorrências
    echo ""
    echo -e "${BLUE}2. Localizações das configurações /uploads:${NC}"
    grep -n "location.*/uploads" "$NGINX_CONFIG"
    echo ""
    
    # Remover TODAS as configurações /uploads
    echo -e "${BLUE}3. Removendo TODAS as configurações /uploads...${NC}"
    # Criar arquivo temporário sem nenhuma configuração /uploads
    sudo awk '
        /location.*\/uploads/ {
            in_uploads = 1
            next
        }
        in_uploads && /^[[:space:]]*}/ {
            in_uploads = 0
            next
        }
        !in_uploads {
            print
        }
    ' "$NGINX_CONFIG" > /tmp/nginx_config_temp
    
    sudo mv /tmp/nginx_config_temp "$NGINX_CONFIG"
    echo -e "${GREEN}✅ Todas as configurações /uploads removidas${NC}"
else
    echo -e "${GREEN}   ✅ Nenhuma duplicata encontrada${NC}"
fi

echo ""

# Verificar sintaxe
echo -e "${BLUE}4. Verificando sintaxe...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe está correta${NC}"
    echo ""
    echo -e "${BLUE}5. Configurações /uploads restantes:${NC}"
    grep -n "location.*/uploads" "$NGINX_CONFIG" || echo "   Nenhuma (será adicionada)"
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
echo -e "${GREEN}  ✅ Duplicatas Removidas!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Próximo passo:${NC}"
echo "  Execute: sudo ./scripts/corrigir-nginx-uploads-final.sh"

