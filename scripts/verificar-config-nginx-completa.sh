#!/bin/bash

# Script para verificar configuração completa do Nginx
# Uso: ./scripts/verificar-config-nginx-completa.sh

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
echo -e "${BLUE}  🔍 Configuração Completa do Nginx${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Mostrar configuração completa do server block
echo -e "${BLUE}1. Configuração completa do server block:${NC}"
echo ""
sudo grep -A 100 "server {" "$NGINX_CONFIG" | head -80
echo ""

# Verificar todas as ocorrências de root
echo -e "${BLUE}2. Todas as ocorrências de 'root':${NC}"
sudo grep -n "root" "$NGINX_CONFIG"
echo ""

# Verificar configuração /uploads
echo -e "${BLUE}3. Configuração /uploads:${NC}"
sudo grep -A 6 "location /uploads" "$NGINX_CONFIG"
echo ""

# Verificar se há try_files que pode estar interferindo
echo -e "${BLUE}4. Ocorrências de 'try_files':${NC}"
sudo grep -n "try_files" "$NGINX_CONFIG" || echo "   Nenhuma encontrada"
echo ""

# Verificar logs mais recentes
echo -e "${BLUE}5. Logs mais recentes:${NC}"
sudo tail -5 /var/log/nginx/error.log | grep "uploads" || echo "   Nenhum erro recente"

