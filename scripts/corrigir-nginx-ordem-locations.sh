#!/bin/bash

# Script para corrigir ordem das locations no Nginx
# O location /uploads DEVE vir ANTES do location ~* que captura arquivos estáticos
# Uso: ./scripts/corrigir-nginx-ordem-locations.sh

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
echo -e "${BLUE}  🔧 Correção de Ordem das Locations${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Fazer backup
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"
echo ""

# Verificar ordem atual
echo -e "${BLUE}1. Verificando ordem atual...${NC}"
UPLOADS_LINE=$(grep -n "location /uploads" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
STATIC_LINE=$(grep -n "location ~\*" "$NGINX_CONFIG" | head -1 | cut -d: -f1)

if [ -n "$UPLOADS_LINE" ] && [ -n "$STATIC_LINE" ]; then
    echo -e "   Linha /uploads: $UPLOADS_LINE"
    echo -e "   Linha ~* (estáticos): $STATIC_LINE"
    
    if [ "$UPLOADS_LINE" -lt "$STATIC_LINE" ]; then
        echo -e "${GREEN}   ✅ Ordem correta: /uploads vem antes de ~*${NC}"
        echo -e "${YELLOW}   Mas ainda pode haver problema com o regex...${NC}"
    else
        echo -e "${RED}   ❌ Ordem incorreta: ~* vem antes de /uploads${NC}"
        echo -e "${RED}   Isso faz o regex capturar arquivos .png antes do alias!${NC}"
    fi
fi
echo ""

# Remover todas as configurações /uploads duplicadas
echo -e "${BLUE}2. Removendo configurações /uploads duplicadas...${NC}"
# Contar quantas vezes aparece
COUNT=$(grep -c "location /uploads" "$NGINX_CONFIG" || echo "0")
if [ "$COUNT" -gt 1 ]; then
    echo -e "${YELLOW}   ⚠️  Encontradas $COUNT configurações /uploads${NC}"
    # Remover todas exceto a primeira
    FIRST=true
    sudo sed -i '/location \/uploads/,/^[[:space:]]*}/{
        /location \/uploads/{
            if ('"$FIRST"') {
                '"$FIRST"'=false
                p
            }
            d
        }
        /^[[:space:]]*}/{
            if (!'"$FIRST"') {
                d
            }
        }
    }' "$NGINX_CONFIG" || true
    
    # Método mais simples: remover todas e adicionar uma nova
    sudo sed -i '/location \/uploads/,/^[[:space:]]*}/d' "$NGINX_CONFIG"
    echo -e "${GREEN}   ✅ Configurações duplicadas removidas${NC}"
else
    # Remover a única configuração existente
    sudo sed -i '/location \/uploads/,/^[[:space:]]*}/d' "$NGINX_CONFIG"
    echo -e "${GREEN}   ✅ Configuração antiga removida${NC}"
fi
echo ""

# Adicionar configuração /uploads ANTES do location ~* (arquivos estáticos)
echo -e "${BLUE}3. Adicionando /uploads ANTES do location ~*...${NC}"
UPLOADS_DIR="/var/www/sispat/backend/uploads"

# Encontrar location ~* e inserir ANTES dele
if grep -q "location ~\*" "$NGINX_CONFIG"; then
    # Inserir ANTES do location ~*
    sudo sed -i "/location ~\*/i\\
\\
    # Arquivos estáticos (uploads) - DEVE vir ANTES do location ~*\\
    # para não ser capturado pelo regex de arquivos estáticos\\
    location /uploads {\\
        alias $UPLOADS_DIR/;\\
        expires 1y;\\
        add_header Cache-Control \"public\";\\
        access_log off;\\
    }\\
" "$NGINX_CONFIG"
    echo -e "${GREEN}   ✅ Configuração adicionada ANTES do location ~*${NC}"
else
    # Se não há location ~*, inserir após /api
    if grep -q "location /api" "$NGINX_CONFIG"; then
        sudo sed -i "/location \/api\//,/^[[:space:]]*}/ {
            /^[[:space:]]*}/a\\
\\
    # Arquivos estáticos (uploads)\\
    location /uploads {\\
        alias $UPLOADS_DIR/;\\
        expires 1y;\\
        add_header Cache-Control \"public\";\\
        access_log off;\\
    }
        }" "$NGINX_CONFIG"
        echo -e "${GREEN}   ✅ Configuração adicionada após /api${NC}"
    fi
fi
echo ""

# Verificar sintaxe
echo -e "${BLUE}4. Verificando sintaxe...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe está correta${NC}"
    
    # Mostrar ordem final
    echo ""
    echo -e "${BLUE}5. Ordem final das locations:${NC}"
    grep -n "location" "$NGINX_CONFIG" | grep -E "(uploads|~|api|/ )" | head -10
    
    # Recarregar Nginx
    echo ""
    echo -e "${BLUE}6. Recarregando Nginx...${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx recarregado${NC}"
    
    # Testar acesso
    echo ""
    echo -e "${BLUE}7. Testando acesso...${NC}"
    sleep 2
    TEST_FILE=$(ls -t "$UPLOADS_DIR" | grep -E "\.(jpg|jpeg|png|gif|webp)$" | head -1)
    if [ -n "$TEST_FILE" ]; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://sispat.vps-kinghost.net/uploads/$TEST_FILE" 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}   ✅ Arquivo acessível via HTTP (200)${NC}"
            echo -e "   URL: https://sispat.vps-kinghost.net/uploads/$TEST_FILE"
        else
            echo -e "${YELLOW}   ⚠️  Código HTTP: $HTTP_CODE${NC}"
            echo -e "${YELLOW}   Aguarde alguns segundos e teste novamente${NC}"
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

