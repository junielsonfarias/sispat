#!/bin/bash

# Script para limpar completamente e corrigir Nginx
# Uso: ./scripts/limpar-e-corrigir-nginx.sh

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
echo -e "${BLUE}  🔧 Limpeza e Correção Completa${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Fazer backup
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"
echo ""

# 1. Mostrar todas as configurações /uploads
echo -e "${BLUE}1. Configurações /uploads encontradas:${NC}"
grep -n "location.*/uploads" "$NGINX_CONFIG" || echo "   Nenhuma encontrada"
echo ""

# 2. Remover TODAS usando sed de forma mais agressiva
echo -e "${BLUE}2. Removendo TODAS as configurações /uploads...${NC}"

# Método 1: Remover blocos location /uploads completos
# Primeiro, vamos marcar onde começam e terminam
python3 << 'PYTHON_SCRIPT'
import re
import sys

config_file = "/etc/nginx/sites-enabled/sispat"
with open(config_file, 'r') as f:
    lines = f.readlines()

output = []
i = 0
skip_block = False
in_uploads_block = False
brace_count = 0

while i < len(lines):
    line = lines[i]
    
    # Detectar início de location /uploads
    if re.search(r'location\s+(\^~)?\s*/uploads', line):
        in_uploads_block = True
        brace_count = line.count('{') - line.count('}')
        skip_block = True
        i += 1
        continue
    
    # Se estamos em um bloco /uploads, contar chaves
    if skip_block:
        brace_count += line.count('{') - line.count('}')
        if brace_count <= 0:
            skip_block = False
            in_uploads_block = False
        i += 1
        continue
    
    # Linha normal, adicionar
    output.append(line)
    i += 1

# Remover linhas vazias múltiplas
content = ''.join(output)
content = re.sub(r'\n{3,}', '\n\n', content)

with open(config_file, 'w') as f:
    f.write(content)

print("✅ Todas as configurações /uploads removidas")
PYTHON_SCRIPT

echo ""

# 3. Verificar se ainda há duplicatas
echo -e "${BLUE}3. Verificando se ainda há duplicatas...${NC}"
UPLOADS_COUNT=$(grep -c "location.*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
if [ "$UPLOADS_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ Ainda há configurações /uploads!${NC}"
    grep -n "location.*/uploads" "$NGINX_CONFIG"
    echo ""
    echo -e "${YELLOW}Tentando remover manualmente...${NC}"
    # Tentar remover linha por linha
    sudo sed -i '/location.*\/uploads/d' "$NGINX_CONFIG"
    # Remover linhas relacionadas
    sudo sed -i '/alias.*\/backend\/uploads/d' "$NGINX_CONFIG"
    sudo sed -i '/expires.*1y/d' "$NGINX_CONFIG" 2>/dev/null || true
    sudo sed -i '/Cache-Control.*public/d' "$NGINX_CONFIG" 2>/dev/null || true
    sudo sed -i '/access_log off/d' "$NGINX_CONFIG" 2>/dev/null || true
    
    # Verificar novamente
    UPLOADS_COUNT=$(grep -c "location.*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
    if [ "$UPLOADS_COUNT" -gt 0 ]; then
        echo -e "${RED}❌ Não foi possível remover todas. Edite manualmente.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Nenhuma configuração /uploads restante${NC}"
echo ""

# 4. Adicionar configuração correta
echo -e "${BLUE}4. Adicionando configuração /uploads correta...${NC}"
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

# 5. Verificar duplicatas novamente
echo -e "${BLUE}5. Verificando duplicatas finais...${NC}"
UPLOADS_COUNT=$(grep -c "location.*/uploads" "$NGINX_CONFIG" || echo "0")
if [ "$UPLOADS_COUNT" -ne 1 ]; then
    echo -e "${RED}❌ Número incorreto de configurações /uploads: $UPLOADS_COUNT${NC}"
    grep -n "location.*/uploads" "$NGINX_CONFIG"
    exit 1
else
    echo -e "${GREEN}✅ Apenas uma configuração /uploads encontrada${NC}"
fi
echo ""

# 6. Verificar sintaxe
echo -e "${BLUE}6. Verificando sintaxe...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe está correta${NC}"
    
    # Mostrar configuração final
    echo ""
    echo -e "${BLUE}7. Configuração final /uploads:${NC}"
    grep -A 6 "location.*/uploads" "$NGINX_CONFIG"
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

