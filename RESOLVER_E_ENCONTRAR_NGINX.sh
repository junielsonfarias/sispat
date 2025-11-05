#!/bin/bash

# Script para resolver conflitos git e encontrar configuração do Nginx

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔧 RESOLVENDO CONFLITOS E ENCONTRANDO NGINX${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# 1. Resolver conflitos git
echo -e "${YELLOW}1️⃣ Resolvendo conflitos do Git...${NC}"
cd /var/www/sispat
git stash 2>/dev/null || git reset --hard origin/main
git pull origin main
echo -e "${GREEN}✅ Git atualizado${NC}"
echo ""

# 2. Dar permissão aos scripts
echo -e "${YELLOW}2️⃣ Configurando scripts...${NC}"
chmod +x ENCONTRAR_CONFIG_NGINX.sh 2>/dev/null || true
chmod +x VERIFICAR_E_CORRIGIR_NGINX_UPSTREAM.sh 2>/dev/null || true
echo -e "${GREEN}✅ Scripts configurados${NC}"
echo ""

# 3. Encontrar configuração do Nginx
echo -e "${YELLOW}3️⃣ Procurando arquivo de configuração do Nginx...${NC}"
echo ""

echo -e "${BLUE}📁 Arquivos em /etc/nginx/sites-available/:${NC}"
ls -la /etc/nginx/sites-available/ 2>/dev/null || echo "   Diretório não encontrado"
echo ""

echo -e "${BLUE}📁 Arquivos em /etc/nginx/sites-enabled/:${NC}"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "   Diretório não encontrado"
echo ""

echo -e "${BLUE}📁 Arquivos em /etc/nginx/conf.d/:${NC}"
ls -la /etc/nginx/conf.d/ 2>/dev/null || echo "   Diretório não encontrado"
echo ""

echo -e "${BLUE}🔎 Procurando arquivos que contêm 'location /api/':${NC}"
NGINX_CONFIG=""
find /etc/nginx -type f -name "*.conf" 2>/dev/null | while read file; do
    if grep -q "location /api/" "$file" 2>/dev/null; then
        echo -e "${GREEN}   ✅ ENCONTRADO: $file${NC}"
        echo ""
        echo -e "${YELLOW}   Conteúdo relevante:${NC}"
        grep -A 10 "location /api/" "$file" | head -15
        echo ""
        NGINX_CONFIG="$file"
    fi
done

# Verificar upstream
echo -e "${BLUE}🔍 Verificando configuração de upstream...${NC}"
for file in /etc/nginx/sites-available/* /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf 2>/dev/null; do
    if [ -f "$file" ] && grep -q "upstream\|proxy_pass.*backend\|proxy_pass.*3000" "$file" 2>/dev/null; then
        echo -e "${GREEN}   ✅ Verificando: $file${NC}"
        echo ""
        echo -e "${YELLOW}   Upstream/proxy_pass encontrado:${NC}"
        grep -B 2 -A 5 "upstream\|proxy_pass.*backend\|proxy_pass.*3000" "$file" | head -10
        echo ""
    fi
done

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📋 RESUMO${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "✅ Git atualizado"
echo -e "✅ Scripts configurados"
echo ""
echo -e "🔍 Próximos passos:"
echo -e "   1. Verifique o arquivo de configuração encontrado acima"
echo -e "   2. Execute: ./VERIFICAR_E_CORRIGIR_NGINX_UPSTREAM.sh"
echo ""

