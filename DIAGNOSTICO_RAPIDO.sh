#!/bin/bash
# Script rápido de diagnóstico - Cole e execute diretamente no VPS

echo "=== DIAGNÓSTICO RÁPIDO SISPAT ==="
echo "Data: $(date)"
echo ""

echo "1. STATUS DO BACKEND (PM2):"
pm2 list 2>/dev/null || echo "PM2 não encontrado"
echo ""

echo "2. BACKEND ESCUTANDO NA PORTA 3000:"
if ss -tuln 2>/dev/null | grep -q ":3000" || netstat -tuln 2>/dev/null | grep -q ":3000"; then
    echo "✓ Backend está escutando na porta 3000"
else
    echo "✗ Backend NÃO está escutando na porta 3000"
fi
echo ""

echo "3. STATUS DO NGINX:"
if systemctl is-active --quiet nginx; then
    echo "✓ Nginx está rodando"
else
    echo "✗ Nginx NÃO está rodando"
fi
echo ""

echo "4. HEALTH CHECK:"
HEALTH=$(curl -s http://localhost:3000/api/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✓ Health check OK"
    echo "$HEALTH"
else
    echo "✗ Health check falhou"
fi
echo ""

echo "5. RATE LIMITS NO REDIS:"
if command -v redis-cli &> /dev/null && redis-cli ping &> /dev/null 2>/dev/null; then
    echo "Chaves de rate limit ativas:"
    redis-cli --scan --pattern "rl:auth:*" 2>/dev/null | head -5 | while read key; do
        ttl=$(redis-cli ttl "$key" 2>/dev/null)
        value=$(redis-cli get "$key" 2>/dev/null)
        echo "  $key: $value (TTL: ${ttl}s)"
    done
else
    echo "Redis não disponível ou não configurado"
fi
echo ""

echo "6. ÚLTIMOS ERROS DO BACKEND:"
pm2 logs sispat-backend --lines 10 --nostream 2>/dev/null | grep -i "error\|erro\|fail" | tail -5 || echo "Nenhum erro recente"
echo ""

echo "7. VARIÁVEIS CRÍTICAS:"
cd /var/www/sispat 2>/dev/null || cd ~
if [ -f backend/.env ]; then
    echo "HOST: $(grep '^HOST=' backend/.env 2>/dev/null | cut -d'=' -f2)"
    echo "PORT: $(grep '^PORT=' backend/.env 2>/dev/null | cut -d'=' -f2)"
    echo "ENABLE_REDIS: $(grep '^ENABLE_REDIS=' backend/.env 2>/dev/null | cut -d'=' -f2)"
    echo "ENABLE_RATE_LIMIT: $(grep '^ENABLE_RATE_LIMIT=' backend/.env 2>/dev/null | cut -d'=' -f2)"
else
    echo ".env não encontrado"
fi
echo ""

echo "=== FIM DO DIAGNÓSTICO ==="
