#!/bin/bash

# Script definitivo para corrigir Nginx - remove tudo e adiciona apenas uma vez
# Uso: ./scripts/corrigir-nginx-definitivo-final.sh

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

# 1. Mostrar configurações atuais (com busca mais ampla)
echo -e "${BLUE}1. Buscando configurações /uploads (busca ampla)...${NC}"
grep -n -i "uploads" "$NGINX_CONFIG" || echo "   Nenhuma encontrada"
echo ""

# 2. Remover usando método mais agressivo
echo -e "${BLUE}2. Removendo TODAS as configurações /uploads...${NC}"

# Criar arquivo temporário processando linha por linha
TEMP_FILE="/tmp/nginx_clean_$$"
> "$TEMP_FILE"

IN_UPLOADS_BLOCK=0
BRACE_COUNT=0

while IFS= read -r line || [ -n "$line" ]; do
    # Verificar se estamos entrando em um bloco /uploads
    if echo "$line" | grep -qiE "location\s+(\^~)?\s*/uploads"; then
        IN_UPLOADS_BLOCK=1
        BRACE_COUNT=$(echo "$line" | grep -o '{' | wc -l)
        BRACE_COUNT=$((BRACE_COUNT - $(echo "$line" | grep -o '}' | wc -l)))
        # Não adicionar esta linha ao arquivo
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
        # Não adicionar esta linha ao arquivo
        continue
    fi
    
    # Linha normal - adicionar ao arquivo
    echo "$line" >> "$TEMP_FILE"
done < "$NGINX_CONFIG"

# Substituir arquivo original
sudo mv "$TEMP_FILE" "$NGINX_CONFIG"
sudo chmod 644 "$NGINX_CONFIG"

echo -e "${GREEN}✅ Configurações removidas${NC}"
echo ""

# 3. Verificar se foi removido (busca mais ampla)
echo -e "${BLUE}3. Verificando remoção (busca ampla)...${NC}"
UPLOADS_COUNT=$(grep -ci "uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
if [ "$UPLOADS_COUNT" != "0" ]; then
    echo -e "${YELLOW}⚠️  Ainda há menções a 'uploads' no arquivo:${NC}"
    grep -n -i "uploads" "$NGINX_CONFIG"
    echo ""
    echo -e "${BLUE}Verificando se são configurações location...${NC}"
    LOCATION_COUNT=$(grep -cE "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
    if [ "$LOCATION_COUNT" != "0" ]; then
        echo -e "${RED}❌ Ainda há configurações location /uploads!${NC}"
        grep -n -E "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG"
        echo ""
        echo -e "${YELLOW}Tentando remover manualmente linha por linha...${NC}"
        # Remover todas as linhas que contêm location /uploads e seus blocos
        while grep -qE "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG"; do
            LINE=$(grep -n -E "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
            # Remover do início do bloco até encontrar }
            sudo sed -i "${LINE},/^[[:space:]]*}/d" "$NGINX_CONFIG"
        done
        LOCATION_COUNT=$(grep -cE "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
        if [ "$LOCATION_COUNT" != "0" ]; then
            echo -e "${RED}❌ Falha ao remover. Edite manualmente.${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Não são configurações location (pode ser comentário ou outra coisa)${NC}"
    fi
else
    echo -e "${GREEN}✅ Nenhuma menção a 'uploads' encontrada${NC}"
fi
echo ""

# 4. Adicionar APENAS UMA configuração
echo -e "${BLUE}4. Adicionando configuração /uploads correta...${NC}"
UPLOADS_DIR="/var/www/sispat/backend/uploads"

# Verificar se já existe configuração location /uploads
if ! grep -qE "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG"; then
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
        else
            echo -e "${YELLOW}⚠️  Não encontrou location ~* nem /api. Adicionando no final do bloco server...${NC}"
            # Adicionar antes do último }
            sudo sed -i '$ i\
\
    # Arquivos estáticos (uploads)\
    location ^~ /uploads {\
        alias '"$UPLOADS_DIR"'/;\
        expires 1y;\
        add_header Cache-Control "public";\
        access_log off;\
    }' "$NGINX_CONFIG"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Já existe uma configuração /uploads${NC}"
fi
echo ""

# 5. Verificar duplicatas
echo -e "${BLUE}5. Verificando duplicatas finais...${NC}"
LOCATION_COUNT=$(grep -cE "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
if [ "$LOCATION_COUNT" -gt 1 ]; then
    echo -e "${RED}❌ Ainda há duplicatas! ($LOCATION_COUNT encontradas)${NC}"
    grep -n -E "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG"
    echo ""
    echo -e "${YELLOW}Removendo duplicatas (mantendo apenas a primeira)...${NC}"
    # Manter apenas a primeira, remover as outras
    FIRST_LINE=$(grep -n -E "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    # Remover todas exceto a primeira (de trás para frente)
    grep -n -E "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG" | tail -n +2 | cut -d: -f1 | tac | while read line; do
        # Remover bloco começando nesta linha
        sudo sed -i "${line},/^[[:space:]]*}/d" "$NGINX_CONFIG"
    done
    LOCATION_COUNT=$(grep -cE "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
fi

if [ "$LOCATION_COUNT" -eq 1 ]; then
    echo -e "${GREEN}✅ Apenas uma configuração /uploads encontrada${NC}"
elif [ "$LOCATION_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Nenhuma configuração /uploads encontrada - adicionando...${NC}"
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
        echo -e "${GREEN}✅ Configuração adicionada${NC}"
    fi
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
    
    # Mostrar configuração final
    echo ""
    echo -e "${BLUE}7. Configuração final /uploads:${NC}"
    grep -A 6 -E "location\s+(\^~)?\s*/uploads" "$NGINX_CONFIG" || echo "   Nenhuma encontrada"
    echo ""
    
    # Recarregar Nginx
    echo -e "${BLUE}8. Recarregando Nginx...${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx recarregado${NC}"
    
    # Testar acesso
    echo ""
    echo -e "${BLUE}9. Testando acesso...${NC}"
    sleep 3
    TEST_FILE=$(ls -t /var/www/sispat/backend/uploads 2>/dev/null | grep -E "\.(jpg|jpeg|png|gif|webp)$" | head -1)
    if [ -n "$TEST_FILE" ]; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://sispat.vps-kinghost.net/uploads/$TEST_FILE" 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}   ✅ Arquivo acessível via HTTP (200)${NC}"
            echo -e "   URL: https://sispat.vps-kinghost.net/uploads/$TEST_FILE"
        else
            echo -e "${YELLOW}   ⚠️  Código HTTP: $HTTP_CODE${NC}"
            echo -e "${BLUE}   Verifique logs: sudo tail -5 /var/log/nginx/error.log${NC}"
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
echo -e "${GREEN}  ✅ Correção Concluída!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

