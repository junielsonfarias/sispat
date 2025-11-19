#!/bin/bash

# Script para limpar COMPLETAMENTE todas as configurações /uploads e adicionar apenas uma
# Uso: ./scripts/limpar-nginx-completo.sh

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
echo -e "${BLUE}  🧹 Limpeza Completa do Nginx${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Fazer backup
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"
echo ""

# 1. Mostrar configurações atuais
echo -e "${BLUE}1. Configurações /uploads encontradas:${NC}"
grep -n -i "uploads" "$NGINX_CONFIG" | head -20 || echo "   Nenhuma encontrada"
echo ""

# 2. Remover TODAS as linhas que contêm "uploads" (incluindo comentários)
echo -e "${BLUE}2. Removendo TODAS as linhas relacionadas a /uploads...${NC}"

# Criar arquivo temporário sem nenhuma menção a uploads
TEMP_FILE="/tmp/nginx_clean_$$"
> "$TEMP_FILE"

IN_UPLOADS_BLOCK=0
BRACE_COUNT=0

while IFS= read -r line || [ -n "$line" ]; do
    # Verificar se a linha contém "location" e "/uploads" (case insensitive)
    if echo "$line" | grep -qiE "location\s+.*\/uploads"; then
        IN_UPLOADS_BLOCK=1
        BRACE_COUNT=$(echo "$line" | grep -o '{' | wc -l)
        BRACE_COUNT=$((BRACE_COUNT - $(echo "$line" | grep -o '}' | wc -l)))
        # Não adicionar esta linha
        continue
    fi
    
    # Se estamos dentro de um bloco /uploads
    if [ "$IN_UPLOADS_BLOCK" -eq 1 ]; then
        # Contar chaves
        OPEN=$(echo "$line" | grep -o '{' | wc -l)
        CLOSE=$(echo "$line" | grep -o '}' | wc -l)
        BRACE_COUNT=$((BRACE_COUNT + OPEN - CLOSE))
        
        # Se fechou todas as chaves, sair do bloco
        if [ "$BRACE_COUNT" -le 0 ]; then
            IN_UPLOADS_BLOCK=0
            BRACE_COUNT=0
        fi
        # Não adicionar esta linha
        continue
    fi
    
    # Remover linhas que são apenas comentários sobre uploads
    if echo "$line" | grep -qiE "^[[:space:]]*#.*uploads"; then
        # Não adicionar esta linha
        continue
    fi
    
    # Linha normal - adicionar ao arquivo
    echo "$line" >> "$TEMP_FILE"
done < "$NGINX_CONFIG"

# Substituir arquivo original
sudo mv "$TEMP_FILE" "$NGINX_CONFIG"
sudo chmod 644 "$NGINX_CONFIG"

echo -e "${GREEN}✅ Todas as configurações /uploads removidas${NC}"
echo ""

# 3. Verificar se foi removido (apenas configurações location, não comentários)
echo -e "${BLUE}3. Verificando remoção...${NC}"
LOCATION_COUNT=$(grep -cE "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
UPLOADS_COMMENTS=$(grep -cE "^[[:space:]]*#.*uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")

if [ "$LOCATION_COUNT" != "0" ]; then
    echo -e "${YELLOW}⚠️  Ainda há configurações location /uploads:${NC}"
    grep -n -E "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG"
    echo ""
    echo -e "${YELLOW}Removendo manualmente...${NC}"
    # Remover todas as configurações location /uploads
    while grep -qE "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG"; do
        LINE=$(grep -n -E "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
        # Remover bloco começando nesta linha até encontrar }
        sudo sed -i "${LINE},/^[[:space:]]*}/d" "$NGINX_CONFIG"
    done
    LOCATION_COUNT=$(grep -cE "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
fi

if [ "$LOCATION_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ Nenhuma configuração location /uploads encontrada${NC}"
    if [ "$UPLOADS_COMMENTS" -gt 0 ]; then
        echo -e "${BLUE}   ℹ️  Encontrados $UPLOADS_COMMENTS comentários sobre uploads (serão removidos)${NC}"
        # Remover comentários sobre uploads
        sudo sed -i '/^[[:space:]]*#.*uploads/d' "$NGINX_CONFIG"
    fi
else
    echo -e "${RED}❌ Ainda há configurações location /uploads${NC}"
    exit 1
fi
echo ""

# 4. Adicionar APENAS UMA configuração limpa
echo -e "${BLUE}4. Adicionando configuração /uploads correta...${NC}"
UPLOADS_DIR="/var/www/sispat/backend/uploads"

# Encontrar location ~* e inserir ANTES dele
if grep -q "location ~\*" "$NGINX_CONFIG"; then
    # Inserir ANTES do location ~*
    sudo sed -i "/location ~\*/i\\
\\
    # Arquivos estáticos (uploads)\\
    location ^~ /uploads {\\
        alias $UPLOADS_DIR/;\\
        expires 1y;\\
        add_header Cache-Control \"public\";\\
        access_log off;\\
    }\\
" "$NGINX_CONFIG"
    echo -e "${GREEN}✅ Configuração adicionada ANTES do location ~*${NC}"
else
    echo -e "${RED}❌ Não encontrou location ~* para inserir antes${NC}"
    exit 1
fi
echo ""

# 5. Verificar duplicatas
echo -e "${BLUE}5. Verificando configuração final...${NC}"
LOCATION_COUNT=$(grep -cE "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
if [ "$LOCATION_COUNT" -eq 1 ]; then
    echo -e "${GREEN}✅ Apenas uma configuração /uploads encontrada${NC}"
    echo ""
    echo -e "${BLUE}Configuração adicionada:${NC}"
    grep -A 6 -E "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG"
else
    echo -e "${RED}❌ Número incorreto: $LOCATION_COUNT${NC}"
    grep -n -E "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG"
    exit 1
fi
echo ""

# 6. Verificar sintaxe
echo -e "${BLUE}6. Verificando sintaxe...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe está correta${NC}"
    
    # Recarregar Nginx
    echo ""
    echo -e "${BLUE}7. Recarregando Nginx...${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx recarregado${NC}"
    
    # Testar acesso
    echo ""
    echo -e "${BLUE}8. Testando acesso...${NC}"
    sleep 2
    TEST_FILE=$(ls -t /var/www/sispat/backend/uploads 2>/dev/null | grep -E "\.(jpg|jpeg|png|gif|webp)$" | head -1)
    if [ -n "$TEST_FILE" ]; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://sispat.vps-kinghost.net/uploads/$TEST_FILE" 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}   ✅ Arquivo acessível via HTTP (200)${NC}"
            echo -e "   URL: https://sispat.vps-kinghost.net/uploads/$TEST_FILE"
        else
            echo -e "${YELLOW}   ⚠️  Código HTTP: $HTTP_CODE${NC}"
            echo -e "${BLUE}   Verifique logs: sudo tail -10 /var/log/nginx/error.log${NC}"
        fi
    else
        echo -e "${YELLOW}   ⚠️  Nenhum arquivo de imagem encontrado para testar${NC}"
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
echo -e "${GREEN}  ✅ Limpeza Concluída!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

