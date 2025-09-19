#!/bin/bash

# =============================================================================
# SCRIPT DE INSTALAÇÃO SIMPLES - SISPAT VPS
# Para pessoas sem conhecimento técnico
# =============================================================================

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${PURPLE}🚀 $1${NC}"
}

# Função para pausar e aguardar confirmação
pause() {
    echo -e "\n${YELLOW}Pressione Enter para continuar...${NC}"
    read -r
}

# Função para verificar se está rodando como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script deve ser executado como root!"
        log_info "Execute: sudo su -"
        exit 1
    fi
}

# Função para verificar sistema operacional
check_os() {
    log_header "Verificando sistema operacional..."
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        log_error "Sistema operacional não suportado!"
        exit 1
    fi
    
    log_info "Sistema: $OS $VER"
    
    if [[ "$OS" == *"Ubuntu"* ]]; then
        log_success "Ubuntu detectado - Compatível!"
    elif [[ "$OS" == *"Debian"* ]]; then
        log_success "Debian detectado - Compatível!"
    else
        log_warning "Sistema não testado, mas tentando continuar..."
    fi
}

# Função para atualizar sistema
update_system() {
    log_header "Atualizando sistema..."
    
    log_info "Atualizando lista de pacotes..."
    apt update -y
    
    log_info "Atualizando pacotes instalados..."
    apt upgrade -y
    
    log_info "Instalando dependências básicas..."
    apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    
    log_success "Sistema atualizado com sucesso!"
}

# Função para instalar Node.js
install_nodejs() {
    log_header "Instalando Node.js..."
    
    log_info "Baixando e instalando Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
    
    # Verificar instalação
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    log_success "Node.js $NODE_VERSION instalado!"
    log_success "NPM $NPM_VERSION instalado!"
}

# Função para instalar PostgreSQL
install_postgresql() {
    log_header "Instalando PostgreSQL..."
    
    log_info "Instalando PostgreSQL 15..."
    apt install -y postgresql postgresql-contrib postgresql-client
    
    # Iniciar e habilitar PostgreSQL
    systemctl start postgresql
systemctl enable postgresql
    
    # Configurar PostgreSQL
    log_info "Configurando PostgreSQL..."
    
    # Gerar senhas seguras
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    DB_NAME="sispat_db"
    DB_USER="sispat_user"
    ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Configurar PostgreSQL para aceitar conexões
    PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)
    
    # Backup da configuração original
    cp /etc/postgresql/$PG_VERSION/main/postgresql.conf /etc/postgresql/$PG_VERSION/main/postgresql.conf.backup
    cp /etc/postgresql/$PG_VERSION/main/pg_hba.conf /etc/postgresql/$PG_VERSION/main/pg_hba.conf.backup
    
    # Configurar PostgreSQL para performance e segurança
    cat >> /etc/postgresql/$PG_VERSION/main/postgresql.conf << EOF

# Configurações do SISPAT
listen_addresses = 'localhost'
port = 5432
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = -1
log_autovacuum_min_duration = 0
log_error_verbosity = default

# Performance
shared_preload_libraries = 'pg_stat_statements'
track_activity_query_size = 2048
pg_stat_statements.track = all
pg_stat_statements.max = 10000
EOF

    # Configurar autenticação
    cat > /etc/postgresql/$PG_VERSION/main/pg_hba.conf << EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             all                                     peer
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
# IPv6 local connections:
host    all             all             ::1/128                 md5
# Allow replication connections from localhost, by a user with the
# replication privilege.
local   replication     all                                     peer
host    replication     all             127.0.0.1/32            md5
host    replication     all             ::1/128                 md5
EOF

    # Reiniciar PostgreSQL
    systemctl restart postgresql
    
    # Aguardar PostgreSQL inicializar
    sleep 5

