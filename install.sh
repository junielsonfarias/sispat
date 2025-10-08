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
        echo -e "${CYAN}${prompt}${NC}"
        read -p "$(echo -e ${MAGENTA}  Digite aqui${NC}) (ou pressione ENTER para usar: ${GREEN}$default${NC}): " input
        eval "$var_name=\"${input:-$default}\""
    else
        echo -e "${CYAN}${prompt}${NC}"
        read -p "$(echo -e ${MAGENTA}  Digite aqui:${NC}) " input
        eval "$var_name=\"$input\""
    fi
}

ask_password() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"
    
    echo ""
    echo -e "${CYAN}${prompt}${NC}"
    if [ -n "$default" ]; then
        echo -e "${YELLOW}  (Pressione ENTER para usar senha padrão ou digite sua própria senha)${NC}"
        read -sp "$(echo -e ${MAGENTA}  Digite a senha:${NC}) " input
        echo ""
        eval "$var_name=\"${input:-$default}\""
    else
        read -sp "$(echo -e ${MAGENTA}  Digite a senha:${NC}) " input
        echo ""
        eval "$var_name=\"$input\""
    fi
}

ask_yes_no() {
    local prompt="$1"
    local default="${2:-S}"
    
    echo ""
    if [ "$default" = "S" ]; then
        read -p "$(echo -e ${MAGENTA}❯${NC}) $prompt (Digite S para Sim ou N para Não) [${GREEN}Sim${NC}]: " response
        response=${response:-S}
    else
        read -p "$(echo -e ${MAGENTA}❯${NC}) $prompt (Digite S para Sim ou N para Não) [${GREEN}Não${NC}]: " response
        response=${response:-N}
    fi
    
    # Aceitar: S, s, Sim, sim, SIM, Y, y, Yes, yes
    [[ "$response" =~ ^[SsYy]|[Ss][Ii][Mm]|[Yy][Ee][Ss]$ ]]
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
    
    # Validação flexível que aceita:
    # - Domínios simples: exemplo.com
    # - Subdomínios: sispat.exemplo.com
    # - Múltiplos níveis: sispat.vps-kinghost.net
    # - TLDs variados: .com, .br, .com.br, .net, .gov.br, etc.
    
    # Verificar se tem pelo menos um ponto
    if [[ ! $domain =~ \. ]]; then
        return 1
    fi
    
    # Verificar caracteres válidos (letras, números, pontos, hífens)
    if [[ ! $domain =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        return 1
    fi
    
    # Verificar se não começa ou termina com hífen ou ponto
    if [[ $domain =~ ^[-.]|[-.]$ ]]; then
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
    echo -e "${WHITE}═══════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}        CONFIGURAÇÃO DO SISTEMA - 8 PERGUNTAS       ${NC}"
    echo -e "${WHITE}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}📋 Vou fazer algumas perguntas simples para configurar o SISPAT 2.0${NC}"
    echo ""
    echo -e "${YELLOW}💡 DICA: Pressione ENTER para usar o valor padrão sugerido${NC}"
    echo ""
    sleep 2
    
    # Domínio
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}PERGUNTA 1 de 8: DOMÍNIO DO SISTEMA${NC}"
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}Digite o endereço do seu site (sem http:// ou https://)${NC}"
    echo ""
    echo -e "${GREEN}Exemplos válidos:${NC}"
    echo -e "  • sispat.prefeitura.com.br"
    echo -e "  • patrimonio.municipio.pb.gov.br"
    echo -e "  • sispat.vps-kinghost.net"
    echo -e "  • sistema.exemplo.com"
    echo ""
    
    while true; do
        ask "Qual o domínio do sistema?" DOMAIN "sispat.exemplo.com.br"
        if validate_domain "$DOMAIN"; then
            success "Domínio válido: $DOMAIN"
            break
        else
            echo ""
            error "Domínio inválido!"
            echo -e "${YELLOW}  O domínio deve:${NC}"
            echo -e "${YELLOW}  • Ter pelo menos um ponto (.)${NC}"
            echo -e "${YELLOW}  • Não conter espaços${NC}"
            echo -e "${YELLOW}  • Não conter caracteres especiais (exceto - e .)${NC}"
            echo -e "${YELLOW}  • Não começar ou terminar com hífen ou ponto${NC}"
            echo ""
            echo -e "${GREEN}Exemplos corretos:${NC}"
            echo -e "  ✅ sispat.prefeitura.com.br"
            echo -e "  ✅ sispat.vps-kinghost.net"
            echo -e "  ✅ patrimonio.exemplo.com"
            echo ""
            echo -e "${RED}Exemplos errados:${NC}"
            echo -e "  ❌ sispat (falta extensão)"
            echo -e "  ❌ http://sispat.com (não coloque http://)"
            echo -e "  ❌ sispat_.com (caractere _ inválido)"
            echo ""
            sleep 2
        fi
    done
    
    API_DOMAIN="api.$DOMAIN"
    info "API será acessível em: $API_DOMAIN"
    sleep 1
    
    # Email do administrador
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}PERGUNTA 2 de 8: SEU EMAIL (SUPERUSUÁRIO)${NC}"
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}Este será o email do administrador principal do sistema${NC}"
    echo ""
    
    while true; do
        ask "Qual seu email?" SUPERUSER_EMAIL "admin@$DOMAIN"
        if validate_email "$SUPERUSER_EMAIL"; then
            success "Email válido: $SUPERUSER_EMAIL"
            break
        else
            error "Email inválido. Use formato: nome@dominio.com"
        fi
    done
    sleep 1
    
    # Nome do administrador
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}PERGUNTA 3 de 8: SEU NOME COMPLETO${NC}"
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    ask "Qual seu nome completo?" SUPERUSER_NAME "Administrador SISPAT"
    success "Nome registrado: $SUPERUSER_NAME"
    sleep 1
    
    # Senha do banco de dados
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}PERGUNTA 4 de 8: SENHA DO BANCO DE DADOS${NC}"
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}Esta senha é para o PostgreSQL (banco de dados interno)${NC}"
    echo -e "${YELLOW}Recomendação: Pressione ENTER para usar a senha padrão${NC}"
    echo ""
    
    ask_password "Senha do PostgreSQL" DB_PASSWORD "sispat_password_123"
    success "Senha do banco configurada"
    sleep 1
    
    # Senha do superusuário
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}PERGUNTA 5 de 8: SUA SENHA DE ACESSO AO SISTEMA${NC}"
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}Esta será a senha que você usará para fazer login${NC}"
    echo -e "${YELLOW}Recomendação: Pressione ENTER para usar: Tiko6273@${NC}"
    echo ""
    
    ask_password "Sua senha de login" SUPERUSER_PASSWORD "Tiko6273@"
    success "Sua senha configurada"
    sleep 1
    
    # Senha padrão para outros usuários
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}PERGUNTA 6 de 8: SENHA PARA OUTROS USUÁRIOS${NC}"
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}Esta senha será usada para admin, supervisor, usuário padrão${NC}"
    echo -e "${YELLOW}Recomendação: Pressione ENTER para usar: password123${NC}"
    echo ""
    
    ask_password "Senha padrão para outros usuários" DEFAULT_PASSWORD "password123"
    success "Senha padrão configurada"
    sleep 1
    
    # Gerar JWT secret
    echo ""
    echo -e "${CYAN}⚙️  Gerando chave de segurança JWT automaticamente...${NC}"
    JWT_SECRET=$(openssl rand -hex 64)
    success "Chave de segurança gerada"
    sleep 1
    
    # Nome do município
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}PERGUNTA 7 de 8: NOME DO MUNICÍPIO/ÓRGÃO${NC}"
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}Exemplo: Prefeitura Municipal de Vista Serrana${NC}"
    echo ""
    
    ask "Nome do município/órgão" MUNICIPALITY_NAME "Prefeitura Municipal"
    success "Município: $MUNICIPALITY_NAME"
    sleep 1
    
    # Estado
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}PERGUNTA 8 de 8: ESTADO (UF)${NC}"
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}Digite a sigla do estado (ex: PB, SP, RJ, MG)${NC}"
    echo ""
    
    ask "Sigla do estado (UF)" STATE "XX"
    STATE=$(echo "$STATE" | tr '[:lower:]' '[:upper:]')
    success "Estado: $STATE"
    sleep 1
    
    # SSL
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}CONFIGURAÇÃO ADICIONAL: SSL/HTTPS${NC}"
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}SSL/HTTPS deixa seu site seguro (cadeado verde no navegador)${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANTE: Seu DNS deve estar apontando para este servidor!${NC}"
    echo ""
    
    if ask_yes_no "Deseja configurar SSL/HTTPS automaticamente agora?"; then
        CONFIGURE_SSL="yes"
        success "SSL será configurado automaticamente"
    else
        CONFIGURE_SSL="no"
        info "Você poderá configurar SSL depois com: sudo certbot --nginx -d $DOMAIN"
    fi
    sleep 1
    
    # Confirmação
    echo ""
    echo -e "${WHITE}═══════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}           RESUMO DAS SUAS CONFIGURAÇÕES           ${NC}"
    echo -e "${WHITE}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${CYAN}🌐 Domínio do site:${NC}      $DOMAIN"
    echo -e "  ${CYAN}🌐 API:${NC}                  $API_DOMAIN"
    echo -e "  ${CYAN}📧 Seu email:${NC}            $SUPERUSER_EMAIL"
    echo -e "  ${CYAN}👤 Seu nome:${NC}             $SUPERUSER_NAME"
    echo -e "  ${CYAN}🏛️  Município:${NC}            $MUNICIPALITY_NAME"
    echo -e "  ${CYAN}📍 Estado:${NC}               $STATE"
    echo -e "  ${CYAN}🗃️  Banco de dados:${NC}       $DB_NAME"
    echo -e "  ${CYAN}🔒 SSL/HTTPS:${NC}            ${CONFIGURE_SSL}"
    echo ""
    echo -e "${YELLOW}⚠️  Verifique se está tudo correto antes de continuar!${NC}"
    echo ""
    
    if ! ask_yes_no "Tudo certo? Posso começar a instalação?"; then
        echo ""
        info "Instalação cancelada. Execute o script novamente para reconfigurar."
        exit 0
    fi
}

