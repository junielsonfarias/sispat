#!/bin/bash

# Script para testar o backend manualmente e ver erros
# Autor: GPT-4

cd /var/www/sispat/backend || exit 1

echo "=== TESTANDO BACKEND MANUALMENTE ==="
echo ""

# Parar o PM2
echo "1. Parando backend no PM2..."
pm2 stop sispat-backend 2>/dev/null
sleep 2

# Verificar arquivo compilado
echo ""
echo "2. Verificando arquivo compilado..."
if [ -f dist/index.js ]; then
    echo "✓ Arquivo existe: dist/index.js"
    ls -lh dist/index.js
else
    echo "✗ Arquivo não existe! Recompilando..."
    npm run build
fi

# Verificar .env
echo ""
echo "3. Verificando .env..."
if [ -f .env ]; then
    echo "✓ Arquivo .env existe"
    echo "PORT: $(grep '^PORT=' .env | cut -d'=' -f2)"
    echo "HOST: $(grep '^HOST=' .env | cut -d'=' -f2)"
    echo "NODE_ENV: $(grep '^NODE_ENV=' .env | cut -d'=' -f2)"
    if grep -q "^JWT_SECRET=" .env; then
        echo "✓ JWT_SECRET configurado"
    else
        echo "✗ JWT_SECRET NÃO configurado!"
    fi
else
    echo "✗ Arquivo .env NÃO existe!"
fi

# Tentar executar diretamente
echo ""
echo "4. Tentando executar backend diretamente..."
echo "   (Isso vai mostrar o erro real)"
echo ""

# Carregar variáveis de ambiente
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Executar e capturar erro
timeout 10 node dist/index.js 2>&1 || echo ""
echo ""
echo "=== FIM DO TESTE ==="
echo ""
echo "Reiniciando no PM2..."
pm2 start backend/dist/index.js --name sispat-backend
