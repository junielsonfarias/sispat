#!/bin/bash

# Script de diagnóstico completo para erro na página de relatórios
# Execute no servidor: bash DIAGNOSTICAR_ERRO_RELATORIOS.sh

echo "🔍 DIAGNÓSTICO COMPLETO - Página de Relatórios"
echo "=============================================="
echo ""

cd /var/www/sispat

# 1. Verificar status do backend
echo "1️⃣ Status do Backend:"
echo "-------------------"
pm2 status | grep sispat-backend || echo "⚠️  Backend não está rodando!"
echo ""

# 2. Verificar logs recentes do backend
echo "2️⃣ Últimos 50 logs do backend (procurando erros):"
echo "------------------------------------------------"
pm2 logs sispat-backend --lines 50 --nostream | grep -i "error\|erro\|fail\|report-template" | tail -20 || echo "Nenhum erro encontrado nos logs recentes"
echo ""

# 3. Testar endpoint de report-templates
echo "3️⃣ Testando endpoint /api/config/report-templates:"
echo "--------------------------------------------------"
echo "Testando com curl..."
HTTP_CODE=$(curl -s -o /tmp/test-report-templates.json -w "%{http_code}" \
  -H "Authorization: Bearer $(pm2 logs sispat-backend --lines 200 --nostream | grep -o 'token.*' | head -1 | cut -d' ' -f2 2>/dev/null || echo '')" \
  http://127.0.0.1:3000/api/config/report-templates 2>/dev/null)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Endpoint respondeu com HTTP 200"
    echo "Resposta:"
    cat /tmp/test-report-templates.json | head -20
else
    echo "❌ Endpoint retornou HTTP $HTTP_CODE"
    echo "Resposta:"
    cat /tmp/test-report-templates.json
fi
echo ""

# 4. Verificar se há templates no banco
echo "4️⃣ Verificando templates no banco de dados:"
echo "-------------------------------------------"
cd backend
if [ -f ".env" ]; then
    DB_URL=$(grep DATABASE_URL .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "$DB_URL" ]; then
        echo "Conectando ao banco..."
        psql "$DB_URL" -c "SELECT id, name, \"municipalityId\", \"createdAt\" FROM report_templates LIMIT 5;" 2>/dev/null || echo "⚠️  Não foi possível conectar ao banco"
    else
        echo "⚠️  DATABASE_URL não encontrado no .env"
    fi
else
    echo "⚠️  Arquivo .env não encontrado"
fi
cd ..
echo ""

# 5. Verificar logs do Nginx
echo "5️⃣ Últimos erros do Nginx:"
echo "-------------------------"
sudo tail -30 /var/log/nginx/error.log | grep -i "relatorios\|report\|500\|502\|503" || echo "Nenhum erro relacionado encontrado"
echo ""

# 6. Verificar se os arquivos do frontend existem
echo "6️⃣ Verificando arquivos do frontend:"
echo "------------------------------------"
if [ -f "dist/index.html" ]; then
    echo "✅ dist/index.html existe"
    echo "Tamanho: $(du -h dist/index.html | cut -f1)"
else
    echo "❌ dist/index.html NÃO existe!"
fi

if [ -d "dist/assets/js" ]; then
    JS_FILES=$(find dist/assets/js -name "*.js" | wc -l)
    echo "✅ Encontrados $JS_FILES arquivos JS em dist/assets/js"
else
    echo "❌ Diretório dist/assets/js não existe!"
fi
echo ""

# 7. Verificar configuração do Nginx
echo "7️⃣ Verificando configuração do Nginx:"
echo "-------------------------------------"
if [ -f "/etc/nginx/sites-available/sispat" ]; then
    echo "✅ Arquivo de configuração existe"
    echo "Verificando se dist está configurado corretamente:"
    grep -A 5 "root\|location.*\/" /etc/nginx/sites-available/sispat | head -10
else
    echo "⚠️  Arquivo de configuração não encontrado em /etc/nginx/sites-available/sispat"
fi
echo ""

# 8. Verificar permissões dos arquivos
echo "8️⃣ Verificando permissões:"
echo "-------------------------"
ls -la dist/index.html 2>/dev/null | awk '{print "dist/index.html: " $1 " " $3 " " $4}'
ls -ld dist 2>/dev/null | awk '{print "dist/: " $1 " " $3 " " $4}'
echo ""

# 9. Testar saúde do backend
echo "9️⃣ Testando saúde do backend:"
echo "-----------------------------"
HEALTH=$(curl -s http://127.0.0.1:3000/api/health 2>/dev/null)
if [ -n "$HEALTH" ]; then
    echo "✅ Backend está respondendo"
    echo "$HEALTH" | head -5
else
    echo "❌ Backend não está respondendo em http://127.0.0.1:3000/api/health"
fi
echo ""

# 10. Verificar variáveis de ambiente do backend
echo "🔟 Verificando variáveis críticas do backend:"
echo "--------------------------------------------"
cd backend
if [ -f ".env" ]; then
    echo "JWT_SECRET: $(grep JWT_SECRET .env | cut -d'=' -f2 | cut -c1-20)..."
    echo "HOST: $(grep HOST .env | cut -d'=' -f2)"
    echo "PORT: $(grep PORT .env | cut -d'=' -f2)"
    echo "NODE_ENV: $(grep NODE_ENV .env | cut -d'=' -f2)"
else
    echo "⚠️  Arquivo .env não encontrado"
fi
cd ..
echo ""

echo "✅ Diagnóstico concluído!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Verifique os erros acima"
echo "   2. Se o endpoint retornar erro, verifique os logs: pm2 logs sispat-backend --lines 100"
echo "   3. Verifique o console do navegador (F12) para erros JavaScript"
echo ""

