#!/bin/bash

# ===========================================
# 🚀 SISPAT 2.0 - INSTALADOR AUTOMÁTICO
# ===========================================
# Instalação completa em servidor VPS Linux
# Suporta: Debian 11/12, Ubuntu 20.04/22.04/24.04
# ===========================================

set -e

# Cores para interface amigável
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Variáveis globais
INSTALL_DIR="/var/www/sispat"
LOG_FILE="/var/log/sispat-install.log"
DB_NAME="sispat_prod"
DB_USER="sispat_user"
APP_PORT=3000

# ===========================================
# FUNÇÕES DE INTERFACE
# ===========================================

show_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                   ║"
    echo "║              🏛️  INSTALADOR SISPAT 2.0  🏛️                        ║"
    echo "║                                                                   ║"
    echo "║          Sistema Integrado de Patrimônio                          ║"
    echo "║          Instalação Automática para VPS Linux                     ║"
    echo "║                                                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗ ERRO:${NC} $1" | tee -a "$LOG_FILE"
    echo ""
    echo -e "${YELLOW}Verifique o log em:${NC} $LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

ask() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"
    
    echo ""
    if [ -n "$default" ]; then
        read -p "$(echo -e ${MAGENTA}❯${NC}) $prompt [${GREEN}$default${NC}]: " input
        eval "$var_name=\"${input:-$default}\""
    else
        read -p "$(echo -e ${MAGENTA}❯${NC}) $prompt: " input
        eval "$var_name=\"$input\""
    fi
}

ask_password() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"
    
    echo ""
    if [ -n "$default" ]; then
        read -sp "$(echo -e ${MAGENTA}❯${NC}) $prompt [padrão disponível]: " input
        echo ""
        eval "$var_name=\"${input:-$default}\""
    else
        read -sp "$(echo -e ${MAGENTA}❯${NC}) $prompt: " input
        echo ""
        eval "$var_name=\"$input\""
    fi
}

ask_yes_no() {
    local prompt="$1"
    local default="${2:-S}"
    
    echo ""
    if [ "$default" = "S" ]; then
        read -p "$(echo -e ${MAGENTA}❯${NC}) $prompt [${GREEN}S${NC}/n]: " response
        response=${response:-S}
    else
        read -p "$(echo -e ${MAGENTA}❯${NC}) $prompt [s/${GREEN}N${NC}]: " response
        response=${response:-N}
    fi
    
    [[ "$response" =~ ^[Ss]$ ]]
}

show_progress() {
    local current=$1
    local total=$2
    local description="$3"
    
    local percent=$((current * 100 / total))
    local filled=$((percent / 2))
    local empty=$((50 - filled))
    
    printf "\r${CYAN}[${NC}"
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "${CYAN}]${NC} %3d%% - %s" $percent "$description"
    
    if [ $current -eq $total ]; then
        echo ""
    fi
}

# ===========================================
# FUNÇÕES DE VALIDAÇÃO
# ===========================================

check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "Este script deve ser executado como root. Use: sudo bash install.sh"
    fi
}

check_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VERSION=$VERSION_ID
        
        case "$ID" in
            debian)
                if [[ "$VERSION_ID" != "11" && "$VERSION_ID" != "12" ]]; then
                    warning "Debian $VERSION_ID detectado. Recomendado: Debian 11 ou 12"
                fi
                ;;
            ubuntu)
                if [[ ! "$VERSION_ID" =~ ^(20.04|22.04|24.04)$ ]]; then
                    warning "Ubuntu $VERSION_ID detectado. Recomendado: 20.04, 22.04 ou 24.04"
                fi
                ;;
            *)
                warning "SO $OS detectado. Testado em Debian 11/12 e Ubuntu 20.04/22.04/24.04"
                ;;
        esac
        
        success "Sistema operacional: $OS $VERSION"
    else
        error "Não foi possível detectar o sistema operacional"
    fi
}

check_memory() {
    local mem_mb=$(free -m | awk '/^Mem:/{print $2}')
    
    if [ "$mem_mb" -lt 2048 ]; then
        warning "Memória RAM: ${mem_mb}MB. Recomendado: 4GB (4096MB)"
        if ! ask_yes_no "Continuar mesmo assim?"; then
            exit 0
        fi
    else
        success "Memória RAM: ${mem_mb}MB"
    fi
}

