#!/bin/bash

# =============================================================================
# SCRIPT PARA CRIAR SUPERUSUÁRIO AUTOMATICAMENTE
# Executa durante a instalação para garantir que o admin existe
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

# Função para verificar se está rodando como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script deve ser executado como root!"
        log_info "Execute: sudo su -"
        exit 1
    fi
}

# Função para verificar se o Node.js está instalado
check_nodejs() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js não está instalado!"
        log_info "Instale o Node.js primeiro"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    log_success "Node.js $NODE_VERSION encontrado"
}

# Função para verificar se o PostgreSQL está rodando
check_postgresql() {
    if ! systemctl is-active --quiet postgresql; then
        log_warning "PostgreSQL não está rodando, tentando iniciar..."
        systemctl start postgresql
        sleep 5
        
        if ! systemctl is-active --quiet postgresql; then
            log_error "Não foi possível iniciar o PostgreSQL!"
            exit 1
        fi
    fi
    
    log_success "PostgreSQL está rodando"
}

# Função para verificar conexão com banco
check_database_connection() {
    log_info "Verificando conexão com banco de dados..."
    
    # Tentar conectar várias vezes
    for i in {1..5}; do
        if PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "SELECT 1;" > /dev/null 2>&1; then
            log_success "Conexão com banco de dados OK!"
            return 0
        else
            if [ $i -eq 5 ]; then
                log_error "Não foi possível conectar ao banco após 5 tentativas!"
                log_info "Verificando se o banco existe..."
                
                # Tentar criar banco se não existir
                if ! PGPASSWORD=postgres psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw sispat_db; then
                    log_info "Banco sispat_db não existe, criando..."
                    PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE sispat_db OWNER postgres;" 2>/dev/null || true
                    
                    # Tentar conectar novamente
                    if PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "SELECT 1;" > /dev/null 2>&1; then
                        log_success "Banco criado e conexão OK!"
                        return 0
                    fi
                fi
                
                exit 1
            else
                log_warning "Tentativa $i falhou, tentando novamente em 3 segundos..."
                sleep 3
            fi
        fi
    done
}

# Função para executar script de criação do superusuário
create_superuser() {
    log_header "Criando superusuário..."
    
    cd /var/www/sispat
    
    # Verificar se o script existe
    if [ ! -f "scripts/create-superuser.js" ]; then
        log_error "Script create-superuser.js não encontrado!"
        exit 1
    fi
    
    # Executar script
    log_info "Executando script de criação do superusuário..."
    node scripts/create-superuser.js
    
    if [ $? -eq 0 ]; then
        log_success "Superusuário criado com sucesso!"
    else
        log_error "Falha ao criar superusuário!"
        exit 1
    fi
}

# Função para verificar se o superusuário foi criado
verify_superuser() {
    log_info "Verificando se o superusuário foi criado..."
    
    # Verificar no banco
    SUPERUSER_COUNT=$(PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -t -c "SELECT COUNT(*) FROM users WHERE email = 'junielsonfarias@gmail.com' AND role = 'superuser';" 2>/dev/null | tr -d ' ')
    
    if [ "$SUPERUSER_COUNT" = "1" ]; then
        log_success "Superusuário verificado no banco de dados!"
        
        # Mostrar informações do superusuário
        log_info "Informações do superusuário:"
        PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "SELECT id, name, email, role, is_active, created_at FROM users WHERE email = 'junielsonfarias@gmail.com';"
        
    else
        log_error "Superusuário não foi criado corretamente!"
        exit 1
    fi
}

# Função para mostrar credenciais
show_credentials() {
    log_header "Credenciais do Superusuário"
    
    echo -e "\n${GREEN}🔑 CREDENCIAIS DE ACESSO:${NC}"
    echo -e "📧 Email: ${YELLOW}junielsonfarias@gmail.com${NC}"
    echo -e "👤 Nome: ${YELLOW}Junielson Farias${NC}"
    echo -e "🔒 Senha: ${YELLOW}Tiko6273@${NC}"
    echo -e "👑 Role: ${YELLOW}superuser${NC}"
    
    echo -e "\n${BLUE}📁 ARQUIVO DE CREDENCIAIS:${NC}"
    if [ -f "/root/sispat-superuser-credentials.json" ]; then
        echo -e "📄 Localização: ${YELLOW}/root/sispat-superuser-credentials.json${NC}"
        echo -e "🔐 Permissões: ${YELLOW}600 (apenas root pode ler)${NC}"
    else
        echo -e "❌ Arquivo de credenciais não encontrado"
    fi
    
    echo -e "\n${GREEN}✅ PRÓXIMOS PASSOS:${NC}"
    echo -e "1. 🌐 Acesse a aplicação no navegador"
    echo -e "2. 🔑 Use as credenciais acima para fazer login"
    echo -e "3. ⚙️  Configure seu município e sistema"
    echo -e "4. 👥 Adicione outros usuários conforme necessário"
    
    echo -e "\n${YELLOW}⚠️  IMPORTANTE:${NC}"
    echo -e "• Mantenha as credenciais seguras"
    echo -e "• Altere a senha após o primeiro login"
    echo -e "• Não compartilhe as credenciais"
}

# Função principal
main() {
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║           👑 CRIAÇÃO DE SUPERUSUÁRIO - SISPAT                ║"
    echo "║                                                              ║"
    echo "║              Configuração automática do administrador        ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Verificações iniciais
    check_root
    check_nodejs
    check_postgresql
    check_database_connection
    
    # Criar superusuário
    create_superuser
    verify_superuser
    
    # Mostrar credenciais
    show_credentials
    
    echo -e "\n${GREEN}🎉 Superusuário configurado com sucesso!${NC}"
}

# Executar função principal
main "$@"
