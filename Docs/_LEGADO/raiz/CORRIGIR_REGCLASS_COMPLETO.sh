#!/bin/bash

# Script completo para corrigir erro regclass e problemas de permissão
# Execute no servidor: bash CORRIGIR_REGCLASS_COMPLETO.sh

set -e

echo "🔧 Correção completa do erro regclass"
echo "======================================"
echo ""

cd /var/www/sispat/backend

# 1. Verificar se correção foi aplicada no arquivo fonte
echo "1️⃣ Verificando arquivo fonte..."
if grep -q "to_regclass('public.documentos_gerais')::text" src/config/metrics.ts; then
    echo "   ✅ Correção já aplicada no fonte"
else
    echo "   ⚠️  Aplicando correção no arquivo fonte..."
    sed -i "s/to_regclass('public.documentos_gerais') as regclass/to_regclass('public.documentos_gerais')::text as regclass/g" src/config/metrics.ts
    echo "   ✅ Correção aplicada"
fi

# 2. Corrigir todas as permissões necessárias
echo ""
echo "2️⃣ Corrigindo permissões..."
chmod +x node_modules/.bin/* 2>/dev/null || true
chmod +x node_modules/typescript/bin/tsc 2>/dev/null || true
chmod +x node_modules/.prisma/client/* 2>/dev/null || true
chmod +x node_modules/@prisma/client/* 2>/dev/null || true
find node_modules/.bin -type f -exec chmod +x {} \; 2>/dev/null || true
echo "   ✅ Permissões corrigidas"

# 3. Limpar build anterior
echo ""
echo "3️⃣ Limpando build anterior..."
rm -rf dist
echo "   ✅ Build anterior removido"

# 4. Gerar Prisma Client manualmente primeiro
echo ""
echo "4️⃣ Gerando Prisma Client..."
npx prisma generate || {
    echo "   ⚠️  Tentando com caminho completo..."
    /usr/bin/node node_modules/prisma/build/index.js generate || {
        echo "   ⚠️  Tentando com npm..."
        npm run prisma:generate
    }
}
echo "   ✅ Prisma Client gerado"

# 5. Compilar TypeScript
echo ""
echo "5️⃣ Compilando TypeScript..."
npx tsc || {
    echo "   ⚠️  Tentando com caminho completo..."
    node_modules/.bin/tsc || {
        echo "   ⚠️  Tentando com npm..."
        npm run build
    }
}
echo "   ✅ TypeScript compilado"

# 6. Verificar se dist foi criado
echo ""
echo "6️⃣ Verificando build..."
if [ -f "dist/index.js" ]; then
    echo "   ✅ Build criado com sucesso"
    ls -lh dist/index.js
else
    echo "   ❌ ERRO: dist/index.js não foi criado!"
    echo "   Verifique os erros acima"
    exit 1
fi

# 7. Verificar se correção está no código compilado
echo ""
echo "7️⃣ Verificando correção no código compilado..."
if grep -q "::text as regclass" dist/config/metrics.js 2>/dev/null; then
    echo "   ✅ Correção encontrada no código compilado"
else
    echo "   ⚠️  Correção não encontrada no código compilado"
    echo "   Tentando compilar novamente..."
    npm run build:prod
fi

# 8. Reiniciar PM2
echo ""
echo "8️⃣ Reiniciando PM2..."
pm2 delete sispat-backend 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
echo "   ✅ PM2 reiniciado"

# 9. Aguardar e verificar
echo ""
echo "9️⃣ Aguardando backend iniciar..."
sleep 10

echo ""
echo "🔟 Verificando status..."
pm2 status

echo ""
echo "✅ Processo concluído!"
echo ""
echo "📋 Verifique os logs em 1 minuto:"
echo "   pm2 logs sispat-backend --lines 30 | grep -i regclass"
echo ""
echo "Se não aparecer nenhum erro de regclass, a correção foi bem-sucedida!"

