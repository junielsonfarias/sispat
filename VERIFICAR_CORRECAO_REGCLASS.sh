#!/bin/bash

# Script para verificar se correção regclass foi aplicada corretamente
# Execute no servidor: bash VERIFICAR_CORRECAO_REGCLASS.sh

echo "🔍 Verificando correção regclass"
echo "================================="
echo ""

cd /var/www/sispat/backend

# 1. Verificar arquivo fonte
echo "1️⃣ Verificando arquivo fonte (src/config/metrics.ts):"
if grep -q "::text as regclass" src/config/metrics.ts; then
    echo "   ✅ Correção encontrada no arquivo fonte"
    grep -n "to_regclass.*documentos_gerais" src/config/metrics.ts
else
    echo "   ❌ Correção NÃO encontrada no arquivo fonte!"
    exit 1
fi

echo ""

# 2. Verificar código compilado
echo "2️⃣ Verificando código compilado (dist/config/metrics.js):"
if [ -f "dist/config/metrics.js" ]; then
    if grep -q "::text as regclass" dist/config/metrics.js; then
        echo "   ✅ Correção encontrada no código compilado"
        echo "   Linha encontrada:"
        grep -n "to_regclass.*documentos_gerais" dist/config/metrics.js | head -3
    else
        echo "   ❌ Correção NÃO encontrada no código compilado!"
        echo "   Buscando qualquer ocorrência de to_regclass:"
        grep -n "to_regclass" dist/config/metrics.js | head -5
        echo ""
        echo "   ⚠️  É necessário recompilar!"
        exit 1
    fi
else
    echo "   ❌ Arquivo dist/config/metrics.js não existe!"
    echo "   ⚠️  É necessário compilar!"
    exit 1
fi

echo ""

# 3. Verificar quando backend foi reiniciado
echo "3️⃣ Verificando quando backend foi reiniciado:"
pm2 list | grep sispat-backend
echo ""

# 4. Aguardar e verificar logs recentes
echo "4️⃣ Aguardando 60 segundos para coletar novos logs..."
echo "   (O erro ocorre a cada 30 segundos, então precisamos aguardar)"
sleep 60

echo ""
echo "5️⃣ Verificando logs dos últimos 2 minutos:"
CURRENT_TIME=$(date +%H:%M)
echo "   Hora atual: $CURRENT_TIME"
echo "   Procurando erros de regclass nos últimos 2 minutos..."
echo ""

# Buscar erros recentes (últimos 2 minutos)
pm2 logs sispat-backend --lines 100 --nostream | grep -i "regclass\|prisma:error" | tail -10

if [ $? -eq 0 ]; then
    echo ""
    echo "❌ Ainda há erros de regclass nos logs!"
    echo "   Verifique se o código compilado foi realmente atualizado."
    echo ""
    echo "   Execute:"
    echo "   pm2 logs sispat-backend --lines 50"
else
    echo ""
    echo "✅ Nenhum erro de regclass encontrado nos logs recentes!"
    echo "   A correção parece estar funcionando."
fi

echo ""
echo "📋 Para monitorar em tempo real:"
echo "   pm2 logs sispat-backend --lines 0 | grep -i regclass"

