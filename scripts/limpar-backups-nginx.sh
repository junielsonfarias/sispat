#!/bin/bash

# Script para remover backups do Nginx e verificar duplicatas
# Uso: ./scripts/limpar-backups-nginx.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🧹 Limpeza de Backups do Nginx${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# 1. Remover todos os backups do diretório sites-enabled
echo -e "${BLUE}1. Removendo arquivos de backup...${NC}"
BACKUP_COUNT=$(sudo find /etc/nginx/sites-enabled -name "*.backup.*" 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}   Encontrados $BACKUP_COUNT arquivo(s) de backup${NC}"
    sudo find /etc/nginx/sites-enabled -name "*.backup.*" -delete
    echo -e "${GREEN}   ✅ Backups removidos${NC}"
else
    echo -e "${GREEN}   ✅ Nenhum backup encontrado${NC}"
fi
echo ""

# 2. Verificar arquivo principal
echo -e "${BLUE}2. Verificando arquivo principal...${NC}"
NGINX_CONFIG="/etc/nginx/sites-enabled/sispat"
if [ ! -f "$NGINX_CONFIG" ]; then
    NGINX_CONFIG="/etc/nginx/sites-available/sispat"
fi

# Verificar duplicatas
LOCATION_COUNT=$(grep -c "location.*uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
if [ "$LOCATION_COUNT" -gt 1 ]; then
    echo -e "${YELLOW}   ⚠️  Encontradas $LOCATION_COUNT configurações /uploads${NC}"
    echo -e "${BLUE}   Configurações encontradas:${NC}"
    grep -n "location.*uploads" "$NGINX_CONFIG"
    echo ""
    echo -e "${YELLOW}   Removendo duplicatas...${NC}"
    
    # Manter apenas a primeira, remover as outras
    FIRST_LINE=$(grep -n "location.*uploads" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    grep -n "location.*uploads" "$NGINX_CONFIG" | tail -n +2 | cut -d: -f1 | tac | while read line; do
        # Remover bloco começando nesta linha
        sudo sed -i "${line},/^[[:space:]]*}/d" "$NGINX_CONFIG"
    done
    
    LOCATION_COUNT=$(grep -c "location.*uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
    if [ "$LOCATION_COUNT" -eq 1 ]; then
        echo -e "${GREEN}   ✅ Duplicatas removidas${NC}"
    else
        echo -e "${RED}   ❌ Ainda há $LOCATION_COUNT configurações${NC}"
    fi
else
    echo -e "${GREEN}   ✅ Apenas uma configuração /uploads encontrada${NC}"
fi
echo ""

# 3. Testar sintaxe
echo -e "${BLUE}3. Testando sintaxe do Nginx...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe está correta${NC}"
    
    # Recarregar
    echo ""
    echo -e "${BLUE}4. Recarregando Nginx...${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx recarregado${NC}"
else
    echo -e "${RED}❌ Erro na sintaxe!${NC}"
    sudo nginx -t
    exit 1
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Limpeza Concluída!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

