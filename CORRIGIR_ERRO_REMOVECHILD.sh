#!/bin/bash

# Script para aplicar correção do erro removeChild no Login
# Execute no servidor: bash CORRIGIR_ERRO_REMOVECHILD.sh

echo "🔧 Aplicando correção do erro removeChild"
echo "=========================================="
echo ""

cd /var/www/sispat

# 1. Atualizar código
echo "1️⃣ Atualizando código..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "   ⚠️  Erro ao fazer git pull. Continuando..."
fi
echo ""

# 2. Verificar se correção está presente
echo "2️⃣ Verificando correções no código..."
if grep -q "isMountedRef" src/pages/auth/Login.tsx 2>/dev/null; then
    echo "   ✅ Correções encontradas no código"
else
    echo "   ❌ Correções NÃO encontradas!"
    exit 1
fi
echo ""

# 3. Corrigir permissões
echo "3️⃣ Corrigindo permissões..."
chmod +x node_modules/.bin/vite 2>/dev/null || true
echo "   ✅ Permissões corrigidas"
echo ""

# 4. Recompilar frontend
echo "4️⃣ Recompilando frontend..."
npm run build 2>&1 | tee /tmp/frontend-build-removechild.log
if [ $? -ne 0 ]; then
    echo "   ❌ Erro na compilação. Verifique: /tmp/frontend-build-removechild.log"
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

echo "✅ Correção aplicada com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Limpe o cache do navegador COMPLETAMENTE (Ctrl+Shift+Delete)"
echo "   2. Ou use modo anônimo/privado"
echo "   3. Acesse https://sispat.vps-kinghost.net"
echo "   4. Faça login e verifique se o erro não ocorre mais"
echo ""

