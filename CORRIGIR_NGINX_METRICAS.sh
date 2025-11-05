#!/bin/bash

# Script para corrigir problema de 404 nas rotas de métricas via Nginx
# O problema pode estar na configuração do proxy_pass

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔧 CORRIGINDO NGINX PARA ROTAS DE MÉTRICAS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# 1. Verificar configuração atual do Nginx
echo -e "${YELLOW}1️⃣ Verificando configuração atual do Nginx...${NC}"
NGINX_CONFIG="/etc/nginx/sites-available/sispat"
if [ ! -f "$NGINX_CONFIG" ]; then
    NGINX_CONFIG="/etc/nginx/conf.d/sispat.conf"
fi

if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${RED}❌ Arquivo de configuração do Nginx não encontrado${NC}"
    echo -e "${YELLOW}   Procurando em outros locais...${NC}"
    find /etc/nginx -name "*sispat*" -type f 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✅ Configuração encontrada: $NGINX_CONFIG${NC}"
echo ""

# 2. Verificar configuração atual do /api/
echo -e "${YELLOW}2️⃣ Verificando configuração de /api/...${NC}"
if grep -q "location /api/" "$NGINX_CONFIG"; then
    echo -e "${GREEN}✅ Bloco location /api/ encontrado${NC}"
    echo -e "${BLUE}   Configuração atual:${NC}"
    sed -n '/location \/api\//,/^[[:space:]]*}/p' "$NGINX_CONFIG" | head -20
else
    echo -e "${RED}❌ Bloco location /api/ não encontrado!${NC}"
fi
echo ""

# 3. Verificar se há problema com proxy_pass
echo -e "${YELLOW}3️⃣ Verificando proxy_pass...${NC}"
PROXY_PASS=$(grep -A 2 "location /api/" "$NGINX_CONFIG" | grep "proxy_pass" | head -1)
echo -e "   Configuração atual: $PROXY_PASS"

# Verificar se proxy_pass tem barra final (pode causar problema)
if echo "$PROXY_PASS" | grep -q "/api/"; then
    echo -e "${YELLOW}⚠️  proxy_pass tem /api/ no final, isso pode causar duplicação${NC}"
    echo -e "${YELLOW}   Deve ser apenas: proxy_pass http://sispat_backend;${NC}"
fi
echo ""

# 4. Fazer backup da configuração
echo -e "${YELLOW}4️⃣ Fazendo backup da configuração...${NC}"
cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✅ Backup criado${NC}"
echo ""

# 5. Testar configuração do Nginx
echo -e "${YELLOW}5️⃣ Testando configuração do Nginx...${NC}"
if nginx -t 2>&1; then
    echo -e "${GREEN}✅ Configuração do Nginx está válida${NC}"
else
    echo -e "${RED}❌ Erro na configuração do Nginx!${NC}"
    echo -e "${YELLOW}   Restaurando backup...${NC}"
    cp "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)" "$NGINX_CONFIG"
    exit 1
fi
echo ""

# 6. Verificar se o backend está acessível
echo -e "${YELLOW}6️⃣ Verificando se o backend está acessível...${NC}"
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/metrics/summary 2>/dev/null || echo "000")
echo -e "   Status do backend (localhost:3000): $BACKEND_RESPONSE"

if [ "$BACKEND_RESPONSE" = "401" ] || [ "$BACKEND_RESPONSE" = "403" ]; then
    echo -e "${GREEN}✅ Backend está respondendo corretamente (401/403 é esperado sem token)${NC}"
elif [ "$BACKEND_RESPONSE" = "404" ]; then
    echo -e "${RED}❌ Backend também retorna 404! Problema não é do Nginx${NC}"
    echo -e "${YELLOW}   Execute: cd /var/www/sispat/backend && npm run build && pm2 restart sispat-backend${NC}"
    exit 1
else
    echo -e "${YELLOW}⚠️  Backend retornou status $BACKEND_RESPONSE${NC}"
fi
echo ""

