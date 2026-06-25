#!/bin/bash

# ===========================================
# 🚀 SISPAT 2.0 - INSTALADOR SIMPLIFICADO
# ===========================================
# Instalação completa em servidor VPS Linux
# Versão: 2.0.4
# Suporta: Debian 11/12, Ubuntu 20.04/22.04/24.04
# ===========================================

set -e

# Cores para interface
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Variáveis globais
INSTALL_DIR="/var/www/sispat"
GITHUB_REPO="https://github.com/junielsonfarias/sispat.git"

# Banner
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}║      🏛️  SISPAT 2.0 - INSTALADOR AUTOMÁTICO       ║${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}║    Sistema Integrado de Patrimônio Municipal      ║${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Função de log
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

error() {
    echo -e "${RED}[ERRO]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[ATENÇÃO]${NC} $1"
}

# Verificar se é root
if [ "$EUID" -ne 0 ]; then 
    error "Execute como root: sudo bash install-sispat.sh"
fi

# Verificar sistema
log "Verificando sistema operacional..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
    success "Sistema detectado: $OS $VERSION"
else
    error "Sistema operacional não identificado"
fi

# Verificar se suportado
if [[ "$OS" != "debian" && "$OS" != "ubuntu" ]]; then
    error "Sistema não suportado. Use Debian ou Ubuntu"
fi

# Solicitar informações
echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}   INFORMAÇÕES NECESSÁRIAS PARA INSTALAÇÃO          ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════${NC}"
echo ""

read -p "Domínio do sistema (ex: sispat.prefeitura.com.br): " DOMAIN
if [ -z "$DOMAIN" ]; then
    error "Domínio é obrigatório"
fi

read -p "Email do superusuário: " SUPERUSER_EMAIL
if [ -z "$SUPERUSER_EMAIL" ]; then
    error "Email do superusuário é obrigatório"
fi

read -sp "Senha do superusuário (12+ caracteres): " SUPERUSER_PASSWORD
echo ""
if [ ${#SUPERUSER_PASSWORD} -lt 12 ]; then
    error "Senha deve ter no mínimo 12 caracteres"
fi

read -p "Nome completo do superusuário: " SUPERUSER_NAME
if [ -z "$SUPERUSER_NAME" ]; then
    error "Nome do superusuário é obrigatório"
fi

read -p "Nome do município: " MUNICIPALITY_NAME
if [ -z "$MUNICIPALITY_NAME" ]; then
    error "Nome do município é obrigatório"
fi

read -p "Estado (UF): " STATE
if [ -z "$STATE" ]; then
    error "Estado é obrigatório"
fi

read -sp "Senha do banco PostgreSQL: " DB_PASSWORD
echo ""
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    warning "Senha gerada automaticamente: $DB_PASSWORD"
fi

read -p "Configurar SSL com Let's Encrypt? [S/n]: " SETUP_SSL
SETUP_SSL=${SETUP_SSL:-S}

# Confirmar instalação
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}   RESUMO DA INSTALAÇÃO                             ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "Domínio: ${GREEN}$DOMAIN${NC}"
echo -e "Email Admin: ${GREEN}$SUPERUSER_EMAIL${NC}"
echo -e "Município: ${GREEN}$MUNICIPALITY_NAME${NC}"
echo -e "Estado: ${GREEN}$STATE${NC}"
echo -e "SSL: ${GREEN}$SETUP_SSL${NC}"
echo ""
read -p "Confirmar instalação? [S/n]: " CONFIRM
CONFIRM=${CONFIRM:-S}

if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
    error "Instalação cancelada"
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}   INICIANDO INSTALAÇÃO                              ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

# ETAPA 1: Atualizar sistema
log "Etapa 1/8: Atualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt update -qq
apt upgrade -y -qq
success "Sistema atualizado"

# ETAPA 2: Instalar dependências básicas
log "Etapa 2/8: Instalando dependências básicas..."
apt install -y -qq \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release
success "Dependências instaladas"

# ETAPA 3: Instalar Node.js 20
log "Etapa 3/8: Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
apt install -y -qq nodejs
success "Node.js $(node --version) instalado"

# ETAPA 4: Instalar PNPM e PM2
log "Etapa 4/8: Instalando PNPM e PM2..."
npm install -g pnpm pm2 --silent
success "PNPM e PM2 instalados"

# ETAPA 5: Instalar PostgreSQL
log "Etapa 5/8: Instalando PostgreSQL..."
apt install -y -qq postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
success "PostgreSQL instalado"

# ETAPA 6: Instalar Nginx
log "Etapa 6/8: Instalando Nginx..."
apt install -y -qq nginx
systemctl start nginx
systemctl enable nginx
success "Nginx instalado"

