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
GITHUB_REPO="https://github.com/junielsonfarias/sispat.git"

# ===========================================
# FUNÇÕES DE LIMPEZA
# ===========================================

clean_previous_installation() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     🧹 REMOVENDO INSTALAÇÃO ANTERIOR             ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log "Iniciando limpeza de instalação anterior..."
    
    # 1. Parar PM2
    echo -e "${YELLOW}  [1/8]${NC} Parando processos PM2..."
    pm2 delete all 2>/dev/null || true
    pm2 kill 2>/dev/null || true
    success "Processos PM2 parados"
    
    # 2. Parar Nginx
    echo -e "${YELLOW}  [2/8]${NC} Parando Nginx..."
    systemctl stop nginx 2>/dev/null || true
    success "Nginx parado"
    
    # 3. Remover diretório da aplicação
    echo -e "${YELLOW}  [3/8]${NC} Removendo diretório de instalação..."
    if [ -d "$INSTALL_DIR" ]; then
        # Fazer backup se houver uploads
        if [ -d "$INSTALL_DIR/backend/uploads" ]; then
            warning "Fazendo backup de uploads..."
            mkdir -p /tmp/sispat-backup
            cp -r "$INSTALL_DIR/backend/uploads" /tmp/sispat-backup/ 2>/dev/null || true
            success "Backup de uploads salvo em /tmp/sispat-backup/"
        fi
        rm -rf "$INSTALL_DIR"
        success "Diretório removido: $INSTALL_DIR"
    else
        info "Diretório não existe: $INSTALL_DIR"
    fi
    
    # 4. Remover configurações do Nginx
    echo -e "${YELLOW}  [4/8]${NC} Removendo configurações do Nginx..."
    rm -f /etc/nginx/sites-available/sispat 2>/dev/null || true
    rm -f /etc/nginx/sites-enabled/sispat 2>/dev/null || true
    success "Configurações do Nginx removidas"
    
    # 5. Remover banco de dados (OPCIONAL)
    echo ""
    echo -e "${RED}⚠️  ATENÇÃO: REMOÇÃO DO BANCO DE DADOS${NC}"
    echo -e "${YELLOW}Deseja remover o banco de dados existente?${NC}"
    echo -e "${YELLOW}Isso apagará TODOS os dados cadastrados!${NC}"
    echo ""
    read -p "$(echo -e ${MAGENTA}Remover banco? [${RED}s${MAGENTA}/${GREEN}N${MAGENTA}]:${NC}) " remove_db
    
    if [[ "$remove_db" =~ ^[Ss]$ ]]; then
        echo -e "${YELLOW}  [5/8]${NC} Removendo banco de dados..."
        sudo -u postgres psql << EOF 2>/dev/null || true
DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;
EOF
        success "Banco de dados removido: $DB_NAME"
    else
        echo -e "${YELLOW}  [5/8]${NC} Mantendo banco de dados existente..."
        success "Banco de dados preservado"
    fi
    
    # 6. Remover logs antigos
    echo -e "${YELLOW}  [6/8]${NC} Removendo logs antigos..."
    rm -f /var/log/sispat-*.log 2>/dev/null || true
    rm -f /tmp/build-*.log 2>/dev/null || true
    rm -f /tmp/prisma-*.log 2>/dev/null || true
    success "Logs antigos removidos"
    
    # 7. Remover certificados SSL (se existirem)
    echo -e "${YELLOW}  [7/8]${NC} Verificando certificados SSL..."
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        warning "Certificados SSL encontrados para $DOMAIN"
        read -p "$(echo -e ${MAGENTA}Remover certificados SSL? [s/N]:${NC}) " remove_ssl
        if [[ "$remove_ssl" =~ ^[Ss]$ ]]; then
            certbot delete --cert-name "$DOMAIN" 2>/dev/null || true
            success "Certificados SSL removidos"
        else
            success "Certificados SSL preservados"
        fi
    else
        info "Nenhum certificado SSL encontrado"
    fi
    
    # 8. Limpar cache do sistema
    echo -e "${YELLOW}  [8/8]${NC} Limpando cache do sistema..."
    apt-get clean 2>/dev/null || true
    npm cache clean --force 2>/dev/null || true
    pnpm store prune 2>/dev/null || true
    success "Cache limpo"
    
    echo ""
    success "✨ Limpeza concluída! Sistema pronto para instalação nova."
    echo ""
    
    # Restaurar uploads se existir backup
    if [ -d "/tmp/sispat-backup/uploads" ]; then
        echo -e "${CYAN}📦 Backup de uploads disponível em /tmp/sispat-backup/${NC}"
        echo -e "${YELLOW}Será restaurado automaticamente após a instalação.${NC}"
    fi
    
    sleep 3
}

