#!/bin/bash

# =================================
# INSTALAÇÃO SEGURA VPS - SISPAT
# Sistema de Patrimônio - VERSÃO SEGURA E CORRIGIDA
# =================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Função para erro
error() {
    echo -e "${RED}[ERRO]${NC} $1"
    exit 1
}

# Função para sucesso
success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

# Função para aviso
warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Banner
echo ""
echo "🚀 ================================================"
echo "🚀    INSTALAÇÃO SEGURA VPS - SISPAT"
echo "🚀    Sistema de Patrimônio - VERSÃO SEGURA"
echo "🚀    ✅ Instalação automática e segura"
echo "🚀    ✅ Configuração otimizada para produção"
echo "🚀    ✅ Senhas seguras geradas automaticamente"
echo "🚀    ✅ Configuração dinâmica de domínio"
echo "🚀 ================================================"
echo ""

# Verificar se estamos rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Este script deve ser executado como root (sudo)"
fi

# Solicitar informações do usuário
echo "🔧 Configuração Inicial:"
echo ""

# Solicitar domínio
read -p "🌐 Digite seu domínio (ex: meusite.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    error "Domínio é obrigatório"
fi

# Solicitar email para SSL
read -p "📧 Digite seu email para certificado SSL: " EMAIL
if [ -z "$EMAIL" ]; then
    error "Email é obrigatório para certificado SSL"
fi

# Solicitar usuário do GitHub
read -p "👤 Digite seu usuário do GitHub: " GITHUB_USER
if [ -z "$GITHUB_USER" ]; then
    error "Usuário do GitHub é obrigatório"
fi