# ===========================================
# FUNÇÕES DE INSTALAÇÃO
# ===========================================

install_dependencies() {
    local step=$1
    
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       INSTALANDO DEPENDÊNCIAS DO SISTEMA         ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${BLUE}  ⚙️  Atualizando lista de pacotes...${NC}"
    apt update -qq > /tmp/apt-update.log 2>&1 &
    show_spinner $! "Atualizando sistema (1-2 minutos)..."
    wait $!
    success "Sistema atualizado"
    
    echo ""
    echo -e "${BLUE}  ⚙️  Instalando ferramentas básicas...${NC}"
    apt install -y -qq curl wget git build-essential software-properties-common \
        ca-certificates gnupg lsb-release unzip > /tmp/apt-install.log 2>&1 &
    show_spinner $! "Instalando curl, git, wget, etc (1-2 minutos)..."
    wait $!
    
    echo ""
    success "✅ Dependências básicas instaladas"
}

install_nodejs() {
    local step=$1
    
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       INSTALANDO NODE.JS E FERRAMENTAS           ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if ! command -v node &> /dev/null; then
        echo -e "${BLUE}  ⚙️  Baixando e instalando Node.js 18...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /tmp/nodejs-setup.log 2>&1 &
        show_spinner $! "Configurando repositório do Node.js (1 minuto)..."
        wait $!
        
        apt install -y -qq nodejs > /tmp/nodejs-install.log 2>&1 &
        show_spinner $! "Instalando Node.js 18 (1-2 minutos)..."
        wait $!
    fi
    
    echo ""
    echo -e "${BLUE}  ⚙️  Instalando PNPM (gerenciador de pacotes)...${NC}"
    npm install -g pnpm > /tmp/pnpm-install.log 2>&1 &
    show_spinner $! "Instalando PNPM (30 segundos)..."
    wait $!
    success "PNPM instalado"
    
    echo ""
    echo -e "${BLUE}  ⚙️  Instalando PM2 (gerenciador de processos)...${NC}"
    npm install -g pm2 > /tmp/pm2-install.log 2>&1 &
    show_spinner $! "Instalando PM2 (30 segundos)..."
    wait $!
    success "PM2 instalado"
    
    local node_version=$(node -v)
    local pnpm_version=$(pnpm -v)
    
    echo ""
    success "✅ Node.js $node_version e PNPM $pnpm_version instalados"
}

