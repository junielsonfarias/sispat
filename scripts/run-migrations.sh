#!/bin/bash

echo "🗄️ Executando migrações do banco de dados..."

# Verificar se o banco está rodando
if ! pg_isready -h localhost -p 5432 -U sispat_user; then
    echo "❌ PostgreSQL não está rodando. Execute: sudo systemctl start postgresql"
    exit 1
fi

# Executar migrações
cd "$(dirname "$0")/.."
node server/database/migrate.js

echo "✅ Migrações executadas com sucesso!"