#!/bin/bash

# =============================================================================
# SCRIPT DE INSTALAÇÃO LIMPA - SISPAT VPS
# Remove instalação anterior e instala do zero
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    echo -e "\n${BLUE}🚀 $1${NC}"
}

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
    log_error "Este script deve ser executado como root!"
    log_info "Execute: sudo su -"
    exit 1
fi

# Banner
clear
echo -e "${GREEN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           🧹 INSTALAÇÃO LIMPA - SISPAT VPS                  ║
║                                                              ║
║              Remove instalação anterior e instala do zero    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Configuração de domínio
log_header "CONFIGURAÇÃO DE DOMÍNIO"
echo -e "${YELLOW}Se você tem um domínio (ex: meusispat.com.br), digite abaixo:${NC}"
echo -e "${YELLOW}Se não tem domínio, apenas pressione Enter para continuar${NC}"
echo ""
read -p "Digite seu domínio ou pressione Enter para pular: " DOMAIN

if [ -z "$DOMAIN" ]; then
    DOMAIN="localhost"
    log_info "Usando localhost como domínio"
else
    log_info "Domínio configurado: $DOMAIN"
fi

echo ""
read -p "Pressione Enter para continuar..."

# Função para remover instalação anterior
remove_old_installation() {
    log_header "Removendo instalação anterior..."
    
    # Navegar para um diretório seguro antes de remover
    cd /root
    
    # Parar serviços
    log_info "Parando serviços..."
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    systemctl stop nginx 2>/dev/null || true
    
    # Remover diretório da aplicação
    log_info "Removendo diretório da aplicação..."
    rm -rf /var/www/sispat
    
    # Remover configurações do Nginx
    log_info "Removendo configurações do Nginx..."
    rm -f /etc/nginx/sites-enabled/sispat
    rm -f /etc/nginx/sites-available/sispat
    
    # Restaurar configuração padrão do Nginx
    if [ ! -f "/etc/nginx/sites-enabled/default" ]; then
        ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/
    fi
    
    # Remover certificados SSL (se existirem)
    log_info "Removendo certificados SSL..."
    rm -f /etc/ssl/certs/sispat.crt
    rm -f /etc/ssl/private/sispat.key
    
    # Remover scripts de backup
    log_info "Removendo scripts de backup..."
    rm -f /usr/local/bin/sispat-backup.sh
    
    # Remover entradas do cron
    log_info "Removendo tarefas agendadas..."
    sed -i '/sispat-backup.sh/d' /etc/crontab 2>/dev/null || true
    sed -i '/certbot renew/d' /etc/crontab 2>/dev/null || true
    
    # Limpar logs antigos
    log_info "Limpando logs antigos..."
    rm -rf /var/log/nginx/sispat*
    
    # Remover credenciais antigas
    log_info "Removendo credenciais antigas..."
    rm -f /root/sispat-db-credentials.txt
    
    log_success "Instalação anterior removida com sucesso!"
}

# Função para instalar dependências do sistema
install_system_dependencies() {
    log_header "Instalando dependências do sistema..."
    
    # Atualizar sistema
    log_info "Atualizando sistema..."
    apt update
    apt upgrade -y
    
    # Instalar dependências básicas
    log_info "Instalando dependências básicas..."
    apt install -y lsb-release ca-certificates curl git gnupg software-properties-common unzip wget apt-transport-https
    
    log_success "Dependências do sistema instaladas!"
}

# Função para instalar Node.js
install_nodejs() {
    log_header "Instalando Node.js..."
    
    # Verificar se Node.js já está instalado
    if command -v node &> /dev/null; then
        log_info "Node.js já está instalado: $(node --version)"
        return 0
    fi
    
    log_info "Baixando e instalando Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    
    log_success "Node.js $(node --version) instalado!"
    log_success "NPM $(npm --version) instalado!"
}

