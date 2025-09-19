#!/bin/bash

echo "🚀 Deploy completo do SISPAT para produção..."

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório raiz do projeto"
    exit 1
fi

# 1. Parar serviços existentes
echo "🛑 Parando serviços existentes..."
pm2 stop sispat-backend 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true

# 2. Fazer backup do banco (se existir)
echo "💾 Fazendo backup do banco de dados..."
if pg_isready -h localhost -p 5432 -U sispat_user; then
    pg_dump -h localhost -U sispat_user -d sispat_production > backups/backup-$(date +%Y%m%d-%H%M%S).sql
    echo "✅ Backup criado"
fi

# 3. Atualizar código
echo "📥 Atualizando código..."
git pull origin main

# 4. Instalar dependências
echo "📦 Instalando dependências..."
npm install --production

# 5. Executar migrações
echo "🗄️ Executando migrações..."
node server/database/migrate.js

# 6. Build do frontend
echo "🏗️ Fazendo build do frontend..."
npm run build

# 7. Copiar arquivos para produção
echo "📁 Copiando arquivos para produção..."
sudo cp -r dist/* /var/www/html/ 2>/dev/null || cp -r dist/* ./public/

# 8. Iniciar serviços
echo "🚀 Iniciando serviços..."
pm2 start ecosystem.config.js --env production
sudo systemctl start nginx

# 9. Verificar status
echo "✅ Verificando status dos serviços..."
pm2 status
sudo systemctl status nginx --no-pager

echo "🎉 Deploy concluído com sucesso!"
echo "🌐 Acesse: https://seu-dominio.com"