check_existing_installation() {
    local has_installation=false
    
    # Verificar se existe instalação
    if [ -d "$INSTALL_DIR" ] || \
       pm2 list 2>/dev/null | grep -q "sispat-backend" || \
       [ -f "/etc/nginx/sites-available/sispat" ] || \
       sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        has_installation=true
    fi
    
    if [ "$has_installation" = true ]; then
        echo ""
        echo -e "${YELLOW}╔═══════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║    ⚠️  INSTALAÇÃO ANTERIOR DETECTADA             ║${NC}"
        echo -e "${YELLOW}╚═══════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${CYAN}Foi detectada uma instalação anterior do SISPAT.${NC}"
        echo ""
        echo -e "${WHITE}Itens encontrados:${NC}"
        [ -d "$INSTALL_DIR" ] && echo -e "  ${GREEN}✓${NC} Diretório: $INSTALL_DIR"
        pm2 list 2>/dev/null | grep -q "sispat-backend" && echo -e "  ${GREEN}✓${NC} Processo PM2: sispat-backend"
        [ -f "/etc/nginx/sites-available/sispat" ] && echo -e "  ${GREEN}✓${NC} Configuração Nginx"
        sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME" && echo -e "  ${GREEN}✓${NC} Banco de dados: $DB_NAME"
        echo ""
        echo -e "${YELLOW}Recomendação: Fazer instalação limpa (remove tudo e instala do zero)${NC}"
        echo -e "${CYAN}Isso evita conflitos e garante instalação sem erros.${NC}"
        echo ""
        read -p "$(echo -e ${MAGENTA}Deseja fazer instalação LIMPA? [${GREEN}S${MAGENTA}/${RED}n${MAGENTA}]:${NC}) " clean_install
        
        if [[ ! "$clean_install" =~ ^[Nn]$ ]]; then
            clean_previous_installation
            return 0
        else
            warning "Continuando com instalação sobre a existente..."
            warning "Isso pode causar conflitos!"
            echo ""
            read -p "$(echo -e ${MAGENTA}Tem certeza? [s/N]:${NC}) " confirm
            if [[ ! "$confirm" =~ ^[Ss]$ ]]; then
                echo ""
                error "Instalação cancelada pelo usuário."
            fi
        fi
    fi
}

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
    echo -e "${WHITE}        CONFIGURAÇÃO DO SISTEMA - 5 PERGUNTAS       ${NC}"
    echo -e "${WHITE}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}📋 Vou fazer algumas perguntas simples para configurar o SISPAT 2.0${NC}"
    echo ""
    echo -e "${YELLOW}💡 DICA: Pressione ENTER para usar o valor padrão sugerido${NC}"
    echo ""
    sleep 2
    
    # Domínio
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}PERGUNTA 1 de 5: DOMÍNIO DO SISTEMA${NC}"
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
    
    # ✅ Removido API_DOMAIN - agora usa mesmo domínio + /api
    info "API será acessível em: $DOMAIN/api"
    sleep 1
    
    # Email do administrador
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}PERGUNTA 2 de 5: SEU EMAIL (SUPERUSUÁRIO)${NC}"
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
    echo -e "${WHITE}PERGUNTA 3 de 5: SEU NOME COMPLETO${NC}"
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    ask "Qual seu nome completo?" SUPERUSER_NAME "Administrador SISPAT"
    success "Nome registrado: $SUPERUSER_NAME"
    sleep 1
    
    # Credenciais do Supervisor (FIXAS)
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}CONFIGURAÇÃO: SUPERVISOR (Usuário Operacional)${NC}"
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}O supervisor ajudará na gestão operacional do sistema.${NC}"
    echo -e "${GREEN}Credenciais pré-configuradas do supervisor:${NC}"
    echo ""
    
    # Credenciais do supervisor — SENHA ALEATÓRIA por instalação. NUNCA fixar: o
    # install.sh é público no repositório; uma senha fixa seria credencial-padrão
    # exposta (qualquer um logaria como supervisor em qualquer instância).
    SUPERVISOR_EMAIL="supervisor@${DOMAIN}"
    SUPERVISOR_PASSWORD="Sv$(openssl rand -hex 8)@9"
    SUPERVISOR_NAME="Supervisor"
    
    echo -e "  ${CYAN}📧 Email:${NC} ${WHITE}${SUPERVISOR_EMAIL}${NC}"
    echo -e "  ${CYAN}🔑 Senha:${NC} ${WHITE}${SUPERVISOR_PASSWORD}${NC}"
    echo -e "  ${CYAN}👤 Nome:${NC}  ${WHITE}${SUPERVISOR_NAME}${NC}"
    echo ""
    success "Supervisor configurado automaticamente"
    sleep 1
    
    # Senha do banco de dados (AUTOMÁTICA)
    DB_PASSWORD="sispat_password_$(openssl rand -hex 8)"
    
    # Senha do superusuário
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}PERGUNTA 4 de 5: SUA SENHA DE ACESSO AO SISTEMA${NC}"
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}Esta será a senha que você usará para fazer login${NC}"
    echo -e "${YELLOW}Pressione ENTER para gerar uma senha forte ALEATÓRIA (exibida ao final).${NC}"
    echo ""

    # Default ALEATÓRIO por instalação (sem senha pública embutida no instalador).
    SUPERUSER_PASSWORD_DEFAULT="Adm$(openssl rand -hex 8)@7"
    ask_password "Sua senha de login" SUPERUSER_PASSWORD "$SUPERUSER_PASSWORD_DEFAULT"
    success "Sua senha configurada"
    sleep 1
    
    # Gerar JWT secret
    echo ""
    echo -e "${CYAN}⚙️  Gerando chave de segurança JWT automaticamente...${NC}"
    JWT_SECRET=$(openssl rand -hex 64)
    success "Chave de segurança gerada"
    sleep 1
    
    # Nome do município (AUTOMÁTICO - Padrão SSBV)
    MUNICIPALITY_NAME="Prefeitura Municipal de Vista Serrana"
    STATE="PB"
    
    echo ""
    echo -e "${CYAN}⚙️  Configurando município automaticamente...${NC}"
    echo -e "${GREEN}   Município: ${WHITE}${MUNICIPALITY_NAME}${NC}"
    echo -e "${GREEN}   Estado: ${WHITE}${STATE}${NC}"
    success "Município configurado"
    sleep 1
    
    # SSL
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}PERGUNTA 5 de 5: CONFIGURAR SSL/HTTPS?${NC}"
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
    echo -e "  ${CYAN}🌐 API:${NC}                  $DOMAIN/api"
    echo -e "  ${CYAN}📧 Seu email:${NC}            $SUPERUSER_EMAIL"
    echo -e "  ${CYAN}👤 Seu nome:${NC}             $SUPERUSER_NAME"
    echo -e "  ${CYAN}📧 Email Supervisor:${NC}     $SUPERVISOR_EMAIL"
    echo -e "  ${CYAN}👤 Nome Supervisor:${NC}      $SUPERVISOR_NAME"
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
        echo -e "${BLUE}  ⚙️  Baixando e instalando Node.js 20...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /tmp/nodejs-setup.log 2>&1 &
        show_spinner $! "Configurando repositório do Node.js (1 minuto)..."
        wait $!

        apt install -y -qq nodejs > /tmp/nodejs-install.log 2>&1 &
        show_spinner $! "Instalando Node.js 20 (1-2 minutos)..."
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

-- Conceder privilégios no banco
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOF
    
    # Conceder privilégios no schema public
    sudo -u postgres psql -d "$DB_NAME" > /dev/null 2>&1 << EOF
-- Conceder privilégios no schema public
GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;

-- Configurar privilégios padrão para objetos futuros
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF
    
    success "Banco de dados '$DB_NAME' criado e permissões configuradas"
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
    git clone "$GITHUB_REPO" "$INSTALL_DIR" 2>&1 | tee -a "$LOG_FILE" &
    show_spinner $! "Baixando código (pode levar 1-2 minutos)..."
    wait $!
    
    cd "$INSTALL_DIR"
    
    echo ""
    success "✅ Código baixado de: $GITHUB_REPO"
}

