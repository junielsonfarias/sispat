#!/bin/bash
# Script para aplicar correção definitiva de rate limiting (v2)
# Desabilita rate limiting para requisições GET autenticadas

set -e

cd /var/www/sispat/backend

echo "=== CORRIGINDO RATE LIMITING V2 ==="
echo ""

# 1. Atualizar código do repositório
echo "1. Atualizando código do repositório..."
git pull

if [ $? -ne 0 ]; then
    echo "⚠️  Erro ao fazer git pull. Continuando com código local..."
fi

echo ""

# 2. Verificar se a correção já está aplicada
if grep -q "Requisições GET autenticadas: SEM rate limiting" src/middlewares/advanced-rate-limit.ts 2>/dev/null; then
    echo "✅ Correção já aplicada no código fonte"
else
    echo "⚠️  Correção não encontrada. Verifique se o git pull foi executado."
    echo "   Execute: git pull"
    exit 1
fi

echo ""

# 3. Recompilar backend
echo "2. Recompilando backend..."
rm -rf dist
npm run build:prod 2>&1 | tee /tmp/backend-build-rate-limit.log

if grep -qi "error" /tmp/backend-build-rate-limit.log; then
    echo "❌ Erro na recompilação. Verifique: /tmp/backend-build-rate-limit.log"
    exit 1
fi

if [ ! -d "dist" ]; then
    echo "❌ Diretório dist não encontrado após build"
    exit 1
fi

echo "✅ Backend recompilado com sucesso"
echo ""

# 4. Reiniciar PM2
echo "3. Reiniciando backend..."
pm2 restart sispat-backend
sleep 3

if pm2 list | grep -q "sispat-backend.*online"; then
    echo "✅ Backend reiniciado com sucesso"
else
    echo "❌ Backend não está rodando. Verifique: pm2 logs sispat-backend"
    exit 1
fi

echo ""
echo "=== CONCLUSÃO ==="
echo "Rate limiting corrigido (v2)!"
echo ""
echo "Configuração atualizada:"
echo "  ✅ Requisições GET autenticadas: SEM limite"
echo "  ✅ Requisições não autenticadas: 2000 req / 15 min"
echo "  ✅ Operações de escrita: Mantidas limitações específicas"
echo "  ✅ Rotas públicas: SEM limite"
echo ""
echo "O frontend agora pode carregar normalmente sem erros 429!"
echo ""
echo "Teste novamente no navegador."

