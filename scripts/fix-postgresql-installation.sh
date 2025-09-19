#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO - INSTALAÇÃO POSTGRESQL SISPAT
# Para corrigir problemas de instalação do PostgreSQL
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

log_header "Corrigindo instalação do PostgreSQL..."

# Detectar versão do PostgreSQL
PG_VERSION=$(ls /etc/postgresql/ | head -1)
if [ -z "$PG_VERSION" ]; then
    log_error "PostgreSQL não está instalado!"
    exit 1
fi

log_info "Versão do PostgreSQL detectada: $PG_VERSION"

# Verificar se PostgreSQL está rodando
if ! systemctl is-active --quiet postgresql; then
    log_info "Iniciando PostgreSQL..."
    systemctl start postgresql
    sleep 5
fi

# Verificar se está funcionando
if systemctl is-active --quiet postgresql; then
    log_success "PostgreSQL está rodando!"
else
    log_error "PostgreSQL não está rodando!"
    log_info "Tentando iniciar manualmente..."
    systemctl start postgresql
    sleep 5
    
    if systemctl is-active --quiet postgresql; then
        log_success "PostgreSQL iniciado com sucesso!"
    else
        log_error "Não foi possível iniciar PostgreSQL!"
        log_info "Verificando logs..."
        journalctl -u postgresql --no-pager -l
        exit 1
    fi
fi

# Verificar se o usuário postgres pode conectar
log_info "Testando conexão com PostgreSQL..."
if sudo -u postgres -H psql -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "Conexão com PostgreSQL funcionando!"
else
    log_error "Não foi possível conectar ao PostgreSQL!"
    exit 1
fi

# Configurar variáveis do banco
DB_NAME="sispat_db"
DB_USER="sispat_user"
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

log_info "Configurando banco de dados..."

# Criar usuário
log_info "Criando usuário $DB_USER..."
sudo -u postgres -H psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || log_info "Usuário $DB_USER já existe"

# Criar banco de dados
log_info "Criando banco de dados $DB_NAME..."
sudo -u postgres -H psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || log_info "Banco $DB_NAME já existe"

# Conceder privilégios
log_info "Configurando privilégios..."
sudo -u postgres -H psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
sudo -u postgres -H psql -c "ALTER USER $DB_USER CREATEDB;" 2>/dev/null || true

# Configurar senha do postgres
log_info "Configurando senha do usuário postgres..."
sudo -u postgres -H psql -c "ALTER USER postgres PASSWORD '$ADMIN_PASSWORD';" 2>/dev/null || true

# Testar conexão final
log_info "Testando conexão final..."
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
    log_success "PostgreSQL configurado com sucesso!"
else
    log_error "Erro na conexão final!"
    exit 1
fi

# Salvar credenciais
log_info "Salvando credenciais..."
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

log_success "Credenciais salvas em: /root/sispat-db-credentials.txt"

# Mostrar informações
log_header "Configuração Concluída!"
echo -e "\n${GREEN}🎉 PostgreSQL configurado com sucesso!${NC}"
echo -e "\n${BLUE}📋 INFORMAÇÕES DO BANCO:${NC}"
echo -e "📊 Nome: ${YELLOW}$DB_NAME${NC}"
echo -e "👤 Usuário: ${YELLOW}$DB_USER${NC}"
echo -e "🔑 Senha: ${YELLOW}$DB_PASSWORD${NC}"
echo -e "📁 Credenciais salvas em: ${YELLOW}/root/sispat-db-credentials.txt${NC}"

echo -e "\n${BLUE}🛠️  COMANDOS ÚTEIS:${NC}"
echo -e "📊 Status: ${YELLOW}systemctl status postgresql${NC}"
echo -e "🔄 Reiniciar: ${YELLOW}systemctl restart postgresql${NC}"
echo -e "🔍 Conectar: ${YELLOW}PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME${NC}"

echo -e "\n${GREEN}✅ Agora você pode continuar com a instalação do SISPAT!${NC}"
