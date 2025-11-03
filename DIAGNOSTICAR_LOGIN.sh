#!/bin/bash
# Script para diagnosticar problemas de login

echo "=== DIAGNÓSTICO DE LOGIN ==="
echo ""

cd /var/www/sispat/backend

# Carregar variáveis do .env
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

SUPERUSER_EMAIL="${SUPERUSER_EMAIL:-admin@sispat.local}"

echo "1. Verificando usuário no banco de dados..."
echo "   Email: $SUPERUSER_EMAIL"
echo ""

# Verificar se usuário existe
USER_EXISTS=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { email: '$SUPERUSER_EMAIL' },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true, 
        isActive: true,
        municipalityId: true
      }
    });
    if (user) {
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('NOT_FOUND');
    }
  } catch (e) {
    console.log('ERROR: ' + e.message);
  } finally {
    await prisma.\$disconnect();
  }
})();
" 2>/dev/null)

if [ "$USER_EXISTS" = "NOT_FOUND" ]; then
    echo "❌ Usuário não encontrado no banco de dados!"
    echo ""
    echo "Execute o seed para criar o usuário:"
    echo "  npm run prisma:seed:prod"
    exit 1
elif echo "$USER_EXISTS" | grep -q "ERROR"; then
    echo "❌ Erro ao verificar usuário:"
    echo "$USER_EXISTS"
    exit 1
else
    echo "✅ Usuário encontrado:"
    echo "$USER_EXISTS"
fi
echo ""

echo "2. Verificando logs recentes do backend (últimas tentativas de login)..."
echo ""
pm2 logs sispat-backend --lines 50 --nostream | grep -i -E "login|auth|error|invalid|credentials" | tail -20 || echo "Nenhum log de login encontrado"
echo ""

echo "3. Testando endpoint de login diretamente..."
echo ""
LOGIN_TEST=$(curl -s -X POST https://sispat.vps-kinghost.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SUPERUSER_EMAIL\",\"password\":\"test\"}" \
  -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$LOGIN_TEST" | grep "HTTP_CODE" | cut -d: -f2)
RESPONSE=$(echo "$LOGIN_TEST" | grep -v "HTTP_CODE")

echo "   Resposta do servidor (HTTP $HTTP_CODE):"
echo "$RESPONSE" | head -5
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Login está funcionando!"
    echo "   Token recebido: $(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4 | head -c 50)..."
elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ Credenciais inválidas (senha incorreta)"
elif [ "$HTTP_CODE" = "500" ]; then
    echo "❌ Erro interno do servidor"
    echo "   Verifique os logs: pm2 logs sispat-backend"
else
    echo "⚠️  Status HTTP inesperado: $HTTP_CODE"
fi
echo ""

echo "4. Verificando configuração de CORS e cookies..."
echo ""
# Verificar configuração de CORS no backend
if grep -q "cors" backend/src/index.ts 2>/dev/null; then
    echo "✅ CORS configurado no backend"
    grep -A 5 "cors" backend/src/index.ts | head -10
else
    echo "⚠️  CORS não encontrado na configuração"
fi
echo ""

echo "5. Verificando variáveis de ambiente relacionadas a autenticação..."
echo ""
grep -E "JWT_SECRET|JWT_EXPIRES|SESSION|COOKIE" .env 2>/dev/null | sed 's/=.*/=***/' || echo "Nenhuma variável de autenticação encontrada"
echo ""

echo "=== RESUMO E SOLUÇÕES ==="
echo ""
if [ "$HTTP_CODE" = "401" ]; then
    echo "❌ Problema: Credenciais inválidas"
    echo ""
    echo "POSSÍVEIS CAUSAS:"
    echo "  1. Senha incorreta no banco de dados"
    echo "  2. Hash da senha não corresponde"
    echo "  3. Usuário inativo (isActive=false)"
    echo ""
    echo "SOLUÇÕES:"
    echo "  1. Verificar senha no .env:"
    echo "     grep SUPERUSER_PASSWORD /var/www/sispat/backend/.env"
    echo ""
    echo "  2. Recriar usuário com senha correta:"
    echo "     cd /var/www/sispat/backend"
    echo "     npm run prisma:seed:prod"
    echo ""
    echo "  3. Verificar se usuário está ativo:"
    echo "     Execute este script novamente e verifique 'isActive: true'"
elif [ "$HTTP_CODE" = "500" ]; then
    echo "❌ Problema: Erro interno do servidor"
    echo ""
    echo "SOLUÇÃO:"
    echo "  1. Verificar logs detalhados:"
    echo "     pm2 logs sispat-backend --lines 100"
    echo ""
    echo "  2. Verificar se banco de dados está acessível:"
    echo "     cd /var/www/sispat/backend"
    echo "     npx prisma db execute --stdin <<< 'SELECT 1;'"
elif [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Login está funcionando!"
    echo ""
    echo "Se você ainda recebe erro no navegador:"
    echo "  1. Limpe cookies e cache do navegador"
    echo "  2. Tente em modo anônimo/privado"
    echo "  3. Verifique console do navegador (F12) para erros de CORS"
else
    echo "⚠️  Problema desconhecido. Verifique os logs acima."
fi

