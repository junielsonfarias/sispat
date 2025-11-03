#!/bin/bash

# Script para atualizar código em produção
# Uso: bash scripts/atualizar-producao.sh

set -e

echo "🔄 Atualizando código em produção..."

cd /var/www/sispat

# 1. Corrigir permissões do Git
echo "📁 Configurando permissões do Git..."
git config --global --add safe.directory /var/www/sispat

# 2. Atualizar código
echo "📥 Baixando atualizações..."
git pull origin main || {
    echo "⚠️  Git pull falhou. Tentando corrigir permissões..."
    chown -R root:root .git
    git pull origin main
}

# 3. Corrigir permissões do node_modules/.bin
echo "🔧 Corrigindo permissões de execução..."
cd backend
chmod +x node_modules/.bin/* 2>/dev/null || true
chmod +x node_modules/typescript/bin/tsc 2>/dev/null || true

# 4. Recompilar backend
echo "🔨 Recompilando backend..."
npm run build:prod

# 5. Reiniciar PM2
echo "🔄 Reiniciando backend..."
pm2 restart sispat-backend

# 6. Aguardar e verificar
sleep 5
echo "✅ Verificando status..."
pm2 status

echo ""
echo "✅ Atualização concluída!"
echo "📋 Ver logs: pm2 logs sispat-backend --lines 50"

