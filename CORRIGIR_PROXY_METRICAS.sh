#!/bin/bash

# Script para corrigir problema de proxy nas rotas de métricas

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔧 CORRIGINDO PROXY PARA ROTAS DE MÉTRICAS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# 1. Testar backend diretamente
echo -e "${YELLOW}1️⃣ Testando backend diretamente (localhost:3000)...${NC}"
BACKEND_DIRECT=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/metrics/summary 2>/dev/null || echo "000")
echo -e "   Status: $BACKEND_DIRECT"

if [ "$BACKEND_DIRECT" = "401" ] || [ "$BACKEND_DIRECT" = "403" ]; then
    echo -e "${GREEN}   ✅ Backend está respondendo corretamente (401/403 é esperado sem token)${NC}"
    BACKEND_OK=true
elif [ "$BACKEND_DIRECT" = "404" ]; then
    echo -e "${RED}   ❌ Backend retorna 404! Problema não é do Nginx${NC}"
    echo -e "${YELLOW}   ⚠️  O backend precisa ser recompilado/reiniciado${NC}"
    BACKEND_OK=false
else
    echo -e "${YELLOW}   ⚠️  Backend retornou status $BACKEND_DIRECT${NC}"
    BACKEND_OK=false
fi
echo ""

# Se backend não está OK, parar aqui
if [ "$BACKEND_OK" != "true" ]; then
    echo -e "${YELLOW}🔧 Tentando corrigir backend...${NC}"
    cd /var/www/sispat/backend
    echo -e "   Compilando backend..."
    npm run build || echo -e "${RED}   ❌ Erro ao compilar${NC}"
    echo -e "   Reiniciando PM2..."
    pm2 restart sispat-backend || pm2 start ecosystem.config.js --env production
    sleep 3
    echo ""
    
    # Testar novamente
    BACKEND_DIRECT=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/metrics/summary 2>/dev/null || echo "000")
    if [ "$BACKEND_DIRECT" = "401" ] || [ "$BACKEND_DIRECT" = "403" ]; then
        echo -e "${GREEN}   ✅ Backend corrigido!${NC}"
        BACKEND_OK=true
    else
        echo -e "${RED}   ❌ Backend ainda não está funcionando${NC}"
        echo -e "${YELLOW}   Verifique os logs: pm2 logs sispat-backend${NC}"
        exit 1
    fi
    echo ""
fi

# 2. Testar via proxy Nginx
echo -e "${YELLOW}2️⃣ Testando via proxy Nginx (localhost/api)...${NC}"
PROXY_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/metrics/summary 2>/dev/null || echo "000")
echo -e "   Status via proxy: $PROXY_TEST"

if [ "$PROXY_TEST" = "401" ] || [ "$PROXY_TEST" = "403" ]; then
    echo -e "${GREEN}   ✅ Proxy está funcionando! (401/403 é esperado sem token)${NC}"
    PROXY_OK=true
elif [ "$PROXY_TEST" = "404" ]; then
    echo -e "${RED}   ❌ Proxy retorna 404${NC}"
    PROXY_OK=false
else
    echo -e "${YELLOW}   ⚠️  Proxy retornou status $PROXY_TEST${NC}"
    PROXY_OK=false
fi
echo ""