# Criar usuário e banco
    log_info "Criando usuário e banco de dados..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || true
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || true
    sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;" || true
    
    # Configurar senha do postgres para backup
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD '$ADMIN_PASSWORD';" || true
    
    # Testar conexão
    log_info "Testando conexão com o banco..."
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        log_success "PostgreSQL instalado e configurado com sucesso!"
    else
        log_error "Erro ao conectar com PostgreSQL!"
        exit 1
    fi
    
    log_info "Banco: $DB_NAME"
    log_info "Usuário: $DB_USER"
    log_info "Senha: $DB_PASSWORD"
    log_info "Senha Admin: $ADMIN_PASSWORD"
    
    # Salvar credenciais em arquivo seguro
    cat > /root/sispat-db-credentials.txt << EOF
# Credenciais do Banco de Dados SISPAT
# Gerado em: $(date)

Banco de Dados: $DB_NAME
Usuário: $DB_USER
Senha: $DB_PASSWORD

Admin PostgreSQL:
Usuário: postgres
Senha: $ADMIN_PASSWORD

IMPORTANTE: Mantenha este arquivo seguro e não compartilhe!
EOF
    
    chmod 600 /root/sispat-db-credentials.txt
    log_info "Credenciais salvas em: /root/sispat-db-credentials.txt"
}

# Função para instalar Nginx
install_nginx() {
    log_header "Instalando Nginx..."
    
    log_info "Instalando Nginx..."
apt install -y nginx
    
    # Iniciar e habilitar Nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Configurar firewall básico
    ufw allow 'Nginx Full'
    ufw allow OpenSSH
ufw --force enable
    
    log_success "Nginx instalado e configurado!"
}

# Função para instalar PM2
install_pm2() {
    log_header "Instalando PM2..."
    
    log_info "Instalando PM2 globalmente..."
    npm install -g pm2
    
    # Configurar PM2 para iniciar com o sistema
    pm2 startup systemd -u root --hp /root
    pm2 save
    
    log_success "PM2 instalado e configurado!"
}

# Função para baixar e configurar SISPAT
setup_sispat() {
    log_header "Configurando SISPAT..."
    
    # Criar diretório da aplicação
    APP_DIR="/var/www/sispat"
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    log_info "Baixando código do SISPAT..."
    
    # Baixar código do GitHub
    git clone https://github.com/junielsonfarias/sispat.git .
    
    log_info "Instalando dependências..."
    npm install
    
    log_info "Configurando variáveis de ambiente..."
    
    # Gerar JWT Secret seguro
    JWT_SECRET=$(openssl rand -base64 64)
    REFRESH_TOKEN_SECRET=$(openssl rand -base64 64)
    
    # Criar arquivo .env
cat > .env << EOF
# =============================================================================
# CONFIGURAÇÃO DE PRODUÇÃO - SISPAT
# Gerado automaticamente pelo script de instalação
# =============================================================================

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_MAX_CONNECTIONS=100
DB_IDLE_TIMEOUT=120000
DB_CONNECTION_TIMEOUT=60000
DB_SSL_REJECT_UNAUTHORIZED=false

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=12h
REFRESH_TOKEN_SECRET=$REFRESH_TOKEN_SECRET
REFRESH_TOKEN_EXPIRES_IN=7d

# Server Configuration
PORT=3001
NODE_ENV=production
HOST=0.0.0.0

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:8080,http://$(hostname -I | awk '{print $1}'):8080
CORS_ORIGIN=http://localhost:8080,http://$(hostname -I | awk '{print $1}'):8080
CORS_CREDENTIALS=true

# Frontend Configuration
VITE_PORT=8080
VITE_API_TARGET=http://localhost:3001
VITE_API_URL=http://localhost:3001/api
VITE_BACKEND_URL=http://localhost:3001
VITE_DOMAIN=http://$(hostname -I | awk '{print $1}'):8080

# Email Configuration (for password reset, notifications)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@$(hostname)
EMAIL_SUPPORT=support@$(hostname)

# File Upload Configuration
UPLOAD_PATH=$APP_DIR/uploads
MAX_FILE_SIZE=20971520
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel

# Rate Limiting (Backend)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
RATE_LIMIT_AUTH_MAX_ATTEMPTS=5
RATE_LIMIT_AUTH_LOCKOUT_DURATION=300000
RATE_LIMIT_WHITELIST_IPS=127.0.0.1,::1

# Security Configuration
BCRYPT_ROUNDS=14
SESSION_TIMEOUT=3600000
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=3600000
ENABLE_TWO_FACTOR_AUTH=true
TRUST_PROXY=1

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
LOG_FILE_PATH=$APP_DIR/logs/app.log
ERROR_LOG_FILE_PATH=$APP_DIR/logs/error.log
AUDIT_LOG_FILE_PATH=$APP_DIR/logs/audit.log
SENTRY_DSN=

# Backup Configuration
BACKUP_SCHEDULE_CRON="0 2 * * *"
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=/var/backups/sispat

# Redis Configuration (optional, for caching, sessions, rate limiting)
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=
# REDIS_DB=0

# Public Search Configuration
PUBLIC_SEARCH_ENABLED=true
PUBLIC_SEARCH_CACHE_TTL=3600000

# Database Mode (Production with real PostgreSQL)
DISABLE_DATABASE=false
EOF

    # Se o usuário forneceu um domínio, adicionar ao .env
    if [[ -n "$DOMAIN" ]]; then
        log_info "Configurando domínio: $DOMAIN"
        sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://$DOMAIN,http://$DOMAIN|" .env
        echo "VITE_DOMAIN=https://$DOMAIN" >> .env
        echo "VITE_BACKEND_URL=https://$DOMAIN" >> .env
        echo "VITE_API_URL=https://$DOMAIN/api" >> .env
    fi
    
    log_success "SISPAT configurado!"
}

