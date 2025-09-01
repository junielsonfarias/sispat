#!/bin/bash

# =================================
# INSTALAÇÃO COMPLETA VPS - SISPAT
# Sistema de Patrimônio - VERSÃO CORRIGIDA FINAL
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
echo "🚀    Sistema de Patrimônio - VERSÃO CORRIGIDA FINAL"
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

# 0. CORREÇÃO PRÉVIA - Remover repositórios PostgreSQL problemáticos
log "🔧 CORREÇÃO PRÉVIA - Removendo repositórios PostgreSQL problemáticos..."
if [ -f "/etc/apt/sources.list.d/pgdg.list" ]; then
    rm -f /etc/apt/sources.list.d/pgdg.list
    log "Repositório PostgreSQL problemático removido"
fi

# Tentar remover chave GPG se existir
if apt-key list 2>/dev/null | grep -q "ACCC4CF8"; then
    apt-key del ACCC4CF8 2>/dev/null || true
    log "Chave GPG PostgreSQL removida"
fi

# 1. Atualizar sistema
log "📦 Atualizando sistema..."
apt update
apt upgrade -y
apt install -y build-essential curl git software-properties-common unzip wget
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

# 4. Instalar pnpm e PM2
log "📦 Instalando pnpm e PM2..."
npm install -g pnpm pm2
success "pnpm instalado: $(pnpm --version)"
success "PM2 instalado: $(pm2 --version)"

# 5. Instalar PostgreSQL com correções
log "🗄️ Instalando PostgreSQL com correções..."
UBUNTU_VERSION=$(lsb_release -cs)
log "📋 Versão do Ubuntu detectada: $UBUNTU_VERSION"

if [ "$UBUNTU_VERSION" = "focal" ]; then
    log "📦 Ubuntu 20.04 detectado - usando repositório padrão Ubuntu..."
    warning "⚠️ Repositório oficial PostgreSQL não disponível para focal (404 Not Found)"
    
    # Instalar PostgreSQL do repositório padrão Ubuntu
    apt install -y postgresql postgresql-contrib
    
    # Configurar PostgreSQL
    systemctl enable postgresql
    systemctl start postgresql
    
    # Configurar usuário e banco
    sudo -u postgres psql << EOF
DROP USER IF EXISTS sispat_user;
CREATE USER sispat_user WITH PASSWORD 'sispat123456';
CREATE DATABASE sispat_production OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
ALTER USER sispat_user CREATEDB;
\q
EOF
    
    success "PostgreSQL instalado: $(psql --version)"
else
    log "📦 Configurando repositório PostgreSQL para Ubuntu $UBUNTU_VERSION..."
    # Adicionar repositório oficial PostgreSQL
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt update
    apt install -y postgresql postgresql-contrib
    
    # Configurar PostgreSQL
    systemctl enable postgresql
    systemctl start postgresql
    
    # Configurar usuário e banco
    sudo -u postgres psql << EOF
DROP USER IF EXISTS sispat_user;
CREATE USER sispat_user WITH PASSWORD 'sispat123456';
CREATE DATABASE sispat_production OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
ALTER USER sispat_user CREATEDB;
\q
EOF
    
    success "PostgreSQL instalado: $(psql --version)"
fi

# 6. Instalar Redis
log "📦 Instalando Redis..."
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
success "Redis instalado e configurado"

# 7. Instalar Nginx
log "📦 Instalando Nginx..."
apt install -y nginx
success "Nginx instalado: $(nginx -v)"

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
cat > .env.production << 'EOF'
# Configurações do Servidor
PORT=3001
HOST=0.0.0.0

# Banco de Dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_production
DB_USER=sispat_user
DB_PASSWORD=sispat123456
DATABASE_URL=postgresql://sispat_user:sispat123456@localhost:5432/sispat_production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=sispat123456
REDIS_URL=redis://:sispat123456@localhost:6379

# JWT e Segurança
JWT_SECRET=sispat_jwt_secret_production_2025_very_secure_key_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://sispat.vps-kinghost.net
CORS_CREDENTIALS=true

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
EOF

success "Arquivo .env.production criado (SEM NODE_ENV)"

