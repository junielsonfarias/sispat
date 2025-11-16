#!/bin/bash

# Script de diagnóstico para problemas de upload
# Uso: ./scripts/diagnostico-upload.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

UPLOADS_DIR="/var/www/sispat/backend/uploads"
BACKEND_DIR="/var/www/sispat/backend"

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔍 Diagnóstico de Upload${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# 1. Verificar diretório de uploads
echo -e "${BLUE}1. Verificando diretório de uploads...${NC}"
if [ ! -d "$UPLOADS_DIR" ]; then
    echo -e "${RED}❌ Diretório não existe: $UPLOADS_DIR${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Diretório existe${NC}"
fi

# 2. Verificar permissões
echo -e "${BLUE}2. Verificando permissões...${NC}"
PERMS=$(stat -c "%a" "$UPLOADS_DIR")
OWNER=$(stat -c "%U:%G" "$UPLOADS_DIR")
echo -e "   Permissões: ${PERMS}"
echo -e "   Proprietário: ${OWNER}"

if [ "$PERMS" != "755" ] && [ "$PERMS" != "775" ]; then
    echo -e "${YELLOW}⚠️  Permissões podem estar incorretas (recomendado: 755 ou 775)${NC}"
fi

# 3. Listar arquivos recentes
echo ""
echo -e "${BLUE}3. Arquivos mais recentes (últimos 10):${NC}"
ls -lht "$UPLOADS_DIR" | head -11 | tail -10

# 4. Verificar arquivos sem extensão
echo ""
echo -e "${BLUE}4. Arquivos sem extensão (problema conhecido):${NC}"
FILES_NO_EXT=$(find "$UPLOADS_DIR" -type f ! -name "*.*" | wc -l)
if [ "$FILES_NO_EXT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Encontrados $FILES_NO_EXT arquivo(s) sem extensão:${NC}"
    find "$UPLOADS_DIR" -type f ! -name "*.*" | head -5
else
    echo -e "${GREEN}✅ Nenhum arquivo sem extensão${NC}"
fi

# 5. Verificar arquivos com "blob-" no nome
echo ""
echo -e "${BLUE}5. Arquivos com 'blob-' no nome:${NC}"
BLOB_FILES=$(find "$UPLOADS_DIR" -type f -name "blob-*" | wc -l)
if [ "$BLOB_FILES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Encontrados $BLOB_FILES arquivo(s) com 'blob-' no nome:${NC}"
    find "$UPLOADS_DIR" -type f -name "blob-*" | head -5
else
    echo -e "${GREEN}✅ Nenhum arquivo com 'blob-' no nome${NC}"
fi

# 6. Verificar arquivos com extensão válida
echo ""
echo -e "${BLUE}6. Arquivos com extensão válida (últimos 5):${NC}"
find "$UPLOADS_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.gif" -o -name "*.webp" -o -name "*.pdf" \) | head -5 | while read file; do
    echo -e "   ${GREEN}✅${NC} $(basename "$file")"
done

# 7. Verificar código do backend
echo ""
echo -e "${BLUE}7. Verificando código do backend...${NC}"
if [ -f "$BACKEND_DIR/dist/middlewares/uploadMiddleware.js" ]; then
    echo -e "${GREEN}✅ Código compilado existe${NC}"
    
    # Verificar se contém a correção
    if grep -q "nameWithoutExt = 'image'" "$BACKEND_DIR/dist/middlewares/uploadMiddleware.js"; then
        echo -e "${GREEN}✅ Correção de extensão encontrada no código${NC}"
    else
        echo -e "${RED}❌ Correção de extensão NÃO encontrada - rebuild necessário${NC}"
    fi
else
    echo -e "${RED}❌ Código compilado não encontrado${NC}"
fi

# 8. Verificar PM2
echo ""
echo -e "${BLUE}8. Verificando PM2...${NC}"
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "sispat-backend"; then
        STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="sispat-backend") | .pm2_env.status')
        echo -e "   Status: ${STATUS}"
        
        if [ "$STATUS" != "online" ]; then
            echo -e "${RED}❌ Backend não está online${NC}"
        else
            echo -e "${GREEN}✅ Backend está online${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Processo sispat-backend não encontrado${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PM2 não encontrado${NC}"
fi

# 9. Verificar Nginx
echo ""
echo -e "${BLUE}9. Verificando configuração Nginx...${NC}"
if [ -f "/etc/nginx/sites-available/sispat" ]; then
    if grep -q "location /uploads" "/etc/nginx/sites-available/sispat"; then
        echo -e "${GREEN}✅ Configuração /uploads encontrada${NC}"
        echo ""
        grep -A 3 "location /uploads" "/etc/nginx/sites-available/sispat"
    else
        echo -e "${RED}❌ Configuração /uploads não encontrada${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Arquivo de configuração Nginx não encontrado${NC}"
fi

# 10. Resumo
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  📊 Resumo${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "Total de arquivos: $(find "$UPLOADS_DIR" -type f | wc -l)"
echo -e "Arquivos sem extensão: $FILES_NO_EXT"
echo -e "Arquivos com 'blob-': $BLOB_FILES"
echo ""
echo -e "${YELLOW}💡 Próximos passos:${NC}"
echo "1. Se houver arquivos sem extensão, eles são antigos (antes da correção)"
echo "2. Novos uploads devem ter extensão correta (ex: image-{timestamp}-{random}.jpg)"
echo "3. Teste fazendo um novo upload e verifique se o arquivo tem extensão"
echo "4. Verifique os logs do backend: pm2 logs sispat-backend --lines 50"

