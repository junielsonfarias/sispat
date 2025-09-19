#!/bin/bash

# =============================================================================
# SCRIPT SIMPLES - CORREÇÃO POSTGRESQL SISPAT
# Para resolver problemas específicos de autenticação
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

log_header "Correção Simples do PostgreSQL..."

# Configurar diretório de trabalho
cd /tmp

# Detectar versão do PostgreSQL
PG_VERSION=$(ls /etc/postgresql/ | head -1)
log_info "Versão do PostgreSQL: $PG_VERSION"

# Verificar se PostgreSQL está rodando
if ! systemctl is-active --quiet postgresql; then
    log_info "Iniciando PostgreSQL..."
    systemctl start postgresql
    sleep 5
fi

# Configurar variáveis padrão para produção
DB_NAME="sispat_db"
DB_USER="postgres"
DB_PASSWORD="postgres"
ADMIN_PASSWORD="postgres"

log_info "Configurando banco de dados..."

# Função para executar comandos PostgreSQL
run_psql() {
    sudo -u postgres -H psql -c "$1" 2>/dev/null || true
}

# Remover banco existente se houver
log_info "Removendo banco existente (se houver)..."
run_psql "DROP DATABASE IF EXISTS $DB_NAME;"

# Aguardar
sleep 2

# Configurar senha do usuário postgres
log_info "Configurando senha do usuário postgres..."
run_psql "ALTER USER postgres PASSWORD '$DB_PASSWORD';"

# Criar banco
log_info "Criando banco $DB_NAME..."
run_psql "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Configurar privilégios
log_info "Configurando privilégios..."
run_psql "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Testar conexão
log_info "Testando conexão..."
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
    log_success "PostgreSQL configurado com sucesso!"
else
    log_error "Erro na conexão!"
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

IMPORTANTE: Mantenha este arquivo seguro e não compartilhe!
EOF

chmod 600 /root/sispat-db-credentials.txt

# Mostrar informações
log_header "Configuração Concluída!"
echo -e "\n${GREEN}🎉 PostgreSQL configurado com sucesso!${NC}"
echo -e "\n${BLUE}📋 INFORMAÇÕES DO BANCO:${NC}"
echo -e "📊 Nome: ${YELLOW}$DB_NAME${NC}"
echo -e "👤 Usuário: ${YELLOW}$DB_USER${NC}"
echo -e "🔑 Senha: ${YELLOW}$DB_PASSWORD${NC}"
echo -e "📁 Credenciais salvas em: ${YELLOW}/root/sispat-db-credentials.txt${NC}"

echo -e "\n${GREEN}✅ Agora você pode continuar com a instalação do SISPAT!${NC}"