# ETAPA 7: Instalar Certbot (se SSL)
if [[ "$SETUP_SSL" =~ ^[Ss]$ ]]; then
    log "Etapa 7/8: Instalando Certbot..."
    apt install -y -qq certbot python3-certbot-nginx
    success "Certbot instalado"
fi

# ETAPA 8: Baixar código
log "Etapa 8/8: Clonando repositório..."
mkdir -p /var/www
cd /var/www
if [ -d "sispat" ]; then
    warning "Diretório sispat já existe. Fazendo backup..."
    mv sispat sispat.backup.$(date +%Y%m%d_%H%M%S)
fi
git clone --quiet $GITHUB_REPO sispat
cd sispat

# ✅ CORREÇÃO: Configurar Git safe.directory para evitar erro de "dubious ownership"
log "Configurando Git..."
git config --global --add safe.directory /var/www/sispat
success "Git configurado"

success "Código baixado"

# Configurar PostgreSQL
log "Configurando banco de dados..."
sudo -u postgres psql <<EOF >/dev/null 2>&1
ALTER USER postgres WITH PASSWORD 'postgres_temp_password_2025';
CREATE USER sispat_user WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE sispat_prod OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_prod TO sispat_user;
EOF
success "Banco de dados configurado"

# Build do pacote compartilhado (@sispat/shared) - PRÉ-REQUISITO
# Frontend e backend dependem de shared/dist (gitignored). Sem este passo
# os builds quebram em clone limpo ao resolver @sispat/shared.
log "Compilando pacote compartilhado (@sispat/shared)..."
if [ -d "shared" ]; then
    cd shared
    (corepack pnpm install || npm install) >/tmp/shared-install.log 2>&1
    npm run build >/tmp/shared-build.log 2>&1 || error "Falha ao compilar @sispat/shared. Verifique: /tmp/shared-build.log"
    cd ..
    success "Pacote compartilhado compilado"
else
    warning "Diretório shared não encontrado — pulando build do pacote compartilhado"
fi

# Configurar Backend
log "Configurando backend..."
cd backend

# Gerar JWT_SECRET
JWT_SECRET=$(openssl rand -hex 32)

cat > .env <<EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL="postgresql://sispat_user:$DB_PASSWORD@localhost:5432/sispat_prod"
DATABASE_SSL=false

# JWT
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="24h"

# CORS
# ✅ CORREÇÃO: Configurar FRONTEND_URL baseado em SSL
FRONTEND_URL="https://$DOMAIN"
CORS_ORIGIN="https://$DOMAIN"
CORS_CREDENTIALS=true

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=2000

# ✅ CORREÇÃO: Redis (desabilitado por padrão, pode ser habilitado depois)
ENABLE_REDIS=false

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"

# Logging
LOG_LEVEL=info
LOG_FILE="./logs/app.log"

# Monitoring
ENABLE_METRICS=true
HEALTH_CHECK_INTERVAL=30000

# Municipality
MUNICIPALITY_NAME="$MUNICIPALITY_NAME"
STATE="$STATE"
SUPERUSER_EMAIL="$SUPERUSER_EMAIL"
SUPERUSER_PASSWORD="$SUPERUSER_PASSWORD"
SUPERUSER_NAME="$SUPERUSER_NAME"
EOF
success "Backend configurado"

# Instalar dependências do backend (incluindo devDependencies para compilação)
log "Instalando dependências do backend..."
npm install --silent
success "Dependências do backend instaladas"

# Build do backend
log "Compilando backend..."
if npm run build:prod 2>&1 | tee /tmp/backend-build.log | grep -v "DeprecationWarning"; then
    if grep -qi "error" /tmp/backend-build.log; then
        error "Erro na compilação do backend. Verifique: /tmp/backend-build.log"
    fi
    success "Backend compilado"
else
    error "Falha na compilação do backend. Verifique: /tmp/backend-build.log"
fi

# Executar migrations
log "Aplicando migrations do banco..."
# Prisma Client já foi gerado pelo build:prod
npx prisma migrate deploy >/dev/null 2>&1 || error "Falha ao aplicar migrations. Verifique a conexão com o banco."
success "Migrations aplicadas"

# Popular banco
log "Populando banco de dados..."
export MUNICIPALITY_NAME="$MUNICIPALITY_NAME"
export STATE="$STATE"
export SUPERUSER_EMAIL="$SUPERUSER_EMAIL"
export SUPERUSER_PASSWORD="$SUPERUSER_PASSWORD"
export SUPERUSER_NAME="$SUPERUSER_NAME"
export BCRYPT_ROUNDS=12