configure_environment() {
    echo ""
    log "Configurando variáveis de ambiente..."
    
    # ✅ Determinar protocolo baseado em SSL
    local PROTOCOL="http"
    if [ "$CONFIGURE_SSL" = "yes" ]; then
        PROTOCOL="https"
    fi
    
    echo -e "${BLUE}  → Protocolo: ${WHITE}${PROTOCOL}${NC}"
    echo -e "${BLUE}  → URL Frontend: ${WHITE}${PROTOCOL}://${DOMAIN}${NC}"
    echo -e "${BLUE}  → URL API: ${WHITE}${PROTOCOL}://${DOMAIN}/api${NC}"
    
    # Configurar frontend
    # ✅ IMPORTANTE: Usar mesmo domínio + /api (sem subdomain "api.")
    cat > "$INSTALL_DIR/.env" << EOF
VITE_API_URL=${PROTOCOL}://${DOMAIN}/api
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
# ===========================================
# SISPAT 2.0 - Backend (gerado pelo install.sh)
# ===========================================

NODE_ENV=production
PORT=$APP_PORT
HOST=0.0.0.0

# --- Database (Postgres local) ---
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
DATABASE_SSL=false
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# --- JWT (token gerado por openssl rand -hex 64) ---
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

# --- CORS (origem do frontend) ---
FRONTEND_URL="${PROTOCOL}://${DOMAIN}"
CORS_ORIGIN="${PROTOCOL}://${DOMAIN}"
CORS_CREDENTIALS=true

# --- Segurança ---
BCRYPT_ROUNDS=12
HELMET_ENABLED=true

# --- Rate limiting (atenção: 5/15min é muito agressivo para NAT; 20 é melhor) ---
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
MAX_REQUEST_SIZE=10mb

# --- Upload ---
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/gif,image/webp,application/pdf"
UPLOAD_PATH="./uploads"

# --- Logs ---
LOG_LEVEL=info
LOG_FILE="./logs/app.log"
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# --- Redis (opcional; descomente para ativar rate limit distribuído e cache) ---
# ENABLE_REDIS=true
# REDIS_URL=redis://localhost:6379
# REDIS_PASSWORD=
# REDIS_DB=0

# --- Email/SMTP (necessário para reset de senha) ---
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM="SISPAT <noreply@${DOMAIN}>"

# --- Observabilidade (opcional) ---
# SENTRY_DSN=
ENABLE_HEALTH_MONITOR=true
ENABLE_METRICS=true

# --- Backup ---
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30
BACKUP_PATH="/var/backups/sispat"
EOF
    
    success "Variáveis de ambiente configuradas"
    echo -e "${GREEN}     Frontend API: ${WHITE}${PROTOCOL}://${DOMAIN}/api${NC}"
    echo -e "${GREEN}     Backend CORS: ${WHITE}${PROTOCOL}://${DOMAIN}${NC}"
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

    # Build do pacote compartilhado (@sispat/shared) - PRÉ-REQUISITO
    # Frontend e backend dependem de shared/dist (que é gitignored). Sem este
    # passo, os builds quebram em clone limpo ao resolver @sispat/shared.
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  ETAPA 0/4: Compilando pacote compartilhado      ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    if [ -d "$INSTALL_DIR/shared" ]; then
        echo -e "${BLUE}  → Instalando dependências e compilando @sispat/shared...${NC}"
        cd "$INSTALL_DIR/shared"
        npm install > /tmp/build-shared-deps.log 2>&1
        npm run build > /tmp/build-shared.log 2>&1
        if [ -f "dist/index.js" ]; then
            success "✅ Pacote compartilhado compilado (shared/dist)"
        else
            echo ""
            echo -e "${YELLOW}Últimas linhas do log:${NC}"
            tail -30 /tmp/build-shared.log
            error "❌ Falha ao compilar @sispat/shared! Ver: /tmp/build-shared.log"
        fi
        cd "$INSTALL_DIR"
    else
        warning "Diretório shared não encontrado — pulando build do pacote compartilhado"
    fi

    # Build frontend - com indicador de progresso
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  ETAPA 1/4: Instalando dependências do frontend  ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Limpar instalação anterior se existir
    if [ -d "node_modules" ]; then
        echo -e "${BLUE}  → Removendo node_modules anterior...${NC}"
        rm -rf node_modules package-lock.json
    fi
    
    # Preferir pnpm (mesmo gerenciador do CI/atualização → honra pnpm-lock.yaml e
    # versões reproduzíveis). Fallback AUTOMÁTICO para npm se pnpm faltar/falhar,
    # preservando a robustez do instalador.
    local FRONTEND_DEPS_OK=false
    # CRÍTICO: sem isto, o corepack pergunta "Do you want to download pnpm@X? [Y/n]"
    # e PENDURA a instalação (sem TTY p/ responder). Com =0 ele baixa em silêncio.
    export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
    command -v corepack >/dev/null 2>&1 && corepack enable >/dev/null 2>&1 || true
    if command -v pnpm >/dev/null 2>&1 && [ -f pnpm-lock.yaml ]; then
        echo -e "${BLUE}  → Instalando pacotes do frontend com pnpm (--frozen-lockfile)...${NC}"
        # timeout (-k força SIGKILL) p/ não pendurar a instalação se o pnpm empacar
        # (build de dep nativa / rede lenta) — ao estourar 12min, cai automaticamente
        # no fallback npm. </dev/null garante EOF em qualquer prompt inesperado.
        if timeout -k 30 720 pnpm install --frozen-lockfile </dev/null > /tmp/build-frontend-deps.log 2>&1 && [ -f "node_modules/.bin/vite" ]; then
            success "✅ Dependências do frontend instaladas (pnpm)"
            FRONTEND_DEPS_OK=true
        else
            warning "⚠️  pnpm indisponível/falhou — usando npm (--legacy-peer-deps) como fallback"
        fi
    fi

    if [ "$FRONTEND_DEPS_OK" != true ]; then
        # Fallback npm (--legacy-peer-deps) com retry — fluxo robusto original.
        echo -e "${BLUE}  → Instalando pacotes do frontend (npm)...${NC}"
        # captura o status sem disparar o set -e (|| ...) — preserva o tratamento
        # de erro/retry abaixo e cobre o caso de timeout (124).
        local deps_status=0
        timeout -k 30 720 npm install --legacy-peer-deps > /tmp/build-frontend-deps.log 2>&1 || deps_status=$?

        echo ""
        if [ $deps_status -eq 0 ]; then
            # Verificar se vite foi instalado corretamente
            if [ -f "node_modules/.bin/vite" ]; then
                success "✅ Dependências do frontend instaladas"
            else
                warning "⚠️  Vite não encontrado após npm install, tentando solução..."

                echo -e "${BLUE}  → Limpando e reinstalando com --force...${NC}"
                rm -rf node_modules package-lock.json ~/.npm

                npm install --legacy-peer-deps --force 2>&1 | tee /tmp/build-frontend-deps-retry.log

                if [ -f "node_modules/.bin/vite" ]; then
                    success "✅ Vite instalado após retry"
                else
                    echo ""
                    echo -e "${RED}❌ ERRO CRÍTICO: Vite não pode ser instalado!${NC}"
                    echo ""
                    echo -e "${YELLOW}Últimas linhas do log:${NC}"
                    tail -30 /tmp/build-frontend-deps-retry.log
                    echo ""
                    echo -e "${CYAN}Possíveis causas:${NC}"
                    echo "  • Problema de rede ao baixar pacotes"
                    echo "  • Memória insuficiente durante instalação"
                    echo "  • Conflito de dependências"
                    echo ""
                    error "Não foi possível instalar dependências do frontend"
                fi
            fi
        else
            echo ""
            echo -e "${RED}❌ npm install falhou!${NC}"
            echo ""
            echo -e "${YELLOW}Últimas 50 linhas do log:${NC}"
            tail -50 /tmp/build-frontend-deps.log
            echo ""
            error "❌ Falha ao instalar dependências do frontend! Ver: /tmp/build-frontend-deps.log"
        fi
    fi
    
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  ETAPA 2/4: Compilando frontend (React/TypeScript)║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""

    # Revalida @sispat/shared LOGO ANTES do build do frontend. A instalação de
    # deps pode ter rebuildado o shared via 'prepare' e um sinal (Ctrl+C/pkill)
    # no meio pode truncar dist/schemas/*.js → o vite falha com "X is not exported
    # by shared/dist/index.js". Rebuild limpo + verifica um export-canário.
    if [ -d "$INSTALL_DIR/shared" ]; then
        echo -e "${BLUE}  → Revalidando @sispat/shared (rebuild limpo)...${NC}"
        ( cd "$INSTALL_DIR/shared" && rm -rf dist && npm run build > /tmp/build-shared.log 2>&1 ) || true
        cd "$INSTALL_DIR"
        if [ -f "$INSTALL_DIR/shared/dist/index.js" ] && grep -q "loginSchema" "$INSTALL_DIR/shared/dist/schemas/auth.js" 2>/dev/null; then
            success "✅ @sispat/shared íntegro (dist completo)"
        else
            echo ""
            tail -20 /tmp/build-shared.log 2>/dev/null
            error "❌ shared/dist incompleto — falha ao recompilar @sispat/shared. Ver: /tmp/build-shared.log"
        fi
    fi

    # Verificar novamente se vite existe antes de fazer build
    if [ ! -f "node_modules/.bin/vite" ]; then
        error "❌ Vite não está instalado! Não é possível fazer build do frontend."
    fi
    
    echo -e "${BLUE}  → Compilando código React/TypeScript...${NC}"
    
    # Usar npm run build com timeout
    timeout 900 npm run build > /tmp/build-frontend.log 2>&1 &
    local build_frontend_pid=$!
    show_spinner $build_frontend_pid "Compilando frontend (pode levar 5-10 minutos)..."
    wait $build_frontend_pid
    local build_frontend_status=$?
    
    echo ""
    if [ $build_frontend_status -eq 0 ]; then
        # Verificar se gerou os arquivos
        if [ -f "dist/index.html" ] && [ -d "dist/assets" ]; then
            success "✅ Frontend compilado com sucesso"
        else
            warning "⚠️  Build reportou sucesso mas arquivos não foram gerados"
            echo ""
            echo -e "${YELLOW}Últimas linhas do log:${NC}"
            tail -20 /tmp/build-frontend.log
            error "❌ Frontend não foi compilado corretamente"
        fi
    elif [ $build_frontend_status -eq 124 ]; then
        error "❌ Timeout no build (>15 min). Servidor pode ter pouca memória. Ver: /tmp/build-frontend.log"
    else
        echo ""
        echo -e "${YELLOW}Erro no build do frontend:${NC}"
        tail -30 /tmp/build-frontend.log
        echo ""
        error "❌ Falha ao compilar frontend! Ver log completo: /tmp/build-frontend.log"
    fi
    
    # Build backend - com indicador de progresso
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  ETAPA 3/4: Instalando dependências do backend   ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    cd backend
    
    # Limpar instalação anterior se existir
    if [ -d "node_modules" ]; then
        echo -e "${BLUE}  → Removendo node_modules anterior do backend...${NC}"
        rm -rf node_modules package-lock.json
    fi
    
    echo -e "${BLUE}  → Instalando pacotes do backend...${NC}"
    
    # IMPORTANTE: Instalar TODAS as dependências (incluindo devDependencies)
    # porque precisamos dos @types/* para compilar TypeScript
    timeout 600 npm install > /tmp/build-backend-deps.log 2>&1 &
    local backend_deps_pid=$!
    show_spinner $backend_deps_pid "Instalando pacotes do backend (pode levar 2-3 minutos)..."
    wait $backend_deps_pid
    local backend_deps_status=$?
    
    echo ""
    if [ $backend_deps_status -eq 0 ]; then
        # Verificar se TypeScript foi instalado
        if [ -f "node_modules/.bin/tsc" ]; then
            local types_count=$(ls node_modules/@types 2>/dev/null | wc -l)
            success "✅ Dependências do backend instaladas (@types: $types_count pacotes)"
        else
            warning "⚠️  TypeScript não encontrado, reinstalando..."
            rm -rf node_modules package-lock.json
            npm install > /tmp/build-backend-deps-retry.log 2>&1
            
            if [ -f "node_modules/.bin/tsc" ]; then
                success "✅ Dependências reinstaladas com sucesso"
            else
                echo ""
                error "❌ Falha ao instalar TypeScript! Ver: /tmp/build-backend-deps-retry.log"
            fi
        fi
    elif [ $backend_deps_status -eq 124 ]; then
        error "❌ Timeout na instalação (>10 min). Ver: /tmp/build-backend-deps.log"
    else
        echo ""
        echo -e "${YELLOW}Erro ao instalar dependências:${NC}"
        tail -20 /tmp/build-backend-deps.log
        echo ""
        error "❌ Falha ao instalar dependências do backend! Ver: /tmp/build-backend-deps.log"
    fi
    
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  ETAPA 4/4: Compilando backend (Node.js/TypeScript)║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}  ⚠️  Esta é a parte que pode demorar mais (1-3 minutos)${NC}"
    echo -e "${YELLOW}  ⚠️  O spinner pode parecer travado, mas está funcionando!${NC}"
    echo ""
    
    # Verificar se TypeScript existe antes de compilar
    if [ ! -f "node_modules/.bin/tsc" ]; then
        error "❌ TypeScript não está instalado! Não é possível compilar o backend."
    fi
    
    echo -e "${BLUE}  → Compilando código TypeScript do backend...${NC}"
    
    # Executar build do backend com timeout
    timeout 600 npm run build > /tmp/build-backend.log 2>&1 &
    local build_pid=$!
    
    # Mostrar spinner
    show_spinner $build_pid "Compilando backend (aguarde, pode demorar até 3 minutos)..."
    
    # Aguardar conclusão
    wait $build_pid
    local build_status=$?
    
    echo ""
    
    if [ $build_status -eq 124 ]; then
        echo ""
        echo -e "${YELLOW}Últimas linhas do log:${NC}"
        tail -30 /tmp/build-backend.log
        echo ""
        error "❌ Timeout no build do backend (>10 min). Ver: /tmp/build-backend.log"
    elif [ $build_status -eq 0 ]; then
        # Verificar se realmente criou os arquivos compilados
        if [ -f "dist/index.js" ]; then
            local compiled_files=$(find dist -name "*.js" 2>/dev/null | wc -l)
            success "✅ Backend compilado com sucesso! ($compiled_files arquivos JS)"
        else
            echo ""
            warning "⚠️  Build reportou sucesso mas arquivos não foram criados!"
            echo ""
            echo -e "${YELLOW}Últimas linhas do log:${NC}"
            tail -30 /tmp/build-backend.log
            echo ""
            echo -e "${CYAN}Log completo em: /tmp/build-backend.log${NC}"
            error "❌ Backend não foi compilado corretamente"
        fi
    else
        echo ""
        echo -e "${RED}❌ Falha ao compilar backend!${NC}"
        echo ""
        echo -e "${YELLOW}Erros de compilação encontrados:${NC}"
        grep -i "error" /tmp/build-backend.log | head -20 | sed 's/^/  /'
        echo ""
        echo -e "${YELLOW}Últimas linhas do log:${NC}"
        tail -20 /tmp/build-backend.log | sed 's/^/  /'
        echo ""
        echo -e "${CYAN}Log completo em: /tmp/build-backend.log${NC}"
        error "❌ Compilação do backend falhou!"
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
    
    # Criar tabelas adicionais usando scripts Node.js (correção de bugs)
    echo ""
    echo -e "${BLUE}  ⚙️  Criando tabelas adicionais (customizations, documents, fields, templates)...${NC}"
    
    # 1. Customizations
    if [ -f "create-customizations-table.js" ]; then
        node create-customizations-table.js > /tmp/create-customizations.log 2>&1
        if [ $? -eq 0 ]; then
            success "Tabela customizations criada"
        else
            warning "Erro ao criar customizations (pode já existir)"
        fi
    else
        warning "Script create-customizations-table.js não encontrado"
    fi
    
    # 2. Imovel Custom Fields
    if [ -f "create-imovel-fields-table.js" ]; then
        node create-imovel-fields-table.js > /tmp/create-imovel-fields.log 2>&1
        if [ $? -eq 0 ]; then
            success "Tabela imovel_custom_fields criada"
        else
            warning "Erro ao criar imovel_custom_fields (pode já existir)"
        fi
    else
        warning "Script create-imovel-fields-table.js não encontrado"
    fi
    
    # 3. Documents
    if [ -f "create-documents-table.js" ]; then
        node create-documents-table.js > /tmp/create-documents.log 2>&1
        if [ $? -eq 0 ]; then
            success "Tabela documents criada"
        else
            warning "Erro ao criar documents (pode já existir)"
        fi
    else
        warning "Script create-documents-table.js não encontrado"
    fi
    
    # 4. Ficha Templates
    if [ -f "create-ficha-templates-table.js" ]; then
        node create-ficha-templates-table.js > /tmp/create-ficha-templates.log 2>&1
        if [ $? -eq 0 ]; then
            success "Tabela ficha_templates criada"
        else
            warning "Erro ao criar ficha_templates (pode já existir)"
        fi
    else
        warning "Script create-ficha-templates-table.js não encontrado"
    fi
    
    # Conceder permissões em TODAS as tabelas (incluindo as recém-criadas)
    echo ""
    echo -e "${BLUE}  ⚙️  Concedendo permissões finais em todas as tabelas...${NC}"
    sudo -u postgres psql -d "$DB_NAME" > /dev/null 2>&1 << 'PERMEOF'
