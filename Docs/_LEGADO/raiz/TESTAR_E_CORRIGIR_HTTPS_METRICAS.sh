#!/bin/bash

# Script para testar e corrigir rotas de métricas via HTTPS

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔧 TESTANDO E CORRIGINDO ROTAS DE MÉTRICAS VIA HTTPS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# 1. Testar backend diretamente
echo -e "${YELLOW}1️⃣ Testando backend diretamente...${NC}"
BACKEND_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/metrics/summary 2>/dev/null || echo "000")
if [ "$BACKEND_TEST" = "401" ] || [ "$BACKEND_TEST" = "403" ]; then
    echo -e "${GREEN}   ✅ Backend OK (Status: $BACKEND_TEST)${NC}"
else
    echo -e "${RED}   ❌ Backend com problema (Status: $BACKEND_TEST)${NC}"
    exit 1
fi
echo ""

# 2. Encontrar arquivo de configuração do Nginx
echo -e "${YELLOW}2️⃣ Encontrando configuração do Nginx...${NC}"
NGINX_CONFIG=$(find /etc/nginx -type f \( -name "*.conf" -o -name "sispat" \) -exec grep -l "location /api" {} \; 2>/dev/null | head -1)

if [ -z "$NGINX_CONFIG" ]; then
    # Tentar encontrar em sites-enabled
    NGINX_CONFIG=$(ls /etc/nginx/sites-enabled/* 2>/dev/null | head -1)
fi

if [ -n "$NGINX_CONFIG" ] && [ -f "$NGINX_CONFIG" ]; then
    echo -e "${GREEN}   ✅ Configuração encontrada: $NGINX_CONFIG${NC}"
else
    echo -e "${RED}   ❌ Arquivo de configuração não encontrado${NC}"
    exit 1
fi
echo ""

# 3. Verificar configuração atual
echo -e "${YELLOW}3️⃣ Verificando configuração do /api...${NC}"
API_CONFIG=$(grep -A 10 "location /api" "$NGINX_CONFIG" | head -15)
echo "$API_CONFIG"
echo ""

# Verificar se há problema com a configuração
PROXY_PASS=$(echo "$API_CONFIG" | grep "proxy_pass" | head -1)
echo -e "   proxy_pass: $PROXY_PASS"

if echo "$PROXY_PASS" | grep -q "proxy_pass http://127.0.0.1:3000\|proxy_pass http://localhost:3000"; then
    if echo "$PROXY_PASS" | grep -q "/api"; then
        echo -e "${YELLOW}   ⚠️  proxy_pass tem /api no caminho, isso pode causar duplicação${NC}"
    else
        echo -e "${GREEN}   ✅ Configuração do proxy_pass parece correta${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  Verifique se o proxy_pass está apontando para localhost:3000${NC}"
fi
echo ""

# 4. Testar via HTTPS (localmente, ignorando certificado)
echo -e "${YELLOW}4️⃣ Testando via HTTPS (localhost)...${NC}"
HTTPS_TEST=$(curl -k -s -o /dev/null -w "%{http_code}" https://localhost/api/metrics/summary 2>/dev/null || echo "000")
echo -e "   Status via HTTPS: $HTTPS_TEST"

if [ "$HTTPS_TEST" = "401" ] || [ "$HTTPS_TEST" = "403" ]; then
    echo -e "${GREEN}   ✅ Proxy HTTPS está funcionando! (Status: $HTTPS_TEST)${NC}"
    HTTPS_OK=true
elif [ "$HTTPS_TEST" = "404" ]; then
    echo -e "${RED}   ❌ Proxy HTTPS retorna 404${NC}"
    HTTPS_OK=false
else
    echo -e "${YELLOW}   ⚠️  Proxy HTTPS retornou status $HTTPS_TEST${NC}"
    HTTPS_OK=false
fi
echo ""

# 5. Se não está funcionando, verificar e corrigir configuração
if [ "$HTTPS_OK" != "true" ]; then
    echo -e "${YELLOW}5️⃣ Verificando configuração do location /api...${NC}"
    
    # Verificar se location /api está dentro do bloco HTTPS (listen 443)
    if grep -A 50 "listen 443" "$NGINX_CONFIG" | grep -q "location /api"; then
        echo -e "${GREEN}   ✅ location /api está no bloco HTTPS${NC}"
    else
        echo -e "${RED}   ❌ location /api NÃO está no bloco HTTPS!${NC}"
        echo -e "${YELLOW}   ⚠️  Isso pode ser o problema${NC}"
    fi
    echo ""
    
    # Verificar se precisa ajustar location /api para /api/
    LOCATION_LINE=$(grep "location /api" "$NGINX_CONFIG" | head -1)
    echo -e "   Configuração atual: $LOCATION_LINE"
    
    if echo "$LOCATION_LINE" | grep -q "location /api[^/]"; then
        echo -e "${YELLOW}   ⚠️  location está como '/api' (sem barra final)${NC}"
        echo -e "${YELLOW}   ⚠️  Isso pode não capturar /api/metrics/summary corretamente${NC}"
        echo -e "${YELLOW}   💡 Sugestão: Mudar para 'location /api/'${NC}"
    fi
    echo ""
fi

# 6. Limpar cache e recarregar
echo -e "${YELLOW}6️⃣ Limpando cache e recarregando Nginx...${NC}"
rm -rf /var/cache/nginx/* 2>/dev/null || true
systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || systemctl restart nginx
sleep 2
echo -e "${GREEN}   ✅ Nginx recarregado${NC}"
echo ""

# 7. Testar novamente
echo -e "${YELLOW}7️⃣ Testando novamente via HTTPS...${NC}"
HTTPS_TEST2=$(curl -k -s -o /dev/null -w "%{http_code}" https://localhost/api/metrics/summary 2>/dev/null || echo "000")
echo -e "   Status após recarregar: $HTTPS_TEST2"

if [ "$HTTPS_TEST2" = "401" ] || [ "$HTTPS_TEST2" = "403" ]; then
    echo -e "${GREEN}   ✅ Funcionando!${NC}"
    HTTPS_OK=true
fi
echo ""

# 8. Verificar logs se ainda não funcionar
if [ "$HTTPS_OK" != "true" ]; then
    echo -e "${YELLOW}8️⃣ Verificando logs do Nginx...${NC}"
    tail -20 /var/log/nginx/error.log 2>/dev/null | grep -i "metrics\|api\|404" | tail -5 || echo "   Nenhum erro relacionado"
    echo ""
fi

# 9. Resumo e recomendações
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📋 RESUMO${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Backend: Status $BACKEND_TEST ✅"
echo -e "HTTPS: Status $HTTPS_TEST2"
echo ""

if [ "$HTTPS_OK" = "true" ]; then
    echo -e "${GREEN}✅ TUDO FUNCIONANDO!${NC}"
    echo -e "   Teste no frontend: https://sispat.vps-kinghost.net/admin/metrics"
    echo -e "   Se ainda não funcionar, limpe o cache do navegador (Ctrl+Shift+R)"
else
    echo -e "${YELLOW}⚠️  AINDA HÁ PROBLEMAS${NC}"
    echo ""
    echo -e "Possíveis soluções:"
    echo -e "1. Verificar se 'location /api' está no bloco HTTPS (listen 443)"
    echo -e "2. Considerar mudar 'location /api' para 'location /api/'"
    echo -e "3. Verificar se o proxy_pass está correto"
    echo ""
    echo -e "Comando para ver configuração:"
    echo -e "   cat $NGINX_CONFIG | grep -A 15 'location /api'"
    echo ""
    echo -e "Teste manual:"
    echo -e "   curl -k -v https://localhost/api/metrics/summary"
fi
echo ""

