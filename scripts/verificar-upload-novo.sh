#!/bin/bash

# Script para verificar se novos uploads estão funcionando corretamente
# Uso: ./scripts/verificar-upload-novo.sh

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
echo -e "${BLUE}  🔍 Verificação de Upload${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# 1. Verificar arquivos mais recentes
echo -e "${BLUE}1. Arquivos mais recentes (últimos 5):${NC}"
ls -lht "$UPLOADS_DIR" | head -6

# 2. Verificar se há arquivos com "image-" no nome (correto)
echo ""
echo -e "${BLUE}2. Arquivos com nome correto (image-...):${NC}"
IMAGE_FILES=$(find "$UPLOADS_DIR" -type f -name "image-*" | wc -l)
if [ "$IMAGE_FILES" -gt 0 ]; then
    echo -e "${GREEN}✅ Encontrados $IMAGE_FILES arquivo(s) com nome correto${NC}"
    find "$UPLOADS_DIR" -type f -name "image-*" | head -3
else
    echo -e "${YELLOW}⚠️  Nenhum arquivo com nome 'image-' encontrado${NC}"
fi

# 3. Verificar arquivos blob recentes
echo ""
echo -e "${BLUE}3. Arquivos blob recentes (últimas 2 horas):${NC}"
find "$UPLOADS_DIR" -type f -name "blob-*" -mmin -120 | head -5 | while read file; do
    echo -e "   ${YELLOW}⚠️${NC} $(basename "$file") - $(stat -c "%y" "$file" | cut -d' ' -f1,2 | cut -d'.' -f1)"
done

# 4. Verificar código compilado
echo ""
echo -e "${BLUE}4. Verificando código compilado...${NC}"
if grep -q "nameWithoutExt = 'image'" "$BACKEND_DIR/dist/middlewares/uploadMiddleware.js"; then
    echo -e "${GREEN}✅ Correção encontrada no código compilado${NC}"
else
    echo -e "${RED}❌ Correção NÃO encontrada - rebuild necessário${NC}"
fi

# 5. Verificar logs do backend (últimos uploads)
echo ""
echo -e "${BLUE}5. Últimos uploads nos logs (últimas 20 linhas):${NC}"
pm2 logs sispat-backend --lines 20 --nostream | grep -i "arquivo salvo\|upload\|file" | tail -5 || echo "Nenhum log de upload encontrado"

# 6. Verificar permissões
echo ""
echo -e "${BLUE}6. Verificando permissões...${NC}"
WRONG_PERMS=$(find "$UPLOADS_DIR" -type f ! -user www-data | wc -l)
if [ "$WRONG_PERMS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $WRONG_PERMS arquivo(s) com proprietário incorreto${NC}"
    find "$UPLOADS_DIR" -type f ! -user www-data | head -3
else
    echo -e "${GREEN}✅ Todas as permissões estão corretas${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${YELLOW}💡 Diagnóstico:${NC}"
echo ""
if [ "$IMAGE_FILES" -eq 0 ]; then
    echo -e "${RED}❌ PROBLEMA: Nenhum arquivo com nome correto encontrado${NC}"
    echo "   - O backend pode não estar usando o código corrigido"
    echo "   - Execute: cd /var/www/sispat/backend && npm run build && pm2 restart sispat-backend"
else
    echo -e "${GREEN}✅ Arquivos com nome correto estão sendo criados${NC}"
fi