# Função para configurar banco de dados
setup_database() {
    log_header "Configurando banco de dados..."
    
    cd $APP_DIR
    
    log_info "Executando migrações do banco de dados..."
    
    # Criar diretórios necessários
    mkdir -p logs uploads
    
    # Executar script de criação de tabelas
    if [ -f "server/database/create-missing-tables.js" ]; then
        log_info "Criando tabelas do banco de dados..."
        node server/database/create-missing-tables.js
    fi
    
    # Executar script de dados de exemplo
    if [ -f "server/database/create-sample-data.js" ]; then
        log_info "Criando dados iniciais..."
        node server/database/create-sample-data.js
    fi
    
    # Executar script de otimização
    if [ -f "server/database/optimize.js" ]; then
        log_info "Otimizando banco de dados..."
        node server/database/optimize.js
    fi
    
    log_success "Banco de dados configurado com sucesso!"
}

# Função para fazer build da aplicação
build_sispat() {
    log_header "Compilando aplicação..."
    
    cd $APP_DIR
    
    log_info "Fazendo build da aplicação..."
    npm run build:prod
    
    log_success "Aplicação compilada com sucesso!"
}

# Função para configurar Nginx
configure_nginx() {
    log_header "Configurando Nginx..."
    
    # Backup da configuração original
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
    
    # Configurar Nginx para SISPAT
    cat > /etc/nginx/sites-available/default << EOF
server {
    listen 80;
    server_name _;
    
    # Redirecionar para HTTPS se domínio configurado
    if (\$host = $DOMAIN) {
        return 301 https://\$host\$request_uri;
    }
    
    # Configurações de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Proxy para API
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

    # WebSocket support
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
    
    # Arquivos estáticos
    location / {
        root $APP_DIR/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

    # Testar configuração do Nginx
    nginx -t
    
    # Recarregar Nginx
    systemctl reload nginx
    
    log_success "Nginx configurado!"
}

# Função para configurar SSL (se domínio fornecido)
configure_ssl() {
    if [[ -n "$DOMAIN" ]]; then
        log_header "Configurando SSL..."
        
        log_info "Instalando Certbot..."
apt install -y certbot python3-certbot-nginx
        
        log_info "Obtendo certificado SSL..."
        certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
        
        log_success "SSL configurado para $DOMAIN!"
    else
        log_info "Domínio não fornecido - SSL não configurado"
        log_warning "Para usar HTTPS, configure um domínio e execute: certbot --nginx -d seu-dominio.com"
    fi
}

# Função para iniciar SISPAT com PM2
start_sispat() {
    log_header "Iniciando SISPAT..."
    
    cd $APP_DIR
    
    # Parar processos existentes
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    # Iniciar aplicação
    log_info "Iniciando aplicação com PM2..."
    pm2 start ecosystem.production.config.cjs --env production
    
    # Salvar configuração do PM2
pm2 save
    
    log_success "SISPAT iniciado com PM2!"
}

# Função para configurar backup automático
setup_backup() {
    log_header "Configurando backup automático..."
    
    # Criar diretório de backup
    mkdir -p /var/backups/sispat
    
    # Criar script de backup
    cat > /usr/local/bin/sispat-backup.sh << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/sispat"
DATE=\$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/sispat"

# Carregar credenciais do banco
source /root/sispat-db-credentials.txt 2>/dev/null || {
    echo "Erro: Não foi possível carregar credenciais do banco"
    exit 1
}

# Backup do banco de dados
echo "Iniciando backup do banco de dados..."
PGPASSWORD=\$DB_PASSWORD pg_dump -h localhost -U \$DB_USER -d \$DB_NAME > \$BACKUP_DIR/db_backup_\$DATE.sql

if [ \$? -eq 0 ]; then
    echo "Backup do banco concluído: \$DATE"
else
    echo "Erro no backup do banco de dados"
    exit 1
fi

# Backup dos arquivos da aplicação
echo "Iniciando backup dos arquivos..."
tar -czf \$BACKUP_DIR/app_backup_\$DATE.tar.gz -C \$APP_DIR . --exclude=node_modules --exclude=.git

if [ \$? -eq 0 ]; then
    echo "Backup dos arquivos concluído: \$DATE"
else
    echo "Erro no backup dos arquivos"
    exit 1
fi

# Manter apenas os últimos 30 backups
find \$BACKUP_DIR -name "*.sql" -mtime +30 -delete
find \$BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completo concluído: \$DATE"
EOF

    chmod +x /usr/local/bin/sispat-backup.sh
    
    # Configurar cron para backup diário às 2h da manhã
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/sispat-backup.sh") | crontab -
    
    log_success "Backup automático configurado!"
}

# Função para mostrar informações finais
show_final_info() {
    log_header "Instalação Concluída!"
    
    echo -e "\n${GREEN}🎉 SISPAT instalado com sucesso!${NC}"
    echo -e "\n${CYAN}📋 INFORMAÇÕES DE ACESSO:${NC}"
    
    if [[ -n "$DOMAIN" ]]; then
        echo -e "🌐 URL: ${YELLOW}https://$DOMAIN${NC}"
    else
        IP=$(hostname -I | awk '{print $1}')
        echo -e "🌐 URL: ${YELLOW}http://$IP:8080${NC}"
    fi
    
    echo -e "\n${CYAN}🔑 LOGIN PADRÃO:${NC}"
    echo -e "📧 Email: ${YELLOW}admin@sispat.com${NC}"
    echo -e "🔒 Senha: ${YELLOW}admin123${NC}"
    echo -e "${RED}⚠️  IMPORTANTE: Altere a senha após o primeiro login!${NC}"
    
    echo -e "\n${CYAN}🗄️  BANCO DE DADOS:${NC}"
    echo -e "📊 Nome: ${YELLOW}$DB_NAME${NC}"
    echo -e "👤 Usuário: ${YELLOW}$DB_USER${NC}"
    echo -e "🔑 Senha: ${YELLOW}$DB_PASSWORD${NC}"
    echo -e "📁 Credenciais salvas em: ${YELLOW}/root/sispat-db-credentials.txt${NC}"
    
    echo -e "\n${CYAN}🛠️  COMANDOS ÚTEIS:${NC}"
    echo -e "📊 Status: ${YELLOW}pm2 status${NC}"
    echo -e "📝 Logs: ${YELLOW}pm2 logs${NC}"
    echo -e "🔄 Reiniciar: ${YELLOW}pm2 restart all${NC}"
    echo -e "⏹️  Parar: ${YELLOW}pm2 stop all${NC}"
    echo -e "▶️  Iniciar: ${YELLOW}pm2 start all${NC}"
    
    echo -e "\n${CYAN}🗄️  COMANDOS DO BANCO:${NC}"
    echo -e "🔍 Conectar: ${YELLOW}PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME${NC}"
    echo -e "📊 Status: ${YELLOW}systemctl status postgresql${NC}"
    echo -e "🔄 Reiniciar: ${YELLOW}systemctl restart postgresql${NC}"
    echo -e "💾 Backup: ${YELLOW}/usr/local/bin/sispat-backup.sh${NC}"
    
    echo -e "\n${CYAN}📁 DIRETÓRIOS IMPORTANTES:${NC}"
    echo -e "📂 Aplicação: ${YELLOW}$APP_DIR${NC}"
    echo -e "💾 Backups: ${YELLOW}/var/backups/sispat${NC}"
    echo -e "📋 Logs: ${YELLOW}$APP_DIR/logs${NC}"
    
    echo -e "\n${GREEN}✅ Próximos passos:${NC}"
    echo -e "1. 🌐 Acesse o sistema no navegador"
    echo -e "2. 🔑 Faça login com as credenciais acima"
    echo -e "3. 🔒 Altere a senha do administrador"
    echo -e "4. ⚙️  Configure seu município"
    echo -e "5. 👥 Adicione usuários conforme necessário"
    
    echo -e "\n${BLUE}📞 Precisa de ajuda?${NC}"
    echo -e "📖 Consulte: ${YELLOW}docs/GUIA-INSTALACAO-SIMPLES-VPS.md${NC}"
    echo -e "🐛 Problemas? Execute: ${YELLOW}pm2 logs${NC}"
    
    echo -e "\n${PURPLE}🚀 Seu SISPAT está funcionando!${NC}"
}

# Função principal
main() {
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║           🚀 INSTALAÇÃO SIMPLES - SISPAT VPS                ║"
    echo "║                                                              ║"
    echo "║              Para pessoas sem conhecimento técnico           ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Verificações iniciais
    check_root
    check_os
    
    # Perguntar sobre domínio
    echo -e "\n${CYAN}🌐 CONFIGURAÇÃO DE DOMÍNIO${NC}"
    echo -e "Se você tem um domínio (ex: meusispat.com.br), digite abaixo:"
    echo -e "Se não tem domínio, apenas pressione Enter para continuar"
    echo -e "\n${YELLOW}Digite seu domínio ou pressione Enter para pular:${NC}"
    read -r DOMAIN
    
    if [[ -n "$DOMAIN" ]]; then
        log_info "Domínio configurado: $DOMAIN"
    else
        log_info "Continuando sem domínio (usando IP)"
    fi
    
    pause
    
    # Executar instalação
    update_system
    install_nodejs
    install_postgresql
    install_nginx
    install_pm2
    setup_sispat
    setup_database
    build_sispat
    configure_nginx
    configure_ssl
    start_sispat
    setup_backup
    
    # Mostrar informações finais
    show_final_info
    
    echo -e "\n${GREEN}🎉 Instalação concluída com sucesso!${NC}"
    echo -e "${YELLOW}Pressione Enter para finalizar...${NC}"
    read -r
}

# Executar função principal
main "$@"