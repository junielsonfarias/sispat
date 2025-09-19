#!/bin/bash

echo "🏗️ Fazendo build para produção..."

# Limpar builds anteriores
rm -rf dist/

# Instalar dependências
npm install --production

# Build do frontend
npm run build

# Verificar se o build foi criado
if [ ! -d "dist" ]; then
    echo "❌ Erro: Diretório dist não foi criado"
    exit 1
fi

echo "✅ Build de produção criado com sucesso!"
echo "📁 Diretório: $(pwd)/dist"