# 7. Limpar cache do Nginx
echo -e "${YELLOW}7️⃣ Limpando cache do Nginx...${NC}"
rm -rf /var/cache/nginx/* 2>/dev/null || true
echo -e "${GREEN}✅ Cache limpo${NC}"
echo ""

# 8. Recarregar Nginx
echo -e "${YELLOW}8️⃣ Recarregando Nginx...${NC}"
if systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null; then
    echo -e "${GREEN}✅ Nginx recarregado${NC}"
else
    echo -e "${YELLOW}⚠️  Erro ao recarregar, tentando restart...${NC}"
    systemctl restart nginx || nginx -s reload
fi
echo ""

# 9. Aguardar Nginx reiniciar
echo -e "${YELLOW}9️⃣ Aguardando Nginx reiniciar (2 segundos)...${NC}"
sleep 2
echo ""

# 10. Testar via domínio (se possível) ou localhost
echo -e "${YELLOW}🔟 Testando endpoint via proxy...${NC}"
PROXY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/metrics/summary 2>/dev/null || echo "000")
echo -e "   Status via proxy (localhost/api): $PROXY_RESPONSE"

if [ "$PROXY_RESPONSE" = "401" ] || [ "$PROXY_RESPONSE" = "403" ]; then
    echo -e "${GREEN}✅ Proxy está funcionando! (401/403 é esperado sem token)${NC}"
elif [ "$PROXY_RESPONSE" = "404" ]; then
    echo -e "${RED}❌ Proxy ainda retorna 404${NC}"
    echo -e "${YELLOW}   Verificando logs do Nginx...${NC}"
    tail -20 /var/log/nginx/error.log 2>/dev/null || echo "Logs não disponíveis"
else
    echo -e "${YELLOW}⚠️  Proxy retornou status $PROXY_RESPONSE${NC}"
fi
echo ""

# 11. Verificar logs do Nginx
echo -e "${YELLOW}1️⃣1️⃣ Últimas linhas dos logs de erro do Nginx:${NC}"
tail -10 /var/log/nginx/error.log 2>/dev/null | grep -i "metrics\|api\|404" || echo "Nenhum erro relacionado encontrado"
echo ""

# 12. Sugestões de correção
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📋 DIAGNÓSTICO${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$BACKEND_RESPONSE" = "401" ] || [ "$BACKEND_RESPONSE" = "403" ]; then
    if [ "$PROXY_RESPONSE" = "404" ]; then
        echo -e "${YELLOW}⚠️  PROBLEMA IDENTIFICADO:${NC}"
        echo -e "   • Backend funciona localmente (localhost:3000)"
        echo -e "   • Proxy Nginx retorna 404"
        echo -e "   • Isso indica problema na configuração do proxy_pass"
        echo ""
        echo -e "${YELLOW}🔧 CORREÇÃO SUGERIDA:${NC}"
        echo -e "   Verifique se o proxy_pass está assim:"
        echo -e "   ${GREEN}proxy_pass http://sispat_backend;${NC}"
        echo -e "   ${RED}NÃO use: proxy_pass http://sispat_backend/api/;${NC}"
        echo ""
        echo -e "   Se usar upstream, verifique:"
        echo -e "   ${GREEN}upstream sispat_backend {${NC}"
        echo -e "   ${GREEN}    server localhost:3000;${NC}"
        echo -e "   ${GREEN}}${NC}"
    else
        echo -e "${GREEN}✅ TUDO FUNCIONANDO!${NC}"
        echo -e "   Backend e proxy estão respondendo corretamente"
    fi
else
    echo -e "${RED}❌ PROBLEMA NO BACKEND${NC}"
    echo -e "   O backend não está respondendo corretamente"
    echo -e "   Execute: cd /var/www/sispat/backend && npm run build && pm2 restart sispat-backend"
fi
echo ""

# 13. Verificar upstream
echo -e "${YELLOW}1️⃣2️⃣ Verificando configuração de upstream...${NC}"
if grep -q "upstream.*sispat_backend\|upstream.*backend" "$NGINX_CONFIG" /etc/nginx/nginx.conf 2>/dev/null; then
    echo -e "${GREEN}✅ Upstream encontrado${NC}"
    grep -A 5 "upstream.*sispat_backend\|upstream.*backend" "$NGINX_CONFIG" /etc/nginx/nginx.conf 2>/dev/null | head -10
else
    echo -e "${YELLOW}⚠️  Upstream não encontrado, usando proxy_pass direto${NC}"
    echo -e "   Isso pode estar causando problemas se o proxy_pass estiver mal configurado"
fi
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📝 RESUMO${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "✅ Ações executadas:"
echo -e "   • Verificação da configuração do Nginx"
echo -e "   • Backup da configuração"
echo -e "   • Teste da configuração"
echo -e "   • Limpeza de cache"
echo -e "   • Recarga do Nginx"
echo ""
echo -e "🧪 Testes:"
echo -e "   • Backend local: Status $BACKEND_RESPONSE"
echo -e "   • Via proxy: Status $PROXY_RESPONSE"
echo ""
echo -e "🔍 Próximos passos:"
echo -e "   1. Verifique a configuração do Nginx manualmente"
echo -e "   2. Teste via curl: curl -H 'Authorization: Bearer TOKEN' https://sispat.vps-kinghost.net/api/metrics/summary"
echo -e "   3. Verifique logs: tail -f /var/log/nginx/error.log"
echo ""

