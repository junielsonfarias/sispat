#!/bin/bash

# =================================
# INSTALAÇÃO COMPLETA VPS - SISPAT
# Script completamente novo e testado
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
echo "🚀    Script completamente novo e testado"
echo "🚀    ✅ Instalação automática e segura"
echo "🚀    ✅ Configuração otimizada para produção"
echo "🚀 ================================================"
echo ""

# Verificar se estamos rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Este script deve ser executado como root (sudo)"
fi

# Configurações
DOMAIN=""
DB_PASSWORD=""
JWT_SECRET=""
EMAIL=""

# Função para obter configurações do usuário
get_user_config() {
    echo ""
    echo "📋 CONFIGURAÇÃO INICIAL:"
    echo "========================="
    echo "Este script irá instalar o SISPAT automaticamente."
    echo "Você precisará fornecer algumas informações básicas."
    echo ""
    
    # Obter domínio
    while [ -z "$DOMAIN" ]; do
        read -p "🌐 Digite seu domínio (ex: meusite.com): " DOMAIN
        if [ -z "$DOMAIN" ]; then
            warning "Domínio é obrigatório!"
        fi
    done
    
    # Obter senha do banco
    while [ -z "$DB_PASSWORD" ]; do
        read -s -p "🔒 Digite uma senha forte para o banco de dados: " DB_PASSWORD
        echo ""
        if [ -z "$DB_PASSWORD" ]; then
            warning "Senha é obrigatória!"
        elif [ ${#DB_PASSWORD} -lt 8 ]; then
            warning "Senha deve ter pelo menos 8 caracteres!"
            DB_PASSWORD=""
        fi
    done
    
    # Obter email
    while [ -z "$EMAIL" ]; do
        read -p "📧 Digite seu email para certificado SSL: " EMAIL
        if [ -z "$EMAIL" ]; then
            warning "Email é obrigatório!"
        fi
    done
    
    # Gerar JWT Secret
    JWT_SECRET=$(openssl rand -base64 32)
    
    echo ""
    echo "📋 CONFIGURAÇÕES CONFIRMADAS:"
    echo "=============================="
    echo "🌐 Domínio: $DOMAIN"
    echo "🔒 Senha DB: [OCULTA]"
    echo "🔑 JWT Secret: [GERADO AUTOMATICAMENTE]"
    echo "📧 Email SSL: $EMAIL"
    echo ""
    
    read -p "✅ Confirma as configurações? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Instalação cancelada pelo usuário"
    fi
}

# Função para atualizar sistema
update_system() {
    log "📦 Atualizando sistema..."
    
    apt update -y
    apt upgrade -y
    apt install -y build-essential curl git software-properties-common unzip wget lsb-release
    
    success "Sistema atualizado"
}

# Função para instalar Node.js
install_nodejs() {
    log "📦 Instalando Node.js 18.x..."
    
    # Instalar Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    
    # Verificar instalação
    NODE_VERSION=$(node --version)
    success "Node.js instalado: $NODE_VERSION"
}

# Função para instalar ferramentas
install_tools() {
    log "📦 Instalando ferramentas..."
    
    # Instalar PM2 globalmente
    npm install -g pm2
    
    success "Ferramentas instaladas"
}

# Função para instalar PostgreSQL
install_postgresql() {
    log "🗄️ Instalando PostgreSQL..."
    
    # Instalar PostgreSQL
    apt install -y postgresql postgresql-contrib
    
    # Iniciar e habilitar serviço
    systemctl start postgresql
    systemctl enable postgresql
    
    # Configurar usuário e banco
    sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS sispat_production;
DROP USER IF EXISTS sispat_user;
CREATE USER sispat_user WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE sispat_production OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
ALTER USER sispat_user CREATEDB;
\q
EOF
    
    success "PostgreSQL instalado e configurado"
}

# Função para instalar Redis
install_redis() {
    log "📦 Instalando Redis..."
    
    # Instalar Redis
    apt install -y redis-server
    
    # Configurar Redis
    sed -i 's/# requirepass foobared/requirepass '$DB_PASSWORD'/' /etc/redis/redis.conf
    sed -i 's/# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
    sed -i 's/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
    
    # Iniciar e habilitar serviço
    systemctl start redis-server
    systemctl enable redis-server
    
    success "Redis instalado e configurado"
}

# Função para instalar Nginx
install_nginx() {
    log "📦 Instalando Nginx..."
    
    # Instalar Nginx
    apt install -y nginx
    
    success "Nginx instalado"
}

# Função para configurar firewall
configure_firewall() {
    log "🔥 Configurando firewall..."
    
    # Instalar UFW
    apt install -y ufw
    
    # Configurar regras
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 3001/tcp
    
    # Ativar firewall
    ufw --force enable
    
    success "Firewall configurado"
}

# Função para clonar repositório
clone_repository() {
    log "📥 Clonando repositório SISPAT..."
    
    # Criar diretório
    mkdir -p /var/www
    cd /var/www
    
    # Fazer backup se existir
    if [ -d "sispat" ]; then
        warning "Diretório sispat já existe, fazendo backup..."
        mv sispat sispat.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Clonar repositório
    git clone https://github.com/junielsonfarias/sispat.git
    cd sispat
    
    success "Repositório clonado"
}

# Função para configurar variáveis de ambiente
configure_environment() {
    log "⚙️ Configurando variáveis de ambiente..."
    
    # Criar arquivo .env
    cat > .env << EOF
# Configurações básicas
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Banco de dados
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

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://$DOMAIN,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=https://$DOMAIN,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080

# URLs dinâmicas
VITE_BACKEND_URL=https://$DOMAIN
VITE_API_URL=https://$DOMAIN/api
VITE_WS_URL=wss://$DOMAIN
EOF
    
    success "Arquivo .env criado"
}

# Função para configurar scripts
configure_scripts() {
    log "🔧 Configurando scripts e diretórios..."
    
    # Tornar scripts executáveis
    chmod +x scripts/*.sh
    
    # Criar diretórios necessários
    mkdir -p logs
    mkdir -p backups
    
    success "Scripts configurados com permissões de execução"
}

# Função para instalar dependências
install_dependencies() {
    log "📦 Instalando dependências..."
    
    # Instalar dependências
    npm install --legacy-peer-deps --no-optional --force
    
    success "Dependências instaladas"
}

# Função para habilitar extensões PostgreSQL
enable_postgresql_extensions() {
    log "🔧 Habilitando extensões PostgreSQL..."
    
    # Habilitar extensões
    sudo -u postgres psql -d sispat_production << EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
\q
EOF
    
    success "Extensões PostgreSQL habilitadas"
}

# Função para executar migrações
run_migrations() {
    log "🗄️ Executando migrações do banco..."
    
    # Executar migrações
    node server/database/migrate.js
    
    success "Migrações executadas"
}

# Função para fazer build do frontend
build_frontend() {
    log "🏗️ Fazendo build do frontend..."
    
    # Fazer build
    npm run build
    
    success "Build do frontend concluído"
}

# Função para configurar Nginx
configure_nginx() {
    log "🌐 Configurando Nginx..."
    
    # Criar configuração do site
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
    
    # Recarregar Nginx
    systemctl reload nginx
    
    success "Nginx configurado"
}

# Função para configurar SSL
configure_ssl() {
    log "🔒 Configurando SSL..."
    
    # Instalar Certbot
    apt install -y certbot python3-certbot-nginx
    
    # Obter certificado SSL
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL
    
    success "SSL configurado"
}

# Função para configurar PM2
configure_pm2() {
    log "⚙️ Configurando PM2..."
    
    # Iniciar aplicação
    pm2 start ecosystem.config.cjs --env production
    
    # Salvar configuração
    pm2 save
    
    # Configurar startup
    pm2 startup systemd -u root --hp /root
    
    success "PM2 configurado"
}

# Função para configurar domínio
configure_domain() {
    log "🌐 Configurando domínio..."
    
    # Atualizar URLs no .env
    sed -i "s|VITE_BACKEND_URL=.*|VITE_BACKEND_URL=https://$DOMAIN|" .env
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://$DOMAIN/api|" .env
    sed -i "s|VITE_WS_URL=.*|VITE_WS_URL=wss://$DOMAIN|" .env
    
    # Fazer rebuild com novas URLs
    npm run build
    
    success "Domínio configurado"
}

# Função para aplicar correções
apply_fixes() {
    log "🔧 Aplicando correções..."
    
    # Parar PM2
    pm2 stop all 2>/dev/null || true
    
    # Aplicar correção createContext
    if [ -f "scripts/fix-createcontext-definitive.sh" ]; then
        chmod +x scripts/fix-createcontext-definitive.sh
        ./scripts/fix-createcontext-definitive.sh
    fi
    
    # Aplicar correção vite.config.ts
    if [ -f "scripts/fix-vite-config-error.sh" ]; then
        chmod +x scripts/fix-vite-config-error.sh
        ./scripts/fix-vite-config-error.sh
    fi
    
    success "Correções aplicadas"
}

# Função para verificar instalação
verify_installation() {
    log "🔍 Verificando instalação..."
    
    # Verificar serviços
    systemctl is-active --quiet postgresql && success "PostgreSQL ativo" || error "PostgreSQL não está ativo"
    systemctl is-active --quiet redis-server && success "Redis ativo" || error "Redis não está ativo"
    systemctl is-active --quiet nginx && success "Nginx ativo" || error "Nginx não está ativo"
    
    # Verificar PM2
    pm2 list | grep -q "online" && success "PM2 ativo" || error "PM2 não está ativo"
    
    # Verificar API
    sleep 5
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
        success "API respondendo"
    else
        warning "API pode não estar respondendo"
    fi
    
    # Verificar frontend
    if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200"; then
        success "Frontend respondendo"
    else
        warning "Frontend pode não estar respondendo"
    fi
    
    success "Verificação concluída"
}

# Função principal
main() {
    get_user_config
    update_system
    install_nodejs
    install_tools
    install_postgresql
    install_redis
    install_nginx
    configure_firewall
    clone_repository
    configure_environment
    configure_scripts
    install_dependencies
    enable_postgresql_extensions
    run_migrations
    build_frontend
    configure_nginx
    configure_ssl
    configure_pm2
    configure_domain
    apply_fixes
    verify_installation
    
    # Instruções finais
    log "📝 INSTALAÇÃO CONCLUÍDA!"
    echo ""
    echo "🎉 SISPAT INSTALADO COM SUCESSO!"
    echo "=================================="
    echo ""
    echo "🌐 URLs da aplicação:"
    echo "   - Frontend: https://$DOMAIN"
    echo "   - API: https://$DOMAIN/api"
    echo "   - Health: https://$DOMAIN/api/health"
    echo ""
    echo "📊 Serviços:"
    echo "   - PostgreSQL: localhost:5432"
    echo "   - Redis: localhost:6379"
    echo "   - Nginx: localhost:80/443"
    echo "   - PM2: gerenciando aplicação"
    echo ""
    echo "🔧 Comandos úteis:"
    echo "   - Ver logs: pm2 logs sispat"
    echo "   - Reiniciar: pm2 restart sispat"
    echo "   - Status: pm2 status"
    echo "   - Nginx: systemctl status nginx"
    echo "   - PostgreSQL: systemctl status postgresql"
    echo ""
    echo "📞 Suporte:"
    echo "   - Logs: pm2 logs sispat"
    echo "   - Nginx: tail -f /var/log/nginx/error.log"
    echo "   - PostgreSQL: tail -f /var/log/postgresql/postgresql-*.log"
    echo ""
    echo "🎯 Próximos passos:"
    echo "   1. Acesse https://$DOMAIN"
    echo "   2. Faça login com as credenciais padrão"
    echo "   3. Configure usuários e permissões"
    echo "   4. Configure backup automático"
    echo ""
    
    success "🎉 Instalação concluída com sucesso!"
}

# Executar função principal
main
