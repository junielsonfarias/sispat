#!/bin/bash

# Script para limpar FORÇADAMENTE todas as configurações /uploads
# Uso: ./scripts/limpar-nginx-forcado.sh

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
echo -e "${BLUE}  🧹 Limpeza FORÇADA do Nginx${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Fazer backup
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"
echo ""

# 1. Mostrar TODAS as configurações relacionadas
echo -e "${BLUE}1. Buscando TODAS as configurações /uploads...${NC}"
grep -n -E "location\s+.*\/uploads|location\s+\^~\s*\/uploads" "$NGINX_CONFIG" || echo "   Nenhuma encontrada com regex"
echo ""

# 2. Usar Python para remover de forma mais precisa
echo -e "${BLUE}2. Removendo configurações usando Python...${NC}"

python3 << 'PYTHON_SCRIPT'
import re
import sys

config_file = "/etc/nginx/sites-enabled/sispat"
try:
    with open(config_file, 'r') as f:
        lines = f.readlines()
except:
    config_file = "/etc/nginx/sites-available/sispat"
    with open(config_file, 'r') as f:
        lines = f.readlines()

output_lines = []
i = 0
skip_until_brace = 0
brace_count = 0

while i < len(lines):
    line = lines[i]
    
    # Verificar se é início de bloco location /uploads
    if re.search(r'location\s+(\^~)?\s*/uploads', line):
        skip_until_brace = 1
        brace_count = line.count('{') - line.count('}')
        i += 1
        continue
    
    # Se estamos dentro de um bloco a ser removido
    if skip_until_brace:
        brace_count += line.count('{') - line.count('}')
        if brace_count <= 0:
            skip_until_brace = 0
            brace_count = 0
        i += 1
        continue
    
    # Remover comentários sobre uploads
    if re.search(r'^\s*#.*uploads', line, re.IGNORECASE):
        i += 1
        continue
    
    # Linha normal - manter
    output_lines.append(line)
    i += 1

# Escrever arquivo limpo
with open(config_file, 'w') as f:
    f.writelines(output_lines)

print("✅ Configurações removidas")
PYTHON_SCRIPT

echo ""

# 3. Verificar novamente
echo -e "${BLUE}3. Verificando remoção...${NC}"
LOCATION_COUNT=$(grep -cE "location\s+.*\/uploads|location\s+\^~\s*\/uploads" "$NGINX_CONFIG" 2>/dev/null | head -1 || echo "0")
LOCATION_COUNT=${LOCATION_COUNT//[^0-9]/}  # Remover caracteres não numéricos
LOCATION_COUNT=${LOCATION_COUNT:-0}  # Default para 0 se vazio

if [ "$LOCATION_COUNT" -gt 0 ] 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Ainda há $LOCATION_COUNT configuração(ões):${NC}"
    grep -n -E "location\s+.*\/uploads|location\s+\^~\s*\/uploads" "$NGINX_CONFIG"
    echo ""
    echo -e "${YELLOW}Removendo manualmente linha por linha...${NC}"
    
    # Remover todas as configurações location /uploads usando sed
    while grep -qE "location\s+.*\/uploads|location\s+\^~\s*\/uploads" "$NGINX_CONFIG"; do
        LINE_NUM=$(grep -n -E "location\s+.*\/uploads|location\s+\^~\s*\/uploads" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
        
        # Encontrar onde termina o bloco (próxima linha com apenas })
        END_LINE=$LINE_NUM
        BRACE_COUNT=0
        while IFS= read -r line; do
            if [ $END_LINE -ge $LINE_NUM ]; then
                OPEN=$(echo "$line" | grep -o '{' | wc -l)
                CLOSE=$(echo "$line" | grep -o '}' | wc -l)
                BRACE_COUNT=$((BRACE_COUNT + OPEN - CLOSE))
                if [ $BRACE_COUNT -le 0 ] && [ $END_LINE -gt $LINE_NUM ]; then
                    break
                fi
            fi
            END_LINE=$((END_LINE + 1))
        done < "$NGINX_CONFIG"
        
        # Remover do início até o fim do bloco
        sudo sed -i "${LINE_NUM},${END_LINE}d" "$NGINX_CONFIG"
    done
    
    LOCATION_COUNT=$(grep -cE "location\s+.*\/uploads|location\s+\^~\s*\/uploads" "$NGINX_CONFIG" 2>/dev/null | head -1 || echo "0")
    LOCATION_COUNT=${LOCATION_COUNT//[^0-9]/}
    LOCATION_COUNT=${LOCATION_COUNT:-0}
fi

if [ "$LOCATION_COUNT" -eq 0 ] 2>/dev/null; then
    echo -e "${GREEN}✅ Nenhuma configuração location /uploads encontrada${NC}"
else
    echo -e "${RED}❌ Ainda há $LOCATION_COUNT configuração(ões)${NC}"
    echo -e "${YELLOW}Edite manualmente o arquivo: $NGINX_CONFIG${NC}"
    exit 1
fi
echo ""

# 4. Remover comentários sobre uploads
echo -e "${BLUE}4. Removendo comentários sobre uploads...${NC}"
sudo sed -i '/^[[:space:]]*#.*uploads/d' "$NGINX_CONFIG" 2>/dev/null || true
echo -e "${GREEN}✅ Comentários removidos${NC}"
echo ""

# 5. Adicionar APENAS UMA configuração limpa
echo -e "${BLUE}5. Adicionando configuração /uploads correta...${NC}"
UPLOADS_DIR="/var/www/sispat/backend/uploads"

# Verificar se já existe
if ! grep -qE "location\s+.*\/uploads|location\s+\^~\s*\/uploads" "$NGINX_CONFIG"; then
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
else
    echo -e "${YELLOW}⚠️  Já existe uma configuração /uploads${NC}"
fi
echo ""

# 6. Verificar duplicatas
echo -e "${BLUE}6. Verificando configuração final...${NC}"
LOCATION_COUNT=$(grep -cE "location\s+.*\/uploads|location\s+\^~\s*\/uploads" "$NGINX_CONFIG" 2>/dev/null | head -1 || echo "0")
LOCATION_COUNT=${LOCATION_COUNT//[^0-9]/}
LOCATION_COUNT=${LOCATION_COUNT:-0}
if [ "$LOCATION_COUNT" -eq 1 ] 2>/dev/null; then
    echo -e "${GREEN}✅ Apenas uma configuração /uploads encontrada${NC}"
    echo ""
    echo -e "${BLUE}Configuração adicionada:${NC}"
    grep -A 6 -E "location\s+.*\/uploads|location\s+\^~\s*\/uploads" "$NGINX_CONFIG"
else
    echo -e "${RED}❌ Número incorreto: $LOCATION_COUNT${NC}"
    grep -n -E "location\s+.*\/uploads|location\s+\^~\s*\/uploads" "$NGINX_CONFIG"
    exit 1
fi
echo ""

# 7. Verificar sintaxe
echo -e "${BLUE}7. Verificando sintaxe...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe está correta${NC}"
    
    # Recarregar Nginx
    echo ""
    echo -e "${BLUE}8. Recarregando Nginx...${NC}"
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

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Limpeza Concluída!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