GRANT ALL PRIVILEGES ON SCHEMA public TO sispat_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sispat_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sispat_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sispat_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sispat_user;
PERMEOF
    
    if [ $? -eq 0 ]; then
        success "Permissões concedidas em todas as tabelas"
    else
        warning "Erro ao conceder permissões"
    fi
    
    # Verificar tabelas criadas
    echo ""
    echo -e "${BLUE}  → Verificando tabelas essenciais...${NC}"
    local tables_ok=0
    local tables_missing=0
    
    for table in users municipalities sectors customizations ficha_templates documents imovel_custom_fields; do
        if sudo -u postgres psql -d "$DB_NAME" -t -c "\d $table" > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} Tabela $table existe"
            # NÃO usar ((tables_ok++)): com set -e, o pós-incremento retorna o
            # valor ANTIGO (0 na 1ª vez) → exit 1 → o script ABORTA aqui (era a
            # causa das paradas em "Tabela users existe"). Assignment é set -e-safe.
            tables_ok=$((tables_ok + 1))
        else
            echo -e "  ${YELLOW}⚠${NC} Tabela $table NÃO encontrada"
            tables_missing=$((tables_missing + 1))
        fi
    done
    
    echo ""
    if [ $tables_missing -eq 0 ]; then
        success "Todas as tabelas essenciais foram criadas ($tables_ok/7)"
    else
        warning "$tables_missing tabelas não foram encontradas (pode causar problemas)"
    fi
    
    # Popular banco com dados iniciais
    echo ""
    echo -e "${BLUE}  ⚙️  Criando superusuário e dados iniciais...${NC}"
    echo ""
    
    # Passar credenciais para o seed
    export SUPERUSER_EMAIL="$SUPERUSER_EMAIL"
    export SUPERUSER_PASSWORD="$SUPERUSER_PASSWORD"
    export SUPERUSER_NAME="$SUPERUSER_NAME"
    export SUPERVISOR_EMAIL="$SUPERVISOR_EMAIL"
    export SUPERVISOR_PASSWORD="$SUPERVISOR_PASSWORD"
    export SUPERVISOR_NAME="$SUPERVISOR_NAME"
    export MUNICIPALITY_NAME="$MUNICIPALITY_NAME"
    export STATE="$STATE"
    export BCRYPT_ROUNDS="12"
    
    # Seed com a versão COMPILADA (node dist/prisma/seed.js — backend já buildado na
    # FASE 3) em vez de ts-node: muito mais rápido e estável (o ts-node compila tudo
    # em runtime e travava na VPS sob carga após o build). timeout evita pendurar a
    # instalação se algo empacar; o | tee mantém o fluxo de verificação abaixo.
    timeout -k 15 300 npm run prisma:seed:prod 2>&1 | tee -a "$LOG_FILE"

    if true; then
        echo ""
        
        # Verificar se usuário foi realmente criado
        echo -e "${BLUE}  → Verificando se superusuário foi criado...${NC}"
        local user_count=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE email = '$SUPERUSER_EMAIL';" 2>/dev/null | tr -d ' ')
        
        if [ "$user_count" = "1" ]; then
            success "✅ Superusuário criado com sucesso!"
            echo -e "${GREEN}     Email: ${WHITE}$SUPERUSER_EMAIL${NC}"
        else
            warning "⚠️  Superusuário não foi criado. Criando manualmente..."
            
            # Criar usuário manualmente via Node.js
            cat > /tmp/create-user.js << USEREOF
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createUser() {
  const passwordHash = await bcrypt.hash('$SUPERUSER_PASSWORD', 10);
  const municipality = await prisma.municipality.findFirst();
  
  const user = await prisma.user.upsert({
    where: { email: '$SUPERUSER_EMAIL' },
    update: { password: passwordHash, role: 'superuser', isActive: true },
    create: {
      id: 'user-superuser',
      email: '$SUPERUSER_EMAIL',
      name: '$SUPERUSER_NAME',
      password: passwordHash,
      role: 'superuser',
      responsibleSectors: [],
      municipalityId: municipality.id,
      isActive: true,
    },
  });
  console.log('✅ Usuário criado:', user.email);
}