check_disk() {
    local disk_gb=$(df / | awk 'NR==2 {print int($4/1024/1024)}')
    
    if [ "$disk_gb" -lt 20 ]; then
        warning "Espaço em disco: ${disk_gb}GB. Recomendado: 50GB"
        if ! ask_yes_no "Continuar mesmo assim?"; then
            exit 0
        fi
    else
        success "Espaço em disco: ${disk_gb}GB disponível"
    fi
}

validate_domain() {
    local domain=$1
    
    if [[ ! $domain =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
        return 1
    fi
    return 0
}

validate_email() {
    local email=$1
    
    if [[ ! $email =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 1
    fi
    return 0
}

# ===========================================
# FUNÇÕES DE CONFIGURAÇÃO
# ===========================================

collect_configuration() {
    show_banner
    echo -e "${WHITE}═══ CONFIGURAÇÃO DO SISTEMA ═══${NC}"
    echo ""
    echo "Vou fazer algumas perguntas para configurar o SISPAT 2.0"
    echo "Pressione ENTER para usar o valor padrão [entre colchetes]"
    echo ""
    
    # Domínio
    while true; do
        ask "Qual o domínio do sistema?" DOMAIN "sispat.exemplo.com.br"
        if validate_domain "$DOMAIN"; then
            break
        else
            error "Domínio inválido. Use formato: sispat.prefeitura.com.br"
        fi
    done
    
    API_DOMAIN="api.$DOMAIN"
    
    # Email do administrador
    while true; do
        ask "Email do superusuário (você)" SUPERUSER_EMAIL "admin@$DOMAIN"
        if validate_email "$SUPERUSER_EMAIL"; then
            break
        else
            error "Email inválido"
        fi
    done
    
    # Nome do administrador
    ask "Seu nome completo" SUPERUSER_NAME "Administrador SISPAT"
    
    # Senha do banco de dados
    ask_password "Senha do PostgreSQL (banco de dados)" DB_PASSWORD "sispat_password_123"
    
    # Senha do superusuário
    echo ""
    echo -e "${CYAN}ℹ Para facilitar testes, você pode usar a senha padrão${NC}"
    ask_password "Senha do superusuário" SUPERUSER_PASSWORD "Tiko6273@"
    
    # Senha padrão para outros usuários
    ask_password "Senha padrão para outros usuários (admin, supervisor, etc)" DEFAULT_PASSWORD "password123"
    
    # Gerar JWT secret
    echo ""
    info "Gerando chave JWT secreta..."
    JWT_SECRET=$(openssl rand -hex 64)
    success "Chave JWT gerada automaticamente"
    
    # Nome do município
    ask "Nome do município/órgão" MUNICIPALITY_NAME "Prefeitura Municipal"
    
    # Estado
    ask "Sigla do estado (UF)" STATE "XX"
    STATE=$(echo "$STATE" | tr '[:lower:]' '[:upper:]')
    
    # SSL
    echo ""
    if ask_yes_no "Configurar SSL automático com Let's Encrypt?"; then
        CONFIGURE_SSL="yes"
        warning "Certifique-se que o DNS já está apontando para este servidor!"
        sleep 2
    else
        CONFIGURE_SSL="no"
        info "Você poderá configurar SSL depois com: sudo certbot --nginx -d $DOMAIN"
    fi
    
    # Confirmação
    echo ""
    echo -e "${WHITE}═══ RESUMO DA CONFIGURAÇÃO ═══${NC}"
    echo ""
    echo -e "  ${CYAN}Domínio:${NC}           $DOMAIN"
    echo -e "  ${CYAN}API:${NC}               $API_DOMAIN"
    echo -e "  ${CYAN}Email:${NC}             $SUPERUSER_EMAIL"
    echo -e "  ${CYAN}Nome:${NC}              $SUPERUSER_NAME"
    echo -e "  ${CYAN}Município:${NC}         $MUNICIPALITY_NAME"
    echo -e "  ${CYAN}Estado:${NC}            $STATE"
    echo -e "  ${CYAN}Banco:${NC}             $DB_NAME"
    echo -e "  ${CYAN}SSL:${NC}               ${CONFIGURE_SSL}"
    echo ""
    
    if ! ask_yes_no "Confirma as configurações acima?"; then
        echo ""
        info "Instalação cancelada. Execute novamente para reconfigurar."
        exit 0
    fi
}

# ===========================================
# FUNÇÕES DE INSTALAÇÃO
# ===========================================

install_dependencies() {
    local step=$1
    
    show_progress $step 10 "Atualizando sistema..."
    apt update -qq > /dev/null 2>&1
    
    show_progress $((step+1)) 10 "Instalando dependências básicas..."
    apt install -y -qq curl wget git build-essential software-properties-common \
        ca-certificates gnupg lsb-release unzip > /dev/null 2>&1
    
    success "Dependências básicas instaladas"
}

install_nodejs() {
    local step=$1
    
    show_progress $step 10 "Instalando Node.js 18..."
    
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
        apt install -y -qq nodejs > /dev/null 2>&1
    fi
    
    show_progress $((step+1)) 10 "Instalando PNPM..."
    npm install -g pnpm > /dev/null 2>&1
    
    show_progress $((step+2)) 10 "Instalando PM2..."
    npm install -g pm2 > /dev/null 2>&1
    
    local node_version=$(node -v)
    local pnpm_version=$(pnpm -v)
    
    success "Node.js $node_version e PNPM $pnpm_version instalados"
}

install_postgresql() {
    local step=$1
    
    show_progress $step 10 "Instalando PostgreSQL 15..."
    
    if ! command -v psql &> /dev/null; then
        apt install -y -qq postgresql postgresql-contrib > /dev/null 2>&1
    fi
    
    systemctl start postgresql > /dev/null 2>&1
    systemctl enable postgresql > /dev/null 2>&1
    
    success "PostgreSQL instalado e ativo"
}

install_nginx() {
    local step=$1
    
    show_progress $step 10 "Instalando Nginx..."
    
    if ! command -v nginx &> /dev/null; then
        apt install -y -qq nginx > /dev/null 2>&1
    fi
    
    systemctl start nginx > /dev/null 2>&1
    systemctl enable nginx > /dev/null 2>&1
    
    success "Nginx instalado e ativo"
}

install_certbot() {
    local step=$1
    
    if [ "$CONFIGURE_SSL" = "yes" ]; then
        show_progress $step 10 "Instalando Certbot (SSL)..."
        apt install -y -qq certbot python3-certbot-nginx > /dev/null 2>&1
        success "Certbot instalado"
    else
        show_progress $step 10 "Pulando instalação do Certbot..."
    fi
}

configure_database() {
    echo ""
    log "Configurando banco de dados PostgreSQL..."
    
    # Criar usuário e banco
    sudo -u postgres psql > /dev/null 2>&1 << EOF
-- Criar usuário se não existir
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;

-- Criar banco se não existir
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOF
    
    success "Banco de dados '$DB_NAME' criado"
}

clone_repository() {
    echo ""
    log "Baixando código do SISPAT 2.0..."
    
    # Remover diretório se existir
    if [ -d "$INSTALL_DIR" ]; then
        warning "Diretório $INSTALL_DIR já existe. Fazendo backup..."
        mv "$INSTALL_DIR" "${INSTALL_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Criar diretório
    mkdir -p "$INSTALL_DIR"
    
    # Clonar repositório
    git clone -q https://github.com/junielsonfarias/sispat.git "$INSTALL_DIR" 2>&1 | tee -a "$LOG_FILE"
    
    cd "$INSTALL_DIR"
    
    success "Código baixado de: https://github.com/junielsonfarias/sispat"
}

configure_environment() {
    echo ""
    log "Configurando variáveis de ambiente..."
    
    # Configurar frontend
    cat > "$INSTALL_DIR/.env" << EOF
VITE_API_URL=https://${API_DOMAIN}
VITE_USE_BACKEND=true
VITE_APP_NAME=SISPAT 2.0
VITE_APP_VERSION=2.0.0
VITE_APP_ENV=production
VITE_BUILD_OPTIMIZE=true
VITE_BUILD_COMPRESS=true
VITE_ENABLE_DEVTOOLS=false
VITE_ENABLE_LOGGING=false
EOF
    
    # Configurar backend
    cat > "$INSTALL_DIR/backend/.env" << EOF
NODE_ENV=production
PORT=$APP_PORT

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
DATABASE_SSL=false
DATABASE_POOL_SIZE=20

JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="24h"

FRONTEND_URL="https://${DOMAIN}"
CORS_ORIGIN="https://${DOMAIN}"
CORS_CREDENTIALS=true

BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"

LOG_LEVEL=info
LOG_FILE="./logs/app.log"
EOF
    
    success "Variáveis de ambiente configuradas"
}

build_application() {
    echo ""
    log "Fazendo build da aplicação (isso pode levar alguns minutos)..."
    
    cd "$INSTALL_DIR"
    
    # Build frontend
    echo -e "${BLUE}  → Instalando dependências do frontend...${NC}"
    pnpm install --frozen-lockfile > /dev/null 2>&1
    
    echo -e "${BLUE}  → Compilando frontend para produção...${NC}"
    pnpm run build:prod > /dev/null 2>&1
    
    # Build backend
    echo -e "${BLUE}  → Instalando dependências do backend...${NC}"
    cd backend
    npm install --production > /dev/null 2>&1
    
    echo -e "${BLUE}  → Compilando backend para produção...${NC}"
    npm run build > /dev/null 2>&1
    
    success "Build concluído com sucesso"
}

setup_database() {
    echo ""
    log "Configurando estrutura do banco de dados..."
    
    cd "$INSTALL_DIR/backend"
    
    # Gerar Prisma Client
    echo -e "${BLUE}  → Gerando Prisma Client...${NC}"
    npx prisma generate > /dev/null 2>&1
    
    # Executar migrações
    echo -e "${BLUE}  → Executando migrações...${NC}"
    npx prisma migrate deploy > /dev/null 2>&1
    
    # Popular banco com dados iniciais
    echo -e "${BLUE}  → Criando usuários e dados iniciais...${NC}"
    npm run prisma:seed 2>&1 | tee -a "$LOG_FILE"
    
    success "Banco de dados configurado e populado"
}

configure_nginx() {
    echo ""
    log "Configurando Nginx..."
    
    # Criar configuração do site
    cat > /etc/nginx/sites-available/sispat << EOF
server {
    listen 80;
    server_name ${DOMAIN} ${API_DOMAIN};
    
    # Redirecionar para HTTPS (será configurado pelo Certbot)
    location / {
        root ${INSTALL_DIR}/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Uploads
    location /uploads/ {
        alias ${INSTALL_DIR}/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:${APP_PORT}/health;
        access_log off;
    }
}
EOF
    
    # Ativar site
    ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
    if nginx -t > /dev/null 2>&1; then
        systemctl reload nginx
        success "Nginx configurado: $DOMAIN"
    else
        error "Erro na configuração do Nginx"
    fi
}

configure_ssl() {
    if [ "$CONFIGURE_SSL" = "yes" ]; then
        echo ""
        log "Configurando certificado SSL..."
        
        # Verificar DNS
        echo -e "${BLUE}  → Verificando DNS...${NC}"
        if ! host "$DOMAIN" > /dev/null 2>&1; then
            warning "DNS não está apontando para este servidor"
            warning "Configure o DNS antes de prosseguir com SSL"
            
            if ask_yes_no "Pular configuração de SSL?"; then
                info "SSL não configurado. Configure depois com: sudo certbot --nginx -d $DOMAIN"
                return
            fi
        fi
        
        # Obter certificado
        echo -e "${BLUE}  → Obtendo certificado SSL...${NC}"
        certbot --nginx -d "$DOMAIN" -d "$API_DOMAIN" --non-interactive --agree-tos --email "$SUPERUSER_EMAIL" --redirect 2>&1 | tee -a "$LOG_FILE"
        
        if [ $? -eq 0 ]; then
            success "SSL configurado: https://$DOMAIN"
        else
            warning "Não foi possível configurar SSL automaticamente"
            info "Configure manualmente: sudo certbot --nginx -d $DOMAIN"
        fi
    fi
}

configure_systemd() {
    echo ""
    log "Configurando serviço do sistema..."
    
    cat > /etc/systemd/system/sispat-backend.service << EOF
[Unit]
Description=SISPAT 2.0 Backend API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=${INSTALL_DIR}/backend
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=${INSTALL_DIR}/backend/.env

StandardOutput=journal
StandardError=journal
SyslogIdentifier=sispat-backend

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${INSTALL_DIR}/backend/uploads ${INSTALL_DIR}/backend/logs

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable sispat-backend > /dev/null 2>&1
    
    success "Serviço systemd configurado"
}

configure_firewall() {
    echo ""
    log "Configurando firewall..."
    
    if command -v ufw &> /dev/null; then
        ufw --force enable > /dev/null 2>&1
        ufw allow 22/tcp > /dev/null 2>&1
        ufw allow 80/tcp > /dev/null 2>&1
        ufw allow 443/tcp > /dev/null 2>&1
        
        success "Firewall configurado (portas 22, 80, 443)"
    else
        warning "UFW não disponível. Configure o firewall manualmente"
    fi
}

configure_permissions() {
    echo ""
    log "Configurando permissões..."
    
    # Criar diretórios necessários
    mkdir -p "$INSTALL_DIR/backend/uploads"
    mkdir -p "$INSTALL_DIR/backend/logs"
    mkdir -p "$INSTALL_DIR/backend/backups"
    mkdir -p /var/backups/sispat
    mkdir -p /var/log/sispat
    
    # Configurar permissões
    chown -R www-data:www-data "$INSTALL_DIR"
    chown -R www-data:www-data /var/backups/sispat
    chown -R www-data:www-data /var/log/sispat
    
    chmod 755 "$INSTALL_DIR/backend/uploads"
    chmod 755 "$INSTALL_DIR/backend/logs"
    chmod 755 "$INSTALL_DIR/backend/backups"
    
    success "Permissões configuradas"
}

start_application() {
    echo ""
    log "Iniciando aplicação..."
    
    cd "$INSTALL_DIR/backend"
    
    # Iniciar com PM2
    sudo -u www-data pm2 start dist/index.js --name sispat-backend > /dev/null 2>&1
    sudo -u www-data pm2 save > /dev/null 2>&1
    
    # Configurar PM2 para iniciar com o sistema
    env PATH=$PATH:/usr/bin pm2 startup systemd -u www-data --hp /var/www > /dev/null 2>&1
    
    # Aguardar inicialização
    sleep 5
    
    # Verificar se está rodando
    if curl -f http://localhost:$APP_PORT/health > /dev/null 2>&1; then
        success "Aplicação iniciada e respondendo"
    else
        error "Aplicação não está respondendo. Verifique os logs: pm2 logs sispat-backend"
    fi
}

configure_backup() {
    echo ""
    log "Configurando backup automático..."
    
    # Copiar script de backup
    chmod +x "$INSTALL_DIR/scripts/backup.sh"
    
    # Criar cron job para backup diário às 2h
    (crontab -l 2>/dev/null; echo "0 2 * * * $INSTALL_DIR/scripts/backup.sh > /var/log/sispat/backup.log 2>&1") | crontab -
    
    success "Backup automático configurado (diário às 2h)"
}

configure_monitoring() {
    echo ""
    log "Configurando monitoramento..."
    
    # Copiar script de monitoramento
    chmod +x "$INSTALL_DIR/scripts/monitor.sh"
    
    # Criar cron job para monitoramento a cada 5 minutos
    (crontab -l 2>/dev/null; echo "*/5 * * * * $INSTALL_DIR/scripts/monitor.sh > /var/log/sispat/monitor.log 2>&1") | crontab -
    
    success "Monitoramento configurado (a cada 5 minutos)"
}

# ===========================================
# FUNÇÃO PRINCIPAL
# ===========================================

main() {
    # Verificações iniciais
    check_root
    check_os
    
    # Banner e informações
    show_banner
    
    echo -e "${WHITE}Bem-vindo ao instalador do SISPAT 2.0!${NC}"
    echo ""
    echo "Este instalador vai:"
    echo "  ✓ Instalar todas as dependências necessárias"
    echo "  ✓ Configurar PostgreSQL, Nginx e Node.js"
    echo "  ✓ Baixar e compilar a aplicação"
    echo "  ✓ Configurar SSL (opcional)"
    echo "  ✓ Criar usuários e popular banco de dados"
    echo "  ✓ Iniciar o sistema automaticamente"
    echo ""
    echo -e "${YELLOW}Tempo estimado: 15-30 minutos${NC}"
    echo ""
    
    if ! ask_yes_no "Deseja continuar?"; then
        exit 0
    fi
    
    # Verificações de sistema
    echo ""
    log "Verificando sistema..."
    check_memory
    check_disk
    
    # Coletar configurações
    collect_configuration
    
    # Instalação
    echo ""
    echo -e "${WHITE}═══ INICIANDO INSTALAÇÃO ═══${NC}"
    echo ""
    
    install_dependencies 1
    install_nodejs 3
    install_postgresql 6
    install_nginx 7
    install_certbot 8
    
    show_progress 9 10 "Finalizando instalação de dependências..."
    sleep 1
    show_progress 10 10 "Dependências instaladas com sucesso!"
    echo ""
    
    # Configuração
    configure_database
    clone_repository
    configure_environment
    
    # Build
    build_application
    
    # Setup do banco
    setup_database
    
    # Configurar serviços
    configure_nginx
    configure_systemd
    configure_firewall
    configure_permissions
    
    # Iniciar aplicação
    start_application
    
    # Configurar SSL
    configure_ssl
    
    # Configurar backup e monitoramento
    configure_backup
    configure_monitoring
    
    # Finalização
    show_success_message
}

show_success_message() {
    clear
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                   ║"
    echo "║              🎉  INSTALAÇÃO CONCLUÍDA COM SUCESSO!  🎉            ║"
    echo "║                                                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${WHITE}═══ INFORMAÇÕES DE ACESSO ═══${NC}"
    echo ""
    echo -e "  ${CYAN}🌐 URL do Sistema:${NC}"
    if [ "$CONFIGURE_SSL" = "yes" ]; then
        echo -e "     ${GREEN}https://${DOMAIN}${NC}"
    else
        echo -e "     ${GREEN}http://${DOMAIN}${NC}"
        echo -e "     ${YELLOW}(Configure SSL: sudo certbot --nginx -d $DOMAIN)${NC}"
    fi
    echo ""
    echo -e "  ${CYAN}👤 ACESSO PRINCIPAL (ADMIN):${NC}"
    echo -e "     Email: ${GREEN}admin@ssbv.com${NC}"
    echo -e "     Senha: ${GREEN}password123${NC}"
    echo ""
    echo -e "  ${CYAN}👤 ACESSO SUPERUSUÁRIO (VOCÊ):${NC}"
    echo -e "     Email: ${GREEN}${SUPERUSER_EMAIL}${NC}"
    echo -e "     Senha: ${GREEN}${SUPERUSER_PASSWORD}${NC}"
    echo ""
    echo -e "${WHITE}═══ OUTROS USUÁRIOS DISPONÍVEIS ═══${NC}"
    echo ""
    echo -e "  Supervisor:   ${GREEN}supervisor@ssbv.com${NC}   / password123"
    echo -e "  Usuário:      ${GREEN}usuario@ssbv.com${NC}      / password123"
    echo -e "  Visualizador: ${GREEN}visualizador@ssbv.com${NC} / password123"
    echo ""
    echo -e "${WHITE}═══ COMANDOS ÚTEIS ═══${NC}"
    echo ""
    echo -e "  ${CYAN}Ver status:${NC}        sudo systemctl status sispat-backend"
    echo -e "  ${CYAN}Ver logs:${NC}          pm2 logs sispat-backend"
    echo -e "  ${CYAN}Reiniciar:${NC}         pm2 restart sispat-backend"
    echo -e "  ${CYAN}Health check:${NC}      curl http://localhost:$APP_PORT/health"
    echo -e "  ${CYAN}Backup manual:${NC}     $INSTALL_DIR/scripts/backup.sh"
    echo -e "  ${CYAN}Monitoramento:${NC}     $INSTALL_DIR/scripts/monitor.sh"
    echo ""
    echo -e "${WHITE}═══ PRÓXIMOS PASSOS ═══${NC}"
    echo ""
    echo "  1. Acesse o sistema: ${GREEN}https://${DOMAIN}${NC}"
    echo "  2. Faça login com: ${GREEN}admin@ssbv.com${NC} / ${GREEN}password123${NC}"
    echo "  3. Vá em: Administração > Gerenciar Usuários"
    echo "  4. Crie seus próprios usuários"
    echo "  5. Configure o município em: Configurações > Personalização"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
    echo -e "  ${YELLOW}→ As senhas atuais são para TESTE${NC}"
    echo -e "  ${YELLOW}→ Para produção REAL, altere TODAS as senhas${NC}"
    echo -e "  ${YELLOW}→ Documentação: $INSTALL_DIR/CREDENCIAIS_PRODUCAO.md${NC}"
    echo ""
    echo -e "${WHITE}═══ LOGS E DOCUMENTAÇÃO ═══${NC}"
    echo ""
    echo -e "  Log de instalação: ${CYAN}$LOG_FILE${NC}"
    echo -e "  Documentação:      ${CYAN}$INSTALL_DIR/README_PRODUCTION.md${NC}"
    echo -e "  Guia de deploy:    ${CYAN}$INSTALL_DIR/DEPLOY_PRODUCTION.md${NC}"
    echo ""
    echo -e "${GREEN}✨ O SISPAT 2.0 está instalado e rodando!${NC}"
    echo ""
    echo -e "${CYAN}📞 Suporte: https://github.com/junielsonfarias/sispat/issues${NC}"
    echo ""
}

# ===========================================
# EXECUTAR INSTALAÇÃO
# ===========================================

main "$@"