install_postgresql() {
    local step=$1
    
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       INSTALANDO POSTGRESQL (BANCO DE DADOS)     ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if ! command -v psql &> /dev/null; then
        echo -e "${BLUE}  ⚙️  Instalando PostgreSQL 15...${NC}"
        apt install -y -qq postgresql postgresql-contrib > /tmp/postgres-install.log 2>&1 &
        show_spinner $! "Instalando PostgreSQL (2-3 minutos)..."
        wait $!
    fi
    
    echo ""
    echo -e "${BLUE}  ⚙️  Iniciando serviço PostgreSQL...${NC}"
    systemctl start postgresql > /dev/null 2>&1
    systemctl enable postgresql > /dev/null 2>&1
    
    echo ""
    success "✅ PostgreSQL instalado e ativo"
}

install_nginx() {
    local step=$1
    
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       INSTALANDO NGINX (SERVIDOR WEB)            ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if ! command -v nginx &> /dev/null; then
        echo -e "${BLUE}  ⚙️  Instalando Nginx...${NC}"
        apt install -y -qq nginx > /tmp/nginx-install.log 2>&1 &
        show_spinner $! "Instalando Nginx (1-2 minutos)..."
        wait $!
    fi
    
    echo ""
    echo -e "${BLUE}  ⚙️  Iniciando serviço Nginx...${NC}"
    systemctl start nginx > /dev/null 2>&1
    systemctl enable nginx > /dev/null 2>&1
    
    echo ""
    success "✅ Nginx instalado e ativo"
}

