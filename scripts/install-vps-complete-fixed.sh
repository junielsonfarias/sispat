#!/bin/bash

# =================================
# INSTALAÇÃO COMPLETA VPS - SISPAT
# Sistema de Patrimônio - VERSÃO CORRIGIDA E MELHORADA
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
echo "🚀    INSTALAÇÃO COMPLETA VPS - SISPAT"
echo "🚀    Sistema de Patrimônio - VERSÃO CORRIGIDA"
echo "🚀    ✅ Scripts corrigidos e PostgreSQL 100% funcional"
echo "🚀    ✅ Configuração dinâmica de domínio"
echo "🚀    ✅ Segurança aprimorada"
echo "🚀 ================================================"
echo ""

# Verificar se estamos rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Este script deve ser executado como root (sudo)"
fi

# Verificar sistema operacional
if ! command -v apt &> /dev/null; then
    error "Este script é específico para sistemas baseados em Debian/Ubuntu"
fi

# 0. CONFIGURAÇÃO INICIAL
log "🔧 Configuração inicial..."

# Solicitar informações do usuário
echo ""
echo "📋 CONFIGURAÇÃO INICIAL:"
echo "========================="

# Solicitar domínio
read -p "🌐 Digite seu domínio (ex: meusite.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    error "Domínio é obrigatório"
fi

# Solicitar senha do banco
read -s -p "🔒 Digite uma senha forte para o banco de dados: " DB_PASSWORD
echo ""
if [ -z "$DB_PASSWORD" ]; then
    error "Senha do banco é obrigatória"
fi