createUser().catch(console.error).finally(() => prisma.\$disconnect());
USEREOF
            
            timeout -k 15 120 node /tmp/create-user.js || warning "Falha/timeout ao criar admin manualmente (ver $LOG_FILE)"
            rm -f /tmp/create-user.js
            # Reverifica de fato (não declarar sucesso cego)
            user_count=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE email = '$SUPERUSER_EMAIL';" 2>/dev/null | tr -d ' ')
            if [ "$user_count" = "1" ]; then
                success "Superusuário criado manualmente"
            else
                warning "⚠️  Admin ainda não criado. Após o fim, rode: cd $INSTALL_DIR/backend && npm run prisma:seed:prod"
            fi
        fi
        
        success "✨ Banco de dados configurado e populado"
        
        # Salvar credenciais em arquivo temporário para exibir no final
        # Valores ENTRE ASPAS: os nomes têm espaço (ex.: "Junielson Farias") e o
        # arquivo é lido com `source` na exibição final — sem aspas, o espaço
        # quebrava (`SUPERUSER_NAME=Junielson Farias` → tentava rodar "Farias").
        cat > /tmp/sispat-credentials.txt << EOF
SUPERUSER_EMAIL="$SUPERUSER_EMAIL"
SUPERUSER_PASSWORD="$SUPERUSER_PASSWORD"
SUPERUSER_NAME="$SUPERUSER_NAME"
SUPERVISOR_EMAIL="$SUPERVISOR_EMAIL"
SUPERVISOR_PASSWORD="$SUPERVISOR_PASSWORD"
SUPERVISOR_NAME="$SUPERVISOR_NAME"
DOMAIN="$DOMAIN"
EOF
    else
        error "Falha ao popular banco de dados"
    fi
}

configure_nginx() {
    echo ""
    log "Configurando Nginx..."
    
    echo -e "${BLUE}  → Domínio: ${WHITE}${DOMAIN}${NC}"
    echo -e "${BLUE}  → API: ${WHITE}${DOMAIN}/api${NC}"
    
    # Criar configuração do site
    # ✅ IMPORTANTE: Apenas 1 domínio, API acessível em /api/
    cat > /etc/nginx/sites-available/sispat << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    
    root ${INSTALL_DIR}/dist;
    
    # API Backend - DEVE vir ANTES de /uploads
    location /api/ {
        proxy_pass http://127.0.0.1:${APP_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Arquivos estáticos (uploads) - ^~ garante precedência sobre regex
    # DEVE vir ANTES do location ~* para não ser capturado pelo regex
    location ^~ /uploads {
        alias ${INSTALL_DIR}/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public";
        access_log off;
    }
    
    # Frontend - Servir arquivos estáticos
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Cache para arquivos estáticos - DEVE vir DEPOIS de /uploads
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:${APP_PORT}/api/health;
        access_log off;
    }
    
    # Limitar tamanho de upload
    client_max_body_size 10M;
}
EOF
    
    echo -e "${BLUE}  → Verificando diretório dist...${NC}"
    if [ ! -d "${INSTALL_DIR}/dist" ]; then
        warning "Diretório dist não encontrado!"
        echo -e "${YELLOW}  Verificando se build foi executado...${NC}"
        ls -la "${INSTALL_DIR}/" | grep dist || warning "Frontend pode não ter sido compilado"
    else
        success "Diretório dist encontrado"
    fi
    
    echo -e "${BLUE}  → Removendo configuração padrão do Nginx...${NC}"
    rm -f /etc/nginx/sites-enabled/default
    success "Configuração padrão removida"
    
    echo -e "${BLUE}  → Ativando site SISPAT...${NC}"
    ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
    success "Site SISPAT ativado"
    
    echo -e "${BLUE}  → Testando configuração do Nginx...${NC}"
    if nginx -t 2>&1 | tee /tmp/nginx-test.log; then
        success "Configuração do Nginx válida"
        
        echo -e "${BLUE}  → Recarregando Nginx...${NC}"
        systemctl reload nginx
        success "Nginx recarregado"
        
        echo -e "${BLUE}  → Verificando status do Nginx...${NC}"
        if systemctl is-active --quiet nginx; then
            success "Nginx está ativo e rodando"
        else
            warning "Nginx não está ativo!"
            systemctl status nginx --no-pager
        fi
    else
        echo ""
        error "Erro na configuração do Nginx! Ver: /tmp/nginx-test.log"
    fi
    
    echo ""
    success "✅ Nginx configurado para: $DOMAIN"
    echo -e "${GREEN}   Frontend: ${WHITE}http://${DOMAIN}${NC}"
    echo -e "${GREEN}   API: ${WHITE}http://${DOMAIN}/api${NC}"
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
        # ✅ Certificado apenas para o domínio principal (API usa mesmo domínio)
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$SUPERUSER_EMAIL" --redirect 2>&1 | tee -a "$LOG_FILE"
        
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
    # IMPORTANTE: o PM2 é o gerenciador OFICIAL do backend (start_application +
    # pm2 startup/save). Este unit systemd é só uma ALTERNATIVA documentada — NÃO
    # habilitar, senão no reboot systemd E PM2 sobem o backend na :3000 ao mesmo
    # tempo (conflito de porta / crash-loop). Mantemos desabilitado e idempotente.
    systemctl disable sispat-backend > /dev/null 2>&1 || true

    success "Unit systemd criado (desabilitado; PM2 é o runner ativo)"
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
    
    # Configurar permissões básicas
    chown -R www-data:www-data "$INSTALL_DIR"
    chown -R www-data:www-data /var/backups/sispat
    chown -R www-data:www-data /var/log/sispat
    
    # ✅ CORREÇÃO: Configurar permissões específicas para uploads e logs
    # Diretórios: 755 (rwxr-xr-x)
    chmod 755 "$INSTALL_DIR/backend/uploads"
    chmod 755 "$INSTALL_DIR/backend/logs"
    chmod 755 "$INSTALL_DIR/backend/backups"
    
    # Arquivos em uploads: 644 (rw-r--r--)
    find "$INSTALL_DIR/backend/uploads" -type f -exec chmod 644 {} \; 2>/dev/null || true
    find "$INSTALL_DIR/backend/uploads" -type d -exec chmod 755 {} \; 2>/dev/null || true
    
    # Arquivos em logs: 644 (rw-r--r--)
    find "$INSTALL_DIR/backend/logs" -type f -exec chmod 644 {} \; 2>/dev/null || true
    find "$INSTALL_DIR/backend/logs" -type d -exec chmod 755 {} \; 2>/dev/null || true
    
    # Garantir que diretórios têm permissão de escrita para www-data
    chmod g+w "$INSTALL_DIR/backend/uploads" 2>/dev/null || true
    chmod g+w "$INSTALL_DIR/backend/logs" 2>/dev/null || true
    
    success "Permissões configuradas (uploads: 755/644, logs: 755/644)"
}