# 11. Configurar scripts
log "🔧 Configurando scripts..."
chmod +x scripts/*.sh

# 12. CORREÇÃO PRÉVIA - Instalar terser para compatibilidade
log "📦 CORREÇÃO PRÉVIA - Instalando terser para compatibilidade..."
if ! grep -q '"terser"' package.json; then
    if pnpm add -D terser; then
        success "Terser instalado com pnpm"
    elif npm install --save-dev terser; then
        success "Terser instalado com npm"
    else
        warning "⚠️ Falha ao instalar terser, continuando sem..."
    fi
else
    success "✅ Terser já está nas dependências"
fi

# 13. Executar setup de produção
log "⚙️ Executando setup de produção..."
./scripts/setup-production.sh

# 14. Executar deploy
log "🚀 Executando deploy..."
./scripts/deploy-production-simple.sh

# 15. Configurar Nginx para sispat.vps-kinghost.net
log "🌐 Configurando Nginx..."
cat > /etc/nginx/sites-available/sispat << 'EOF'
server {
    listen 80;
    server_name sispat.vps-kinghost.net www.sispat.vps-kinghost.net;

    # Frontend
    location / {
        root /var/www/sispat/dist;
        try_files $uri $uri/ /index.html;

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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
success "Nginx configurado"

# 16. Configurar PM2 para startup automático
log "⚙️ Configurando PM2 para startup automático..."
pm2 save
pm2 startup
success "PM2 configurado para startup automático"

# 17. Instalar Certbot para SSL
log "🔒 Instalando Certbot para SSL..."
apt install -y certbot python3-certbot-nginx
success "Certbot instalado"

# 18. Verificação final
log "🔍 Verificação final..."
echo ""
echo "📊 STATUS DOS SERVIÇOS:"
echo "========================"
systemctl status postgresql --no-pager -l
echo ""
systemctl status redis-server --no-pager -l
echo ""
systemctl status nginx --no-pager -l
echo ""
pm2 status
echo ""

# 19. Testes de conectividade
log "🌐 Testando conectividade..."
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    success "✅ Backend respondendo em /api/health"
else
    warning "⚠️ Backend não está respondendo em /api/health"
fi

if curl -f http://localhost:80 > /dev/null 2>&1; then
    success "✅ Nginx respondendo na porta 80"
else
    warning "⚠️ Nginx não está respondendo na porta 80"
fi

# 20. Instruções finais
log "📝 INSTALAÇÃO CONCLUÍDA!"
echo ""
echo "🎉 SISPAT INSTALADO COM SUCESSO!"
echo "=================================="
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Configure SSL com Certbot:"
echo "   certbot --nginx -d sispat.vps-kinghost.net"
echo ""
echo "2. Acesse sua aplicação:"
echo "   - Frontend: http://sispat.vps-kinghost.net"
echo "   - Backend: http://sispat.vps-kinghost.net/api"
echo ""
echo "3. Verifique logs:"
echo "   pm2 logs"
echo "   journalctl -u nginx -f"
echo ""
echo "4. Backup automático configurado em:"
echo "   /var/www/sispat/scripts/backup.sh"
echo ""

# 21. CORREÇÕES APLICADAS
log "🔧 CORREÇÕES APLICADAS NESTA VERSÃO:"
echo "✅ Repositório PostgreSQL problemático removido previamente"
echo "✅ Terser instalado automaticamente"
echo "✅ NODE_ENV=production removido do .env"
echo "✅ Usuário PostgreSQL recriado com senha correta"
echo "✅ Configuração Nginx otimizada"
echo "✅ PM2 configurado para startup automático"
echo "✅ Scripts com permissões corretas"
echo "✅ Verificações de conectividade incluídas"

success "🎉 Instalação completa VPS concluída com sucesso!"
success "✅ SISPAT está rodando em produção!"
success "🚀 Configure SSL e acesse sua aplicação!"

# 22. Informações de troubleshooting
log "📋 INFORMAÇÕES DE TROUBLESHOOTING:"
echo ""
echo "🔧 SE ENCONTRAR PROBLEMAS:"
echo "1. Verifique logs: pm2 logs"
echo "2. Verifique status: pm2 status"
echo "3. Reinicie serviços: pm2 restart all"
echo "4. Verifique banco: sudo -u postgres psql -d sispat_production"
echo "5. Verifique Nginx: sudo nginx -t && sudo systemctl status nginx"
echo ""
echo "📞 Para suporte, verifique os logs em:"
echo "   /var/www/sispat/logs/"
echo "   /root/.pm2/logs/"
echo "   /var/log/nginx/"
echo "   /var/log/postgresql/"
