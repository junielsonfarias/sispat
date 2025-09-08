#!/bin/bash

# Script de instalação do SISPAT em VPS
# Suporta Ubuntu/Debian e CentOS/RHEL

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Verificar se é root
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root. Use um usuário com sudo."
fi

# Detectar distribuição
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    else
        error "Não foi possível detectar a distribuição Linux"
    fi
}

# Instalar dependências do sistema
install_system_deps() {
    log "Instalando dependências do sistema..."
    
    case $DISTRO in
        ubuntu|debian)
            sudo apt update
            sudo apt install -y curl wget git build-essential software-properties-common
            sudo apt install -y postgresql postgresql-contrib
            sudo apt install -y nginx
            sudo apt install -y redis-server
            ;;
        centos|rhel|fedora)
            sudo yum update -y
            sudo yum install -y curl wget git gcc gcc-c++ make
            sudo yum install -y postgresql postgresql-server postgresql-contrib
            sudo yum install -y nginx
            sudo yum install -y redis
            ;;
        *)
            error "Distribuição não suportada: $DISTRO"
            ;;
    esac
}

# Instalar Node.js
install_nodejs() {
    log "Instalando Node.js..."
    
    # Verificar se Node.js já está instalado
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log "Node.js já instalado: $NODE_VERSION"
        return
    fi
    
    # Instalar Node.js via NodeSource
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    
    case $DISTRO in
        ubuntu|debian)
            sudo apt install -y nodejs
            ;;
        centos|rhel|fedora)
            sudo yum install -y nodejs npm
            ;;
    esac
    
    # Verificar instalação
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log "Node.js instalado: $NODE_VERSION"
    log "NPM instalado: $NPM_VERSION"
}

# Instalar PM2
install_pm2() {
    log "Instalando PM2..."
    
    if command -v pm2 &> /dev/null; then
        log "PM2 já instalado"
        return
    fi
    
    sudo npm install -g pm2
    pm2 install pm2-logrotate
    
    # Configurar PM2 para iniciar com o sistema
    pm2 startup
    log "Execute o comando sugerido pelo PM2 para configurar o startup automático"
}

# Configurar PostgreSQL
setup_postgresql() {
    log "Configurando PostgreSQL..."
    
    case $DISTRO in
        ubuntu|debian)
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            ;;
        centos|rhel|fedora)
            sudo postgresql-setup initdb
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            ;;
    esac
    
    # Criar usuário e banco de dados
    sudo -u postgres psql -c "CREATE USER sispat WITH PASSWORD 'sispat123';" || true
    sudo -u postgres psql -c "CREATE DATABASE sispat OWNER sispat;" || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sispat TO sispat;" || true
    
    log "PostgreSQL configurado com sucesso"
}

# Configurar Nginx
setup_nginx() {
    log "Configurando Nginx..."
    
    # Criar configuração do Nginx
    sudo tee /etc/nginx/sites-available/sispat > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
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
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # Habilitar site
    sudo ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
    sudo nginx -t
    
    # Reiniciar Nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    log "Nginx configurado com sucesso"
}

# Configurar Redis
setup_redis() {
    log "Configurando Redis..."
    
    case $DISTRO in
        ubuntu|debian)
            sudo systemctl start redis-server
            sudo systemctl enable redis-server
            ;;
        centos|rhel|fedora)
            sudo systemctl start redis
            sudo systemctl enable redis
            ;;
    esac
    
    log "Redis configurado com sucesso"
}

# Configurar firewall
setup_firewall() {
    log "Configurando firewall..."
    
    if command -v ufw &> /dev/null; then
        sudo ufw allow 22
        sudo ufw allow 80
        sudo ufw allow 443
        sudo ufw --force enable
    elif command -v firewall-cmd &> /dev/null; then
        sudo firewall-cmd --permanent --add-service=ssh
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
        sudo firewall-cmd --reload
    fi
    
    log "Firewall configurado com sucesso"
}

# Criar usuário para aplicação
create_app_user() {
    log "Criando usuário para aplicação..."
    
    if ! id "sispat" &>/dev/null; then
        sudo useradd -m -s /bin/bash sispat
        sudo usermod -aG sudo sispat
        log "Usuário 'sispat' criado com sucesso"
    else
        log "Usuário 'sispat' já existe"
    fi
}

# Configurar diretórios
setup_directories() {
    log "Configurando diretórios..."
    
    sudo mkdir -p /opt/sispat
    sudo chown sispat:sispat /opt/sispat
    sudo mkdir -p /var/log/sispat
    sudo chown sispat:sispat /var/log/sispat
    
    log "Diretórios configurados com sucesso"
}

# Função principal
main() {
    log "Iniciando instalação do SISPAT em VPS..."
    
    detect_distro
    log "Distribuição detectada: $DISTRO $VERSION"
    
    install_system_deps
    install_nodejs
    install_pm2
    setup_postgresql
    setup_nginx
    setup_redis
    setup_firewall
    create_app_user
    setup_directories
    
    log "Instalação concluída com sucesso!"
    log "Próximos passos:"
    log "1. Clone o repositório SISPAT em /opt/sispat"
    log "2. Configure as variáveis de ambiente"
    log "3. Execute 'npm install' para instalar dependências"
    log "4. Execute 'npm run build' para construir a aplicação"
    log "5. Execute 'pm2 start ecosystem.config.js' para iniciar a aplicação"
}

# Executar função principal
main "$@"