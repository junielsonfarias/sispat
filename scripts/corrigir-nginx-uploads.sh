#!/bin/bash

# Script para corrigir configuração Nginx de uploads
# Uso: ./scripts/corrigir-nginx-uploads.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔧 Correção de Configuração Nginx${NC}"
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
    echo "   Procurando em:"
    ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "   Diretório não encontrado"
    exit 1
fi

echo -e "${GREEN}✅ Arquivo de configuração encontrado: $NGINX_CONFIG${NC}"
echo ""

# Verificar configuração atual
echo -e "${BLUE}1. Verificando configuração atual...${NC}"
if grep -q "location /uploads" "$NGINX_CONFIG"; then
    echo -e "${GREEN}✅ Configuração /uploads encontrada${NC}"
    echo ""
    echo -e "${BLUE}Configuração atual:${NC}"
    grep -A 5 "location /uploads" "$NGINX_CONFIG"
else
    echo -e "${YELLOW}⚠️  Configuração /uploads não encontrada${NC}"
    echo "   Será adicionada..."
fi

# Fazer backup
echo ""
echo -e "${BLUE}2. Fazendo backup da configuração...${NC}"
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"

# Verificar se precisa corrigir
UPLOADS_DIR="/var/www/sispat/backend/uploads"
NEEDS_FIX=false

# Verificar se alias está correto
if ! grep -A 5 "location /uploads" "$NGINX_CONFIG" | grep -q "alias.*$UPLOADS_DIR"; then
    NEEDS_FIX=true
    echo -e "${YELLOW}⚠️  Alias não está correto${NC}"
fi

# Verificar se alias termina com /
if grep -A 5 "location /uploads" "$NGINX_CONFIG" | grep "alias" | grep -qv "/$"; then
    NEEDS_FIX=true
    echo -e "${YELLOW}⚠️  Alias não termina com /${NC}"
fi

# Verificar ordem das rotas (importante: /api deve vir antes de /uploads)
UPLOADS_LINE=$(grep -n "location /uploads" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
API_LINE=$(grep -n "location /api" "$NGINX_CONFIG" | head -1 | cut -d: -f1)

if [ -n "$UPLOADS_LINE" ] && [ -n "$API_LINE" ] && [ "$UPLOADS_LINE" -lt "$API_LINE" ]; then
    NEEDS_FIX=true
    echo -e "${YELLOW}⚠️  Ordem incorreta: /uploads vem antes de /api${NC}"
    echo -e "${YELLOW}   Isso pode causar problemas com /api/upload${NC}"
fi

if [ "$NEEDS_FIX" = true ]; then
    echo ""
    echo -e "${BLUE}3. Corrigindo configuração...${NC}"
    
    # Remover configuração antiga se existir
    if grep -q "location /uploads" "$NGINX_CONFIG"; then
        # Criar arquivo temporário sem a configuração antiga
        sudo sed '/location \/uploads/,/^[[:space:]]*}/d' "$NGINX_CONFIG" > /tmp/nginx_config_temp
        sudo mv /tmp/nginx_config_temp "$NGINX_CONFIG"
    fi
    
    # ✅ CORREÇÃO: Garantir que /api vem ANTES de /uploads
    # Encontrar onde inserir (após location /api, mas antes do fechamento do server block)
    if grep -q "location /api" "$NGINX_CONFIG"; then
        # Inserir após location /api (garantindo ordem correta)
        sudo sed -i "/location \/api/,/^[[:space:]]*}/ {
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
    
    echo -e "${GREEN}✅ Configuração atualizada${NC}"
    echo -e "${BLUE}   Ordem garantida: /api antes de /uploads${NC}"
else
    echo -e "${GREEN}✅ Configuração já está correta${NC}"
fi

# Verificar sintaxe
echo ""
echo -e "${BLUE}4. Verificando sintaxe do Nginx...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe está correta${NC}"
    
    # Recarregar Nginx
    echo ""
    echo -e "${BLUE}5. Recarregando Nginx...${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx recarregado${NC}"
else
    echo -e "${RED}❌ Erro na sintaxe!${NC}"
    sudo nginx -t
    echo ""
    echo -e "${YELLOW}Restaurando backup...${NC}"
    sudo cp "$BACKUP_FILE" "$NGINX_CONFIG"
    exit 1
fi

# Testar acesso
echo ""
echo -e "${BLUE}6. Testando acesso HTTP...${NC}"
TEST_FILE=$(ls -t "$UPLOADS_DIR" | grep -E "\.(jpg|jpeg|png|gif|webp)$" | head -1)
if [ -n "$TEST_FILE" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://sispat.vps-kinghost.net/uploads/$TEST_FILE" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Arquivo acessível via HTTP (200)${NC}"
        echo -e "   URL: https://sispat.vps-kinghost.net/uploads/$TEST_FILE"
    else
        echo -e "${YELLOW}⚠️  Arquivo ainda retorna código: $HTTP_CODE${NC}"
        echo -e "   Pode ser cache. Aguarde alguns segundos e teste novamente."
    fi
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Correção Concluída!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo "  1. Teste acessar uma imagem no navegador"
echo "  2. Se ainda não funcionar, verifique logs: sudo tail -f /var/log/nginx/error.log"
echo "  3. Limpe o cache do navegador (Ctrl+Shift+R)"