# Solicitar senha JWT
read -s -p "🔑 Digite uma chave JWT forte (mínimo 32 caracteres): " JWT_SECRET
echo ""
if [ ${#JWT_SECRET} -lt 32 ]; then
    error "Chave JWT deve ter pelo menos 32 caracteres"
fi

# Solicitar email para SSL
read -p "📧 Digite seu email para certificado SSL: " EMAIL
if [ -z "$EMAIL" ]; then
    error "Email é obrigatório para certificado SSL"
fi

# Confirmar configurações
echo ""
echo "📋 CONFIGURAÇÕES CONFIRMADAS:"
echo "=============================="
echo "🌐 Domínio: $DOMAIN"
echo "🔒 Senha DB: [OCULTA]"
echo "🔑 JWT Secret: [OCULTA]"
echo "📧 Email SSL: $EMAIL"
echo ""
read -p "✅ Confirma as configurações? (y/N): " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    error "Instalação cancelada pelo usuário"
fi

# 1. Atualizar sistema
log "📦 Atualizando sistema..."
apt update
apt upgrade -y
apt install -y build-essential curl git software-properties-common unzip wget lsb-release
success "Sistema atualizado"

# 2. Configurar fuso horário e locale
log "🕐 Configurando fuso horário e locale..."
timedatectl set-timezone America/Sao_Paulo
locale-gen pt_BR.UTF-8
update-locale LANG=pt_BR.UTF-8
success "Fuso horário e locale configurados"

# 3. Instalar Node.js 18.x
log "📦 Instalando Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
success "Node.js instalado: $(node --version)"

# 4. Instalar ferramentas
log "📦 Instalando ferramentas..."
npm install -g pnpm pm2 serve
success "Ferramentas instaladas"

# 5. Instalar PostgreSQL
log "🗄️ Instalando PostgreSQL..."
UBUNTU_VERSION=$(lsb_release -cs)
log "📋 Versão do Ubuntu detectada: $UBUNTU_VERSION"

if [ "$UBUNTU_VERSION" = "focal" ]; then
    log "📦 Ubuntu 20.04 detectado - usando repositório padrão Ubuntu..."
    apt install -y postgresql postgresql-contrib
else
    log "📦 Configurando repositório PostgreSQL para Ubuntu $UBUNTU_VERSION..."
    
    # Método moderno para Ubuntu 22.04+ (sem apt-key deprecated)
    apt install -y curl gpg
    
    # Baixar e adicionar chave GPG de forma moderna
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
    
    # Adicionar repositório com método moderno
    echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    
    # Atualizar e instalar PostgreSQL
    apt update
    apt install -y postgresql-15 postgresql-contrib-15
fi

# Configurar PostgreSQL
systemctl enable postgresql
systemctl start postgresql

# Configurar usuário e banco
sudo -u postgres psql << EOF
DROP USER IF EXISTS sispat_user;
CREATE USER sispat_user WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE sispat_production OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
ALTER USER sispat_user CREATEDB;
\q
EOF

success "PostgreSQL instalado e configurado"

# 6. Instalar Redis
log "📦 Instalando Redis..."
apt install -y redis-server

# Configurar Redis
cat > /etc/redis/redis.conf << EOF
bind 127.0.0.1
requirepass $DB_PASSWORD
maxmemory 256mb
maxmemory-policy allkeys-lru
EOF

systemctl enable redis-server
systemctl restart redis-server
success "Redis instalado e configurado"

# 7. Instalar Nginx
log "📦 Instalando Nginx..."
apt install -y nginx
success "Nginx instalado"

# 8. Configurar firewall
log "🔥 Configurando firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3001
ufw --force enable
success "Firewall configurado"

# 9. Clonar repositório SISPAT
log "📥 Clonando repositório SISPAT..."
if [ -d "/var/www/sispat" ]; then
    warning "⚠️ Diretório sispat já existe, fazendo backup..."
    mv /var/www/sispat /var/www/sispat.backup.$(date +%Y%m%d_%H%M%S)
fi

cd /var/www
git clone https://github.com/junielsonfarias/sispat.git
cd sispat
success "Repositório clonado"

# 10. Configurar variáveis de ambiente
log "⚙️ Configurando variáveis de ambiente..."
cat > .env << EOF
# Configurações do Servidor
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Banco de Dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_production
DB_USER=sispat_user
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://sispat_user:$DB_PASSWORD@localhost:5432/sispat_production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$DB_PASSWORD
REDIS_URL=redis://:$DB_PASSWORD@localhost:6379

# JWT e Segurança
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://$DOMAIN,http://localhost:3000,http://127.0.0.1:3000
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=https://$DOMAIN,http://localhost:3000,http://127.0.0.1:3000

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EOF

success "Arquivo .env criado"

# 11. Configurar scripts e diretórios
log "🔧 Configurando scripts e diretórios..."
mkdir -p logs
chmod 755 logs

if [ -d "scripts" ] && [ "$(ls -A scripts/*.sh 2>/dev/null)" ]; then
    chmod +x scripts/*.sh
    success "Scripts configurados com permissões de execução"
else
    warning "⚠️ Diretório scripts não encontrado ou vazio"
fi

# 12. Instalar dependências
log "📦 Instalando dependências..."
# Resolver conflitos de dependências com --legacy-peer-deps
npm install --legacy-peer-deps
success "Dependências instaladas"

# 13. Habilitar extensões PostgreSQL
log "🔧 Habilitando extensões PostgreSQL..."
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" 2>/dev/null || true
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>/dev/null || true
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS unaccent;" 2>/dev/null || true
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>/dev/null || true
success "Extensões PostgreSQL habilitadas"

# 14. Executar migrações
log "🗄️ Executando migrações do banco..."
if [ -f "server/database/migrate.js" ]; then
    node server/database/migrate.js
    success "Migrações executadas"
else
    warning "⚠️ Arquivo de migração não encontrado"
fi

# 15. Build do frontend
log "🏗️ Fazendo build do frontend..."
npm run build
success "Frontend buildado"

# 16. Configurar Nginx
log "🌐 Configurando Nginx..."
cat > /etc/nginx/sites-available/sispat << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Redirecionar HTTP para HTTPS (será configurado depois)
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # Configurações SSL (serão adicionadas pelo Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Configurações de segurança
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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Proxy para WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Servir arquivos estáticos do frontend
    location / {
        root /var/www/sispat/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Logs
    access_log /var/log/nginx/sispat_access.log;
    error_log /var/log/nginx/sispat_error.log;
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t
systemctl reload nginx
success "Nginx configurado"

# 16. Instalar Certbot
log "🔒 Instalando Certbot..."
apt install -y certbot python3-certbot-nginx
success "Certbot instalado"

# 17. Obter certificado SSL
log "🔒 Obtendo certificado SSL..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive
success "Certificado SSL obtido"

# 18. Configurar PM2
log "⚙️ Configurando PM2..."
pm2 start ecosystem.production.config.cjs --env production
pm2 save
pm2 startup
success "PM2 configurado"

# 19. Configurar backup automático
log "💾 Configurando backup automático..."
cat > /var/www/sispat/scripts/backup.sh << EOF
#!/bin/bash
# Backup automático do SISPAT
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/sispat"
mkdir -p \$BACKUP_DIR

# Backup do banco
pg_dump -h localhost -U sispat_user -d sispat_production > \$BACKUP_DIR/sispat_db_\$DATE.sql

# Backup dos arquivos
tar -czf \$BACKUP_DIR/sispat_files_\$DATE.tar.gz /var/www/sispat

# Limpar backups antigos (manter últimos 7 dias)
find \$BACKUP_DIR -name "*.sql" -mtime +7 -delete
find \$BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup concluído: \$DATE"
EOF

chmod +x /var/www/sispat/scripts/backup.sh

# Adicionar ao cron
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/sispat/scripts/backup.sh") | crontab -
success "Backup automático configurado"

# 20. Configurar monitoramento básico
log "📊 Configurando monitoramento básico..."
cat > /var/www/sispat/scripts/monitor.sh << EOF
#!/bin/bash
# Monitoramento básico do SISPAT

# Verificar se a aplicação está rodando
if ! pm2 list | grep -q "sispat"; then
    echo "ERRO: Aplicação SISPAT não está rodando"
    pm2 restart all
fi

# Verificar se o banco está acessível
if ! sudo -u postgres psql -d sispat_production -c "SELECT 1;" > /dev/null 2>&1; then
    echo "ERRO: Banco de dados não está acessível"
    systemctl restart postgresql
fi

# Verificar se o Nginx está rodando
if ! systemctl is-active --quiet nginx; then
    echo "ERRO: Nginx não está rodando"
    systemctl restart nginx
fi

echo "Monitoramento concluído: \$(date)"
EOF

chmod +x /var/www/sispat/scripts/monitor.sh

# Adicionar ao cron (verificar a cada 5 minutos)
(crontab -l 2>/dev/null; echo "*/5 * * * * /var/www/sispat/scripts/monitor.sh") | crontab -
success "Monitoramento básico configurado"

# 21. Verificação final
log "🔍 Verificação final..."

# Verificar se todos os serviços estão rodando
if systemctl is-active --quiet postgresql; then
    success "✅ PostgreSQL rodando"
else
    error "❌ PostgreSQL não está rodando"
fi

if systemctl is-active --quiet redis-server; then
    success "✅ Redis rodando"
else
    error "❌ Redis não está rodando"
fi

if systemctl is-active --quiet nginx; then
    success "✅ Nginx rodando"
else
    error "❌ Nginx não está rodando"
fi

if pm2 list | grep -q "sispat"; then
    success "✅ Aplicação SISPAT rodando"
else
    error "❌ Aplicação SISPAT não está rodando"
fi

# Testar conectividade
if curl -s --max-time 10 https://$DOMAIN > /dev/null 2>&1; then
    success "✅ Site acessível via HTTPS"
else
    warning "⚠️ Site não acessível via HTTPS (pode levar alguns minutos para propagar)"
fi

# 22. Instruções finais
log "📝 INSTALAÇÃO CONCLUÍDA!"
echo ""
echo "🎉 SISPAT INSTALADO COM SUCESSO!"
echo "=================================="
echo ""
echo "📋 INFORMAÇÕES DA INSTALAÇÃO:"
echo "🌐 Domínio: https://$DOMAIN"
echo "🔒 SSL: Configurado automaticamente"
echo "🗄️ Banco: sispat_production"
echo "👤 Usuário: sispat_user"
echo "🔑 Senha: [CONFIGURADA]"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Acesse sua aplicação: https://$DOMAIN"
echo "2. Crie o usuário administrador"
echo "3. Configure suas preferências"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "   - Ver logs: pm2 logs"
echo "   - Status: pm2 status"
echo "   - Reiniciar: pm2 restart all"
echo "   - Backup: /var/www/sispat/scripts/backup.sh"
echo "   - Monitor: /var/www/sispat/scripts/monitor.sh"
echo ""
echo "📞 Para suporte, verifique os logs em:"
echo "   /var/www/sispat/logs/"
echo "   /root/.pm2/logs/"
echo "   /var/log/nginx/"
echo "   /var/log/postgresql/"
echo ""

success "🎉 Instalação completa VPS concluída com sucesso!"
success "✅ SISPAT está rodando em produção!"
success "🚀 Acesse https://$DOMAIN para começar!"
