#!/bin/bash

# =================================
# SCRIPT DE INSTALAÇÃO RÁPIDA PARA VPS
# SISPAT - Sistema de Patrimônio
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

log "🚀 Iniciando instalação rápida para VPS..."

# Verificar se estamos rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Este script deve ser executado como root (sudo)"
fi

# 1. Atualizar sistema
log "📦 Atualizando sistema..."
apt update && apt upgrade -y
success "Sistema atualizado"

# 2. Instalar dependências básicas
log "🔧 Instalando dependências básicas..."
apt install -y curl wget git build-essential unzip software-properties-common
success "Dependências básicas instaladas"

# 3. Configurar fuso horário
log "🕐 Configurando fuso horário..."
timedatectl set-timezone America/Sao_Paulo
success "Fuso horário configurado"

# 4. Instalar Node.js 18.x
log "📦 Instalando Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
success "Node.js instalado: $(node --version)"

# 5. Instalar pnpm e PM2
log "📦 Instalando pnpm e PM2..."
npm install -g pnpm@8 pm2
success "pnpm instalado: $(pnpm --version)"
success "PM2 instalado: $(pm2 --version)"

# 6. Instalar PostgreSQL
log "🗄️ Instalando PostgreSQL..."

# Verificar versão do Ubuntu
UBUNTU_VERSION=$(lsb_release -cs)
log "📋 Versão do Ubuntu detectada: $UBUNTU_VERSION"

# Configurar repositório PostgreSQL baseado na versão
if [[ "$UBUNTU_VERSION" == "focal" ]]; then
    # Ubuntu 20.04 - usar repositório específico
    log "📦 Configurando repositório PostgreSQL para Ubuntu 20.04..."
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt focal-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
elif [[ "$UBUNTU_VERSION" == "jammy" ]]; then
    # Ubuntu 22.04
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt jammy-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
else
    # Tentar repositório genérico
    log "⚠️ Versão não suportada, tentando repositório genérico..."
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
fi

# Atualizar e instalar
apt update
apt install -y postgresql postgresql-contrib
success "PostgreSQL instalado"

# 7. Configurar PostgreSQL
log "⚙️ Configurando PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

# Criar usuário e banco
sudo -u postgres psql -c "CREATE DATABASE sispat_production;"
sudo -u postgres psql -c "CREATE USER sispat_user WITH PASSWORD 'sispat123456';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;"
sudo -u postgres psql -c "ALTER USER sispat_user CREATEDB;"
success "PostgreSQL configurado"

# 8. Instalar Redis
log "🔴 Instalando Redis..."
apt install -y redis-server
success "Redis instalado"

# 9. Configurar Redis
log "⚙️ Configurando Redis..."
systemctl enable redis-server
systemctl start redis-server

# Configurar senha do Redis
echo "requirepass sispat123456" >> /etc/redis/redis.conf
systemctl restart redis-server
success "Redis configurado"

# 10. Instalar Nginx
log "🌐 Instalando Nginx..."
apt install -y nginx
success "Nginx instalado"

# 11. Configurar firewall básico
log "🔥 Configurando firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3001
ufw --force enable
success "Firewall configurado"

# 12. Instalar Certbot para SSL
log "🔒 Instalando Certbot..."
apt install -y certbot python3-certbot-nginx
success "Certbot instalado"

# 13. Configurar diretórios
log "📁 Configurando diretórios..."
mkdir -p /var/www
cd /var/www
success "Diretórios configurados"

# 14. Clonar aplicação
log "📥 Clonando aplicação SISPAT..."
if [ -d "sispat" ]; then
    log "⚠️ Diretório sispat já existe, atualizando..."
    cd sispat
    git pull origin main
else
    git clone https://github.com/junielsonfarias/sispat.git
    cd sispat
fi
success "Aplicação clonada/atualizada"

# 15. Configurar permissões
log "🔐 Configurando permissões..."
chown -R $SUDO_USER:$SUDO_USER .
chmod +x scripts/*.sh
success "Permissões configuradas"

# 16. Executar configuração de produção
log "⚙️ Executando configuração de produção..."
./scripts/setup-production.sh

# 17. Executar deploy
log "🚀 Executando deploy..."
./scripts/deploy-production-simple.sh

# 18. Configurar Nginx
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

# Testar e recarregar Nginx
nginx -t
systemctl reload nginx
success "Nginx configurado"

# 19. Configurar PM2 para startup automático
log "⚙️ Configurando PM2..."
pm2 save
pm2 startup
success "PM2 configurado para startup automático"

# 20. Verificar status final
log "🔍 Verificando status final..."
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

# 21. Informações finais
log "🎉 Instalação concluída com sucesso!"
echo ""
echo "🚀 SISPAT está rodando em:"
echo "   - Frontend: http://sispat.vps-kinghost.net"
echo "   - Backend: http://sispat.vps-kinghost.net:3001"
echo ""
echo "📋 COMANDOS ÚTEIS:"
echo "   - Ver status: pm2 status"
echo "   - Ver logs: pm2 logs"
echo "   - Backup: ./scripts/backup.sh"
echo "   - Reiniciar: pm2 restart all"
echo ""
echo "🔒 CONFIGURAÇÕES IMPORTANTES:"
echo "   - PostgreSQL: usuário=sispat_user, senha=sispat123456"
echo "   - Redis: senha=sispat123456"
echo "   - JWT_SECRET: gerado automaticamente"
echo ""
echo "⚠️  IMPORTANTE: Altere as senhas padrão em produção!"
echo "   - Edite: /var/www/sispat/.env.production"
echo "   - Configure: /etc/postgresql/*/main/pg_hba.conf"
echo "   - Configure: /etc/redis/redis.conf"
echo ""
echo "🌐 Para configurar SSL:"
echo "   certbot --nginx -d sispat.vps-kinghost.net"
echo ""
echo "🔧 Para resolver problemas do PostgreSQL:"
echo "   - Ubuntu 20.04: Use repositório focal-pgdg"
echo "   - Ubuntu 22.04: Use repositório jammy-pgdg"
echo ""

success "Instalação da VPS concluída! SISPAT está rodando."
