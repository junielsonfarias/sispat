#!/bin/bash

set -e

echo "🔧 Instalando dependências faltantes..."

cd /var/www/sispat

# Resolver conflito do git primeiro
git reset --hard origin/main 2>/dev/null || true
git pull origin main

# Instalar todas as dependências faltantes de uma vez
echo "📦 Instalando dependências críticas..."
npm install --save \
  xlsx@^0.18.5 \
  file-saver@^2.0.5 \
  jspdf@^3.0.3 \
  jspdf-autotable@^5.0.2 \
  qrcode@^1.5.4 \
  recharts@^2.15.4 \
  @tanstack/react-query@^5.90.2 \
  socket.io-client@^4.8.1 \
  --legacy-peer-deps

# Instalar dependências de desenvolvimento críticas (incluindo vite)
echo "📦 Instalando dependências de desenvolvimento..."
npm install --save-dev \
  vite@^5.4.21 \
  @vitejs/plugin-react@^5.0.0 \
  typescript@^5.5.3 \
  tailwindcss@^3.4.17 \
  postcss@^8.5.6 \
  autoprefixer@^10.4.21 \
  @types/react@^19.1.9 \
  @types/react-dom@^19.1.7 \
  @types/node@^24.2.1 \
  --legacy-peer-deps

# Instalar TODAS as dependências do package.json
echo "📦 Instalando todas as dependências do package.json..."
npm install --legacy-peer-deps

# Limpar e recompilar
echo "🧹 Limpando cache..."
rm -rf node_modules/.vite dist

echo "🔨 Recompilando frontend..."
npx vite build

# Verificar
if [ -d "dist/assets" ]; then
  echo ""
  echo "✅ Build concluído com sucesso!"
  echo "📁 Arquivos gerados:"
  ls -lh dist/assets/*.js | head -5
  echo ""
  echo "🔄 Recarregando Nginx..."
  sudo rm -rf /var/cache/nginx/*
  sudo systemctl reload nginx
  echo ""
  echo "✅ Tudo pronto!"
else
  echo ""
  echo "❌ Build falhou - dist/assets não existe"
  exit 1
fi