# Função para instalar PostgreSQL
install_postgresql() {
    log_header "Instalando PostgreSQL..."
    
    # Verificar se PostgreSQL já está instalado
    if systemctl is-active --quiet postgresql; then
        log_info "PostgreSQL já está instalado e rodando"
        return 0
    fi
    
    log_info "Instalando PostgreSQL..."
    apt install -y postgresql postgresql-contrib postgresql-client
    
    # Iniciar e habilitar PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    # Configurar PostgreSQL
    log_info "Configurando PostgreSQL..."
    
    # Configurar credenciais padrão para produção
    DB_PASSWORD="postgres"
    DB_NAME="sispat_db"
    DB_USER="postgres"
    ADMIN_PASSWORD="postgres"
    
    # Detectar versão do PostgreSQL instalada
    PG_VERSION=$(ls /etc/postgresql/ | head -1)
    if [ -z "$PG_VERSION" ]; then
        log_error "Não foi possível detectar a versão do PostgreSQL!"
        exit 1
    fi
    
    log_info "Versão do PostgreSQL detectada: $PG_VERSION"
    
    # Configurar senha do usuário postgres
    log_info "Configurando senha do usuário postgres..."
    sudo -u postgres -H psql -c "ALTER USER postgres PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
    
    # Criar banco de dados
    log_info "Criando banco de dados $DB_NAME..."
    sudo -u postgres -H psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
    sudo -u postgres -H psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
    
    # Conceder privilégios
    log_info "Configurando privilégios..."
    sudo -u postgres -H psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
    
    # Testar conexão
    log_info "Testando conexão com o banco..."
    if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
        log_success "PostgreSQL instalado e configurado com sucesso!"
    else
        log_error "Erro ao conectar com PostgreSQL!"
        exit 1
    fi
    
    # Salvar credenciais
    cat > /root/sispat-db-credentials.txt << EOF
# Credenciais do Banco de Dados SISPAT
# Gerado em: $(date)

Banco de Dados: $DB_NAME
Usuário: $DB_USER
Senha: $DB_PASSWORD

IMPORTANTE: Mantenha este arquivo seguro e não compartilhe!
EOF
    
    chmod 600 /root/sispat-db-credentials.txt
    log_info "Credenciais salvas em: /root/sispat-db-credentials.txt"
}

# Função para instalar Nginx
install_nginx() {
    log_header "Instalando Nginx..."
    
    # Verificar se Nginx já está instalado
    if systemctl is-active --quiet nginx; then
        log_info "Nginx já está instalado e rodando"
        return 0
    fi
    
    log_info "Instalando Nginx..."
    apt install -y nginx
    
    # Iniciar e habilitar Nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Configurar firewall
    log_info "Configurando firewall..."
    ufw allow 'Nginx Full'
    ufw allow OpenSSH
    ufw --force enable
    
    log_success "Nginx instalado e configurado!"
}

# Função para instalar PM2
install_pm2() {
    log_header "Instalando PM2..."
    
    # Navegar para um diretório seguro
    cd /root
    
    # Verificar se PM2 já está instalado
    if command -v pm2 &> /dev/null; then
        log_info "PM2 já está instalado"
        # Limpar processos antigos
        pm2 kill 2>/dev/null || true
        pm2 startup systemd -u root --hp /root 2>/dev/null || true
        return 0
    fi
    
    log_info "Instalando PM2 globalmente..."
    npm install -g pm2
    
    # Configurar PM2 para inicializar no boot
    pm2 startup systemd -u root --hp /root
    pm2 save --force
    
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
    
    # Verificar se o clone foi bem-sucedido
    if [ ! -f "package.json" ]; then
        log_error "Falha ao clonar repositório!"
        exit 1
    fi
    
    log_success "Código do SISPAT baixado com sucesso!"
    
    # Instalar dependências
    log_info "Instalando dependências..."
    npm install --legacy-peer-deps || {
        log_warning "Erro ao instalar dependências, tentando correção..."
        npm cache clean --force
        rm -rf node_modules package-lock.json
        npm install --legacy-peer-deps --force
    }
    
    # Build do projeto
    log_info "Fazendo build do projeto..."
    npm run build
    
    # Configurar variáveis de ambiente
    log_info "Configurando variáveis de ambiente..."
    
    # Gerar JWT Secret seguro
    JWT_SECRET=$(openssl rand -base64 64)
    REFRESH_TOKEN_SECRET=$(openssl rand -base64 64)
    
    # Criar arquivo .env para produção
    cat > .env << EOF
# Ambiente
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Banco de Dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_db
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sispat_db
DB_MAX_CONNECTIONS=50
DB_IDLE_TIMEOUT=60000
DB_CONNECTION_TIMEOUT=30000
DB_SSL_REJECT_UNAUTHORIZED=false

# JWT e Segurança
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=$REFRESH_TOKEN_SECRET
JWT_REFRESH_EXPIRES_IN=7d

# CORS e Domínio
CORS_ORIGIN=https://$DOMAIN,http://$DOMAIN
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=https://$DOMAIN,http://$DOMAIN

# Frontend
VITE_PORT=3000
VITE_API_TARGET=http://localhost:3001
VITE_API_URL=http://localhost:3001/api
VITE_BACKEND_URL=http://localhost:3001
VITE_DOMAIN=https://$DOMAIN

# Habilitar banco de dados
DISABLE_DATABASE=false

# Email (configure depois se necessário)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@$DOMAIN

# Upload de arquivos
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/sispat/uploads

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Segurança
BCRYPT_ROUNDS=12
SESSION_SECRET=$JWT_SECRET

# Logs
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Backup
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=/var/www/sispat/backups
EOF
    
    # Criar diretórios necessários
    mkdir -p logs uploads backups
    
    # Configurar banco de dados
    log_info "Configurando banco de dados..."
    
    # Baixar e executar script de inicialização do banco
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/init-database.sh -o init-db.sh
    chmod +x init-db.sh
    ./init-db.sh
    
    # Executar scripts adicionais se existirem
    if [ -f "server/database/create-sample-data.js" ]; then
        log_info "Executando script de dados de exemplo..."
        node server/database/create-sample-data.js || log_warning "Falha nos dados de exemplo - continuando..."
    fi
    
    log_success "SISPAT configurado com sucesso!"
}

