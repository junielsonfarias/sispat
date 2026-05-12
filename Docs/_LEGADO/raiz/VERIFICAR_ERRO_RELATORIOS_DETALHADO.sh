#!/bin/bash

# Script detalhado para verificar erro na página de relatórios
# Execute no servidor: bash VERIFICAR_ERRO_RELATORIOS_DETALHADO.sh

echo "🔍 DIAGNÓSTICO DETALHADO - Erro na Página de Relatórios"
echo "======================================================="
echo ""

cd /var/www/sispat

# 1. Verificar se backend está rodando
echo "1️⃣ Status do Backend:"
echo "-------------------"
pm2 status | grep sispat-backend
BACKEND_STATUS=$?
if [ $BACKEND_STATUS -ne 0 ]; then
    echo "   ❌ Backend NÃO está rodando!"
    echo "   → Iniciando backend..."
    cd backend
    pm2 start dist/index.js --name sispat-backend
    sleep 3
    cd ..
else
    echo "   ✅ Backend está rodando"
fi
echo ""

# 2. Verificar logs do backend procurando por erros relacionados a report-templates
echo "2️⃣ Últimos 100 logs do backend (erros relacionados a relatórios):"
echo "----------------------------------------------------------------"
pm2 logs sispat-backend --lines 100 --nostream | grep -i "error\|erro\|fail\|report-template\|relatorio\|configController" | tail -30
echo ""

# 3. Testar endpoint de report-templates diretamente
echo "3️⃣ Testando endpoint /api/config/report-templates:"
echo "--------------------------------------------------"
echo "Fazendo requisição GET..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://127.0.0.1:3000/api/config/report-templates 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

echo "   HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Endpoint respondeu com sucesso"
    echo "   Resposta (primeiras 500 caracteres):"
    echo "$BODY" | head -c 500
    echo ""
    echo ""
    echo "   Total de templates: $(echo "$BODY" | grep -o '"id"' | wc -l)"
else
    echo "   ❌ Endpoint retornou erro HTTP $HTTP_CODE"
    echo "   Resposta completa:"
    echo "$BODY"
fi
echo ""

# 4. Verificar se há templates no banco de dados
echo "4️⃣ Verificando templates no banco de dados:"
echo "-------------------------------------------"
cd backend
if [ -f ".env" ]; then
    DB_URL=$(grep DATABASE_URL .env | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
    if [ -n "$DB_URL" ]; then
        echo "   Conectando ao banco..."
        psql "$DB_URL" -c "SELECT COUNT(*) as total FROM report_templates;" 2>/dev/null || {
            echo "   ⚠️  Não foi possível conectar ao banco diretamente"
            echo "   Tentando via Node.js..."
            node -e "
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            prisma.reportTemplate.count().then(count => {
                console.log('   Total de templates:', count);
                prisma.\$disconnect();
            }).catch(err => {
                console.error('   Erro:', err.message);
                prisma.\$disconnect();
            });
            " 2>/dev/null || echo "   ⚠️  Não foi possível acessar via Node.js"
        }
    else
        echo "   ⚠️  DATABASE_URL não encontrado no .env"
    fi
else
    echo "   ⚠️  Arquivo .env não encontrado"
fi
cd ..
echo ""

# 5. Verificar logs do Nginx para erros 500/502/503
echo "5️⃣ Últimos erros do Nginx (relacionados a /relatorios ou /api):"
echo "---------------------------------------------------------------"
sudo tail -50 /var/log/nginx/error.log | grep -i "relatorios\|/api/config/report\|500\|502\|503" | tail -10 || echo "   Nenhum erro encontrado"
echo ""

# 6. Verificar configuração do Nginx para /api
echo "6️⃣ Verificando configuração do Nginx para /api:"
echo "----------------------------------------------"
if [ -f "/etc/nginx/sites-available/sispat" ]; then
    echo "   Configuração de proxy para /api:"
    grep -A 10 "location /api" /etc/nginx/sites-available/sispat | head -15
else
    echo "   ⚠️  Arquivo de configuração não encontrado"
fi
echo ""

# 7. Testar saúde do backend
echo "7️⃣ Testando saúde do backend:"
echo "-----------------------------"
HEALTH=$(curl -s http://127.0.0.1:3000/api/health 2>/dev/null)
if [ -n "$HEALTH" ]; then
    echo "   ✅ Backend está respondendo"
    echo "   Resposta: $HEALTH"
else
    echo "   ❌ Backend não está respondendo"
    echo "   Verificando porta 3000..."
    netstat -tlnp 2>/dev/null | grep 3000 || ss -tlnp 2>/dev/null | grep 3000 || echo "   ⚠️  Porta 3000 não está em uso"
fi
echo ""

# 8. Verificar variáveis de ambiente críticas
echo "8️⃣ Verificando variáveis críticas do backend:"
echo "--------------------------------------------"
cd backend
if [ -f ".env" ]; then
    echo "   JWT_SECRET: $(grep JWT_SECRET .env | cut -d'=' -f2 | cut -c1-20)..."
    echo "   HOST: $(grep '^HOST=' .env | cut -d'=' -f2)"
    echo "   PORT: $(grep '^PORT=' .env | cut -d'=' -f2)"
    echo "   NODE_ENV: $(grep '^NODE_ENV=' .env | cut -d'=' -f2)"
    echo "   DATABASE_URL: $(grep DATABASE_URL .env | cut -d'=' -f2 | cut -c1-30)..."
else
    echo "   ⚠️  Arquivo .env não encontrado"
fi
cd ..
echo ""

# 9. Verificar se o usuário está autenticado (verificar token JWT)
echo "9️⃣ Verificando autenticação:"
echo "---------------------------"
echo "   ⚠️  Para verificar autenticação, execute no navegador:"
echo "   1. Abra DevTools (F12)"
echo "   2. Vá em Application > Local Storage"
echo "   3. Procure por 'token' ou 'auth'"
echo "   4. Copie o token e teste:"
echo "      curl -H 'Authorization: Bearer SEU_TOKEN' http://127.0.0.1:3000/api/config/report-templates"
echo ""

# 10. Verificar console do navegador (instruções)
echo "🔟 Instruções para verificar console do navegador:"
echo "--------------------------------------------------"
echo "   1. Abra https://sispat.vps-kinghost.net/relatorios"
echo "   2. Pressione F12 para abrir DevTools"
echo "   3. Vá na aba 'Console'"
echo "   4. Procure por erros em vermelho"
echo "   5. Clique em 'Detalhes do erro' na página de erro"
echo "   6. Copie a mensagem de erro completa"
echo ""

echo "✅ Diagnóstico concluído!"
echo ""
echo "📋 Próximos passos baseados nos resultados:"
echo ""
echo "   Se o endpoint retornar 401 (Unauthorized):"
echo "   → Problema de autenticação. Verifique se o usuário está logado."
echo ""
echo "   Se o endpoint retornar 500 (Internal Server Error):"
echo "   → Verifique os logs do backend: pm2 logs sispat-backend --lines 100"
echo ""
echo "   Se o endpoint retornar 200 mas vazio []:"
echo "   → Não há templates no banco. Crie um template primeiro."
echo ""
echo "   Se o endpoint não responder:"
echo "   → Backend pode estar offline. Reinicie: pm2 restart sispat-backend"
echo ""

