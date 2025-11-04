#!/bin/bash

set -e

echo "🔧 Instalando React e todas as dependências do frontend..."

cd /var/www/sispat

# 1. Instalar React e React-DOM (dependências principais)
echo "📦 Instalando React e React-DOM..."
npm install --save \
  react@^19.1.1 \
  react-dom@^19.1.1 \
  --legacy-peer-deps

# 2. Instalar dependências críticas de runtime
echo "📦 Instalando dependências críticas de runtime..."
npm install --save \
  react-router-dom@^6.30.1 \
  axios@^1.12.2 \
  zod@^3.25.76 \
  date-fns@^4.1.0 \
  lucide-react@^0.539.0 \
  react-hook-form@^7.62.0 \
  @hookform/resolvers@^3.3.4 \
  clsx@^2.1.1 \
  tailwind-merge@^2.6.0 \
  tailwindcss-animate@^1.0.7 \
  class-variance-authority@^0.7.1 \
  --legacy-peer-deps

# 3. Instalar dependências de desenvolvimento críticas
echo "📦 Instalando dependências de desenvolvimento..."
npm install --save-dev \
  @vitejs/plugin-react@^5.0.0 \
  vite@^5.4.21 \
  typescript@^5.5.3 \
  tailwindcss@^3.4.17 \
  postcss@^8.5.6 \
  autoprefixer@^10.4.21 \
  @types/react@^19.1.9 \
  @types/react-dom@^19.1.7 \
  @types/node@^24.2.1 \
  --legacy-peer-deps

# 4. Instalar todas as dependências do package.json
echo "📦 Instalando todas as dependências do package.json..."
npm install --legacy-peer-deps

# 4. Verificar se React foi instalado
echo ""
echo "✅ Verificando instalações..."
if [ -d "node_modules/react" ]; then
  echo "✓ React instalado: $(node -p "require('./node_modules/react/package.json').version")"
else
  echo "✗ React NÃO instalado!"
  exit 1
fi

if [ -d "node_modules/react-dom" ]; then
  echo "✓ React-DOM instalado: $(node -p "require('./node_modules/react-dom/package.json').version")"
else
  echo "✗ React-DOM NÃO instalado!"
  exit 1
fi

if [ -d "node_modules/react-router-dom" ]; then
  echo "✓ React-Router-DOM instalado"
else
  echo "✗ React-Router-DOM NÃO instalado!"
  exit 1
fi

if [ -f "node_modules/.bin/vite" ]; then
  echo "✓ Vite instalado"
  chmod +x node_modules/.bin/vite
else
  echo "✗ Vite NÃO instalado!"
  exit 1
fi

# 5. Limpar cache do Vite
echo ""
echo "🧹 Limpando cache do Vite..."
rm -rf node_modules/.vite
rm -rf dist

# 6. Recompilar frontend
echo ""
echo "🔨 Recompilando frontend..."
npx vite build

# 7. Verificar se compilou com sucesso
if [ -d "dist/assets" ]; then
  echo ""
  echo "✅ Build concluído com sucesso!"
  echo "📁 Arquivos gerados:"
  ls -lh dist/assets/*.js | head -5
else
  echo ""
  echo "❌ Build falhou - dist/assets não existe"
  echo "📋 Verifique os erros acima e tente novamente"
  exit 1
fi

# 8. Recarregar Nginx
echo ""
echo "🔄 Recarregando Nginx..."
sudo rm -rf /var/cache/nginx/*
sudo systemctl reload nginx

echo ""
echo "✅ Instalação e build concluídos com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Limpe o cache do navegador (Ctrl+Shift+R ou Ctrl+F5)"
echo "2. Acesse a aplicação e verifique os logs do console"
echo "3. Procure pela mensagem: '🚀 [INVENTORY_CONTEXT] InventoryContext inicializado'"
echo "4. Teste criar um inventário e envie os logs do console"
