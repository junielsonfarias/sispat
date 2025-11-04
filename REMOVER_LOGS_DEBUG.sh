#!/bin/bash
set -e

echo "🧹 Removendo logs de debug temporários"
echo "======================================="

cd /var/www/sispat

# Função para remover logs de debug mantendo a estrutura do código
remove_debug_logs() {
  local file=$1
  echo "📝 Processando: $file"
  
  # Criar backup
  cp "$file" "${file}.bak"
  
  # Remover linhas com console.log que contenham [DEBUG]
  sed -i '/console\.log.*\[DEBUG\]/d' "$file"
  sed -i '/console\.log.*DEBUG/d' "$file"
  sed -i '/console\.error.*\[ERROR\]/d' "$file"
  sed -i '/console\.warn.*\[DEBUG\]/d' "$file"
  
  # Remover comentários de log inicial
  sed -i '/LOG INICIAL PARA VERIFICAR/d' "$file"
  sed -i '/FORÇAR LOGS EM PRODUÇÃO/d' "$file"
  
  echo "✅ Logs removidos de: $file"
}

# Remover logs dos arquivos de inventário
echo ""
echo "🔍 Removendo logs de InventoryContext..."
if [ -f "src/contexts/InventoryContext.tsx" ]; then
  remove_debug_logs "src/contexts/InventoryContext.tsx"
fi

echo ""
echo "🔍 Removendo logs de InventarioCreate..."
if [ -f "src/pages/inventarios/InventarioCreate.tsx" ]; then
  remove_debug_logs "src/pages/inventarios/InventarioCreate.tsx"
fi

echo ""
echo "✅ LOGS DE DEBUG REMOVIDOS!"
echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo "   1. Recompilar frontend: npm run build"
echo "   2. Verificar se não quebrou nada"
echo "   3. Se tudo OK, fazer commit das mudanças"
echo ""
echo "   Backups salvos com extensão .bak"

