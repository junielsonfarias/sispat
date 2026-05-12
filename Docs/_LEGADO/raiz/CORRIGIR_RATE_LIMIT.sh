#!/bin/bash
# Script para aplicar correção de rate limiting e reiniciar backend

set -e

cd /var/www/sispat/backend

echo "=== CORRIGINDO RATE LIMITING ==="
echo ""

# 1. Verificar se já tem as mudanças
if grep -q "max: (req: any) =>" src/middlewares/advanced-rate-limit.ts 2>/dev/null; then
    echo "✅ Correção já aplicada no código fonte"
else
    echo "⚠️  Correção não encontrada. Aplicando manualmente..."
    
    # Aplicar correção manualmente
    sed -i 's/max: 100, \/\/ 100 requests/max: (req: any) => {\n    const authHeader = req.headers.authorization\n    if (authHeader && authHeader.startsWith("Bearer ")) {\n      return 1000\n    }\n    return 500\n  },/' src/middlewares/advanced-rate-limit.ts
    
    # Adicionar exceção para rotas públicas
    sed -i 's/req.path.startsWith(\x27\/api\/health\x27) || req.path.startsWith(\x27\/health\x27)/req.path.startsWith(\x27\/api\/health\x27) || req.path.startsWith(\x27\/health\x27) || req.path.startsWith(\x27\/api\/public\x27)/' src/middlewares/advanced-rate-limit.ts
    
    echo "✅ Correção aplicada manualmente"
fi

echo ""

# 2. Recompilar backend
echo "2. Recompilando backend..."
rm -rf dist
npm run build:prod

if [ $? -eq 0 ]; then
    echo "✅ Backend recompilado com sucesso"
else
    echo "❌ Erro na recompilação. Verifique os logs acima."
    exit 1
fi

echo ""

# 3. Reiniciar PM2
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
echo "Rate limiting corrigido!"
echo ""
echo "Limites atualizados:"
echo "  - Não autenticados: 500 requisições / 15 minutos"
echo "  - Autenticados: 1000 requisições / 15 minutos"
echo "  - Rotas públicas: sem limite"
echo ""
echo "Teste novamente no navegador!"

