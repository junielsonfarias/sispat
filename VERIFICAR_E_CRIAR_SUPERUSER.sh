#!/bin/bash
# Script para verificar e criar superuser se necessário

set -e

cd /var/www/sispat/backend

echo "=== VERIFICAÇÃO DO SUPERUSER ==="
echo ""

# Carregar variáveis do .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Verificar se superuser existe
echo "1. Verificando se superuser existe no banco de dados..."
SUPERUSER_EXISTS=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM users WHERE email = '$SUPERUSER_EMAIL';" 2>/dev/null | grep -o '[0-9]' | head -1 || echo "0")

if [ "$SUPERUSER_EXISTS" = "0" ] || [ -z "$SUPERUSER_EXISTS" ]; then
    echo "⚠️  Superuser não encontrado no banco de dados"
    echo ""
    echo "2. Executando seed para criar superuser..."
    echo ""
    
    # Exportar variáveis necessárias
    export MUNICIPALITY_NAME="${MUNICIPALITY_NAME:-Município Exemplo}"
    export STATE="${STATE:-SP}"
    export SUPERUSER_EMAIL="${SUPERUSER_EMAIL:-admin@sispat.local}"
    export SUPERUSER_PASSWORD="${SUPERUSER_PASSWORD:-admin123}"
    export SUPERUSER_NAME="${SUPERUSER_NAME:-Administrador}"
    export BCRYPT_ROUNDS="${BCRYPT_ROUNDS:-10}"
    
    echo "Configurações:"
    echo "  - Email: $SUPERUSER_EMAIL"
    echo "  - Nome: $SUPERUSER_NAME"
    echo "  - Município: $MUNICIPALITY_NAME / $STATE"
    echo ""
    
    # Executar seed
    if npm run prisma:seed:prod 2>&1 | tee /tmp/seed-run.log; then
        echo ""
        echo "✅ Seed executado com sucesso!"
        echo ""
        echo "3. Verificando novamente..."
        sleep 2
        SUPERUSER_EXISTS=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM users WHERE email = '$SUPERUSER_EMAIL';" 2>/dev/null | grep -o '[0-9]' | head -1 || echo "0")
        
        if [ "$SUPERUSER_EXISTS" != "0" ]; then
            echo "✅ Superuser criado com sucesso!"
        else
            echo "❌ Superuser ainda não existe. Verifique o log: /tmp/seed-run.log"
        fi
    else
        echo ""
        echo "❌ Erro ao executar seed. Verifique: /tmp/seed-run.log"
        exit 1
    fi
else
    echo "✅ Superuser já existe no banco de dados"
    echo ""
    echo "2. Verificando informações do superuser..."
    echo ""
    echo "Email: $SUPERUSER_EMAIL"
    echo ""
    echo "Para fazer login, use:"
    echo "  Email: $SUPERUSER_EMAIL"
    echo "  Senha: (a senha configurada no .env)"
    echo ""
    echo "Para ver a senha configurada:"
    echo "  grep SUPERUSER_PASSWORD /var/www/sispat/backend/.env"
fi

echo ""
echo "=== VERIFICAÇÃO DE MUNICÍPIO ==="
MUNICIPALITY_EXISTS=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM municipalities WHERE name = '$MUNICIPALITY_NAME';" 2>/dev/null | grep -o '[0-9]' | head -1 || echo "0")
if [ "$MUNICIPALITY_EXISTS" = "0" ] || [ -z "$MUNICIPALITY_EXISTS" ]; then
    echo "⚠️  Município não encontrado. Execute o seed novamente."
else
    echo "✅ Município existe no banco de dados"
fi

echo ""
echo "=== CONCLUSÃO ==="
echo "Se o superuser foi criado, você pode fazer login com:"
echo "  Email: $SUPERUSER_EMAIL"
echo ""
echo "Se ainda houver problemas, verifique:"
echo "  - pm2 logs sispat-backend"
echo "  - /tmp/seed-run.log"
echo "  - Arquivo .env em /var/www/sispat/backend/.env"