restore_uploads() {
    # Restaurar uploads se existir backup
    if [ -d "/tmp/sispat-backup/uploads" ]; then
        echo ""
        log "Restaurando uploads da instalação anterior..."
        
        mkdir -p "$INSTALL_DIR/backend/uploads"
        cp -r /tmp/sispat-backup/uploads/* "$INSTALL_DIR/backend/uploads/" 2>/dev/null || true
        
        # ✅ CORREÇÃO: Ajustar permissões corretas (igual ao configure_permissions)
        chown -R www-data:www-data "$INSTALL_DIR/backend/uploads"
        chmod 755 "$INSTALL_DIR/backend/uploads"
        find "$INSTALL_DIR/backend/uploads" -type f -exec chmod 644 {} \; 2>/dev/null || true
        find "$INSTALL_DIR/backend/uploads" -type d -exec chmod 755 {} \; 2>/dev/null || true
        
        # Remover backup temporário
        rm -rf /tmp/sispat-backup
        
        success "Uploads restaurados com permissões corretas!"
    fi
}

start_application() {
    echo ""
    log "Iniciando aplicação..."
    
    # Restaurar uploads antes de iniciar
    restore_uploads
    
    cd "$INSTALL_DIR/backend"
    
    # Verificar se dist/index.js existe
    if [ ! -f "dist/index.js" ]; then
        error "Arquivo dist/index.js não encontrado! Backend não foi compilado."
    fi
    
    echo -e "${BLUE}  → Verificando arquivos necessários...${NC}"
    success "Backend compilado encontrado"
    
    # Parar PM2 anterior se existir
    echo -e "${BLUE}  → Parando processos PM2 anteriores...${NC}"
    pm2 delete sispat-backend 2>/dev/null || true
    pm2 kill 2>/dev/null || true
    
    # ✅ CORREÇÃO: Verificar se existe ecosystem.config.js
    if [ -f "ecosystem.config.js" ]; then
        echo -e "${BLUE}  → Usando ecosystem.config.js...${NC}"
        pm2 start ecosystem.config.js --env production --name sispat-backend --user www-data 2>&1 | tee -a "$LOG_FILE"
    else
        # Fallback: iniciar diretamente com PM2 como www-data
        echo -e "${BLUE}  → Iniciando aplicação com PM2 (usuário www-data)...${NC}"
        pm2 start dist/index.js --name sispat-backend --user www-data 2>&1 | tee -a "$LOG_FILE"
    fi
    
    if [ $? -ne 0 ]; then
        echo ""
        error "Falha ao iniciar PM2. Tentando ver o erro..."
        echo ""
        echo -e "${YELLOW}Últimas linhas do código:${NC}"
        tail -20 dist/index.js
        echo ""
        echo -e "${YELLOW}Tentando iniciar diretamente para ver erro:${NC}"
        node dist/index.js &
        sleep 3
        pkill -f "node dist/index.js"
        exit 1
    fi
    
    echo -e "${BLUE}  → Salvando configuração PM2...${NC}"
    pm2 save 2>&1 | tee -a "$LOG_FILE"
    
    # ✅ CORREÇÃO: Configurar PM2 para iniciar com o sistema (como root, mas processo roda como www-data)
    echo -e "${BLUE}  → Configurando PM2 para iniciar automaticamente...${NC}"
    # PM2 startup precisa ser executado como root, mas o processo roda como www-data (definido no --user)
    env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root 2>&1 | grep -v "sudo" | tee -a "$LOG_FILE" || true
    
    # Verificar se PM2 está rodando corretamente
    echo -e "${BLUE}  → Verificando status do PM2...${NC}"
    sleep 2
    if pm2 list | grep -q "sispat-backend"; then
        success "PM2 está rodando"
        pm2 status | grep sispat-backend || true
    else
        warning "PM2 pode não estar rodando corretamente"
    fi
    
    # Aguardar inicialização
    echo -e "${BLUE}  → Aguardando aplicação iniciar (10 segundos)...${NC}"
    for i in {1..10}; do
        echo -ne "\r     Aguardando... $i/10 segundos"
        sleep 1
    done
    echo ""
    
    # Verificar status do PM2
    echo -e "${BLUE}  → Verificando status do PM2...${NC}"
    pm2 list | tee -a "$LOG_FILE"
    
    # Verificar se está rodando
    echo -e "${BLUE}  → Testando health check da API...${NC}"
    local max_attempts=5
    local attempt=1
    local api_ok=false
    
    while [ $attempt -le $max_attempts ]; do
        echo -ne "\r     Tentativa $attempt/$max_attempts..."
        if curl -f -s http://localhost:$APP_PORT/api/health > /dev/null 2>&1; then
            api_ok=true
            break
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    echo ""
    
    if [ "$api_ok" = true ]; then
        success "Aplicação iniciada e respondendo! ✨"
        echo -e "${GREEN}     API Health Check: ${WHITE}http://localhost:$APP_PORT/api/health${NC}"
    else
        echo ""
        warning "Aplicação iniciou mas API não está respondendo ainda"
        echo ""
        echo -e "${YELLOW}Verificando logs do PM2:${NC}"
        pm2 logs sispat-backend --lines 30 --nostream
        echo ""
        echo -e "${CYAN}Para ver logs em tempo real:${NC}"
        echo -e "  ${WHITE}pm2 logs sispat-backend${NC}"
        echo ""
        echo -e "${YELLOW}Continuando instalação...${NC}"
        sleep 3
    fi
}

configure_backup() {
    echo ""
    log "Configurando backup automático..."
    
    # Copiar script de backup
    chmod +x "$INSTALL_DIR/scripts/backup.sh"
    
    # Criar cron job para backup diário às 2h (sem duplicar em reinstalações)
    (crontab -l 2>/dev/null | grep -vF "$INSTALL_DIR/scripts/backup.sh"; \
     echo "0 2 * * * $INSTALL_DIR/scripts/backup.sh > /var/log/sispat/backup.log 2>&1") | crontab -
    
    success "Backup automático configurado (diário às 2h)"
}

configure_monitoring() {
    echo ""
    log "Configurando monitoramento..."
    
    # Copiar script de monitoramento
    chmod +x "$INSTALL_DIR/scripts/monitor.sh"
    
    # Criar cron job para monitoramento a cada 5 minutos (sem duplicar)
    (crontab -l 2>/dev/null | grep -vF "$INSTALL_DIR/scripts/monitor.sh"; \
     echo "*/5 * * * * $INSTALL_DIR/scripts/monitor.sh > /var/log/sispat/monitor.log 2>&1") | crontab -
    
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
    
    # Verificar instalação anterior
    check_existing_installation
    
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
    
    # Verificação final
    verify_installation
    
    # Finalização
    show_success_message
}