# Validar domínio
if [[ ! $DOMAIN =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
    error "Formato de domínio inválido"
fi

# Validar email
if [[ ! $EMAIL =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    error "Formato de email inválido"
fi

log "Iniciando instalação segura do SISPAT..."

# Criar arquivo de senhas seguras
SECRETS_FILE="/root/sispat-secrets.txt"
echo "# Senhas seguras geradas automaticamente - NÃO COMPARTILHAR" > $SECRETS_FILE
echo "# Data: $(date)" >> $SECRETS_FILE
echo "" >> $SECRETS_FILE

# Gerar senhas seguras
log "Gerando senhas seguras..."
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -hex 64)

# Salvar senhas
echo "DB_PASSWORD=$DB_PASSWORD" >> $SECRETS_FILE
echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> $SECRETS_FILE
echo "JWT_SECRET=$JWT_SECRET" >> $SECRETS_FILE
echo "DOMAIN=$DOMAIN" >> $SECRETS_FILE
echo "EMAIL=$EMAIL" >> $SECRETS_FILE
echo "GITHUB_USER=$GITHUB_USER" >> $SECRETS_FILE

chmod 600 $SECRETS_FILE
success "Senhas seguras geradas e salvas em $SECRETS_FILE"

# Atualizar sistema
log "Atualizando sistema..."
apt update && apt upgrade -y
apt install -y build-essential curl git software-properties-common unzip wget openssl

# Instalar Node.js 20.x
log "Instalando Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar instalação Node.js
if ! command -v node &> /dev/null; then
    error "Falha na instalação do Node.js"
fi

# Instalar pnpm e PM2
log "Instalando pnpm e PM2..."
npm install -g pnpm pm2

# Verificar instalações
if ! command -v pnpm &> /dev/null; then
    error "Falha na instalação do pnpm"
fi

if ! command -v pm2 &> /dev/null; then
    error "Falha na instalação do PM2"
fi

success "Node.js, pnpm e PM2 instalados com sucesso"

# Instalar PostgreSQL
log "Instalando PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Configurar PostgreSQL
log "Configurando PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

# Verificar status PostgreSQL
if ! systemctl is-active --quiet postgresql; then
    error "PostgreSQL não está rodando"
fi

# Configurar usuário e banco PostgreSQL
log "Configurando usuário e banco PostgreSQL..."
sudo -u postgres psql << EOF
CREATE USER sispat_user WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE sispat_production OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
ALTER USER sispat_user CREATEDB;
\q
EOF

# Habilitar extensões PostgreSQL
log "Habilitando extensões PostgreSQL..."
sudo -u postgres psql -d sispat_production << EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
\q
EOF

success "PostgreSQL configurado com sucesso"

# Instalar Redis
log "Instalando Redis..."
apt install -y redis-server

# Configurar Redis
log "Configurando Redis..."
sed -i "s/# requirepass foobared/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf
sed -i "s/# maxmemory <bytes>/maxmemory 256mb/" /etc/redis/redis.conf
sed -i "s/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/" /etc/redis/redis.conf

systemctl enable redis-server
systemctl restart redis-server

# Verificar Redis
if ! redis-cli -a $REDIS_PASSWORD ping | grep -q "PONG"; then
    error "Falha na configuração do Redis"
fi

success "Redis configurado com sucesso"

# Instalar Nginx
log "Instalando Nginx..."
apt install -y nginx

# Configurar firewall
log "Configurando firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3001
ufw --force enable

success "Nginx e firewall configurados"

# Clonar repositório
log "Clonando repositório SISPAT..."
cd /var/www
if [ -d "sispat" ]; then
    warning "Diretório sispat já existe, fazendo backup..."
    mv sispat sispat-backup-$(date +%Y%m%d-%H%M%S)
fi

git clone https://github.com/$GITHUB_USER/sispat.git
cd sispat

# Verificar se o clone foi bem-sucedido
if [ ! -f "package.json" ]; then
    error "Falha ao clonar repositório ou repositório inválido"
fi

success "Repositório clonado com sucesso"

# Configurar variáveis de ambiente
log "Configurando variáveis de ambiente..."
cp env.production.example .env.production

# Substituir variáveis no arquivo .env.production
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env.production
sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env.production
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env.production
sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN,http://localhost:3000,http://127.0.0.1:3000|" .env.production
sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://$DOMAIN,http://localhost:3000,http://127.0.0.1:3000|" .env.production

success "Variáveis de ambiente configuradas"

# Instalar dependências
log "Instalando dependências..."
pnpm install --legacy-peer-deps

# Fazer build
log "Fazendo build da aplicação..."
export VITE_API_URL=https://$DOMAIN/api
export VITE_BACKEND_URL=https://$DOMAIN
pnpm run build

# Verificar se o build foi bem-sucedido
if [ ! -d "dist" ]; then
    error "Falha no build da aplicação"
fi

success "Build da aplicação concluído"

# Configurar Nginx
log "Configurando Nginx..."
cat > /etc/nginx/sites-available/sispat << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Frontend
    location / {
        root /var/www/sispat/dist;
        try_files \$uri \$uri/ /index.html;

        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração Nginx
if ! nginx -t; then
    error "Erro na configuração do Nginx"
fi

systemctl reload nginx
success "Nginx configurado com sucesso"

# Instalar Certbot e configurar SSL
log "Configurando SSL com Let's Encrypt..."
apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL

# Configurar renovação automática
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

success "SSL configurado com sucesso"

# Configurar PM2
log "Configurando PM2..."
pm2 start ecosystem.production.config.cjs --env production
pm2 save
pm2 startup

success "PM2 configurado com sucesso"

# Executar migrações do banco
log "Executando migrações do banco de dados..."
if [ -f "server/database/migrate.js" ]; then
    node server/database/migrate.js
    success "Migrações executadas com sucesso"
else
    warning "Arquivo de migração não encontrado, pulando..."
fi

# Verificar status final
log "Verificando status final dos serviços..."

# Verificar PostgreSQL
if systemctl is-active --quiet postgresql; then
    success "PostgreSQL: ✅ Rodando"
else
    error "PostgreSQL: ❌ Não está rodando"
fi

# Verificar Redis
if systemctl is-active --quiet redis-server; then
    success "Redis: ✅ Rodando"
else
    error "Redis: ❌ Não está rodando"
fi

# Verificar Nginx
if systemctl is-active --quiet nginx; then
    success "Nginx: ✅ Rodando"
else
    error "Nginx: ❌ Não está rodando"
fi

# Verificar PM2
if pm2 list | grep -q "online"; then
    success "PM2: ✅ Processos rodando"
else
    error "PM2: ❌ Nenhum processo rodando"
fi

# Testar conectividade
log "Testando conectividade..."

# Testar frontend
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200"; then
    success "Frontend: ✅ Acessível em https://$DOMAIN"
else
    warning "Frontend: ⚠️ Pode não estar acessível ainda"
fi

# Testar API
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/health | grep -q "200"; then
    success "API: ✅ Acessível em https://$DOMAIN/api/health"
else
    warning "API: ⚠️ Pode não estar acessível ainda"
fi

# Mostrar informações finais
echo ""
echo "🎉 ================================================"
echo "🎉    INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo "🎉 ================================================"
echo ""
echo "📋 Informações da Instalação:"
echo "   🌐 Domínio: https://$DOMAIN"
echo "   📧 Email SSL: $EMAIL"
echo "   👤 GitHub: $GITHUB_USER"
echo ""
echo "🔐 Informações de Segurança:"
echo "   📁 Senhas salvas em: $SECRETS_FILE"
echo "   🔒 Arquivo protegido (chmod 600)"
echo ""
echo "📊 Status dos Serviços:"
pm2 list
echo ""
echo "🔧 Comandos Úteis:"
echo "   Ver logs: pm2 logs"
echo "   Status: pm2 status"
echo "   Reiniciar: pm2 restart all"
echo "   Ver senhas: cat $SECRETS_FILE"
echo ""
echo "⚠️ IMPORTANTE:"
echo "   - Mantenha o arquivo de senhas seguro"
echo "   - Configure backup das senhas"
echo "   - Monitore logs regularmente"
echo "   - Atualize dependências periodicamente"
echo ""
echo "✅ SISPAT está rodando em produção com segurança!"
echo ""

success "Instalação segura concluída com sucesso!"
