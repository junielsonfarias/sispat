#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';

console.log('🚀 Configurando SISPAT para Produção...\n');

// 1. Criar arquivo .env.production
const envProductionContent = `# Configurações de Produção - SISPAT
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Banco de dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_production
DB_USER=sispat_user
DB_PASSWORD=sispat123456
DATABASE_URL=postgresql://sispat_user:sispat123456@localhost:5432/sispat_production

# JWT
JWT_SECRET=sispat_jwt_secret_production_2025_very_secure_key_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS - Configurar com seu domínio
CORS_ORIGIN=https://seu-dominio.com,http://localhost:3000,http://127.0.0.1:3000
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=https://seu-dominio.com,http://localhost:3000,http://127.0.0.1:3000

# Redis (opcional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=sispat123456
REDIS_URL=redis://:sispat123456@localhost:6379

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-do-email

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=7

# Monitoramento
MONITORING_ENABLED=true
LOG_LEVEL=info

# Segurança
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
SESSION_SECRET=sispat_session_secret_production_2025

# Desabilitar banco apenas para desenvolvimento
# DISABLE_DATABASE=true
`;

const envProductionPath = path.resolve(process.cwd(), '.env.production');
writeFileSync(envProductionPath, envProductionContent.trim());
console.log('✅ Arquivo .env.production criado');

// 2. Criar script de instalação PostgreSQL
const postgresInstallScript = `#!/bin/bash

echo "🐘 Instalando PostgreSQL..."

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Iniciar e habilitar PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configurar usuário e banco
sudo -u postgres psql << EOF
CREATE USER sispat_user WITH PASSWORD 'sispat123456';
CREATE DATABASE sispat_production OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
ALTER USER sispat_user CREATEDB;
\\q
EOF

# Habilitar extensões necessárias
sudo -u postgres psql -d sispat_production << EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
\\q
EOF

echo "✅ PostgreSQL instalado e configurado com sucesso!"
echo "📋 Credenciais:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: sispat_production"
echo "   User: sispat_user"
echo "   Password: sispat123456"
`;

const postgresScriptPath = path.resolve(
  process.cwd(),
  'scripts/install-postgresql.sh'
);
writeFileSync(postgresScriptPath, postgresInstallScript.trim());
console.log('✅ Script de instalação PostgreSQL criado');

// 3. Criar script de migração
const migrationScript = `#!/bin/bash

echo "🗄️ Executando migrações do banco de dados..."

# Verificar se o banco está rodando
if ! pg_isready -h localhost -p 5432 -U sispat_user; then
    echo "❌ PostgreSQL não está rodando. Execute: sudo systemctl start postgresql"
    exit 1
fi

# Executar migrações
cd "$(dirname "$0")/.."
node server/database/migrate.js

echo "✅ Migrações executadas com sucesso!"
`;

const migrationScriptPath = path.resolve(
  process.cwd(),
  'scripts/run-migrations.sh'
);
writeFileSync(migrationScriptPath, migrationScript.trim());
console.log('✅ Script de migração criado');

// 4. Criar script de build para produção
const buildScript = `#!/bin/bash

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
`;

const buildScriptPath = path.resolve(
  process.cwd(),
  'scripts/build-production.sh'
);
writeFileSync(buildScriptPath, buildScript.trim());
console.log('✅ Script de build criado');

// 5. Criar configuração PM2 para produção
const pm2Config = `module.exports = {
  apps: [
    {
      name: 'sispat-backend',
      script: 'server/index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
`;

const pm2ConfigPath = path.resolve(process.cwd(), 'ecosystem.config.js');
writeFileSync(pm2ConfigPath, pm2Config.trim());
console.log('✅ Configuração PM2 criada');

// 6. Criar configuração Nginx
const nginxConfig = `server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com www.seu-dominio.com;

    # Configurações SSL (serão adicionadas pelo Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    # Configurações de segurança SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Headers de segurança
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy para o backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Proxy para WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Servir arquivos estáticos do frontend
    location / {
        root /var/www/sispat/dist;
        try_files $uri $uri/ /index.html;

        # Cache para arquivos estáticos
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Logs
    access_log /var/log/nginx/sispat_access.log;
    error_log /var/log/nginx/sispat_error.log;
}
`;

const nginxConfigPath = path.resolve(process.cwd(), 'nginx-sispat.conf');
writeFileSync(nginxConfigPath, nginxConfig.trim());
console.log('✅ Configuração Nginx criada');

// 7. Criar diretórios necessários
const directories = ['logs', 'backups', 'uploads'];
directories.forEach(dir => {
  const dirPath = path.resolve(process.cwd(), dir);
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Diretório ${dir} criado`);
  }
});

// 8. Criar script de deploy completo
const deployScript = `#!/bin/bash

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
`;

const deployScriptPath = path.resolve(
  process.cwd(),
  'scripts/deploy-production.sh'
);
writeFileSync(deployScriptPath, deployScript.trim());
console.log('✅ Script de deploy criado');

// 9. Tornar scripts executáveis (simulação)
console.log('\n📋 Próximos passos para produção:');
console.log('1. Execute: chmod +x scripts/*.sh');
console.log('2. Configure seu domínio no arquivo nginx-sispat.conf');
console.log('3. Execute: bash scripts/install-postgresql.sh');
console.log('4. Execute: bash scripts/run-migrations.sh');
console.log('5. Execute: bash scripts/build-production.sh');
console.log('6. Configure Nginx com o arquivo nginx-sispat.conf');
console.log('7. Execute: certbot --nginx -d seu-dominio.com');
console.log('8. Execute: bash scripts/deploy-production.sh');

console.log('\n🎉 Configuração para produção concluída!');
console.log('📁 Arquivos criados:');
console.log('   - .env.production');
console.log('   - scripts/install-postgresql.sh');
console.log('   - scripts/run-migrations.sh');
console.log('   - scripts/build-production.sh');
console.log('   - scripts/deploy-production.sh');
console.log('   - ecosystem.config.js');
console.log('   - nginx-sispat.conf');
console.log('   - logs/, backups/, uploads/');