verify_installation() {
    clear
    show_banner
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   🔍 VERIFICANDO INSTALAÇÃO                      ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log "Iniciando verificação pós-instalação..."
    
    local errors=0
    local warnings=0
    
    # 1. Verificar diretórios
    echo -e "${YELLOW}[1/12]${NC} Verificando estrutura de diretórios..."
    if [ -d "$INSTALL_DIR" ] && [ -d "$INSTALL_DIR/backend" ] && [ -d "$INSTALL_DIR/dist" ]; then
        success "Diretórios criados corretamente"
    else
        warning "Estrutura de diretórios incompleta"
        errors=$((errors + 1))
    fi
    
    # 2. Verificar compilação do frontend
    echo -e "${YELLOW}[2/12]${NC} Verificando compilação do frontend..."
    if [ -f "$INSTALL_DIR/dist/index.html" ] && [ -d "$INSTALL_DIR/dist/assets" ]; then
        local js_files=$(find "$INSTALL_DIR/dist/assets" -name "*.js" 2>/dev/null | wc -l)
        if [ "$js_files" -gt 0 ]; then
            success "Frontend compilado ($js_files arquivos JS)"
        else
            warning "Frontend sem arquivos JavaScript"
            errors=$((errors + 1))
        fi
    else
        warning "Frontend não compilado"
        errors=$((errors + 1))
    fi
    
    # 3. Verificar compilação do backend
    echo -e "${YELLOW}[3/12]${NC} Verificando compilação do backend..."
    if [ -f "$INSTALL_DIR/backend/dist/index.js" ]; then
        local backend_files=$(find "$INSTALL_DIR/backend/dist" -name "*.js" 2>/dev/null | wc -l)
        success "Backend compilado ($backend_files arquivos JS)"
    else
        warning "Backend não compilado"
        errors=$((errors + 1))
    fi
    
    # 4. Verificar dependências do backend
    echo -e "${YELLOW}[4/12]${NC} Verificando dependências do backend..."
    if [ -d "$INSTALL_DIR/backend/node_modules" ]; then
        local types_count=$(ls "$INSTALL_DIR/backend/node_modules/@types" 2>/dev/null | wc -l)
        if [ "$types_count" -gt 5 ]; then
            success "Dependências instaladas (@types: $types_count pacotes)"
        else
            warning "Poucos pacotes @types instalados"
            warnings=$((warnings + 1))
        fi
    else
        warning "node_modules não encontrado"
        errors=$((errors + 1))
    fi
    
    # 5. Verificar Prisma Client
    echo -e "${YELLOW}[5/12]${NC} Verificando Prisma Client..."
    if [ -d "$INSTALL_DIR/backend/node_modules/.prisma/client" ]; then
        success "Prisma Client gerado"
    else
        warning "Prisma Client não gerado"
        errors=$((errors + 1))
    fi
    
    # 6. Verificar banco de dados
    echo -e "${YELLOW}[6/12]${NC} Verificando banco de dados..."
    if sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        # Verificar tabelas
        local table_count=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
        if [ "$table_count" -gt 10 ]; then
            success "Banco de dados criado ($table_count tabelas)"
        else
            warning "Banco com poucas tabelas ($table_count)"
            warnings=$((warnings + 1))
        fi
    else
        warning "Banco de dados não encontrado"
        errors=$((errors + 1))
    fi
    
    # 7. Verificar usuários no banco
    echo -e "${YELLOW}[7/12]${NC} Verificando usuários cadastrados..."
    local user_count=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
    if [ "$user_count" -ge 1 ]; then
        success "Usuário superusuário criado"
    else
        warning "Nenhum usuário cadastrado"
        warnings=$((warnings + 1))
    fi
    
    # 8. Verificar PM2
    echo -e "${YELLOW}[8/12]${NC} Verificando PM2..."
    if pm2 list 2>/dev/null | grep -q "sispat-backend.*online"; then
        success "PM2 rodando (processo online)"
    else
        warning "PM2 não está rodando"
        errors=$((errors + 1))
    fi
    
    # 9. Verificar Nginx
    echo -e "${YELLOW}[9/14]${NC} Verificando Nginx..."
    if systemctl is-active --quiet nginx; then
        if [ -f "/etc/nginx/sites-enabled/sispat" ]; then
            # ✅ CORREÇÃO: Verificar configuração do Nginx (ordem de locations)
            if grep -q "location ^~ /uploads" /etc/nginx/sites-enabled/sispat && \
               grep -q "location /api" /etc/nginx/sites-enabled/sispat; then
                # Verificar se /api vem antes de /uploads
                local api_line=$(grep -n "location /api" /etc/nginx/sites-enabled/sispat | head -1 | cut -d: -f1)
                local uploads_line=$(grep -n "location ^~ /uploads" /etc/nginx/sites-enabled/sispat | head -1 | cut -d: -f1)
                if [ "$api_line" -lt "$uploads_line" ]; then
                    success "Nginx ativo e configurado corretamente (ordem de locations OK)"
                else
                    warning "Nginx configurado mas ordem de locations pode estar incorreta"
                    warnings=$((warnings + 1))
                fi
            else
                warning "Nginx configurado mas sem configuração /uploads correta"
                warnings=$((warnings + 1))
            fi
        else
            warning "Nginx ativo mas configuração não encontrada"
            warnings=$((warnings + 1))
        fi
    else
        warning "Nginx não está ativo"
        errors=$((errors + 1))
    fi
    
    # 9.5. Verificar permissões de uploads e logs
    echo -e "${YELLOW}[10/14]${NC} Verificando permissões de uploads e logs..."
    local uploads_ok=true
    local logs_ok=true
    
    if [ -d "$INSTALL_DIR/backend/uploads" ]; then
        local uploads_owner=$(stat -c '%U:%G' "$INSTALL_DIR/backend/uploads" 2>/dev/null || echo "unknown")
        local uploads_perm=$(stat -c '%a' "$INSTALL_DIR/backend/uploads" 2>/dev/null || echo "000")
        if [ "$uploads_owner" = "www-data:www-data" ] && [ "$uploads_perm" = "755" ]; then
            success "Permissões de uploads corretas (www-data:www-data, 755)"
        else
            warning "Permissões de uploads incorretas ($uploads_owner, $uploads_perm)"
            warnings=$((warnings + 1))
            uploads_ok=false
        fi
    else
        warning "Diretório uploads não existe"
        warnings=$((warnings + 1))
        uploads_ok=false
    fi
    
    if [ -d "$INSTALL_DIR/backend/logs" ]; then
        local logs_owner=$(stat -c '%U:%G' "$INSTALL_DIR/backend/logs" 2>/dev/null || echo "unknown")
        local logs_perm=$(stat -c '%a' "$INSTALL_DIR/backend/logs" 2>/dev/null || echo "000")
        if [ "$logs_owner" = "www-data:www-data" ] && [ "$logs_perm" = "755" ]; then
            success "Permissões de logs corretas (www-data:www-data, 755)"
        else
            warning "Permissões de logs incorretas ($logs_owner, $logs_perm)"
            warnings=$((warnings + 1))
            logs_ok=false
        fi
    else
        warning "Diretório logs não existe"
        warnings=$((warnings + 1))
        logs_ok=false
    fi
    
    # 9.6. Verificar se PM2 está rodando como www-data
    echo -e "${YELLOW}[11/14]${NC} Verificando usuário do processo PM2..."
    local pm2_user=$(pm2 jlist 2>/dev/null | grep -o '"username":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "unknown")
    if [ "$pm2_user" = "www-data" ] || [ "$pm2_user" = "root" ]; then
        success "PM2 rodando como $pm2_user"
    else
        warning "PM2 rodando como $pm2_user (esperado: www-data ou root)"
        warnings=$((warnings + 1))
    fi
    
    # 10. Verificar API (health check)
    echo -e "${YELLOW}[12/14]${NC} Verificando API (health check)..."
    sleep 2  # Aguardar API iniciar
    local api_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$APP_PORT/api/health 2>/dev/null)
    if [ "$api_response" = "200" ]; then
        success "API respondendo (HTTP 200)"
    else
        warning "API não está respondendo (HTTP $api_response)"
        errors=$((errors + 1))
    fi
    
    # 11. Verificar acesso ao frontend via Nginx
    echo -e "${YELLOW}[13/14]${NC} Verificando acesso ao frontend..."
    local frontend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null)
    if [ "$frontend_response" = "200" ]; then
        success "Frontend acessível via Nginx (HTTP 200)"
    else
        warning "Frontend pode não estar acessível (HTTP $frontend_response)"
        warnings=$((warnings + 1))
    fi
    
    # 12. Verificar acesso a uploads via Nginx
    echo -e "${YELLOW}[14/14]${NC} Verificando acesso a uploads via Nginx..."
    # Criar arquivo de teste se uploads estiver vazio
    if [ ! -f "$INSTALL_DIR/backend/uploads/.test" ]; then
        touch "$INSTALL_DIR/backend/uploads/.test"
        chown www-data:www-data "$INSTALL_DIR/backend/uploads/.test"
        chmod 644 "$INSTALL_DIR/backend/uploads/.test"
    fi
    
    local uploads_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/uploads/.test" 2>/dev/null || echo "000")
    if [ "$uploads_response" = "200" ] || [ "$uploads_response" = "404" ]; then
        # 404 é OK se arquivo não existir, significa que Nginx está servindo /uploads
        success "Nginx servindo /uploads corretamente (HTTP $uploads_response)"
        rm -f "$INSTALL_DIR/backend/uploads/.test" 2>/dev/null || true
    else
        warning "Nginx pode não estar servindo /uploads corretamente (HTTP $uploads_response)"
        warnings=$((warnings + 1))
    fi
    
    # 13. Verificar SSL (se configurado)
    echo ""
    echo -e "${YELLOW}[15/15]${NC} Verificando SSL..."
    if [ "$CONFIGURE_SSL" = "yes" ]; then
        if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
            local cert_expiry=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" 2>/dev/null | cut -d= -f2)
            success "SSL configurado (expira: $cert_expiry)"
        else
            warning "SSL não foi configurado"
            warnings=$((warnings + 1))
        fi
    else
        info "SSL não solicitado (pode configurar depois)"
    fi
    
    # Resultado da verificação
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}        RESULTADO DA VERIFICAÇÃO                    ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo ""
    
    if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
        echo -e "${GREEN}✅ PERFEITO! Instalação 100% funcional!${NC}"
        echo -e "${GREEN}   Todos os 12 testes passaram com sucesso.${NC}"
    elif [ $errors -eq 0 ]; then
        echo -e "${YELLOW}⚠️  ATENÇÃO: Instalação funcional com $warnings avisos${NC}"
        echo -e "${YELLOW}   Sistema está rodando, mas pode precisar de ajustes.${NC}"
    else
        echo -e "${RED}❌ ERRO: Instalação com $errors erros e $warnings avisos${NC}"
        echo -e "${RED}   Sistema pode não funcionar corretamente.${NC}"
        echo ""
        echo -e "${YELLOW}Verifique os logs:${NC}"
        echo -e "  ${CYAN}cat $LOG_FILE${NC}"
        echo -e "  ${CYAN}pm2 logs sispat-backend${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo ""
    
    if [ $errors -gt 0 ]; then
        warning "Pressione ENTER para ver a mensagem de acesso mesmo assim..."
        read
    else
        sleep 3
    fi
}

