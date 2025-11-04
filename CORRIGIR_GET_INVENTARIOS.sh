#!/bin/bash
set -e

echo "🔧 CORRIGIR GET INVENTARIOS - Filtro incorreto"
echo "=============================================="

cd /var/www/sispat

# 1. Atualizar código
echo ""
echo "📥 1. Atualizando código do repositório..."
git config --global --add safe.directory /var/www/sispat
sudo git pull origin main

# 2. Recompilar backend
echo ""
echo "🔨 2. Recompilando backend..."
cd backend
npm run build

# 3. Limpar cache Redis (se disponível)
echo ""
echo "🧹 3. Limpando cache..."
if command -v redis-cli &> /dev/null; then
  redis-cli DEL 'inventarios:*' || echo "⚠️ Redis não disponível, cache em memória será limpo no restart"
fi

# 4. Reiniciar backend
echo ""
echo "🔄 4. Reiniciando backend..."
cd ..
pm2 restart sispat-backend

# 5. Aguardar reinício
echo ""
echo "⏳ Aguardando backend reiniciar..."
sleep 3

# 6. Verificar status
echo ""
echo "✅ Status do backend:"
pm2 list

echo ""
echo "📋 Últimos logs (20 linhas):"
pm2 logs sispat-backend --lines 20 --nostream

echo ""
echo "✅ CORREÇÃO APLICADA!"
echo ""
echo "📝 TESTE NO FRONTEND:"
echo "   1. Acesse o sistema"
echo "   2. Vá para 'Inventários'"
echo "   3. Verifique se os inventários aparecem na lista"
echo "   4. Limpe cache do navegador (Ctrl+Shift+R)"

