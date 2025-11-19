#!/bin/bash

# Script para testar acesso a uploads manualmente
# Uso: ./scripts/testar-upload-manual.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🧪 Teste Manual de Uploads${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

UPLOADS_DIR="/var/www/sispat/backend/uploads"

# 1. Listar arquivos recentes
echo -e "${BLUE}1. Arquivos recentes em $UPLOADS_DIR:${NC}"
ls -lht "$UPLOADS_DIR" | head -5
echo ""

# 2. Pegar um arquivo de teste
TEST_FILE=$(ls -t "$UPLOADS_DIR" | grep -E "\.(jpg|jpeg|png|gif|webp)$" | head -1)
if [ -z "$TEST_FILE" ]; then
    echo -e "${RED}❌ Nenhum arquivo de imagem encontrado!${NC}"
    exit 1
fi

echo -e "${BLUE}2. Arquivo de teste: $TEST_FILE${NC}"
echo ""

# 3. Verificar se arquivo existe
if [ -f "$UPLOADS_DIR/$TEST_FILE" ]; then
    echo -e "${GREEN}✅ Arquivo existe no servidor${NC}"
    echo -e "   Caminho completo: $UPLOADS_DIR/$TEST_FILE"
    echo -e "   Tamanho: $(du -h "$UPLOADS_DIR/$TEST_FILE" | cut -f1)"
    echo -e "   Permissões: $(stat -c "%a %U:%G" "$UPLOADS_DIR/$TEST_FILE")"
else
    echo -e "${RED}❌ Arquivo NÃO existe!${NC}"
    exit 1
fi
echo ""

# 4. Testar acesso HTTP
echo -e "${BLUE}3. Testando acesso HTTP...${NC}"
URL="https://sispat.vps-kinghost.net/uploads/$TEST_FILE"
echo -e "   URL: $URL"
echo ""

# Testar com curl detalhado
echo -e "${BLUE}4. Resposta HTTP detalhada:${NC}"
curl -v -I "$URL" 2>&1 | head -20
echo ""

# 5. Verificar logs do Nginx
echo -e "${BLUE}5. Últimas linhas do error.log:${NC}"
sudo tail -3 /var/log/nginx/error.log | grep -i "upload\|$TEST_FILE" || echo "   Nenhum erro recente"
echo ""

# 6. Verificar configuração atual
echo -e "${BLUE}6. Configuração /uploads atual:${NC}"
sudo grep -A 6 "location /uploads" /etc/nginx/sites-enabled/sispat
echo ""

# 7. Verificar se há cache
echo -e "${BLUE}7. Limpando cache do Nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✅ Nginx recarregado${NC}"
echo ""

# 8. Testar novamente após reload
echo -e "${BLUE}8. Testando novamente após reload...${NC}"
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Arquivo acessível via HTTP (200)${NC}"
else
    echo -e "${RED}❌ Código HTTP: $HTTP_CODE${NC}"
    echo ""
    echo -e "${YELLOW}Verificando logs em tempo real...${NC}"
    echo -e "${BLUE}Execute em outro terminal: sudo tail -f /var/log/nginx/error.log${NC}"
    echo -e "${BLUE}E então acesse: $URL${NC}"
fi