if npm run prisma:seed:prod >/tmp/seed.log 2>&1; then
    success "Banco populado"
else
    warning "Seed falhou. Verifique logs: /tmp/seed.log"
    warning "Você pode executar manualmente: cd backend && npm run prisma:seed:prod"
fi

# Configurar Frontend
log "Configurando frontend..."
cd ..

# ✅ CORREÇÃO: Configurar VITE_API_URL baseado em SSL
if [[ "$SETUP_SSL" =~ ^[Ss]$ ]]; then
    FRONTEND_API_URL="https://$DOMAIN/api"
else
    FRONTEND_API_URL="http://$DOMAIN/api"
fi

cat > .env <<EOF
# Frontend Configuration
VITE_API_URL=$FRONTEND_API_URL
VITE_USE_BACKEND=true
VITE_APP_NAME=SISPAT 2.0
VITE_APP_VERSION=2.0.4
VITE_APP_ENV=production

# Build Configuration
VITE_BUILD_OPTIMIZE=true
VITE_BUILD_COMPRESS=true
VITE_BUILD_ANALYZE=false

# Security
VITE_ENABLE_DEVTOOLS=false
VITE_ENABLE_LOGGING=false
EOF

# ✅ CORREÇÃO: Garantir que .env.production existe para build
cp .env .env.production 2>/dev/null || true

success "Frontend configurado"

# Instalar dependências do frontend
log "Instalando dependências do frontend..."
pnpm install --frozen-lockfile --silent
success "Dependências do frontend instaladas"

# Build do frontend
log "Compilando frontend..."
if pnpm run build:prod 2>&1 | tee /tmp/frontend-build.log; then
    if grep -qi "error" /tmp/frontend-build.log; then
        error "Erro na compilação do frontend. Verifique: /tmp/frontend-build.log"
    fi
    if [ ! -d "dist" ]; then
        error "Diretório dist não criado. Build pode ter falhado."
    fi
    success "Frontend compilado"
else
    error "Falha na compilação do frontend. Verifique: /tmp/frontend-build.log"
fi

# Configurar Nginx
log "Configurando Nginx..."

