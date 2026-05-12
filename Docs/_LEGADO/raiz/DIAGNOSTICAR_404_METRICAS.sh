#!/bin/bash

# Script para diagnosticar e corrigir erro 404 nas rotas de métricas

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔍 DIAGNÓSTICO COMPLETO: ERRO 404 EM /api/metrics${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# 1. Testar backend diretamente
echo -e "${YELLOW}1️⃣ Testando backend diretamente...${NC}"
BACKEND_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/metrics/summary 2>/dev/null || echo "000")
echo -e "   Status: $BACKEND_TEST"
if [ "$BACKEND_TEST" = "401" ] || [ "$BACKEND_TEST" = "403" ]; then
    echo -e "${GREEN}   ✅ Backend funcionando${NC}"
else
    echo -e "${RED}   ❌ Backend com problema${NC}"
    exit 1
fi
echo ""

# 2. Encontrar configuração do Nginx
echo -e "${YELLOW}2️⃣ Encontrando configuração do Nginx...${NC}"
NGINX_CONFIG=$(find /etc/nginx -type f \( -name "*.conf" -o -name "sispat" \) -exec grep -l "location /api" {} \; 2>/dev/null | head -1)
if [ -z "$NGINX_CONFIG" ]; then
    NGINX_CONFIG=$(ls /etc/nginx/sites-enabled/* 2>/dev/null | head -1)
fi

if [ -z "$NGINX_CONFIG" ] || [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${RED}   ❌ Arquivo de configuração não encontrado${NC}"
    exit 1
fi

echo -e "${GREEN}   ✅ Configuração: $NGINX_CONFIG${NC}"
echo ""

# 3. Verificar configuração atual
echo -e "${YELLOW}3️⃣ Verificando configuração do /api...${NC}"
API_BLOCK=$(grep -A 15 "location /api" "$NGINX_CONFIG" | head -20)
echo "$API_BLOCK"
echo ""

# Verificar se location /api precisa ser /api/
LOCATION_LINE=$(grep "location /api" "$NGINX_CONFIG" | head -1)
PROXY_PASS_LINE=$(echo "$API_BLOCK" | grep "proxy_pass")

echo -e "   Location: $LOCATION_LINE"
echo -e "   Proxy_pass: $PROXY_PASS_LINE"
echo ""

# 4. Testar via proxy local
echo -e "${YELLOW}4️⃣ Testando via proxy (localhost)...${NC}"
PROXY_TEST=$(curl -k -s -o /dev/null -w "%{http_code}" https://localhost/api/metrics/summary 2>/dev/null || echo "000")
echo -e "   Status via HTTPS local: $PROXY_TEST"

if [ "$PROXY_TEST" = "401" ] || [ "$PROXY_TEST" = "403" ]; then
    echo -e "${GREEN}   ✅ Proxy local funcionando${NC}"
    PROXY_OK=true
else
    echo -e "${RED}   ❌ Proxy local retorna $PROXY_TEST${NC}"
    PROXY_OK=false
fi
echo ""

# 5. Testar via domínio real (se possível)
echo -e "${YELLOW}5️⃣ Testando via domínio real...${NC}"
DOMAIN=$(grep "server_name" "$NGINX_CONFIG" | grep -v "#" | head -1 | awk '{print $2}' | sed 's/;//' | head -1)
if [ -n "$DOMAIN" ]; then
    echo -e "   Domínio: $DOMAIN"
    DOMAIN_TEST=$(curl -k -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/metrics/summary" 2>/dev/null || echo "000")
    echo -e "   Status via domínio: $DOMAIN_TEST"
    
    if [ "$DOMAIN_TEST" = "401" ] || [ "$DOMAIN_TEST" = "403" ]; then
        echo -e "${GREEN}   ✅ Domínio funcionando${NC}"
    elif [ "$DOMAIN_TEST" = "404" ]; then
        echo -e "${RED}   ❌ Domínio retorna 404${NC}"
        echo -e "${YELLOW}   ⚠️  PROBLEMA IDENTIFICADO: Proxy funciona localmente mas não via domínio${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Domínio retorna $DOMAIN_TEST${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  Domínio não encontrado na configuração${NC}"
fi
echo ""

# 6. Verificar se há problema com location /api vs /api/
echo -e "${YELLOW}6️⃣ Verificando se precisa ajustar location...${NC}"
if echo "$LOCATION_LINE" | grep -q "location /api[^/]"; then
    echo -e "${YELLOW}   ⚠️  Location está como '/api' (sem barra final)${NC}"
    echo -e "${YELLOW}   💡 Isso pode causar problemas com algumas rotas${NC}"
    echo ""
    echo -e "${BLUE}   Testando se mudar para '/api/' resolve...${NC}"
    
    # Fazer backup
    cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Tentar corrigir
    sed -i 's|location /api {|location /api/ {|g' "$NGINX_CONFIG"
    
    # Testar configuração
    if nginx -t 2>&1; then
        echo -e "${GREEN}   ✅ Configuração válida após mudança${NC}"
        
        # Recarregar Nginx
        rm -rf /var/cache/nginx/*
        systemctl reload nginx 2>/dev/null || nginx -s reload
        
        sleep 2
        
        # Testar novamente
        NEW_TEST=$(curl -k -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/metrics/summary" 2>/dev/null || echo "000")
        echo -e "   Status após mudança: $NEW_TEST"
        
        if [ "$NEW_TEST" = "401" ] || [ "$NEW_TEST" = "403" ]; then
            echo -e "${GREEN}   ✅ CORREÇÃO APLICADA COM SUCESSO!${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Mudança não resolveu, revertendo...${NC}"
            cp "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)" "$NGINX_CONFIG"
            nginx -t && systemctl reload nginx
        fi
    else
        echo -e "${RED}   ❌ Erro na configuração, revertendo...${NC}"
        cp "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)" "$NGINX_CONFIG"
    fi
else
    echo -e "${GREEN}   ✅ Location já está como '/api/'${NC}"
fi
echo ""

# 7. Verificar logs do Nginx
echo -e "${YELLOW}7️⃣ Verificando logs do Nginx...${NC}"
tail -30 /var/log/nginx/error.log 2>/dev/null | grep -i "metrics\|api\|404" | tail -10 || echo "   Nenhum erro relacionado"
echo ""

# 8. Verificar se há múltiplos blocos location /api
echo -e "${YELLOW}8️⃣ Verificando conflitos de location...${NC}"
API_COUNT=$(grep -c "location /api" "$NGINX_CONFIG" || echo "0")
echo -e "   Total de blocos 'location /api': $API_COUNT"

if [ "$API_COUNT" -gt 1 ]; then
    echo -e "${YELLOW}   ⚠️  Múltiplos blocos encontrados! Isso pode causar conflito${NC}"
    grep -n "location /api" "$NGINX_CONFIG"
fi
echo ""

# 9. Resumo e recomendações
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📋 RESUMO E PRÓXIMOS PASSOS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Backend: Status $BACKEND_TEST ✅"
echo -e "Proxy local: Status $PROXY_TEST"
if [ -n "$DOMAIN_TEST" ]; then
    echo -e "Domínio: Status $DOMAIN_TEST"
fi
echo ""

if [ "$BACKEND_TEST" = "401" ] && [ "$PROXY_TEST" = "401" ]; then
    if [ "$DOMAIN_TEST" = "404" ]; then
        echo -e "${YELLOW}⚠️  PROBLEMA IDENTIFICADO:${NC}"
        echo -e "   O proxy funciona localmente mas não via domínio"
        echo -e "   Isso pode ser:"
        echo -e "   1. Cache do navegador"
        echo -e "   2. Service Worker do frontend"
        echo -e "   3. Problema de CORS"
        echo ""
        echo -e "${BLUE}💡 SOLUÇÕES:${NC}"
        echo -e "   1. Limpar cache do navegador completamente"
        echo -e "   2. Desabilitar Service Worker:"
        echo -e "      - F12 → Application → Service Workers → Unregister"
        echo -e "   3. Testar em janela anônima/privada"
        echo -e "   4. Recompilar frontend:"
        echo -e "      cd /var/www/sispat && npm run build"
    else
        echo -e "${GREEN}✅ TUDO FUNCIONANDO!${NC}"
    fi
else
    echo -e "${RED}❌ AINDA HÁ PROBLEMAS${NC}"
fi
echo ""

