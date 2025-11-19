#!/bin/bash

# Script para verificar e corrigir completamente o Nginx
# Uso: ./scripts/verificar-e-corrigir-nginx-completo.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔍 Verificação e Correção Completa${NC}"
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

# 1. Verificar configuração root
echo -e "${BLUE}1. Verificando configuração root...${NC}"
ROOT_LINE=$(grep -n "^[[:space:]]*root" "$NGINX_CONFIG" | head -1)
if [ -n "$ROOT_LINE" ]; then
    echo -e "${YELLOW}⚠️  Root encontrado:${NC}"
    echo "   $ROOT_LINE"
    ROOT_VALUE=$(echo "$ROOT_LINE" | awk '{print $2}' | tr -d ';')
    echo -e "   Valor: $ROOT_VALUE"
    if [ "$ROOT_VALUE" = "/var/www/sispat/dist" ]; then
        echo -e "${RED}   ❌ Root aponta para /dist (isso interfere com /uploads!)${NC}"
    fi
else
    echo -e "${GREEN}✅ Nenhum root configurado no server block${NC}"
fi
echo ""

# 2. Verificar configuração /uploads
echo -e "${BLUE}2. Verificando configuração /uploads...${NC}"
if grep -q "location /uploads" "$NGINX_CONFIG"; then
    echo -e "${GREEN}✅ Configuração /uploads encontrada${NC}"
    echo ""
    echo -e "${BLUE}Configuração atual:${NC}"
    grep -A 6 "location /uploads" "$NGINX_CONFIG"
    
    # Verificar alias
    ALIAS_VALUE=$(grep -A 6 "location /uploads" "$NGINX_CONFIG" | grep "alias" | awk '{print $2}' | tr -d ';')
    echo ""
    echo -e "   Alias: $ALIAS_VALUE"
    
    if [ "$ALIAS_VALUE" != "/var/www/sispat/backend/uploads/" ]; then
        echo -e "${RED}   ❌ Alias incorreto!${NC}"
    else
        echo -e "${GREEN}   ✅ Alias correto${NC}"
    fi
else
    echo -e "${RED}❌ Configuração /uploads não encontrada!${NC}"
fi
echo ""

# 3. Verificar logs recentes para entender o problema
echo -e "${BLUE}3. Verificando logs recentes...${NC}"
if [ -f "/var/log/nginx/error.log" ]; then
    echo -e "${BLUE}Últimas linhas do error.log:${NC}"
    sudo tail -3 /var/log/nginx/error.log | grep "uploads" || echo "   Nenhum erro recente"
fi
echo ""

# 4. Corrigir configuração
echo -e "${BLUE}4. Corrigindo configuração...${NC}"

# Remover configuração antiga /uploads
if grep -q "location /uploads" "$NGINX_CONFIG"; then
    sudo sed -i '/location \/uploads/,/^[[:space:]]*}/d' "$NGINX_CONFIG"
    echo -e "${GREEN}✅ Configuração antiga removida${NC}"
fi

# Adicionar configuração correta
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
    echo -e "${GREEN}✅ Configuração adicionada após /api${NC}"
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
    echo -e "${GREEN}✅ Configuração adicionada${NC}"
fi

echo ""

# 5. Verificar sintaxe
echo -e "${BLUE}5. Verificando sintaxe...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe está correta${NC}"
    
    # Recarregar Nginx
    echo ""
    echo -e "${BLUE}6. Recarregando Nginx...${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx recarregado${NC}"
    
    # Mostrar configuração final
    echo ""
    echo -e "${BLUE}7. Configuração final /uploads:${NC}"
    grep -A 6 "location /uploads" "$NGINX_CONFIG"
    
    # Testar acesso
    echo ""
    echo -e "${BLUE}8. Testando acesso...${NC}"
    sleep 2
    TEST_FILE=$(ls -t "$UPLOADS_DIR" | grep -E "\.(jpg|jpeg|png|gif|webp)$" | head -1)
    if [ -n "$TEST_FILE" ]; then
        echo -e "   Arquivo: $TEST_FILE"
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://sispat.vps-kinghost.net/uploads/$TEST_FILE" 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}   ✅ Arquivo acessível via HTTP (200)${NC}"
            echo -e "   URL: https://sispat.vps-kinghost.net/uploads/$TEST_FILE"
        else
            echo -e "${RED}   ❌ Código HTTP: $HTTP_CODE${NC}"
            echo -e "${YELLOW}   Verifique logs: sudo tail -f /var/log/nginx/error.log${NC}"
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
echo -e "${BLUE}Se ainda não funcionar:${NC}"
echo "  1. Verifique se há root configurado: sudo grep -n 'root' $NGINX_CONFIG"
echo "  2. Verifique logs: sudo tail -f /var/log/nginx/error.log"
echo "  3. Teste manualmente: curl -I https://sispat.vps-kinghost.net/uploads/NOME_DO_ARQUIVO"

