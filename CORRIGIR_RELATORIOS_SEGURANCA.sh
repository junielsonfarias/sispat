#!/bin/bash

# Script para aplicar correções de segurança no componente Relatorios
# Execute no servidor: bash CORRIGIR_RELATORIOS_SEGURANCA.sh

echo "🔧 Aplicando correções de segurança no componente Relatorios"
echo "============================================================"
echo ""

cd /var/www/sispat

# 1. Atualizar código
echo "1️⃣ Atualizando código..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "   ⚠️  Erro ao fazer git pull. Continuando..."
fi
echo ""

# 2. Verificar se as correções estão presentes
echo "2️⃣ Verificando correções no código..."
if grep -q "safeAccessInfo" src/pages/ferramentas/Relatorios.tsx 2>/dev/null; then
    echo "   ✅ Correções encontradas no código"
else
    echo "   ❌ Correções NÃO encontradas!"
    echo "   💡 Execute 'git pull origin main' para atualizar"
    exit 1
fi
echo ""

# 3. Corrigir permissões do vite
echo "3️⃣ Corrigindo permissões..."
chmod +x node_modules/.bin/vite 2>/dev/null || true
echo "   ✅ Permissões corrigidas"
echo ""

# 4. Recompilar frontend
echo "4️⃣ Recompilando frontend..."
npm run build 2>&1 | tee /tmp/frontend-build-seguranca.log
if [ $? -ne 0 ]; then
    echo "   ❌ Erro na compilação. Verifique: /tmp/frontend-build-seguranca.log"
    exit 1
fi
echo "   ✅ Frontend recompilado com sucesso"
echo ""

# 5. Verificar arquivos
echo "5️⃣ Verificando arquivos compilados..."
if [ -f "dist/index.html" ]; then
    echo "   ✅ dist/index.html existe"
else
    echo "   ❌ dist/index.html NÃO encontrado!"
    exit 1
fi
echo ""

# 6. Recarregar Nginx
echo "6️⃣ Recarregando Nginx..."
sudo systemctl reload nginx 2>/dev/null || sudo service nginx reload 2>/dev/null || true
echo "   ✅ Nginx recarregado"
echo ""

echo "✅ Correções aplicadas com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Limpe o cache do navegador (Ctrl+Shift+R)"
echo "   2. Acesse https://sispat.vps-kinghost.net/relatorios"
echo "   3. Se ainda houver erro, execute: bash DIAGNOSTICAR_ERRO_RELATORIOS.sh"
echo ""