install_certbot() {
    local step=$1
    
    if [ "$CONFIGURE_SSL" = "yes" ]; then
        echo ""
        echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
        echo -e "${CYAN}║       INSTALANDO CERTBOT (SSL/HTTPS)             ║${NC}"
        echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${BLUE}  ⚙️  Instalando Certbot...${NC}"
        apt install -y -qq certbot python3-certbot-nginx > /tmp/certbot-install.log 2>&1 &
        show_spinner $! "Instalando Certbot (1-2 minutos)..."
        wait $!
        echo ""
        success "✅ Certbot instalado"
    else
        info "⏭️  Pulando instalação do Certbot (SSL não será configurado agora)"
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
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       BAIXANDO CÓDIGO DO GITHUB                   ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Remover diretório se existir
    if [ -d "$INSTALL_DIR" ]; then
        warning "Diretório $INSTALL_DIR já existe. Fazendo backup..."
        mv "$INSTALL_DIR" "${INSTALL_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Criar diretório
    mkdir -p "$INSTALL_DIR"
    
    # Clonar repositório com progresso
    echo -e "${BLUE}  📥 Baixando SISPAT 2.0 do GitHub...${NC}"
    git clone https://github.com/junielsonfarias/sispat.git "$INSTALL_DIR" 2>&1 | tee -a "$LOG_FILE" &
    show_spinner $! "Baixando código (pode levar 1-2 minutos)..."
    wait $!
    
    cd "$INSTALL_DIR"
    
    echo ""
    success "✅ Código baixado de: https://github.com/junielsonfarias/sispat"
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

show_spinner() {
    local pid=$1
    local message=$2
    local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local i=0
    
    # Mostrar spinner enquanto o processo está rodando
    while kill -0 $pid 2>/dev/null; do
        i=$(( (i+1) % 10 ))
        printf "\r${BLUE}  ${spin:$i:1} $message${NC}"
        sleep 0.1
    done
    
    # Limpar linha do spinner
    printf "\r%*s\r" $(tput cols) ""
}

build_application() {
    echo ""
    log "Fazendo build da aplicação..."
    echo ""
    echo -e "${YELLOW}⏱️  Esta etapa pode demorar 5-10 minutos. Aguarde...${NC}"
    echo ""
    
    cd "$INSTALL_DIR"
    
    # Build frontend - com indicador de progresso
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  ETAPA 1/4: Instalando dependências do frontend  ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    pnpm install --frozen-lockfile > /tmp/build-frontend-deps.log 2>&1 &
    local deps_pid=$!
    show_spinner $deps_pid "Instalando pacotes do frontend (pode levar 2-3 minutos)..."
    wait $deps_pid
    local deps_status=$?
    
    echo ""
    if [ $deps_status -eq 0 ]; then
        success "✅ Dependências do frontend instaladas"
    else
        echo ""
        error "❌ Falha ao instalar dependências do frontend! Ver: /tmp/build-frontend-deps.log"
    fi
    
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  ETAPA 2/4: Compilando frontend (React/TypeScript)║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    pnpm run build:prod > /tmp/build-frontend.log 2>&1 &
    local build_frontend_pid=$!
    show_spinner $build_frontend_pid "Compilando frontend (pode levar 2-3 minutos)..."
    wait $build_frontend_pid
    local build_frontend_status=$?
    
    echo ""
    if [ $build_frontend_status -eq 0 ]; then
        success "✅ Frontend compilado com sucesso"
    else
        echo ""
        error "❌ Falha ao compilar frontend! Ver: /tmp/build-frontend.log"
    fi
    
    # Build backend - com indicador de progresso
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  ETAPA 3/4: Instalando dependências do backend   ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    cd backend
    
    # IMPORTANTE: Instalar TODAS as dependências (incluindo devDependencies)
    # porque precisamos dos @types/* para compilar TypeScript
    npm install > /tmp/build-backend-deps.log 2>&1 &
    local backend_deps_pid=$!
    show_spinner $backend_deps_pid "Instalando pacotes do backend (pode levar 2-3 minutos)..."
    wait $backend_deps_pid
    local backend_deps_status=$?
    
    echo ""
    if [ $backend_deps_status -eq 0 ]; then
        success "✅ Dependências do backend instaladas (incluindo tipos TypeScript)"
    else
        echo ""
        error "❌ Falha ao instalar dependências do backend! Ver: /tmp/build-backend-deps.log"
        exit 1
    fi
    
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  ETAPA 4/4: Compilando backend (Node.js/TypeScript)║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}  ⚠️  Esta é a parte que pode demorar mais (1-3 minutos)${NC}"
    echo -e "${YELLOW}  ⚠️  O spinner pode parecer travado, mas está funcionando!${NC}"
    echo ""
    
    # Executar build do backend
    npm run build > /tmp/build-backend.log 2>&1 &
    local build_pid=$!
    
    # Mostrar spinner
    show_spinner $build_pid "Compilando backend (aguarde, pode demorar até 3 minutos)..."
    
    # Aguardar conclusão
    wait $build_pid
    local build_status=$?
    
    echo ""
    
    if [ $build_status -eq 0 ]; then
        # Verificar se realmente criou os arquivos compilados
        if [ -f "dist/index.js" ]; then
            success "✅ Backend compilado com sucesso!"
        else
            echo ""
            error "❌ Build reportou sucesso mas arquivos não foram criados!"
            echo ""
            echo -e "${YELLOW}Últimas linhas do log:${NC}"
            tail -30 /tmp/build-backend.log
            echo ""
            echo -e "${CYAN}Log completo em: /tmp/build-backend.log${NC}"
            exit 1
        fi
    else
        echo ""
        error "❌ Falha ao compilar backend!"
        echo ""
        echo -e "${YELLOW}Erros de compilação:${NC}"
        grep -i "error" /tmp/build-backend.log | head -20
        echo ""
        echo -e "${YELLOW}Últimas linhas do log:${NC}"
        tail -20 /tmp/build-backend.log
        echo ""
        echo -e "${CYAN}Log completo em: /tmp/build-backend.log${NC}"
        exit 1
    fi
    
    echo ""
    success "✨ Build completo concluído com sucesso!"
}

