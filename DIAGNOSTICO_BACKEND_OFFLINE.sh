#!/bin/bash

# Script de diagnóstico completo para backend offline
# Execute no servidor: bash DIAGNOSTICO_BACKEND_OFFLINE.sh

echo "🔍 DIAGNÓSTICO COMPLETO - Backend Offline"
echo "=========================================="
echo ""

# 1. Verificar PM2
echo "1️⃣ Status do PM2:"
pm2 status
echo ""

# 2. Verificar se processo está rodando
echo "2️⃣ Verificando processo Node.js na porta 3000:"
if netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp 2>/dev/null | grep :3000; then
    echo "   ✅ Porta 3000 está em uso"
else
    echo "   ❌ Porta 3000 NÃO está em uso!"
    echo "   Backend pode não estar escutando corretamente."
fi
echo ""

# 3. Testar backend localmente
echo "3️⃣ Testando backend localmente:"
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "   ✅ Backend responde localmente"
    curl -s http://localhost:3000/api/health | head -5
else
    echo "   ❌ Backend NÃO responde localmente!"
    echo "   Erro de conexão ao tentar acessar localhost:3000"
fi
echo ""

# 4. Verificar logs do PM2
echo "4️⃣ Últimas linhas dos logs do PM2:"
pm2 logs sispat-backend --lines 20 --nostream | tail -20
echo ""

# 5. Verificar se backend está escutando em localhost ou 0.0.0.0
echo "5️⃣ Verificando em qual interface o backend está escutando:"
netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp 2>/dev/null | grep :3000
echo ""

# 6. Verificar configuração do Nginx
echo "6️⃣ Verificando configuração do Nginx:"
if nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Configuração do Nginx válida"
    echo "   Configuração do proxy:"
    grep -A 10 "location /api" /etc/nginx/sites-available/sispat | head -10
else
    echo "   ❌ Erro na configuração do Nginx!"
    nginx -t
fi
echo ""

# 7. Verificar status do Nginx
echo "7️⃣ Status do Nginx:"
systemctl status nginx --no-pager | head -10
echo ""

# 8. Testar proxy do Nginx
echo "8️⃣ Testando proxy do Nginx:"
if curl -s http://localhost/api/health > /dev/null; then
    echo "   ✅ Nginx consegue fazer proxy para backend"
    curl -s http://localhost/api/health | head -5
else
    echo "   ❌ Nginx NÃO consegue fazer proxy para backend!"
fi
echo ""

# 9. Verificar variável PORT no .env
echo "9️⃣ Verificando variável PORT:"
cd /var/www/sispat/backend
if [ -f ".env" ]; then
    grep "PORT" .env || echo "   PORT não definido no .env (usará padrão 3000)"
else
    echo "   ⚠️  Arquivo .env não encontrado!"
fi
echo ""

# 10. Verificar se backend está escutando em 0.0.0.0 ou 127.0.0.1
echo "🔟 Verificando interface de escuta:"
LISTENING=$(netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp 2>/dev/null | grep :3000)
if echo "$LISTENING" | grep -q "127.0.0.1"; then
    echo "   ✅ Backend escutando em 127.0.0.1:3000 (correto para Nginx)"
elif echo "$LISTENING" | grep -q "0.0.0.0"; then
    echo "   ✅ Backend escutando em 0.0.0.0:3000 (também funciona)"
else
    echo "   ⚠️  Não foi possível determinar interface de escuta"
fi
echo ""

echo "📋 RESUMO:"
echo "=========="
echo ""
echo "Se porta 3000 não está em uso:"
echo "  → Backend não está rodando. Execute: pm2 restart sispat-backend"
echo ""
echo "Se backend não responde localmente:"
echo "  → Verifique logs: pm2 logs sispat-backend --lines 50"
echo ""
echo "Se Nginx não consegue fazer proxy:"
echo "  → Verifique configuração: cat /etc/nginx/sites-available/sispat"
echo "  → Teste Nginx: systemctl status nginx"

