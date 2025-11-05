#!/bin/bash

# Script para verificar e corrigir o upstream do Nginx
# O problema pode ser que o upstream está apontando para 'sispat:3000' (Docker)
# mas deveria ser 'localhost:3000' no servidor real

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔍 VERIFICANDO E CORRIGINDO UPSTREAM DO NGINX${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# 1. Encontrar arquivo de configuração
NGINX_CONFIG=""
for config in /etc/nginx/sites-available/sispat /etc/nginx/conf.d/sispat.conf /etc/nginx/nginx.conf; do
    if [ -f "$config" ]; then
        if grep -q "location /api/" "$config" 2>/dev/null; then
            NGINX_CONFIG="$config"
            break
        fi
    fi
done

if [ -z "$NGINX_CONFIG" ]; then
    echo -e "${RED}❌ Arquivo de configuração do Nginx não encontrado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Configuração encontrada: $NGINX_CONFIG${NC}"
echo ""

# 2. Verificar upstream atual
echo -e "${YELLOW}1️⃣ Verificando configuração de upstream...${NC}"
if grep -q "upstream.*sispat_backend\|upstream.*backend" "$NGINX_CONFIG" 2>/dev/null; then
    echo -e "${GREEN}✅ Upstream encontrado${NC}"
    UPSTREAM_LINE=$(grep -A 2 "upstream.*sispat_backend\|upstream.*backend" "$NGINX_CONFIG" | grep "server" | head -1)
    echo -e "   Configuração atual: $UPSTREAM_LINE"
    
    if echo "$UPSTREAM_LINE" | grep -q "sispat:3000"; then
        echo -e "${YELLOW}⚠️  Upstream está configurado como 'sispat:3000' (Docker)${NC}"
        echo -e "${YELLOW}   Isso pode não funcionar no servidor real${NC}"
        NEEDS_FIX=true
    elif echo "$UPSTREAM_LINE" | grep -q "localhost:3000\|127.0.0.1:3000"; then
        echo -e "${GREEN}✅ Upstream está correto (localhost:3000)${NC}"
        NEEDS_FIX=false
    else
        echo -e "${YELLOW}⚠️  Configuração de upstream não reconhecida${NC}"
        NEEDS_FIX=false
    fi
else
    echo -e "${YELLOW}⚠️  Upstream não encontrado na configuração${NC}"
    echo -e "${YELLOW}   Verificando proxy_pass direto...${NC}"
    PROXY_PASS=$(grep -A 2 "location /api/" "$NGINX_CONFIG" | grep "proxy_pass" | head -1)
    echo -e "   proxy_pass: $PROXY_PASS"
    NEEDS_FIX=false
fi
echo ""

# 3. Testar se localhost:3000 está acessível
echo -e "${YELLOW}2️⃣ Testando conectividade com backend...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null | grep -q "200\|401\|403"; then
    echo -e "${GREEN}✅ Backend está acessível em localhost:3000${NC}"
    BACKEND_ACCESSIBLE=true
else
    echo -e "${RED}❌ Backend NÃO está acessível em localhost:3000${NC}"
    BACKEND_ACCESSIBLE=false
fi
echo ""

# 4. Testar se sispat:3000 está acessível (caso seja Docker)
echo -e "${YELLOW}3️⃣ Testando conectividade com sispat:3000 (Docker)...${NC}"
if getent hosts sispat >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Hostname 'sispat' resolve${NC}"
    if curl -s -o /dev/null -w "%{http_code}" http://sispat:3000/api/health 2>/dev/null | grep -q "200\|401\|403"; then
        echo -e "${GREEN}✅ Backend também está acessível em sispat:3000${NC}"
    else
        echo -e "${RED}❌ Backend NÃO está acessível em sispat:3000${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Hostname 'sispat' não resolve (não é Docker)${NC}"
fi
echo ""

# 5. Fazer backup
echo -e "${YELLOW}4️⃣ Fazendo backup da configuração...${NC}"
cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✅ Backup criado${NC}"
echo ""

# 6. Corrigir upstream se necessário
if [ "$NEEDS_FIX" = true ] && [ "$BACKEND_ACCESSIBLE" = true ]; then
    echo -e "${YELLOW}5️⃣ Corrigindo upstream para localhost:3000...${NC}"
    
    # Criar backup temporário
    TMP_FILE=$(mktemp)
    cp "$NGINX_CONFIG" "$TMP_FILE"
    
    # Substituir sispat:3000 por localhost:3000
    sed -i 's/server sispat:3000;/server localhost:3000;/g' "$TMP_FILE"
    
    # Verificar se a mudança foi feita
    if grep -q "server localhost:3000" "$TMP_FILE"; then
        mv "$TMP_FILE" "$NGINX_CONFIG"
        echo -e "${GREEN}✅ Upstream corrigido para localhost:3000${NC}"
    else
        rm "$TMP_FILE"
        echo -e "${YELLOW}⚠️  Não foi possível fazer a correção automaticamente${NC}"
    fi
else
    echo -e "${GREEN}✅ Nenhuma correção necessária${NC}"
fi
echo ""

# 7. Verificar se há problema com proxy_pass duplicando /api/
echo -e "${YELLOW}6️⃣ Verificando proxy_pass...${NC}"
PROXY_PASS_CONFIG=$(grep -A 5 "location /api/" "$NGINX_CONFIG" | grep "proxy_pass" | head -1)
echo -e "   Configuração: $PROXY_PASS_CONFIG"

if echo "$PROXY_PASS_CONFIG" | grep -q "/api/"; then
    echo -e "${YELLOW}⚠️  proxy_pass tem /api/ no final, isso pode causar duplicação${NC}"
    echo -e "${YELLOW}   Deve ser apenas: proxy_pass http://sispat_backend;${NC}"
    echo -e "${YELLOW}   Ou: proxy_pass http://localhost:3000;${NC}"
fi
echo ""

# 8. Testar configuração do Nginx
echo -e "${YELLOW}7️⃣ Testando configuração do Nginx...${NC}"
if nginx -t 2>&1; then
    echo -e "${GREEN}✅ Configuração do Nginx está válida${NC}"
else
    echo -e "${RED}❌ Erro na configuração do Nginx!${NC}"
    echo -e "${YELLOW}   Restaurando backup...${NC}"
    cp "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)" "$NGINX_CONFIG" 2>/dev/null || true
    exit 1
fi
echo ""

# 9. Limpar cache e recarregar
echo -e "${YELLOW}8️⃣ Limpando cache e recarregando Nginx...${NC}"
rm -rf /var/cache/nginx/* 2>/dev/null || true
systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || systemctl restart nginx
sleep 2
echo -e "${GREEN}✅ Nginx recarregado${NC}"
echo ""

# 10. Testar endpoint
echo -e "${YELLOW}9️⃣ Testando endpoint via proxy...${NC}"
PROXY_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/metrics/summary 2>/dev/null || echo "000")
echo -e "   Status via proxy: $PROXY_TEST"

if [ "$PROXY_TEST" = "401" ] || [ "$PROXY_TEST" = "403" ]; then
    echo -e "${GREEN}✅ Proxy está funcionando! (401/403 é esperado sem token)${NC}"
elif [ "$PROXY_TEST" = "404" ]; then
    echo -e "${RED}❌ Proxy ainda retorna 404${NC}"
    echo -e "${YELLOW}   Verifique os logs: tail -f /var/log/nginx/error.log${NC}"
else
    echo -e "${YELLOW}⚠️  Proxy retornou status $PROXY_TEST${NC}"
fi
echo ""

# 11. Resumo
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📋 RESUMO${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Configuração: $NGINX_CONFIG"
echo -e "Backend acessível: $BACKEND_ACCESSIBLE"
echo -e "Status via proxy: $PROXY_TEST"
echo ""
if [ "$PROXY_TEST" = "401" ] || [ "$PROXY_TEST" = "403" ]; then
    echo -e "${GREEN}✅ CORREÇÃO APLICADA COM SUCESSO!${NC}"
    echo -e "   Teste agora no frontend: https://sispat.vps-kinghost.net/admin/metrics"
else
    echo -e "${YELLOW}⚠️  AINDA HÁ PROBLEMAS${NC}"
    echo -e "   Verifique manualmente a configuração do Nginx"
    echo -e "   Arquivo: $NGINX_CONFIG"
fi
echo ""

