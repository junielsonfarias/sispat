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
    echo -e "${BLUE}  ⚙️  Criando superusuário e dados iniciais...${NC}"
    echo ""
    
    # Passar credenciais do superusuário para o seed
    export SUPERUSER_EMAIL="$SUPERUSER_EMAIL"
    export SUPERUSER_PASSWORD="$SUPERUSER_PASSWORD"
    export SUPERUSER_NAME="$MUNICIPALITY_NAME - Administrador"
    
    npm run prisma:seed 2>&1 | tee -a "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        echo ""
        success "✨ Banco de dados configurado e populado"
        
        # Salvar credenciais em arquivo temporário para exibir no final
        cat > /tmp/sispat-credentials.txt << EOF
SUPERUSER_EMAIL=$SUPERUSER_EMAIL
SUPERUSER_PASSWORD=$SUPERUSER_PASSWORD
SUPERUSER_NAME=$SUPERUSER_NAME
DOMAIN=$DOMAIN
EOF
    else
        error "Falha ao popular banco de dados"
    fi
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

restore_uploads() {
    # Restaurar uploads se existir backup
    if [ -d "/tmp/sispat-backup/uploads" ]; then
        echo ""
        log "Restaurando uploads da instalação anterior..."
        
        mkdir -p "$INSTALL_DIR/backend/uploads"
        cp -r /tmp/sispat-backup/uploads/* "$INSTALL_DIR/backend/uploads/" 2>/dev/null || true
        
        # Ajustar permissões
        chown -R www-data:www-data "$INSTALL_DIR/backend/uploads"
        chmod -R 755 "$INSTALL_DIR/backend/uploads"
        
        # Remover backup temporário
        rm -rf /tmp/sispat-backup
        
        success "Uploads restaurados com sucesso!"
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
    
    # Iniciar com PM2 como root primeiro (mais fácil para debug)
    echo -e "${BLUE}  → Iniciando aplicação com PM2...${NC}"
    pm2 start dist/index.js --name sispat-backend 2>&1 | tee -a "$LOG_FILE"
    
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
    
    # Configurar PM2 para iniciar com o sistema
    echo -e "${BLUE}  → Configurando PM2 para iniciar automaticamente...${NC}"
    env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root 2>&1 | grep -v "sudo" | tee -a "$LOG_FILE" || true
    
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
        if curl -f -s http://localhost:$APP_PORT/health > /dev/null 2>&1; then
            api_ok=true
            break
        fi
        sleep 2
        ((attempt++))
    done
    echo ""
    
    if [ "$api_ok" = true ]; then
        success "Aplicação iniciada e respondendo! ✨"
        echo -e "${GREEN}     API Health Check: ${WHITE}http://localhost:$APP_PORT/health${NC}"
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
        error "Estrutura de diretórios incompleta"
        ((errors++))
    fi
    
    # 2. Verificar compilação do frontend
    echo -e "${YELLOW}[2/12]${NC} Verificando compilação do frontend..."
    if [ -f "$INSTALL_DIR/dist/index.html" ] && [ -d "$INSTALL_DIR/dist/assets" ]; then
        local js_files=$(find "$INSTALL_DIR/dist/assets" -name "*.js" 2>/dev/null | wc -l)
        if [ "$js_files" -gt 0 ]; then
            success "Frontend compilado ($js_files arquivos JS)"
        else
            error "Frontend sem arquivos JavaScript"
            ((errors++))
        fi
    else
        error "Frontend não compilado"
        ((errors++))
    fi
    
    # 3. Verificar compilação do backend
    echo -e "${YELLOW}[3/12]${NC} Verificando compilação do backend..."
    if [ -f "$INSTALL_DIR/backend/dist/index.js" ]; then
        local backend_files=$(find "$INSTALL_DIR/backend/dist" -name "*.js" 2>/dev/null | wc -l)
        success "Backend compilado ($backend_files arquivos JS)"
    else
        error "Backend não compilado"
        ((errors++))
    fi
    
    # 4. Verificar dependências do backend
    echo -e "${YELLOW}[4/12]${NC} Verificando dependências do backend..."
    if [ -d "$INSTALL_DIR/backend/node_modules" ]; then
        local types_count=$(ls "$INSTALL_DIR/backend/node_modules/@types" 2>/dev/null | wc -l)
        if [ "$types_count" -gt 5 ]; then
            success "Dependências instaladas (@types: $types_count pacotes)"
        else
            warning "Poucos pacotes @types instalados"
            ((warnings++))
        fi
    else
        error "node_modules não encontrado"
        ((errors++))
    fi
    
    # 5. Verificar Prisma Client
    echo -e "${YELLOW}[5/12]${NC} Verificando Prisma Client..."
    if [ -d "$INSTALL_DIR/backend/node_modules/.prisma/client" ]; then
        success "Prisma Client gerado"
    else
        error "Prisma Client não gerado"
        ((errors++))
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
            ((warnings++))
        fi
    else
        error "Banco de dados não encontrado"
        ((errors++))
    fi
    
    # 7. Verificar usuários no banco
    echo -e "${YELLOW}[7/12]${NC} Verificando usuários cadastrados..."
    local user_count=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
    if [ "$user_count" -ge 4 ]; then
        success "Usuários criados ($user_count usuários)"
    else
        warning "Poucos usuários cadastrados ($user_count)"
        ((warnings++))
    fi
    
    # 8. Verificar PM2
    echo -e "${YELLOW}[8/12]${NC} Verificando PM2..."
    if pm2 list 2>/dev/null | grep -q "sispat-backend.*online"; then
        local uptime=$(pm2 jlist 2>/dev/null | grep -A 20 "sispat-backend" | grep "pm_uptime" | cut -d: -f2 | cut -d, -f1 | tr -d ' ')
        success "PM2 rodando (processo online)"
    else
        error "PM2 não está rodando"
        ((errors++))
    fi
    
    # 9. Verificar Nginx
    echo -e "${YELLOW}[9/12]${NC} Verificando Nginx..."
    if systemctl is-active --quiet nginx; then
        if [ -f "/etc/nginx/sites-enabled/sispat" ]; then
            success "Nginx ativo e configurado"
        else
            warning "Nginx ativo mas configuração não encontrada"
            ((warnings++))
        fi
    else
        error "Nginx não está ativo"
        ((errors++))
    fi
    
    # 10. Verificar API (health check)
    echo -e "${YELLOW}[10/12]${NC} Verificando API (health check)..."
    sleep 2  # Aguardar API iniciar
    local api_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$APP_PORT/health 2>/dev/null)
    if [ "$api_response" = "200" ]; then
        success "API respondendo (HTTP 200)"
    else
        error "API não está respondendo (HTTP $api_response)"
        ((errors++))
    fi
    
    # 11. Verificar acesso ao frontend via Nginx
    echo -e "${YELLOW}[11/12]${NC} Verificando acesso ao frontend..."
    local frontend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null)
    if [ "$frontend_response" = "200" ]; then
        success "Frontend acessível via Nginx (HTTP 200)"
    else
        warning "Frontend pode não estar acessível (HTTP $frontend_response)"
        ((warnings++))
    fi
    
    # 12. Verificar SSL (se configurado)
    echo -e "${YELLOW}[12/12]${NC} Verificando SSL..."
    if [ "$CONFIGURE_SSL" = "yes" ]; then
        if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
            local cert_expiry=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" 2>/dev/null | cut -d= -f2)
            success "SSL configurado (expira: $cert_expiry)"
        else
            warning "SSL não foi configurado"
            ((warnings++))
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
    
    # Carregar credenciais do arquivo temporário
    if [ -f "/tmp/sispat-credentials.txt" ]; then
        source /tmp/sispat-credentials.txt
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
    echo -e "${CYAN}👤 SUPERUSUÁRIO (Controle Total do Sistema):${NC}"
    echo ""
    echo -e "     ${WHITE}📧 Email:${NC} ${GREEN}${SUPERUSER_EMAIL}${NC}"
    echo -e "     ${WHITE}🔑 Senha:${NC} ${GREEN}${SUPERUSER_PASSWORD}${NC}"
    echo -e "     ${WHITE}👤 Nome:${NC}  ${GREEN}${SUPERUSER_NAME}${NC}"
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
