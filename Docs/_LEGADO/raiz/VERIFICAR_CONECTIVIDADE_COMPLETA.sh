#!/bin/bash
# Script para verificar conectividade completa após correção IPv6

echo "=== VERIFICAÇÃO COMPLETA DA CONECTIVIDADE ==="
echo ""

# 1. Verificar configuração do Nginx
echo "1. Verificando configuração do Nginx..."
if grep -q "proxy_pass http://127.0.0.1:3000" /etc/nginx/sites-available/sispat; then
    echo "✅ Nginx configurado corretamente (127.0.0.1:3000)"
else
    echo "❌ Nginx ainda usando localhost"
fi
echo ""

# 2. Verificar backend direto
echo "2. Testando backend diretamente..."
if curl -s http://127.0.0.1:3000/api/health | grep -q "ok"; then
    echo "✅ Backend respondendo em 127.0.0.1:3000"
else
    echo "❌ Backend não responde diretamente"
fi
echo ""

# 3. Verificar proxy do Nginx
echo "3. Testando proxy do Nginx..."
if curl -s http://localhost/api/health | grep -q "ok"; then
    echo "✅ Nginx fazendo proxy corretamente"
else
    echo "❌ Nginx não consegue fazer proxy"
fi
echo ""

# 4. Verificar endpoint público
echo "4. Testando endpoint público..."
if curl -s http://localhost/api/public/system-configuration | grep -q "id"; then
    echo "✅ Endpoint público funcionando"
else
    echo "❌ Endpoint público não responde"
fi
echo ""

# 5. Verificar PM2
echo "5. Verificando PM2..."
if pm2 list | grep -q "sispat-backend.*online"; then
    echo "✅ PM2 rodando normalmente"
    pm2 list | grep sispat-backend
else
    echo "❌ PM2 não está rodando"
fi
echo ""

# 6. Verificar logs recentes do Nginx (últimos 5 minutos)
echo "6. Verificando erros recentes do Nginx..."
RECENT_ERRORS=$(tail -50 /var/log/nginx/error.log | grep "$(date +%Y/%m/%d)" | grep -v "17:4[0-9]" | grep -v "17:5[0-2]" | grep -i "error\|failed" | wc -l)
if [ "$RECENT_ERRORS" -eq 0 ]; then
    echo "✅ Nenhum erro recente no Nginx"
else
    echo "⚠️  Encontrados $RECENT_ERRORS erros recentes"
    tail -50 /var/log/nginx/error.log | grep "$(date +%Y/%m/%d)" | grep -v "17:4[0-9]" | grep -v "17:5[0-2]" | grep -i "error\|failed" | tail -5
fi
echo ""

# 7. Verificar porta 3000
echo "7. Verificando porta 3000..."
if ss -tlnp | grep -q ":3000" || netstat -tlnp 2>/dev/null | grep -q ":3000"; then
    echo "✅ Porta 3000 está em uso"
    ss -tlnp | grep ":3000" || netstat -tlnp 2>/dev/null | grep ":3000"
else
    echo "❌ Porta 3000 não está em uso"
fi
echo ""

# 8. Teste completo de conectividade externa
echo "8. Testando conectividade externa..."
DOMAIN=$(grep "server_name" /etc/nginx/sites-available/sispat | head -1 | awk '{print $2}' | tr -d ';')
if [ -n "$DOMAIN" ]; then
    echo "Testando: http://$DOMAIN/api/health"
    if curl -s "http://$DOMAIN/api/health" | grep -q "ok"; then
        echo "✅ Conectividade externa funcionando"
    else
        echo "⚠️  Conectividade externa pode ter problemas"
    fi
else
    echo "⚠️  Não foi possível determinar o domínio"
fi
echo ""

echo "=== RESUMO ==="
echo "Se todos os testes acima passaram, o sistema está funcionando corretamente."
echo "Teste o login no navegador: http://$DOMAIN"