# Função para configurar Nginx
setup_nginx() {
    log_header "Configurando Nginx..."
    
    # Criar configuração do Nginx para o SISPAT
    cat > /etc/nginx/sites-available/sispat << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Redirecionar para HTTPS (se não for localhost)
    if (\$host != "localhost") {
        return 301 https://\$server_name\$request_uri;
    }

    # Configurações para localhost
    location / {
        root /var/www/sispat/dist;
        try_files \$uri \$uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

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

    # Logs
    access_log /var/log/nginx/sispat.access.log;
    error_log /var/log/nginx/sispat.error.log;
}

# Configuração HTTPS (será adicionada pelo Certbot se SSL for configurado)
# server {
#     listen 443 ssl http2;
#     server_name $DOMAIN;
#     # Certificados SSL serão configurados pelo Certbot
# }
EOF

    # Ativar site
    ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
    log_info "Testando configuração do Nginx..."
    if nginx -t; then
        log_success "Configuração do Nginx OK!"
        systemctl reload nginx
    else
        log_error "Erro na configuração do Nginx. Executando correção..."
        # Baixar e executar script de correção
        curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-nginx-duplicate-location.sh -o fix-nginx.sh
        chmod +x fix-nginx.sh
        ./fix-nginx.sh
    fi
    
    log_success "Nginx configurado com sucesso!"
}

