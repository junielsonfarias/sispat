#!/bin/bash

# Script para diagnosticar problema com imagem específica
# Uso: ./scripts/diagnostico-imagem-especifica.sh blob-1763333276086-619336306.png

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FILENAME="${1:-blob-1763333276086-619336306.png}"
UPLOADS_DIR="/var/www/sispat/backend/uploads"

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔍 Diagnóstico de Imagem Específica${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "Arquivo: ${YELLOW}$FILENAME${NC}"
echo ""

# 1. Verificar se arquivo existe
echo -e "${BLUE}1. Verificando se arquivo existe...${NC}"
if [ -f "$UPLOADS_DIR/$FILENAME" ]; then
    echo -e "${GREEN}✅ Arquivo existe${NC}"
    ls -lh "$UPLOADS_DIR/$FILENAME"
    
    # Verificar permissões
    PERMS=$(stat -c "%a" "$UPLOADS_DIR/$FILENAME")
    OWNER=$(stat -c "%U:%G" "$UPLOADS_DIR/$FILENAME")
    echo -e "   Permissões: ${PERMS}"
    echo -e "   Proprietário: ${OWNER}"
    
    # Verificar se Nginx consegue acessar
    if [ "$OWNER" != "www-data:www-data" ]; then
        echo -e "${YELLOW}⚠️  Proprietário incorreto - Nginx pode não conseguir acessar${NC}"
    fi
else
    echo -e "${RED}❌ Arquivo NÃO existe${NC}"
    
    # 2. Procurar arquivos similares
    echo ""
    echo -e "${BLUE}2. Procurando arquivos similares...${NC}"
    BASE_NAME=$(echo "$FILENAME" | cut -d'-' -f1-2)
    echo -e "   Procurando por: ${BASE_NAME}*"
    find "$UPLOADS_DIR" -name "${BASE_NAME}*" -type f | head -5
    
    # 3. Verificar arquivos recentes
    echo ""
    echo -e "${BLUE}3. Arquivos mais recentes (últimos 10):${NC}"
    ls -lht "$UPLOADS_DIR" | head -11 | tail -10
    
    # 4. Verificar arquivos com timestamp similar
    echo ""
    echo -e "${BLUE}4. Arquivos com timestamp similar...${NC}"
    TIMESTAMP=$(echo "$FILENAME" | grep -oP '\d{13}' | head -1)
    if [ ! -z "$TIMESTAMP" ]; then
        echo -e "   Timestamp: ${TIMESTAMP}"
        # Procurar arquivos criados na mesma hora (aproximadamente)
        find "$UPLOADS_DIR" -type f -newermt "@$((TIMESTAMP / 1000 - 3600))" ! -newermt "@$((TIMESTAMP / 1000 + 3600))" | head -5
    fi
fi

# 5. Verificar logs do backend
echo ""
echo -e "${BLUE}5. Verificando logs do backend...${NC}"
echo -e "   Procurando por: ${FILENAME}"
pm2 logs sispat-backend --lines 100 --nostream | grep -i "$FILENAME" | tail -5 || echo "   Nenhum log encontrado"

# 6. Verificar código compilado
echo ""
echo -e "${BLUE}6. Verificando código compilado...${NC}"
if grep -q "nameWithoutExt = 'image'" /var/www/sispat/backend/dist/middlewares/uploadMiddleware.js; then
    echo -e "${GREEN}✅ Correção encontrada no código${NC}"
else
    echo -e "${RED}❌ Correção NÃO encontrada${NC}"
fi

# 7. Verificar configuração Nginx
echo ""
echo -e "${BLUE}7. Verificando configuração Nginx...${NC}"
if grep -q "location /uploads" /etc/nginx/sites-available/sispat 2>/dev/null; then
    echo -e "${GREEN}✅ Configuração /uploads encontrada${NC}"
    grep -A 3 "location /uploads" /etc/nginx/sites-available/sispat | head -4
else
    echo -e "${YELLOW}⚠️  Configuração /uploads não encontrada${NC}"
fi

# 8. Testar acesso via HTTP
echo ""
echo -e "${BLUE}8. Testando acesso via HTTP...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://sispat.vps-kinghost.net/uploads/$FILENAME" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Arquivo acessível via HTTP (200)${NC}"
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}❌ Arquivo não encontrado via HTTP (404)${NC}"
else
    echo -e "${YELLOW}⚠️  Código HTTP: ${HTTP_CODE}${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${YELLOW}💡 Diagnóstico:${NC}"
echo ""
if [ ! -f "$UPLOADS_DIR/$FILENAME" ]; then
    echo -e "${RED}❌ PROBLEMA: Arquivo não existe no servidor${NC}"
    echo ""
    echo "Possíveis causas:"
    echo "1. Arquivo foi deletado"
    echo "2. Arquivo nunca foi criado (erro durante upload)"
    echo "3. Arquivo foi salvo em local diferente"
    echo "4. Backend ainda está salvando com nome incorreto"
    echo ""
    echo "Soluções:"
    echo "1. Verificar logs do backend durante upload"
    echo "2. Fazer novo upload e verificar nome do arquivo"
    echo "3. Verificar se backend está usando código corrigido"
else
    if [ "$HTTP_CODE" != "200" ]; then
        echo -e "${YELLOW}⚠️  Arquivo existe mas não é acessível via HTTP${NC}"
        echo ""
        echo "Possíveis causas:"
        echo "1. Permissões incorretas"
        echo "2. Configuração Nginx incorreta"
        echo ""
        echo "Soluções:"
        echo "1. Corrigir permissões: sudo chown www-data:www-data $UPLOADS_DIR/$FILENAME"
        echo "2. Verificar configuração Nginx"
    else
        echo -e "${GREEN}✅ Arquivo existe e é acessível${NC}"
    fi
fi

