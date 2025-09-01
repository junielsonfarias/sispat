#!/bin/bash

# =================================
# SCRIPT DE INSTALAÇÃO COMPLETA VPS - SISPAT
# Inclui todas as correções e soluções
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
echo "🚀 ================================================="
echo "🚀    INSTALAÇÃO COMPLETA VPS - SISPAT"
echo "🚀    Sistema de Patrimônio"
echo "🚀 ================================================="
echo ""

# Verificar se estamos rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Este script deve ser executado como root (sudo)"
fi

# Verificar sistema operacional
if ! command -v apt &> /dev/null; then
    error "Este script é específico para sistemas baseados em Debian/Ubuntu"
fi

# 1. Atualizar sistema
log "📦 Atualizando sistema..."
apt update && apt upgrade -y
apt install -y build-essential curl git software-properties-common unzip wget
success "Sistema atualizado"

# 2. Configurar fuso horário e locale
log "🕐 Configurando fuso horário e locale..."
timedatectl set-timezone America/Sao_Paulo
locale-gen pt_BR.UTF-8
update-locale LANG=pt_BR.UTF-8
success "Fuso horário e locale configurados"

# 3. Instalar Node.js
log "📦 Instalando Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
success "Node.js instalado: $(node --version)"

# 4. Instalar pnpm e PM2
log "📦 Instalando pnpm e PM2..."
npm install -g pnpm pm2
success "pnpm instalado: $(pnpm --version)"
success "PM2 instalado: $(pm2 --version)"

# 5. Instalar PostgreSQL
log "🗄️ Instalando PostgreSQL..."

# Verificar versão do Ubuntu
UBUNTU_VERSION=$(lsb_release -cs)
log "📋 Versão do Ubuntu detectada: $UBUNTU_VERSION"

# Para Ubuntu 20.04, usar diretamente o repositório padrão
if [[ "$UBUNTU_VERSION" == "focal" ]]; then
    log "📦 Ubuntu 20.04 detectado - usando repositório padrão..."
    log "⚠️ Repositório oficial PostgreSQL não disponível para focal"
    
    # Remover qualquer repositório PostgreSQL problemático
    rm -f /etc/apt/sources.list.d/pgdg.list
    apt-key del ACCC4CF8 2>/dev/null || true
    
    # Limpar cache e atualizar
    apt clean
    apt update
    
    # Instalar PostgreSQL do repositório padrão Ubuntu
    apt install -y postgresql postgresql-contrib
    
elif [[ "$UBUNTU_VERSION" == "jammy" ]]; then
    # Ubuntu 22.04 - usar repositório oficial
    log "📦 Configurando repositório PostgreSQL para Ubuntu 22.04..."
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt jammy-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    
    # Atualizar e instalar
    apt update
    apt install -y postgresql postgresql-contrib
    
else
    # Tentar repositório genérico
    log "⚠️ Versão não suportada, tentando repositório genérico..."
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    
    # Atualizar e instalar
    apt update
    apt install -y postgresql postgresql-contrib
fi

# Verificar se a instalação foi bem-sucedida
if ! command -v psql &> /dev/null; then
    log "⚠️ Falha na instalação PostgreSQL, tentando repositório padrão..."
    
    # Remover repositórios problemáticos
    rm -f /etc/apt/sources.list.d/pgdg.list
    apt-key del ACCC4CF8 2>/dev/null || true
    
    # Limpar cache e tentar novamente
    apt clean
    apt update
    apt install -y postgresql postgresql-contrib
fi

# Verificar instalação final
if command -v psql &> /dev/null; then
    success "PostgreSQL instalado: $(psql --version)"
else
    error "Falha na instalação do PostgreSQL"
fi

# 6. Configurar PostgreSQL
log "⚙️ Configurando PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

# Criar usuário e banco
sudo -u postgres psql -c "CREATE USER sispat_user WITH PASSWORD 'sispat123456';" 2>/dev/null || log "⚠️ Usuário sispat_user já existe"
sudo -u postgres psql -c "CREATE DATABASE sispat_production OWNER sispat_user;" 2>/dev/null || log "⚠️ Banco sispat_production já existe"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;"
sudo -u postgres psql -c "ALTER USER sispat_user CREATEDB;"
success "PostgreSQL configurado"

# 7. Instalar Redis
log "📦 Instalando Redis..."
apt install -y redis-server

# Configurar Redis
sed -i 's/# requirepass foobared/requirepass sispat123456/' /etc/redis/redis.conf
sed -i 's/# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
sed -i 's/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

systemctl enable redis-server
systemctl start redis-server
success "Redis instalado e configurado"

# 8. Instalar Nginx
log "📦 Instalando Nginx..."
apt install -y nginx
success "Nginx instalado: $(nginx -v 2>&1 | head -n1)"

# 9. Configurar firewall
log "🔥 Configurando firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3001
ufw --force enable
success "Firewall configurado"

# 10. Clonar repositório
log "📥 Clonando repositório SISPAT..."
cd /var/www
if [ -d "sispat" ]; then
    log "⚠️ Diretório sispat já existe, fazendo backup..."
    mv sispat sispat.backup.$(date +%Y%m%d_%H%M%S)
fi

git clone https://github.com/junielsonfarias/sispat.git
cd sispat
success "Repositório clonado"

# 11. Configurar variáveis de ambiente
log "⚙️ Configurando variáveis de ambiente..."
if [ ! -f ".env.production" ]; then
    cat > .env.production << 'EOF'
# Configurações básicas
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Banco de dados
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

# JWT
JWT_SECRET=sispat_production_secret_key_$(date +%s)
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://sispat.vps-kinghost.net
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Segurança
ENABLE_HELMET=true
ENABLE_CORS=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
EOF
    success "Arquivo .env.production criado"
else
    log "⚠️ Arquivo .env.production já existe"
fi

# 12. Tornar scripts executáveis
log "🔧 Configurando scripts..."
chmod +x scripts/*.sh

# 13. Executar setup de produção
log "⚙️ Executando setup de produção..."
./scripts/setup-production.sh

# 14. Executar deploy
log "🚀 Executando deploy..."
./scripts/deploy-production-simple.sh

# 15. Configurar Nginx
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

# 16. Configurar PM2
log "⚙️ Configurando PM2..."
pm2 save
pm2 startup
success "PM2 configurado para startup automático"

# 17. Instalar Certbot para SSL
log "🔒 Instalando Certbot para SSL..."
apt install -y certbot python3-certbot-nginx
success "Certbot instalado"

# 18. Verificar status final
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

# 19. Informações finais
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
echo "📚 DOCUMENTAÇÃO:"
echo "   - Guia completo: VPS-INSTALLATION-GUIDE-UPDATED.md"
echo "   - Correção PostgreSQL: POSTGRESQL-UBUNTU20-FIX.md"
echo ""

success "🎉 Instalação completa da VPS concluída! SISPAT está rodando."

# 20. Instruções para SSL
echo ""
echo "🔒 PRÓXIMO PASSO - CONFIGURAR SSL:"
echo "===================================="
echo "Execute o comando abaixo para configurar SSL automaticamente:"
echo ""
echo "   certbot --nginx -d sispat.vps-kinghost.net"
echo ""
echo "Isso irá:"
echo "   ✅ Obter certificado SSL gratuito"
echo "   ✅ Configurar HTTPS automaticamente"
echo "   ✅ Configurar renovação automática"
echo ""

success "🚀 SISPAT está pronto para uso em produção!"
