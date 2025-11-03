#!/bin/bash
# Script para verificar e criar superuser se necessário

set -e

cd /var/www/sispat/backend

echo "=== VERIFICAÇÃO DO SUPERUSER ==="
echo ""

# Carregar variáveis do .env
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Verificar credenciais no .env
SUPERUSER_EMAIL="${SUPERUSER_EMAIL:-admin@sispat.local}"
SUPERUSER_PASSWORD="${SUPERUSER_PASSWORD:-admin123}"
SUPERUSER_NAME="${SUPERUSER_NAME:-Administrador}"
MUNICIPALITY_NAME="${MUNICIPALITY_NAME:-Município Exemplo}"
STATE="${STATE:-SP}"
BCRYPT_ROUNDS="${BCRYPT_ROUNDS:-12}"

echo "📋 Configurações detectadas:"
echo "   Email: $SUPERUSER_EMAIL"
echo "   Nome: $SUPERUSER_NAME"
echo "   Município: $MUNICIPALITY_NAME / $STATE"
echo ""

# Verificar se superuser existe usando Node.js
echo "1. Verificando se superuser existe no banco de dados..."
SUPERUSER_EXISTS=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const user = await prisma.user.findUnique({ where: { email: '$SUPERUSER_EMAIL' } });
    console.log(user ? '1' : '0');
  } catch (e) {
    console.log('0');
  } finally {
    await prisma.\$disconnect();
  }
})();
" 2>/dev/null || echo "0")

if [ "$SUPERUSER_EXISTS" = "0" ] || [ -z "$SUPERUSER_EXISTS" ]; then
    echo "⚠️  Superuser não encontrado no banco de dados"
    echo ""
    echo "2. Executando seed para criar superuser..."
    echo ""
    
    # Exportar variáveis necessárias
    export MUNICIPALITY_NAME
    export STATE
    export SUPERUSER_EMAIL
    export SUPERUSER_PASSWORD
    export SUPERUSER_NAME
    export BCRYPT_ROUNDS
    
    # Executar seed
    if npm run prisma:seed:prod 2>&1 | tee /tmp/seed-run.log; then
        echo ""
        echo "✅ Seed executado com sucesso!"
        echo ""
        echo "3. Verificando novamente..."
        sleep 2
        SUPERUSER_EXISTS=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const user = await prisma.user.findUnique({ where: { email: '$SUPERUSER_EMAIL' } });
    console.log(user ? '1' : '0');
  } catch (e) {
    console.log('0');
  } finally {
    await prisma.\$disconnect();
  }
})();
" 2>/dev/null || echo "0")
        
        if [ "$SUPERUSER_EXISTS" != "0" ]; then
            echo "✅ Superuser criado com sucesso!"
        else
            echo "❌ Superuser ainda não existe. Verifique o log: /tmp/seed-run.log"
        fi
    else
        echo ""
        echo "❌ Erro ao executar seed. Verifique o log: /tmp/seed-run.log"
        exit 1
    fi
else
    echo "✅ Superuser já existe no banco de dados"
fi

echo ""
echo "=== CREDENCIAIS DE LOGIN ==="
echo "Email: $SUPERUSER_EMAIL"
echo "Senha: $SUPERUSER_PASSWORD"
echo ""
echo "⚠️  IMPORTANTE: Altere a senha após o primeiro acesso!"
echo ""
echo "=== CONCLUSÃO ==="
echo "Acesse: http://sispat.vps-kinghost.net"
echo "Use as credenciais acima para fazer login."
