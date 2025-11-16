#!/bin/bash

# Script para corrigir permissões dos arquivos de upload
# Uso: ./scripts/corrigir-permissoes-uploads.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

UPLOADS_DIR="/var/www/sispat/backend/uploads"

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔧 Correção de Permissões${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Verificar diretório
if [ ! -d "$UPLOADS_DIR" ]; then
    echo -e "${RED}❌ Diretório não existe: $UPLOADS_DIR${NC}"
    exit 1
fi

# Corrigir permissões do diretório
echo -e "${BLUE}1. Corrigindo permissões do diretório...${NC}"
sudo chown -R www-data:www-data "$UPLOADS_DIR"
sudo chmod -R 755 "$UPLOADS_DIR"
echo -e "${GREEN}✅ Permissões do diretório corrigidas${NC}"

# Corrigir permissões dos arquivos
echo -e "${BLUE}2. Corrigindo permissões dos arquivos...${NC}"
sudo find "$UPLOADS_DIR" -type f -exec chown www-data:www-data {} \;
sudo find "$UPLOADS_DIR" -type f -exec chmod 644 {} \;
echo -e "${GREEN}✅ Permissões dos arquivos corrigidas${NC}"

# Verificar resultado
echo ""
echo -e "${BLUE}3. Verificando resultado...${NC}"
ls -lht "$UPLOADS_DIR" | head -6

echo ""
echo -e "${GREEN}✅ Correção concluída!${NC}"
echo ""
echo -e "${YELLOW}💡 Próximos passos:${NC}"
echo "1. Teste acessar a imagem no navegador"
echo "2. Se ainda der 404, verifique a configuração do Nginx"
echo "3. Verifique os logs: sudo tail -f /var/log/nginx/error.log"

