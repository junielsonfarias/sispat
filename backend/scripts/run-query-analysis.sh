#!/bin/bash

# Script para executar análise de queries do banco de dados

echo "🔍 Iniciando análise de queries do banco de dados..."

cd "$(dirname "$0")/.."

# Verificar se Node está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado!"
    exit 1
fi

# Executar análise
node scripts/optimize-database-queries.js

echo ""
echo "✅ Análise concluída!"