if [[ "$SETUP_SSL" =~ ^[Ss]$ ]]; then
    # Configuração com SSL (será configurado pelo Certbot)
    cat > /etc/nginx/sites-available/sispat <<EOF
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge {
        root /var/www/html;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server (SSL será configurado pelo Certbot)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL (será configurado pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Frontend
    root /var/www/sispat/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Uploads
    location /uploads {
        alias /var/www/sispat/backend/uploads;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    client_max_body_size 10M;
}
EOF
else
    # Configuração sem SSL (apenas HTTP)
    cat > /etc/nginx/sites-available/sispat <<EOF
# HTTP server (sem SSL)
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    root /var/www/sispat/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Uploads
    location /uploads {
        alias /var/www/sispat/backend/uploads;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    client_max_body_size 10M;
}
EOF
fi

# Ativar site
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
if nginx -t >/tmp/nginx-test.log 2>&1; then
    systemctl reload nginx
    success "Nginx configurado"
else
    error "Erro na configuração do Nginx. Verifique: /tmp/nginx-test.log"
fi

# Configurar SSL
if [[ "$SETUP_SSL" =~ ^[Ss]$ ]]; then
    log "Configurando SSL com Let's Encrypt..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $SUPERUSER_EMAIL --redirect || warning "Certificado SSL não obtido (DNS pode não estar propagado ainda)"
    success "SSL configurado"
fi

# Configurar permissões
log "Configurando permissões..."
chown -R www-data:www-data /var/www/sispat
find /var/www/sispat -type d -exec chmod 755 {} \;
find /var/www/sispat -type f -exec chmod 644 {} \;
chmod +x /var/www/sispat/backend/dist/index.js 2>/dev/null || true
success "Permissões configuradas"

# Iniciar backend com PM2
log "Iniciando backend..."
cd backend

# Verificar se dist/index.js existe
if [ ! -f "dist/index.js" ]; then
    error "dist/index.js não encontrado. Build pode ter falhado. Verifique: /tmp/backend-build.log"
fi

# Verificar se diretório de logs existe
mkdir -p logs/pm2

pm2 delete sispat-backend 2>/dev/null || true

# Iniciar PM2 e capturar saída
if pm2 start ecosystem.config.js --env production 2>&1 | tee /tmp/pm2-start.log; then
    pm2 save --silent
    success "PM2 iniciado"
else
    error "Falha ao iniciar PM2. Verifique: /tmp/pm2-start.log e pm2 logs sispat-backend"
fi

# Configurar PM2 startup (adaptar para root ou usuário normal)
if [ "$USER" != "root" ] && [ -d "/home/$USER" ]; then
    pm2 startup systemd -u $USER --hp /home/$USER >/dev/null 2>&1 || warning "PM2 startup não configurado automaticamente"
else
    pm2 startup systemd >/dev/null 2>&1 || warning "PM2 startup não configurado. Execute manualmente: pm2 startup"
fi

# Verificar se processo está rodando
sleep 3
if pm2 list | grep -q "sispat-backend.*online"; then
    success "Backend iniciado e rodando"
else
    warning "Backend pode não estar rodando. Verifique: pm2 status e pm2 logs sispat-backend"
fi

# Aguardar backend iniciar
log "Aguardando backend iniciar..."
sleep 10

# Verificar instalação
log "Verificando instalação..."

# Testar health check
log "Verificando saúde do backend..."
MAX_RETRIES=5
RETRY_COUNT=0
HEALTH_OK=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        HEALTH_OK=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 3
done

if [ "$HEALTH_OK" = true ]; then
    success "Backend respondendo corretamente"
else
    warning "Backend pode estar iniciando ainda. Verifique: pm2 logs sispat-backend"
fi

# Verificar PM2
if pm2 list | grep -q "sispat-backend.*online"; then
    success "PM2 rodando corretamente"
else
    warning "PM2 pode ter problemas. Verifique: pm2 status"
fi

# Verificar Nginx
if systemctl is-active --quiet nginx; then
    success "Nginx rodando corretamente"
else
    error "Nginx não está rodando. Execute: systemctl status nginx"
fi

# Verificar banco
if sudo -u postgres psql -d sispat_prod -c "SELECT COUNT(*) FROM users;" >/dev/null 2>&1; then
    USER_COUNT=$(sudo -u postgres psql -d sispat_prod -tAc "SELECT COUNT(*) FROM users;")
    success "Banco de dados OK ($USER_COUNT usuários)"
else
    warning "Problema ao acessar banco de dados"
fi

# Testar acesso externo
log "Testando acesso externo..."
sleep 5
if curl -f "https://$DOMAIN" >/dev/null 2>&1 || curl -f "http://$DOMAIN" >/dev/null 2>&1; then
    success "Sistema acessível em $DOMAIN"
else
    warning "DNS pode não estar propagado ainda. Acesse via IP temporariamente"
fi

# Informações de acesso
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!              ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}📍 Acesso ao Sistema:${NC}"
echo -e "   URL: ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "${CYAN}👤 Credenciais de Acesso:${NC}"
echo -e "   Email: ${GREEN}$SUPERUSER_EMAIL${NC}"
echo -e "   Senha: ${GREEN}[Senha configurada]${NC}"
echo ""
echo -e "${CYAN}🔐 Senha do Banco de Dados:${NC}"
echo -e "   ${GREEN}$DB_PASSWORD${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo -e "   1. Alterar senha no primeiro acesso"
echo -e "   2. Configurar backup automático"
echo -e "   3. Monitorar logs: pm2 logs sispat-backend"
echo -e "   4. Verificar SSL se não foi configurado"
echo ""
echo -e "${CYAN}📚 Comandos Úteis:${NC}"
echo -e "   Ver logs: ${GREEN}pm2 logs sispat-backend${NC}"
echo -e "   Status: ${GREEN}pm2 status${NC}"
echo -e "   Reiniciar: ${GREEN}pm2 restart sispat-backend${NC}"
echo -e "   Nginx: ${GREEN}systemctl status nginx${NC}"
echo ""
echo -e "${GREEN}🎉 Sistema pronto para uso!${NC}"
echo ""

# Salvar informações
cat > /root/sispat-info.txt <<EOF
═══════════════════════════════════════════════════
   SISPAT 2.0 - INFORMAÇÕES DE ACESSO
═══════════════════════════════════════════════════

Instalado em: $(date)
URL: https://$DOMAIN

Credenciais:
- Email: $SUPERUSER_EMAIL
- Senha: [Configurada durante instalação]

Banco de Dados:
- Database: sispat_prod
- User: sispat_user
- Password: $DB_PASSWORD
- Host: localhost:5432

Comandos Úteis:
- pm2 logs sispat-backend  # Ver logs
- pm2 status               # Status
- pm2 restart sispat-backend  # Reiniciar
- systemctl status nginx   # Status Nginx

═══════════════════════════════════════════════════
EOF

success "Informações salvas em /root/sispat-info.txt"

