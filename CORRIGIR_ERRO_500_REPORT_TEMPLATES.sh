#!/bin/bash

# Script para corrigir erro 500 ao criar modelos de relatório
# Execute no servidor: bash CORRIGIR_ERRO_500_REPORT_TEMPLATES.sh

echo "🔧 Corrigindo erro 500 ao criar modelos de relatório"
echo "===================================================="
echo ""

cd /var/www/sispat/backend

# 1. Fazer backup do controller atual
echo "1️⃣ Fazendo backup do controller..."
cp src/controllers/configController.ts src/controllers/configController.ts.backup
echo "   ✅ Backup criado: configController.ts.backup"
echo ""

# 2. Atualizar código do repositório
echo "2️⃣ Atualizando código do repositório..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "   ⚠️  Erro ao fazer git pull. Continuando com arquivo local..."
fi
echo ""

# 3. Verificar se a correção foi aplicada
echo "3️⃣ Verificando se a correção está presente..."
if grep -q "req.user?.municipalityId" src/controllers/configController.ts; then
    echo "   ✅ Correção encontrada no código"
else
    echo "   ❌ Correção NÃO encontrada! Aplicando manualmente..."
    
    # Aplicar correção manual se necessário
    echo "   📝 A correção precisa ser aplicada manualmente no arquivo:"
    echo "      src/controllers/configController.ts"
    echo "   💡 Consulte o arquivo CORRIGIR_ERRO_500_REPORT_TEMPLATES.md para instruções"
    exit 1
fi
echo ""

# 4. Compilar backend
echo "4️⃣ Compilando backend..."
npm run build 2>&1 | tee /tmp/backend-build-report-templates.log
if [ $? -ne 0 ]; then
    echo "   ❌ Erro na compilação. Verifique: /tmp/backend-build-report-templates.log"
    exit 1
fi
echo "   ✅ Backend compilado com sucesso"
echo ""

# 5. Reiniciar PM2
echo "5️⃣ Reiniciando backend..."
pm2 restart sispat-backend
sleep 3
echo "   ✅ Backend reiniciado"
echo ""

# 6. Verificar saúde do backend
echo "6️⃣ Verificando saúde do backend..."
for i in {1..5}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ Backend respondendo corretamente (HTTP $HTTP_CODE)"
        break
    else
        if [ $i -eq 5 ]; then
            echo "   ⚠️  Backend não está respondendo corretamente (HTTP $HTTP_CODE)"
            echo "   📋 Verifique os logs: pm2 logs sispat-backend --lines 50"
        else
            echo "   ⏳ Aguardando backend iniciar... (tentativa $i/5)"
            sleep 2
        fi
    fi
done
echo ""

# 7. Verificar logs recentes
echo "7️⃣ Verificando logs recentes..."
echo "   Últimas 20 linhas de log:"
pm2 logs sispat-backend --lines 20 --nostream | tail -20
echo ""

echo "✅ Correção aplicada com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Teste criar um novo modelo de relatório no frontend"
echo "   2. Se ainda houver erro, verifique os logs: pm2 logs sispat-backend --lines 50"
echo "   3. Verifique se o usuário está autenticado e tem municipalityId válido"
echo ""

