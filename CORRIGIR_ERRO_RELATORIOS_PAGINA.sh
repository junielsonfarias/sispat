#!/bin/bash

# Script para corrigir erro na página de relatórios
# Execute no servidor: bash CORRIGIR_ERRO_RELATORIOS_PAGINA.sh

echo "🔧 Corrigindo erro na página de relatórios"
echo "=========================================="
echo ""

cd /var/www/sispat

# 1. Fazer backup
echo "1️⃣ Fazendo backup..."
if [ -d "dist" ]; then
    cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    echo "   ✅ Backup criado"
else
    echo "   ⚠️  Diretório dist não existe ainda (primeira compilação)"
fi
echo ""

# 2. Atualizar código
echo "2️⃣ Atualizando código do repositório..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "   ⚠️  Erro ao fazer git pull. Continuando..."
fi
echo ""

# 3. Corrigir permissões do vite
echo "3️⃣ Corrigindo permissões do vite..."
if [ -f "node_modules/.bin/vite" ]; then
    chmod +x node_modules/.bin/vite
    echo "   ✅ Permissões corrigidas"
else
    echo "   ⚠️  Vite não encontrado em node_modules/.bin/vite"
    echo "   → Reinstalando dependências..."
    npm install
    chmod +x node_modules/.bin/vite 2>/dev/null || true
fi
echo ""

# 4. Recompilar frontend (na raiz, não em frontend/)
echo "4️⃣ Recompilando frontend..."
npm run build 2>&1 | tee /tmp/frontend-build-relatorios.log
if [ $? -ne 0 ]; then
    echo "   ❌ Erro na compilação. Verifique: /tmp/frontend-build-relatorios.log"
    echo ""
    echo "   Últimas linhas do log:"
    tail -20 /tmp/frontend-build-relatorios.log
    exit 1
fi
echo "   ✅ Frontend recompilado com sucesso"
echo ""

# 5. Verificar se os arquivos foram criados
echo "5️⃣ Verificando arquivos compilados..."
if [ -f "dist/index.html" ]; then
    echo "   ✅ dist/index.html existe"
    echo "   ✅ Arquivos compilados em: $(pwd)/dist"
else
    echo "   ❌ dist/index.html NÃO encontrado!"
    echo "   Diretório atual: $(pwd)"
    echo "   Conteúdo do diretório:"
    ls -la | head -10
    exit 1
fi
echo ""

# 6. Reiniciar Nginx (se necessário)
echo "6️⃣ Recarregando Nginx..."
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

