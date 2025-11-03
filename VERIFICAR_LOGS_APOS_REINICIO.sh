#!/bin/bash

# Script para verificar logs APENAS após o último reinício
# Execute no servidor: bash VERIFICAR_LOGS_APOS_REINICIO.sh

echo "🔍 Verificando logs APÓS último reinício"
echo "========================================="
echo ""

cd /var/www/sispat/backend

# 1. Confirmar correção no código compilado
echo "1️⃣ Verificando código compilado..."
if grep -q "::text as regclass" dist/config/metrics.js; then
    echo "   ✅ Correção confirmada: ::text está presente"
    echo "   Linha encontrada:"
    grep -n "to_regclass.*documentos_gerais" dist/config/metrics.js
else
    echo "   ❌ Correção NÃO encontrada!"
    exit 1
fi

echo ""

# 2. Verificar quando backend foi reiniciado pela última vez
echo "2️⃣ Status do backend:"
pm2 list | grep sispat-backend
BACKEND_UPTIME=$(pm2 jlist | grep -o '"pm_uptime":[0-9]*' | head -1 | cut -d: -f2)
if [ -n "$BACKEND_UPTIME" ]; then
    UPTIME_SECONDS=$((BACKEND_UPTIME / 1000))
    echo "   Backend está rodando há: ${UPTIME_SECONDS} segundos"
fi

echo ""

# 3. Obter timestamp do último reinício
echo "3️⃣ Buscando timestamp do último reinício nos logs..."
LAST_RESTART=$(pm2 logs sispat-backend --lines 200 --nostream | grep -i "WebSocket Server inicializado\|Health Monitoring iniciado" | tail -1 | grep -o "2025-[0-9-]*T[0-9:]*" | head -1)

if [ -n "$LAST_RESTART" ]; then
    echo "   Último reinício detectado: $LAST_RESTART"
    echo ""
    echo "4️⃣ Verificando erros APÓS $LAST_RESTART..."
    echo "   (Aguardando 90 segundos para coletar logs recentes)"
    sleep 90
    
    echo ""
    echo "5️⃣ Logs de erro APÓS reinício:"
    CURRENT_TIME=$(date +%H:%M:%S)
    echo "   Hora atual: $CURRENT_TIME"
    echo ""
    
    # Buscar erros que ocorreram após o último reinício
    pm2 logs sispat-backend --lines 100 --nostream | \
        awk -v restart="$LAST_RESTART" '
        BEGIN { found_restart = 0; errors_found = 0 }
        /WebSocket Server inicializado|Health Monitoring iniciado/ { found_restart = 1; next }
        found_restart == 1 && /regclass|prisma:error/ { 
            print; errors_found = 1 
        }
        END { 
            if (errors_found == 0) print "✅ Nenhum erro de regclass encontrado após o reinício!"
        }'
else
    echo "   ⚠️  Não foi possível detectar timestamp do reinício"
    echo "   Verificando todos os logs recentes..."
    sleep 60
    pm2 logs sispat-backend --lines 50 --nostream | grep -i "regclass\|prisma:error" | tail -10 || echo "✅ Nenhum erro encontrado!"
fi

echo ""
echo "📋 Para monitorar em tempo real:"
echo "   pm2 logs sispat-backend --lines 0"