setup_database() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       CONFIGURANDO BANCO DE DADOS                 ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    cd "$INSTALL_DIR/backend"
    
    # Gerar Prisma Client
    echo -e "${BLUE}  ⚙️  Gerando Prisma Client...${NC}"
    npx prisma generate > /tmp/prisma-generate.log 2>&1 &
    show_spinner $! "Gerando cliente do banco de dados (30 segundos)..."
    wait $!
    if [ $? -eq 0 ]; then
        success "Prisma Client gerado"
    else
        error "Falha ao gerar Prisma Client. Log: /tmp/prisma-generate.log"
    fi
    
    # Executar migrações
    echo ""
    echo -e "${BLUE}  ⚙️  Executando migrações do banco...${NC}"
    npx prisma migrate deploy > /tmp/prisma-migrate.log 2>&1 &
    show_spinner $! "Criando tabelas no banco de dados (30 segundos)..."
    wait $!
    if [ $? -eq 0 ]; then
        success "Migrações executadas"
    else
        error "Falha nas migrações. Log: /tmp/prisma-migrate.log"
    fi
    
    # Popular banco com dados iniciais
    echo ""
    echo -e "${BLUE}  ⚙️  Criando usuários e dados iniciais...${NC}"
    echo ""
    npm run prisma:seed 2>&1 | tee -a "$LOG_FILE"
    
    echo ""
    success "✨ Banco de dados configurado e populado"
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
    
    echo -e "${WHITE}═══════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}    BEM-VINDO AO INSTALADOR DO SISPAT 2.0!          ${NC}"
    echo -e "${WHITE}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}Este instalador vai fazer TUDO automaticamente:${NC}"
    echo ""
    echo "  ✅ Instalar Node.js, PostgreSQL e Nginx"
    echo "  ✅ Baixar o código do SISPAT do GitHub"
    echo "  ✅ Compilar a aplicação"
    echo "  ✅ Criar banco de dados"
    echo "  ✅ Criar usuários do sistema"
    echo "  ✅ Configurar SSL/HTTPS (opcional)"
    echo "  ✅ Iniciar o sistema"
    echo ""
    echo -e "${YELLOW}⏱️  Tempo estimado: 15 a 30 minutos${NC}"
    echo -e "${YELLOW}☕ Aproveite para tomar um café!${NC}"
    echo ""
    echo -e "${WHITE}═══════════════════════════════════════════════════${NC}"
    echo ""
    
    if ! ask_yes_no "Pronto para começar a instalação?"; then
        echo ""
        info "Instalação cancelada. Execute novamente quando estiver pronto."
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
    clear
    show_banner
    echo -e "${WHITE}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${WHITE}║                                                   ║${NC}"
    echo -e "${WHITE}║         INICIANDO INSTALAÇÃO AUTOMÁTICA           ║${NC}"
    echo -e "${WHITE}║                                                   ║${NC}"
    echo -e "${WHITE}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📦 FASE 1/5: Instalando dependências do sistema${NC}"
    echo -e "${YELLOW}   (Tempo estimado: 5-10 minutos)${NC}"
    echo ""
    
    install_dependencies 1
    install_nodejs 3
    install_postgresql 6
    install_nginx 7
    install_certbot 8
    
    echo ""
    success "🎉 Fase 1/5 concluída - Todas as dependências instaladas!"
    sleep 2
    
    # Configuração
    clear
    show_banner
    echo -e "${CYAN}📦 FASE 2/5: Configurando ambiente${NC}"
    echo -e "${YELLOW}   (Tempo estimado: 2-3 minutos)${NC}"
    echo ""
    
    configure_database
    clone_repository
    configure_environment
    
    echo ""
    success "🎉 Fase 2/5 concluída - Ambiente configurado!"
    sleep 2
    
    # Build
    clear
    show_banner
    echo -e "${CYAN}📦 FASE 3/5: Compilando aplicação${NC}"
    echo -e "${YELLOW}   (Tempo estimado: 5-10 minutos - A PARTE MAIS DEMORADA!)${NC}"
    echo -e "${YELLOW}   ☕ Esta é a hora do café... Não se preocupe, está funcionando!${NC}"
    echo ""
    
    build_application
    
    echo ""
    success "🎉 Fase 3/5 concluída - Aplicação compilada!"
    sleep 2
    
    # Setup do banco
    clear
    show_banner
    echo -e "${CYAN}📦 FASE 4/5: Configurando banco de dados e usuários${NC}"
    echo -e "${YELLOW}   (Tempo estimado: 1-2 minutos)${NC}"
    echo ""
    
    setup_database
    
    echo ""
    success "🎉 Fase 4/5 concluída - Banco de dados pronto!"
    sleep 2
    
    # Configurar serviços e iniciar
    clear
    show_banner
    echo -e "${CYAN}📦 FASE 5/5: Configurando serviços e iniciando sistema${NC}"
    echo -e "${YELLOW}   (Tempo estimado: 2-3 minutos)${NC}"
    echo ""
    
    configure_nginx
    configure_systemd
    configure_firewall
    configure_permissions
    start_application
    configure_ssl
    configure_backup
    configure_monitoring
    
    echo ""
    success "🎉 Fase 5/5 concluída - Sistema iniciado!"
    sleep 2
    
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
    echo "║                  O SISPAT 2.0 ESTÁ FUNCIONANDO!                   ║"
    echo "║                                                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${WHITE}═══════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}         COMO ACESSAR O SISTEMA AGORA                ${NC}"
    echo -e "${WHITE}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}🌐 PASSO 1: Abra seu navegador e digite:${NC}"
    echo ""
    if [ "$CONFIGURE_SSL" = "yes" ]; then
        echo -e "     ${GREEN}${WHITE}https://${DOMAIN}${NC}"
    else
        echo -e "     ${GREEN}${WHITE}http://${DOMAIN}${NC}"
        echo ""
        echo -e "     ${YELLOW}💡 Para ativar HTTPS depois, execute:${NC}"
        echo -e "     ${CYAN}sudo certbot --nginx -d $DOMAIN${NC}"
    fi
    echo ""
    echo -e "${CYAN}👤 PASSO 2: Faça login com estas credenciais:${NC}"
    echo ""
    echo -e "     ${WHITE}Email:${NC} ${GREEN}admin@ssbv.com${NC}"
    echo -e "     ${WHITE}Senha:${NC} ${GREEN}password123${NC}"
    echo ""
    echo -e "${WHITE}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}👥 OUTROS USUÁRIOS CRIADOS AUTOMATICAMENTE:${NC}"
    echo ""
    echo -e "  ${WHITE}Superusuário (você):${NC}"
    echo -e "     Email: ${GREEN}${SUPERUSER_EMAIL}${NC}"
    echo -e "     Senha: ${GREEN}${SUPERUSER_PASSWORD}${NC}"
    echo ""
    echo -e "  ${WHITE}Supervisor:${NC}"
    echo -e "     Email: ${GREEN}supervisor@ssbv.com${NC}"
    echo -e "     Senha: ${GREEN}password123${NC}"
    echo ""
    echo -e "  ${WHITE}Usuário padrão:${NC}"
    echo -e "     Email: ${GREEN}usuario@ssbv.com${NC}"
    echo -e "     Senha: ${GREEN}password123${NC}"
    echo ""
    echo -e "  ${WHITE}Visualizador:${NC}"
    echo -e "     Email: ${GREEN}visualizador@ssbv.com${NC}"
    echo -e "     Senha: ${GREEN}password123${NC}"
    echo ""
    echo -e "${WHITE}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  ATENÇÃO - LEIA COM CUIDADO:${NC}"
    echo ""
    echo -e "  ${YELLOW}✓ As senhas acima são FÁCEIS para você testar o sistema${NC}"
    echo -e "  ${YELLOW}✓ Para uso REAL com dados importantes, ALTERE as senhas!${NC}"
    echo -e "  ${YELLOW}✓ Altere no sistema: Perfil > Alterar Senha${NC}"
    echo ""
    echo -e "${WHITE}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}🔧 COMANDOS ÚTEIS (se precisar):${NC}"
    echo ""
    echo -e "  ${WHITE}Ver se está rodando:${NC}  ${CYAN}pm2 status${NC}"
    echo -e "  ${WHITE}Ver logs do sistema:${NC}  ${CYAN}pm2 logs sispat-backend${NC}"
    echo -e "  ${WHITE}Reiniciar sistema:${NC}    ${CYAN}pm2 restart sispat-backend${NC}"
    echo -e "  ${WHITE}Reiniciar Nginx:${NC}      ${CYAN}sudo systemctl restart nginx${NC}"
    echo -e "  ${WHITE}Fazer backup:${NC}         ${CYAN}$INSTALL_DIR/scripts/backup.sh${NC}"
    echo ""
    echo -e "${WHITE}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GREEN}✨ TUDO PRONTO! Acesse ${WHITE}https://${DOMAIN}${GREEN} agora!${NC}"
    echo ""
    echo -e "${CYAN}📖 Documentação completa em: ${WHITE}$INSTALL_DIR/${NC}"
    echo -e "${CYAN}📞 Suporte: ${WHITE}https://github.com/junielsonfarias/sispat/issues${NC}"
    echo ""
    echo -e "${GREEN}🎊 Aproveite o SISPAT 2.0!${NC}"
    echo ""
}

# ===========================================
# EXECUTAR INSTALAÇÃO
# ===========================================

main "$@"
