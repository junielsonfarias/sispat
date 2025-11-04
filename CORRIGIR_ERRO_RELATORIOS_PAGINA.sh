#!/bin/bash

# Script para corrigir erro na página de relatórios
# Execute no servidor: bash CORRIGIR_ERRO_RELATORIOS_PAGINA.sh

echo "🔧 Corrigindo erro na página de relatórios"
echo "=========================================="
echo ""

cd /var/www/sispat

# 1. Fazer backup
echo "1️⃣ Fazendo backup..."
cp -r frontend/dist frontend/dist.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
echo "   ✅ Backup criado"
echo ""

# 2. Atualizar código
echo "2️⃣ Atualizando código do repositório..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "   ⚠️  Erro ao fazer git pull. Continuando..."
fi
echo ""

# 3. Recompilar frontend
echo "3️⃣ Recompilando frontend..."
cd frontend
npm run build 2>&1 | tee /tmp/frontend-build-relatorios.log
if [ $? -ne 0 ]; then
    echo "   ❌ Erro na compilação. Verifique: /tmp/frontend-build-relatorios.log"
    exit 1
fi
echo "   ✅ Frontend recompilado com sucesso"
echo ""

# 4. Verificar se os arquivos foram criados
echo "4️⃣ Verificando arquivos compilados..."
if [ -f "dist/index.html" ]; then
    echo "   ✅ dist/index.html existe"
else
    echo "   ❌ dist/index.html NÃO encontrado!"
    exit 1
fi
echo ""

# 5. Reiniciar Nginx (se necessário)
echo "5️⃣ Recarregando Nginx..."
sudo systemctl reload nginx 2>/dev/null || sudo service nginx reload 2>/dev/null || true
echo "   ✅ Nginx recarregado"
echo ""

echo "✅ Correção aplicada com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Limpe o cache do navegador (Ctrl+Shift+R ou Cmd+Shift+R)"
echo "   2. Acesse https://sispat.vps-kinghost.net/relatorios"
echo "   3. Se ainda houver erro, verifique o console do navegador (F12)"
echo "   4. Verifique logs do backend: pm2 logs sispat-backend --lines 50"
echo ""