# 3. Se proxy não está OK, limpar cache e recarregar
if [ "$PROXY_OK" != "true" ] && [ "$BACKEND_OK" = "true" ]; then
    echo -e "${YELLOW}3️⃣ Limpando cache do Nginx e recarregando...${NC}"
    
    # Limpar cache
    rm -rf /var/cache/nginx/* 2>/dev/null || true
    echo -e "   ✅ Cache limpo"
    
    # Recarregar Nginx
    if systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null; then
        echo -e "   ✅ Nginx recarregado"
    else
        echo -e "${YELLOW}   ⚠️  Erro ao recarregar, tentando restart...${NC}"
        systemctl restart nginx
    fi
    
    sleep 2
    
    # Testar novamente
    PROXY_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/metrics/summary 2>/dev/null || echo "000")
    echo -e "   Status após recarregar: $PROXY_TEST"
    
    if [ "$PROXY_TEST" = "401" ] || [ "$PROXY_TEST" = "403" ]; then
        echo -e "${GREEN}   ✅ Proxy corrigido!${NC}"
        PROXY_OK=true
    fi
    echo ""
fi

# 4. Verificar configuração do proxy_pass
echo -e "${YELLOW}4️⃣ Verificando configuração do proxy_pass...${NC}"
NGINX_CONFIG=$(find /etc/nginx -type f -name "*.conf" -exec grep -l "location /api" {} \; 2>/dev/null | head -1)

if [ -n "$NGINX_CONFIG" ]; then
    echo -e "   Arquivo: $NGINX_CONFIG"
    PROXY_PASS_LINE=$(grep -A 2 "location /api" "$NGINX_CONFIG" | grep "proxy_pass" | head -1)
    echo -e "   Configuração: $PROXY_PASS_LINE"
    
    # Verificar se está correto
    if echo "$PROXY_PASS_LINE" | grep -q "proxy_pass http://127.0.0.1:3000\|proxy_pass http://localhost:3000"; then
        if echo "$PROXY_PASS_LINE" | grep -q "proxy_pass http://.*:3000[^;]*;"; then
            if echo "$PROXY_PASS_LINE" | grep -q "/api/"; then
                echo -e "${YELLOW}   ⚠️  proxy_pass tem /api/ no final, isso pode causar problema${NC}"
                echo -e "${YELLOW}   Deve ser: proxy_pass http://127.0.0.1:3000;${NC}"
            else
                echo -e "${GREEN}   ✅ Configuração do proxy_pass está correta${NC}"
            fi
        else
            echo -e "${GREEN}   ✅ Configuração do proxy_pass está correta${NC}"
        fi
    else
        echo -e "${YELLOW}   ⚠️  proxy_pass pode não estar configurado corretamente${NC}"
    fi
else
    echo -e "${RED}   ❌ Arquivo de configuração não encontrado${NC}"
fi
echo ""

# 5. Verificar logs do Nginx se ainda há problema
if [ "$PROXY_OK" != "true" ]; then
    echo -e "${YELLOW}5️⃣ Verificando logs do Nginx...${NC}"
    tail -20 /var/log/nginx/error.log 2>/dev/null | grep -i "metrics\|api\|404" | tail -5 || echo "   Nenhum erro relacionado encontrado"
    echo ""
fi

# 6. Resumo
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📋 RESUMO${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Backend (localhost:3000): Status $BACKEND_DIRECT"
echo -e "Proxy (localhost/api): Status $PROXY_TEST"
echo ""

if [ "$BACKEND_OK" = "true" ] && [ "$PROXY_OK" = "true" ]; then
    echo -e "${GREEN}✅ TUDO FUNCIONANDO!${NC}"
    echo -e "   Teste agora no frontend: https://sispat.vps-kinghost.net/admin/metrics"
    echo ""
    echo -e "   Se ainda não funcionar, limpe o cache do navegador (Ctrl+Shift+R)"
elif [ "$BACKEND_OK" = "true" ] && [ "$PROXY_OK" != "true" ]; then
    echo -e "${YELLOW}⚠️  Backend OK mas proxy ainda com problema${NC}"
    echo -e "   Verifique:"
    echo -e "   1. Logs do Nginx: tail -f /var/log/nginx/error.log"
    echo -e "   2. Configuração: $NGINX_CONFIG"
    echo -e "   3. Teste: curl -v http://localhost/api/metrics/summary"
else
    echo -e "${RED}❌ PROBLEMA NO BACKEND${NC}"
    echo -e "   Execute: cd /var/www/sispat/backend && npm run build && pm2 restart sispat-backend"
fi
echo ""

