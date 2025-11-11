#!/bin/bash

# Script para otimizar banco de dados
# Executa ANALYZE nas tabelas principais

echo "🔧 Otimizando banco de dados..."

cd "$(dirname "$0")/.."

# Verificar se DATABASE_URL está configurado
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL não configurado!"
    echo "Configure a variável de ambiente ou use: export DATABASE_URL='...'"
    exit 1
fi

# Executar ANALYZE nas tabelas principais
echo "📊 Executando ANALYZE nas tabelas principais..."

npx prisma db execute --stdin <<EOF
ANALYZE patrimonios;
ANALYZE imoveis;
ANALYZE activity_logs;
ANALYZE users;
ANALYZE sectors;
ANALYZE locais;
EOF

echo "✅ Otimização concluída!"


