#!/bin/bash

# Script para testar configuração Nginx de uploads
# Uso: ./scripts/testar-nginx-uploads.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔍 Teste de Configuração Nginx${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# 1. Verificar configuração Nginx
echo -e "${BLUE}1. Verificando configuração Nginx...${NC}"
NGINX_CONFIG="/etc/nginx/sites-enabled/sispat"
if [ -f "$NGINX_CONFIG" ]; then
    echo -e "${GREEN}✅ Arquivo de configuração encontrado: $NGINX_CONFIG${NC}"
    echo ""
    echo -e "${BLUE}Configuração /uploads:${NC}"
    grep -A 10 "location /uploads" "$NGINX_CONFIG" || echo "   Não encontrado"
else
    # Tentar encontrar em outros locais
    NGINX_CONFIG=$(find /etc/nginx -name "*sispat*" -type f 2>/dev/null | head -1)
    if [ -n "$NGINX_CONFIG" ]; then
        echo -e "${GREEN}✅ Arquivo de configuração encontrado: $NGINX_CONFIG${NC}"
        echo ""
        echo -e "${BLUE}Configuração /uploads:${NC}"
        grep -A 10 "location /uploads" "$NGINX_CONFIG" || echo "   Não encontrado"
    else
        echo -e "${RED}❌ Arquivo de configuração não encontrado!${NC}"
        echo "   Procurando em:"
        ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "   Diretório não encontrado"
    fi
fi

# 2. Verificar se Nginx está rodando
echo ""
echo -e "${BLUE}2. Verificando status do Nginx...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx está rodando${NC}"
else
    echo -e "${RED}❌ Nginx não está rodando!${NC}"
    echo "   Execute: sudo systemctl start nginx"
fi

# 3. Testar sintaxe do Nginx
echo ""
echo -e "${BLUE}3. Testando sintaxe do Nginx...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Sintaxe do Nginx está correta${NC}"
else
    echo -e "${RED}❌ Erro na sintaxe do Nginx!${NC}"
    sudo nginx -t
fi

# 4. Verificar diretório de uploads
echo ""
echo -e "${BLUE}4. Verificando diretório de uploads...${NC}"
UPLOADS_DIR="/var/www/sispat/backend/uploads"
if [ -d "$UPLOADS_DIR" ]; then
    echo -e "${GREEN}✅ Diretório existe: $UPLOADS_DIR${NC}"
    echo -e "   Permissões: $(stat -c "%a %U:%G" "$UPLOADS_DIR")"
    
    # Verificar se o caminho no alias está correto
    ALIAS_PATH=$(grep -A 5 "location /uploads" "$NGINX_CONFIG" 2>/dev/null | grep "alias" | awk '{print $2}' | tr -d ';' || echo "")
    if [ -n "$ALIAS_PATH" ]; then
        echo -e "   Alias no Nginx: $ALIAS_PATH"
        if [ "$ALIAS_PATH" = "$UPLOADS_DIR" ]; then
            echo -e "${GREEN}   ✅ Caminho do alias está correto${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Caminho do alias pode estar incorreto${NC}"
            echo -e "      Esperado: $UPLOADS_DIR"
            echo -e "      Configurado: $ALIAS_PATH"
        fi
    fi
else
    echo -e "${RED}❌ Diretório não existe!${NC}"
fi

# 5. Testar acesso a um arquivo específico
echo ""
echo -e "${BLUE}5. Testando acesso HTTP...${NC}"
TEST_FILE=$(ls -t "$UPLOADS_DIR" | grep -E "\.(jpg|jpeg|png|gif|webp)$" | head -1)
if [ -n "$TEST_FILE" ]; then
    echo -e "   Arquivo de teste: $TEST_FILE"
    
    # Testar localmente
    if [ -f "$UPLOADS_DIR/$TEST_FILE" ]; then
        echo -e "   ${GREEN}✅ Arquivo existe no servidor${NC}"
        
        # Testar acesso via HTTP
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://sispat.vps-kinghost.net/uploads/$TEST_FILE" 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "   ${GREEN}✅ Arquivo acessível via HTTP (200)${NC}"
        else
            echo -e "   ${RED}❌ Arquivo NÃO acessível via HTTP (código: $HTTP_CODE)${NC}"
            echo ""
            echo -e "${YELLOW}   Testando com curl detalhado:${NC}"
            curl -v "https://sispat.vps-kinghost.net/uploads/$TEST_FILE" 2>&1 | head -20
        fi
    fi
else
    echo -e "${YELLOW}   ⚠️  Nenhum arquivo de imagem encontrado para teste${NC}"
fi

# 6. Verificar logs do Nginx
echo ""
echo -e "${BLUE}6. Verificando logs do Nginx...${NC}"
if [ -f "/var/log/nginx/error.log" ]; then
    echo -e "${BLUE}Últimas linhas do error.log:${NC}"
    sudo tail -10 /var/log/nginx/error.log | grep -i "upload\|404\|permission" || echo "   Nenhum erro relevante encontrado"
fi

# 7. Verificar se há problema com trailing slash
echo ""
echo -e "${BLUE}7. Verificando configuração do alias...${NC}"
if grep -q "location /uploads" "$NGINX_CONFIG" 2>/dev/null; then
    ALIAS_LINE=$(grep -A 2 "location /uploads" "$NGINX_CONFIG" | grep "alias")
    echo -e "   Linha do alias: $ALIAS_LINE"
    
    # Verificar se termina com /
    if echo "$ALIAS_LINE" | grep -q "alias.*/$"; then
        echo -e "${GREEN}   ✅ Alias termina com / (correto)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Alias pode precisar terminar com /${NC}"
    fi
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  💡 Recomendações${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo "Se o arquivo retorna 404:"
echo "  1. Verifique se o alias no Nginx termina com /"
echo "  2. Verifique se o caminho do alias está correto"
echo "  3. Recarregue o Nginx: sudo systemctl reload nginx"
echo "  4. Verifique logs: sudo tail -f /var/log/nginx/error.log"