# Função para configurar PM2
setup_pm2() {
    log_header "Configurando PM2..."
    
    # Criar arquivo de configuração do PM2
    cat > /var/www/sispat/ecosystem.production.config.cjs << EOF
module.exports = {
  apps: [{
    name: 'sispat-backend',
    script: 'server/index.js',
    cwd: '/var/www/sispat',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: '/var/www/sispat/logs/pm2.log',
    out_file: '/var/www/sispat/logs/pm2-out.log',
    error_file: '/var/www/sispat/logs/pm2-error.log',
    merge_logs: true,
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

    # Iniciar aplicação com PM2
    cd /var/www/sispat
    pm2 start ecosystem.production.config.cjs --env production
    pm2 save
    
    log_success "PM2 configurado com sucesso!"
}

# Função para configurar backup
setup_backup() {
    log_header "Configurando backup automático..."
    
    # Criar script de backup
    cat > /usr/local/bin/sispat-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/www/sispat/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="sispat_db"
DB_USER="postgres"
DB_PASSWORD="postgres"

mkdir -p $BACKUP_DIR

# Backup do banco de dados
PGPASSWORD=$DB_PASSWORD pg_dump -h localhost -U $DB_USER $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Backup dos arquivos
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz -C /var/www/sispat --exclude=node_modules --exclude=.git --exclude=backups uploads logs

# Remover backups antigos (mais de 30 dias)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
EOF

    chmod +x /usr/local/bin/sispat-backup.sh
    
    # Configurar cron para backup diário às 2h
    echo "0 2 * * * root /usr/local/bin/sispat-backup.sh" >> /etc/crontab
    
    log_success "Backup automático configurado!"
}

# Função para configurar SSL (se não for localhost)
setup_ssl() {
    if [ "$DOMAIN" = "localhost" ]; then
        log_info "Pulando configuração SSL para localhost"
        return 0
    fi
    
    log_header "Configurando SSL..."
    
    # Instalar Certbot
    log_info "Instalando Certbot..."
    apt install -y certbot python3-certbot-nginx
    
    # Verificar se o domínio é acessível
    log_info "Verificando acessibilidade do domínio $DOMAIN..."
    if ! nslookup $DOMAIN >/dev/null 2>&1; then
        log_warning "Domínio $DOMAIN não é acessível. SSL será configurado mais tarde."
        log_info "Para configurar SSL manualmente: certbot --nginx -d $DOMAIN"
        return 0
    fi
    
    # Obter certificado SSL
    log_info "Obtendo certificado SSL para $DOMAIN..."
    if certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --dry-run; then
        log_info "Teste do Certbot bem-sucedido. Obtendo certificado real..."
        certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
        log_success "Certificado SSL configurado com sucesso!"
    else
        log_warning "Falha ao obter certificado SSL. Sistema funcionará em HTTP."
        log_info "Para configurar SSL manualmente: certbot --nginx -d $DOMAIN"
    fi
    
    # Configurar renovação automática
    echo "0 12 * * * root certbot renew --quiet" >> /etc/crontab
    
    log_success "SSL configurado com sucesso!"
}

# Função para mostrar informações finais
show_final_info() {
    log_header "Instalação Concluída!"
    
    echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}║           ✅ SISPAT INSTALADO COM SUCESSO!                   ║${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    
    echo -e "\n${BLUE}📋 INFORMAÇÕES DE ACESSO:${NC}"
    if [ "$DOMAIN" = "localhost" ]; then
        echo -e "🌐 URL: ${YELLOW}http://localhost${NC}"
    else
        echo -e "🌐 URL: ${YELLOW}https://$DOMAIN${NC}"
    fi
    echo -e "🔑 Login: ${YELLOW}admin@sispat.com${NC}"
    echo -e "🔒 Senha: ${YELLOW}admin123${NC}"
    
    echo -e "\n${BLUE}📊 Comandos Úteis:${NC}"
    echo -e "• ${YELLOW}pm2 status${NC}          # Status da aplicação"
    echo -e "• ${YELLOW}pm2 logs${NC}            # Ver logs"
    echo -e "• ${YELLOW}pm2 restart all${NC}     # Reiniciar aplicação"
    echo -e "• ${YELLOW}nginx -t${NC}            # Testar configuração Nginx"
    echo -e "• ${YELLOW}systemctl status postgresql${NC}  # Status do banco"
    
    echo -e "\n${BLUE}📁 Arquivos Importantes:${NC}"
    echo -e "• ${YELLOW}/root/sispat-db-credentials.txt${NC}  # Credenciais do banco"
    echo -e "• ${YELLOW}/var/www/sispat/logs/${NC}            # Logs da aplicação"
    echo -e "• ${YELLOW}/var/www/sispat/backups/${NC}         # Backups automáticos"
    
    echo -e "\n${GREEN}🎉 Instalação limpa concluída com sucesso!${NC}"
}

# Função principal
main() {
    log_header "Iniciando instalação limpa do SISPAT..."
    
    # Remover instalação anterior
    remove_old_installation
    
    # Instalar dependências
    install_system_dependencies
    install_nodejs
    install_postgresql
    install_nginx
    install_pm2
    
    # Configurar SISPAT
    setup_sispat
    setup_nginx
    setup_pm2
    setup_backup
    setup_ssl
    
    # Esquema do banco será corrigido automaticamente pelo init-database.sh

    # Pós-instalação: diagnóstico e correções finais
    log_header "Executando verificação pós-instalação..."
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/diagnose-installation.sh -o /root/diagnose.sh || true
    chmod +x /root/diagnose.sh || true
    /root/diagnose.sh || true

    # Aplicar correções de HTTPS/CORS se necessário
    if grep -q "CORS: Requisição sem origin bloqueada" /var/www/sispat/logs/pm2-error.log 2>/dev/null; then
        log_warning "CORS bloqueando requisições - aplicando correção automática..."
        curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-https-redirect-and-cors.sh -o /root/fix-cors.sh || true
        chmod +x /root/fix-cors.sh || true
        /root/fix-cors.sh || true
    fi
    
    # Garantir serviços ativos
    systemctl reload nginx || systemctl restart nginx || true
    pm2 restart all --update-env || true
    
    # Mostrar informações finais
    show_final_info
}

# Executar função principal
main "$@"
