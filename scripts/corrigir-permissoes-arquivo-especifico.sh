#!/bin/bash

# Script para corrigir permissões de arquivo específico
# Uso: ./scripts/corrigir-permissoes-arquivo-especifico.sh blob-1763333276086-619336306.png

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FILENAME="${1}"
UPLOADS_DIR="/var/www/sispat/backend/uploads"

if [ -z "$FILENAME" ]; then
    echo -e "${RED}❌ Erro: Nome do arquivo não fornecido${NC}"
    echo "Uso: $0 <nome-do-arquivo>"
    exit 1
fi

FILE_PATH="$UPLOADS_DIR/$FILENAME"

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔧 Correção de Permissões${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "Arquivo: ${YELLOW}$FILENAME${NC}"
echo ""

# Verificar se arquivo existe
if [ ! -f "$FILE_PATH" ]; then
    echo -e "${RED}❌ Arquivo não existe: $FILE_PATH${NC}"
    exit 1
fi

# Verificar permissões atuais
CURRENT_OWNER=$(stat -c "%U:%G" "$FILE_PATH")
CURRENT_PERMS=$(stat -c "%a" "$FILE_PATH")

echo -e "${BLUE}Permissões atuais:${NC}"
echo -e "   Proprietário: ${CURRENT_OWNER}"
echo -e "   Permissões: ${CURRENT_PERMS}"
echo ""

# Corrigir permissões
echo -e "${BLUE}Corrigindo permissões...${NC}"
sudo chown www-data:www-data "$FILE_PATH"
sudo chmod 644 "$FILE_PATH"

# Verificar resultado
NEW_OWNER=$(stat -c "%U:%G" "$FILE_PATH")
NEW_PERMS=$(stat -c "%a" "$FILE_PATH")

echo ""
echo -e "${GREEN}✅ Permissões corrigidas!${NC}"
echo -e "   Proprietário: ${NEW_OWNER} (era: ${CURRENT_OWNER})"
echo -e "   Permissões: ${NEW_PERMS} (era: ${CURRENT_PERMS})"

# Testar acesso
echo ""
echo -e "${BLUE}Testando acesso via HTTP...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://sispat.vps-kinghost.net/uploads/$FILENAME" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Arquivo agora é acessível via HTTP (200)${NC}"
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${YELLOW}⚠️  Ainda retorna 404 - pode ser cache do Nginx${NC}"
    echo "   Execute: sudo systemctl reload nginx"
else
    echo -e "${YELLOW}⚠️  Código HTTP: ${HTTP_CODE}${NC}"
fi

echo ""
echo -e "${GREEN}✅ Correção concluída!${NC}"