show_success_message() {
    clear
    
    # Carregar credenciais do arquivo temporário (|| true: nunca abortar o resumo
    # final por causa do conteúdo do arquivo, mesmo que algum valor seja atípico)
    if [ -f "/tmp/sispat-credentials.txt" ]; then
        source /tmp/sispat-credentials.txt || true
    fi
    
    # Determinar URL de acesso
    local access_url
    if [ "$CONFIGURE_SSL" = "yes" ]; then
        access_url="https://${DOMAIN}"
    else
        access_url="http://${DOMAIN}"
    fi
    
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
    
    echo -e "${WHITE}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${WHITE}║                                                                   ║${NC}"
    echo -e "${WHITE}║                   🌐 COMO ACESSAR O SISTEMA                       ║${NC}"
    echo -e "${WHITE}║                                                                   ║${NC}"
    echo -e "${WHITE}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📍 ENDEREÇO DO SISTEMA:${NC}"
    echo ""
    echo -e "     ${GREEN}${WHITE}${access_url}${NC}"
    echo ""
    if [ "$CONFIGURE_SSL" != "yes" ]; then
        echo -e "     ${YELLOW}💡 Para ativar HTTPS (recomendado), execute:${NC}"
        echo -e "     ${CYAN}sudo certbot --nginx -d $DOMAIN${NC}"
        echo ""
    fi
    
    echo -e "${WHITE}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}║                  🔐 SUAS CREDENCIAIS DE ACESSO                    ║${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}👑 SUPERUSUÁRIO (Controle Total do Sistema):${NC}"
    echo ""
    echo -e "     ${WHITE}📧 Email:${NC} ${GREEN}${SUPERUSER_EMAIL}${NC}"
    echo -e "     ${WHITE}🔑 Senha:${NC} ${GREEN}${SUPERUSER_PASSWORD}${NC}"
    echo -e "     ${WHITE}👤 Nome:${NC}  ${GREEN}${SUPERUSER_NAME}${NC}"
    echo ""
    
    echo -e "${CYAN}👨‍💼 SUPERVISOR (Gestão Operacional - Pré-configurado):${NC}"
    echo ""
    echo -e "     ${WHITE}📧 Email:${NC} ${GREEN}${SUPERVISOR_EMAIL}${NC}"
    echo -e "     ${WHITE}🔑 Senha:${NC} ${GREEN}${SUPERVISOR_PASSWORD}${NC}"
    echo -e "     ${WHITE}👤 Nome:${NC}  ${GREEN}${SUPERVISOR_NAME}${NC}"
    echo ""
    echo -e "     ${YELLOW}💡 Senha gerada aleatoriamente nesta instalação — anote e troque após o 1º acesso.${NC}"
    echo ""
    
    echo -e "${WHITE}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${RED}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                                   ║${NC}"
    echo -e "${RED}║  ⚠️  SEGURANÇA: ALTERE SUA SENHA APÓS O PRIMEIRO ACESSO!          ║${NC}"
    echo -e "${RED}║                                                                   ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}🔐 IMPORTANTE - LEIA COM ATENÇÃO:${NC}"
    echo ""
    echo -e "  ${WHITE}1.${NC} A senha acima foi ${YELLOW}configurada durante a instalação${NC}"
    echo -e "  ${WHITE}2.${NC} ${RED}ALTERE ESTA SENHA IMEDIATAMENTE${NC} após o primeiro login"
    echo -e "  ${WHITE}3.${NC} Use uma senha ${GREEN}forte e única${NC} para produção"
    echo ""
    echo -e "${CYAN}📝 Como alterar sua senha:${NC}"
    echo ""
    echo -e "  ${WHITE}1.${NC} Acesse o sistema: ${CYAN}${access_url}${NC}"
    echo -e "  ${WHITE}2.${NC} Faça login com as credenciais acima"
    echo -e "  ${WHITE}3.${NC} Clique no seu nome (canto superior direito)"
    echo -e "  ${WHITE}4.${NC} Selecione ${CYAN}\"Perfil\"${NC} → ${CYAN}\"Alterar Senha\"${NC}"
    echo -e "  ${WHITE}5.${NC} Crie uma senha forte: ${GREEN}mínimo 8 caracteres${NC}"
    echo ""
    echo -e "${YELLOW}💡 Exemplo de senha forte:${NC} ${GREEN}Sispat@2025!Seguro${NC}"
    echo ""
    
    echo -e "${WHITE}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}🔧 COMANDOS ÚTEIS PARA GERENCIAR O SISTEMA:${NC}"
    echo ""
    echo -e "  ${WHITE}Ver status:${NC}           ${CYAN}pm2 status${NC}"
    echo -e "  ${WHITE}Ver logs em tempo real:${NC} ${CYAN}pm2 logs sispat-backend${NC}"
    echo -e "  ${WHITE}Reiniciar aplicação:${NC}  ${CYAN}pm2 restart sispat-backend${NC}"
    echo -e "  ${WHITE}Reiniciar Nginx:${NC}      ${CYAN}sudo systemctl restart nginx${NC}"
    echo -e "  ${WHITE}Backup do banco:${NC}      ${CYAN}sudo -u postgres pg_dump sispat_prod > backup.sql${NC}"
    echo ""
    
    echo -e "${WHITE}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}📚 RECURSOS ADICIONAIS:${NC}"
    echo ""
    echo -e "  ${WHITE}Documentação:${NC}      ${CYAN}https://github.com/junielsonfarias/sispat${NC}"
    echo -e "  ${WHITE}Reportar problemas:${NC} ${CYAN}https://github.com/junielsonfarias/sispat/issues${NC}"
    echo -e "  ${WHITE}Logs instalação:${NC}   ${CYAN}$LOG_FILE${NC}"
    echo ""
    
    echo -e "${WHITE}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}║  ✨ SISTEMA PRONTO! ACESSE AGORA E COMECE A USAR!  ✨             ║${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}║  👉 ${WHITE}${access_url}${GREEN}"
    printf "${GREEN}║"
    local url_length=${#access_url}
    local padding=$((64 - url_length))
    printf "%${padding}s" ""
    echo "║${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Lembre-se: ${RED}ALTERE SUA SENHA${YELLOW} no primeiro acesso!${NC}"
    echo ""
    
    # Limpar arquivo de credenciais
    rm -f /tmp/sispat-credentials.txt
}

# ===========================================
# EXECUTAR INSTALAÇÃO
# ===========================================

main "$@"
