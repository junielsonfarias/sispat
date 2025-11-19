#!/bin/bash

# Script simples para corrigir Nginx - remove tudo e adiciona apenas uma vez
# Uso: ./scripts/corrigir-nginx-simples.sh

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
echo -e "${BLUE}  🔧 Correção Simples do Nginx${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Fazer backup
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"
echo ""

# 1. Mostrar configurações atuais
echo -e "${BLUE}1. Configurações /uploads encontradas:${NC}"
grep -n "location.*/uploads" "$NGINX_CONFIG" || echo "   Nenhuma encontrada"
echo ""

# 2. Remover TODAS usando método mais simples
echo -e "${BLUE}2. Removendo TODAS as configurações /uploads...${NC}"

# Criar arquivo temporário sem nenhuma configuração /uploads
python3 << 'PYTHON_SCRIPT'
import re

config_file = "/etc/nginx/sites-enabled/sispat"
with open(config_file, 'r') as f:
    content = f.read()

# Remover TODAS as configurações location /uploads (com ou sem ^~)
# Padrão: location [^~]* /uploads { ... até fechar }
# Usar regex mais robusto
pattern = r'location\s+\^~\s+/uploads\s*\{[^}]*\}[^\n]*\n?'
while re.search(pattern, content):
    content = re.sub(pattern, '', content, count=1, flags=re.MULTILINE | re.DOTALL)

pattern = r'location\s+/uploads\s*\{[^}]*\}[^\n]*\n?'
while re.search(pattern, content):
    content = re.sub(pattern, '', content, count=1, flags=re.MULTILINE | re.DOTALL)

# Remover blocos multi-linha (mais complexo)
# Procurar por location /uploads e remover até encontrar }
lines = content.split('\n')
output_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    if re.search(r'location\s+(\^~)?\s*/uploads', line):
        # Encontrar início do bloco
        brace_count = line.count('{') - line.count('}')
        i += 1
        # Continuar até fechar todas as chaves
        while i < len(lines) and brace_count > 0:
            brace_count += lines[i].count('{') - lines[i].count('}')
            i += 1
        continue
    output_lines.append(line)
    i += 1

content = '\n'.join(output_lines)

# Limpar linhas vazias múltiplas
content = re.sub(r'\n{3,}', '\n\n', content)

with open(config_file, 'w') as f:
    f.write(content)

print("✅ Todas as configurações /uploads removidas")
PYTHON_SCRIPT

echo ""

# 3. Verificar se foi removido
echo -e "${BLUE}3. Verificando remoção...${NC}"
UPLOADS_COUNT=$(grep -c "location.*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
if [ "$UPLOADS_COUNT" != "0" ]; then
    echo -e "${RED}❌ Ainda há configurações /uploads!${NC}"
    grep -n "location.*/uploads" "$NGINX_CONFIG"
    echo ""
    echo -e "${YELLOW}Removendo manualmente...${NC}"
    # Remover todas as linhas que contêm location /uploads
    sudo sed -i '/location.*\/uploads/d' "$NGINX_CONFIG"
    # Verificar novamente
    UPLOADS_COUNT=$(grep -c "location.*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
    if [ "$UPLOADS_COUNT" != "0" ]; then
        echo -e "${RED}❌ Falha ao remover. Edite manualmente.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Nenhuma configuração /uploads restante${NC}"
echo ""

# 4. Adicionar APENAS UMA configuração
echo -e "${BLUE}4. Adicionando configuração /uploads correta...${NC}"
UPLOADS_DIR="/var/www/sispat/backend/uploads"

# Verificar se já existe antes de adicionar
if ! grep -q "location.*/uploads" "$NGINX_CONFIG"; then
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
else
    echo -e "${YELLOW}⚠️  Já existe uma configuração /uploads${NC}"
fi
echo ""

# 5. Verificar duplicatas
echo -e "${BLUE}5. Verificando duplicatas finais...${NC}"
UPLOADS_COUNT=$(grep -c "location.*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
if [ "$UPLOADS_COUNT" -gt 1 ]; then
    echo -e "${RED}❌ Ainda há duplicatas!${NC}"
    grep -n "location.*/uploads" "$NGINX_CONFIG"
    echo ""
    echo -e "${YELLOW}Removendo duplicatas manualmente...${NC}"
    # Manter apenas a primeira ocorrência
    FIRST_LINE=$(grep -n "location.*/uploads" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    # Remover todas exceto a primeira
    grep -n "location.*/uploads" "$NGINX_CONFIG" | tail -n +2 | cut -d: -f1 | tac | while read line; do
        # Remover bloco começando nesta linha
        sudo sed -i "${line},/^[[:space:]]*}/d" "$NGINX_CONFIG"
    done
    UPLOADS_COUNT=$(grep -c "location.*/uploads" "$NGINX_CONFIG" 2>/dev/null || echo "0")
    if [ "$UPLOADS_COUNT" -gt 1 ]; then
        echo -e "${RED}❌ Não foi possível remover duplicatas automaticamente${NC}"
        echo -e "${YELLOW}Edite manualmente o arquivo: $NGINX_CONFIG${NC}"
        exit 1
    fi
fi

if [ "$UPLOADS_COUNT" -eq 1 ]; then
    echo -e "${GREEN}✅ Apenas uma configuração /uploads encontrada${NC}"
else
    echo -e "${YELLOW}⚠️  Número de configurações: $UPLOADS_COUNT${NC}"
fi
echo ""

# 6. Verificar sintaxe
echo -e "${BLUE}6. Verificando sintaxe...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe está correta${NC}"
    
    # Mostrar configuração final
    echo ""
    echo -e "${BLUE}7. Configuração final /uploads:${NC}"
    grep -A 6 "location.*/uploads" "$NGINX_CONFIG" || echo "   Nenhuma encontrada"
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

