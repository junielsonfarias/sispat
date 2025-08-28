#!/bin/bash

# 🚀 SISPAT - Script de Instalação para Desenvolvimento
# Este script automatiza toda a configuração do ambiente de desenvolvimento

set -e  # Parar em caso de erro

# Cores para output
RED=
'
\033[0;31m
'

GREEN=
'
\033[0;32m
'

YELLOW=
'
\033[1;33m
'

BLUE=
'
\033[0;34m
'

PURPLE=
'
\033[0;35m
'

CYAN=
'
\033[0;36m
'

NC=
'
\033[0m
'
 # No Color

# Função para imprimir com cores
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Banner
echo -e "${PURPLE}"
echo "██████╗ ██╗███████╗██████╗  █████╗ ████████╗"
echo "██╔══██╗██║██╔════╝██╔══██╗██╔══██╗╚══██╔══╝"
echo "███████║██║███████╗██████╔╝███████║   ██║   "
echo "██╔══██║██║╚════██║██╔═══╝ ██╔══██║   ██║   "
echo "██║  ██║██║███████║██║     ██║  ██║   ██║   "
echo "╚═╝  ╚═╝╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝   ╚═╝   "
echo ""
echo "🏛️  Sistema de Gestão Patrimonial"
echo "🔧 Instalação Automática - Ambiente de Desenvolvimento"
echo -e "${NC}"
echo ""

# Verificar se é root
if [[ $EUID -eq 0 ]]; then
   print_error "Este script não deve ser executado como root!"
   print_info "Execute como usuário normal: ./install-dev.sh"
   exit 1
fi

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detectar distribuição Linux
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        print_error "Não foi possível detectar o sistema operacional"
        exit 1
    fi
}

# Instalar Docker
install_docker() {
    print_step "Instalando Docker..."
    
    detect_os
    
    case $OS in
        ubuntu|debian)
            # Remover versões antigas
            sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
            
            # Atualizar repositórios
            sudo apt-get update
            
            # Instalar dependências
            sudo apt-get install -y ca-certificates curl gnupg lsb-release
            
            # Adicionar chave GPG
            sudo mkdir -p /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            
            # Configurar repositório
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            # Instalar Docker
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            ;;
        centos|rhel|rocky|almalinux)
            # Instalar dependências
            sudo yum install -y yum-utils
            
            # Adicionar repositório
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            
            # Instalar Docker
            sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            
            # Iniciar Docker
            sudo systemctl start docker
            sudo systemctl enable docker
            ;;
        *)
            print_error "Sistema operacional não suportado: $OS"
            exit 1
            ;;
    esac
    
    # Adicionar usuário ao grupo docker
    sudo usermod -aG docker $USER
    
    print_success "Docker instalado com sucesso!"
}

# Verificar e instalar dependências
check_dependencies() {
    print_step "Verificando dependências..."
    
    # Git
    if ! command_exists git; then
        print_step "Instalando Git..."
        detect_os
        case $OS in
            ubuntu|debian)
                sudo apt-get update && sudo apt-get install -y git
                ;;
            centos|rhel|rocky|almalinux)
                sudo yum install -y git
                ;;
        esac
        print_success "Git instalado!"
    fi
    
    # Docker
    if ! command_exists docker; then
        install_docker
    else
        print_success "Docker já está instalado"
    fi
    
    # Docker Compose
    if ! docker compose version >/dev/null 2>&1; then
        print_step "Instalando Docker Compose..."
        DOCKER_COMPOSE_VERSION="v2.24.1"
        sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        print_success "Docker Compose instalado!"
    fi
}

# Criar ambiente de desenvolvimento
create_dev_environment() {
    print_step "Criando ambiente de desenvolvimento..."
    
    # Criar diretório
    mkdir -p sispat-dev
    cd sispat-dev
    
    # Docker Compose para desenvolvimento
    cat > docker-compose.dev.yml << 
'
EOF
'

version: 
'
3.8
'


services:
  postgres:
    image: postgres:15-alpine
    container_name: sispat-postgres-dev
    restart: unless-stopped
    environment:
      POSTGRES_DB: sispat_db_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - sispat-dev-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d sispat_db_dev"]
      interval: 30s
      timeout: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: sispat-redis-dev
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data
    networks:
      - sispat-dev-network

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: sispat-pgadmin-dev
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@sispat.local
      PGADMIN_DEFAULT_PASSWORD: admin123
      PGADMIN_CONFIG_SERVER_MODE: 
'
False
'

    ports:
      - "5050:80"
    networks:
      - sispat-dev-network
    depends_on:
      - postgres

volumes:
  postgres_dev_data:
  redis_dev_data:

networks:
  sispat-dev-network:
    driver: bridge
EOF

    # Arquivo de ambiente
    cat > .env.dev << 
'
EOF
'

# SISPAT - Desenvolvimento
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_db_dev
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=desenvolvimento_jwt_secret_nao_usar_em_producao
JWT_EXPIRES_IN=24h
NODE_ENV=development
PORT=3001
REDIS_URL=redis://localhost:6379
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:5173
RATE_LIMIT_WHITELIST_IPS=127.0.0.1,::1,localhost
EOF

    # Scripts de controle
    cat > start-dev.sh << 
'
EOF
'

#!/bin/bash
echo "🚀 Iniciando SISPAT - Desenvolvimento..."
docker-compose -f docker-compose.dev.yml up -d
echo ""
echo "⏳ Aguardando serviços iniciarem..."
sleep 15
echo ""
echo "🎉 SISPAT Desenvolvimento iniciado!"
echo ""
echo "📊 Serviços disponíveis:"
echo "   🗄️  PostgreSQL: localhost:5432"
echo "   🔄 Redis: localhost:6379"
echo "   🖥️  pgAdmin: http://localhost:5050 (admin@sispat.local / admin123)"
echo ""
echo "📝 Próximos passos:"
echo "   1. Clone o repositório do SISPAT"
echo "   2. Configure o arquivo .env com as configurações do .env.dev"
echo "   3. Execute 
'
pnpm install
'
"
echo "   4. Execute 
'
pnpm run db:migrate
'
"
echo "   5. Execute 
'
pnpm run db:seed
'
"
echo "   6. Execute 
'
pnpm run dev
'
"
echo ""
echo "🌐 Aplicação: http://localhost:8080"
EOF

    cat > stop-dev.sh << 
'
EOF
'

#!/bin/bash
echo "🛑 Parando SISPAT - Desenvolvimento..."
docker-compose -f docker-compose.dev.yml down
echo "✅ Serviços parados!"
EOF

    cat > reset-dev.sh << 
'
EOF
'

#!/bin/bash
echo "🔄 Resetando ambiente de desenvolvimento..."
echo "⚠️  Isso irá apagar todos os dados do banco!"
read -p "Tem certeza? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f docker-compose.dev.yml down -v
    docker system prune -f
    echo "✅ Ambiente resetado!"
else
    echo "❌ Operação cancelada"
fi
EOF

    chmod +x *.sh
    
    print_success "Ambiente de desenvolvimento criado!"
}

# Função principal
main() {
    check_dependencies
    create_dev_environment
    
    echo ""
    print_success "🎉 Instalação concluída!"
    echo ""
    print_info "📁 Ambiente criado em: $(pwd)"
    echo ""
    print_step "🚀 Para iniciar:"
    echo -e "${CYAN}   ./start-dev.sh${NC}"
    echo ""
    
    if ! groups $USER | grep -q docker; then
        print_warning "IMPORTANTE: Faça logout/login para usar Docker sem sudo"
    fi
}

main
