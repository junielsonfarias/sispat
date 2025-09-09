#!/bin/bash

# =================================
# INSTALAÇÃO SIMPLIFICADA VPS - SISPAT
# Para Iniciantes - Versão Simplificada
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
echo "🚀    INSTALAÇÃO SIMPLIFICADA VPS - SISPAT"
echo "🚀    Para Iniciantes - Versão Simplificada"
echo "🚀    ✅ Instalação automática e segura"
echo "🚀    ✅ Configuração otimizada para produção"
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

echo ""
echo "📋 CONFIGURAÇÃO INICIAL:"
echo "========================="
echo "Este script irá instalar o SISPAT automaticamente."
echo "Você precisará fornecer algumas informações básicas."
echo ""

# Solicitar informações do usuário
read -p "🌐 Digite seu domínio (ex: meusite.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    error "Domínio é obrigatório"
fi

read -s -p "🔒 Digite uma senha forte para o banco de dados: " DB_PASSWORD
echo ""
if [ -z "$DB_PASSWORD" ]; then
    error "Senha do banco é obrigatória"
fi

read -p "📧 Digite seu email para certificado SSL: " EMAIL
if [ -z "$EMAIL" ]; then
    error "Email é obrigatório para certificado SSL"
fi

# Gerar JWT secret automaticamente
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)

# Confirmar configurações
echo ""
echo "📋 CONFIGURAÇÕES CONFIRMADAS:"
echo "=============================="
echo "🌐 Domínio: $DOMAIN"
echo "🔒 Senha DB: [OCULTA]"
echo "🔑 JWT Secret: [GERADO AUTOMATICAMENTE]"
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
apt install -y build-essential curl git software-properties-common unzip wget lsb-release openssl
success "Sistema atualizado"

# 2. Instalar Node.js 18.x
log "📦 Instalando Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
success "Node.js instalado: $(node --version)"

# 3. Instalar ferramentas
log "📦 Instalando ferramentas..."
npm install -g pnpm pm2 serve
success "Ferramentas instaladas"

# 4. Instalar PostgreSQL
log "🗄️ Instalando PostgreSQL..."
apt install -y postgresql postgresql-contrib
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

# 5. Instalar Redis
log "📦 Instalando Redis..."
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
success "Redis instalado e configurado"

# 6. Instalar Nginx
log "📦 Instalando Nginx..."
apt install -y nginx
success "Nginx instalado"

# 7. Configurar firewall
log "🔥 Configurando firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3001
ufw --force enable
success "Firewall configurado"

# 8. Clonar repositório SISPAT
log "📥 Clonando repositório SISPAT..."
if [ -d "/var/www/sispat" ]; then
    warning "⚠️ Diretório sispat já existe, fazendo backup..."
    mv /var/www/sispat /var/www/sispat.backup.$(date +%Y%m%d_%H%M%S)
fi

cd /var/www
git clone https://github.com/junielsonfarias/sispat.git
cd sispat
success "Repositório clonado"

# 9. Configurar variáveis de ambiente
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
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379

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
EOF

success "Arquivo .env criado"

# 10. Configurar scripts e diretórios
log "🔧 Configurando scripts e diretórios..."
mkdir -p logs
chmod 755 logs

if [ -d "scripts" ] && [ "$(ls -A scripts/*.sh 2>/dev/null)" ]; then
    chmod +x scripts/*.sh
    success "Scripts configurados com permissões de execução"
else
    warning "⚠️ Diretório scripts não encontrado ou vazio"
fi

# 11. Instalar dependências
log "📦 Instalando dependências..."
# Resolver conflitos de dependências com --legacy-peer-deps
npm install --legacy-peer-deps
success "Dependências instaladas"

# 12. Habilitar extensões PostgreSQL
log "🔧 Habilitando extensões PostgreSQL..."
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" 2>/dev/null || true
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>/dev/null || true
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS unaccent;" 2>/dev/null || true
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>/dev/null || true
success "Extensões PostgreSQL habilitadas"

# 13. Executar migrações
log "🗄️ Executando migrações do banco..."
if [ -f "server/database/migrate.js" ]; then
    node server/database/migrate.js
    success "Migrações executadas"
else
    warning "⚠️ Arquivo de migração não encontrado"
fi

# 14. Build do frontend
log "🏗️ Fazendo build do frontend..."
# Limpar build anterior
rm -rf dist
rm -rf node_modules/.vite
# Fazer build
npm run build
success "Frontend buildado"

# 15. Configurar Nginx (HTTP apenas)
log "🌐 Configurando Nginx (HTTP)..."
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

# Testar configuração
nginx -t
systemctl reload nginx
success "Nginx configurado (HTTP)"

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
# Criar diretório de logs
mkdir -p logs
# Iniciar aplicação com PM2
pm2 start ecosystem.config.cjs --env production
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

# 19. Verificação final
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

# 20. Instruções finais
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
echo ""
echo "📞 Para suporte, verifique os logs em:"
echo "   /var/www/sispat/logs/"
echo "   /root/.pm2/logs/"
echo "   /var/log/nginx/"
echo "   /var/log/postgresql/"
echo ""

success "🎉 Instalação simplificada VPS concluída com sucesso!"
success "✅ SISPAT está rodando em produção!"
success "🚀 Acesse https://$DOMAIN para começar!"
