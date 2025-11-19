#!/bin/bash

# Script completo: resolve Git e limpa Nginx
# Uso: ./scripts/corrigir-nginx-completo-final.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd /var/www/sispat

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔧 Correção Completa Final${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# 1. Resolver conflitos Git
echo -e "${BLUE}1. Resolvendo conflitos Git...${NC}"
git stash 2>/dev/null || true
git checkout -- scripts/*.sh 2>/dev/null || true
git pull origin main
echo -e "${GREEN}✅ Git atualizado${NC}"
echo ""

# 2. Dar permissões
echo -e "${BLUE}2. Configurando permissões...${NC}"
chmod +x scripts/*.sh 2>/dev/null || true
echo -e "${GREEN}✅ Permissões configuradas${NC}"
echo ""

# 3. Limpar Nginx manualmente (método direto)
echo -e "${BLUE}3. Limpando configuração do Nginx...${NC}"

NGINX_CONFIG="/etc/nginx/sites-enabled/sispat"
if [ ! -f "$NGINX_CONFIG" ]; then
    NGINX_CONFIG="/etc/nginx/sites-available/sispat"
fi

# Backup
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"
echo ""

# Verificar se há configurações
echo -e "${BLUE}   Verificando configurações existentes...${NC}"
grep -n "location.*uploads" "$NGINX_CONFIG" || echo "   Nenhuma encontrada"
echo ""

# Remover usando Python (mais confiável)
echo -e "${BLUE}   Removendo configurações...${NC}"
sudo python3 << 'PYTHON_SCRIPT'
import re

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

# Verificar se removeu
echo -e "${BLUE}   Verificando remoção...${NC}"
if grep -q "location.*uploads" "$NGINX_CONFIG" 2>/dev/null; then
    echo -e "${YELLOW}   ⚠️  Ainda há configurações, removendo manualmente...${NC}"
    # Remover todas as linhas que contêm location /uploads e seus blocos
    while grep -q "location.*uploads" "$NGINX_CONFIG" 2>/dev/null; do
        LINE=$(grep -n "location.*uploads" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
        # Remover bloco começando nesta linha até encontrar }
        sudo sed -i "${LINE},/^[[:space:]]*}/d" "$NGINX_CONFIG"
    done
fi

if ! grep -q "location.*uploads" "$NGINX_CONFIG" 2>/dev/null; then
    echo -e "${GREEN}   ✅ Nenhuma configuração /uploads encontrada${NC}"
else
    echo -e "${RED}   ❌ Ainda há configurações${NC}"
    exit 1
fi
echo ""

# 4. Adicionar configuração correta
echo -e "${BLUE}4. Adicionando configuração /uploads correta...${NC}"
UPLOADS_DIR="/var/www/sispat/backend/uploads"

# Verificar se já existe
if ! grep -q "location.*uploads" "$NGINX_CONFIG" 2>/dev/null; then
    # Encontrar location ~* e inserir ANTES dele
    if grep -q "location ~\*" "$NGINX_CONFIG"; then
        LINE=$(grep -n "location ~\*" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
        sudo sed -i "${LINE}i\\
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
        echo -e "${RED}❌ Não encontrou location ~*${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Já existe uma configuração /uploads${NC}"
fi
echo ""

# 5. Verificar configuração final
echo -e "${BLUE}5. Verificando configuração final...${NC}"
LOCATION_COUNT=$(grep -c "location.*uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
if [ "$LOCATION_COUNT" -eq 1 ]; then
    echo -e "${GREEN}✅ Apenas uma configuração /uploads encontrada${NC}"
    echo ""
    echo -e "${BLUE}Configuração:${NC}"
    grep -A 6 "location.*uploads" "$NGINX_CONFIG"
else
    echo -e "${RED}❌ Número incorreto: $LOCATION_COUNT${NC}"
    grep -n "location.*uploads" "$NGINX_CONFIG"
    exit 1
fi
echo ""

# 6. Verificar sintaxe e recarregar
echo -e "${BLUE}6. Verificando sintaxe e recarregando Nginx...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe está correta${NC}"
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
echo -e "${GREEN}  ✅ Correção Concluída!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

