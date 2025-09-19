#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO - AUTENTICAÇÃO POSTGRESQL SISPAT
# Para corrigir problemas de autenticação do PostgreSQL
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

# Configurar diretório de trabalho para evitar problemas de permissão
cd /tmp

log_header "Corrigindo autenticação do PostgreSQL..."

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
    exit 1
fi

# Verificar configuração de autenticação
log_info "Verificando configuração de autenticação..."
if [ -f "/etc/postgresql/$PG_VERSION/main/pg_hba.conf" ]; then
    log_info "Arquivo pg_hba.conf encontrado"
    
    # Verificar se a configuração está correta
    if grep -q "host.*all.*all.*127.0.0.1/32.*md5" /etc/postgresql/$PG_VERSION/main/pg_hba.conf; then
        log_success "Configuração de autenticação está correta"
    else
        log_warning "Configuração de autenticação pode estar incorreta"
        log_info "Configurando autenticação correta..."
        
        # Backup do arquivo original
        cp /etc/postgresql/$PG_VERSION/main/pg_hba.conf /etc/postgresql/$PG_VERSION/main/pg_hba.conf.backup
        
        # Configurar autenticação correta
        cat > /etc/postgresql/$PG_VERSION/main/pg_hba.conf << EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             all                                     peer
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
# IPv6 local connections:
host    all             all             ::1/128                 md5
# Allow replication connections from localhost, by a user with the
# replication privilege.
local   replication     all                                     peer
host    replication     all             127.0.0.1/32            md5
host    replication     all             ::1/128                 md5
EOF
        
        log_success "Configuração de autenticação atualizada"
        
        # Reiniciar PostgreSQL
        log_info "Reiniciando PostgreSQL..."
        systemctl restart postgresql
        sleep 5
    fi
else
    log_error "Arquivo pg_hba.conf não encontrado!"
    exit 1
fi

# Configurar variáveis do banco
DB_NAME="sispat_db"
DB_USER="sispat_user"
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

log_info "Configurando banco de dados..."

# Verificar se o usuário postgres pode conectar
log_info "Testando conexão com usuário postgres..."
if sudo -u postgres -H psql -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "Conexão com usuário postgres funcionando!"
else
    log_error "Não foi possível conectar ao PostgreSQL como usuário postgres!"
    exit 1
fi

# Remover usuário existente se houver problemas
log_info "Removendo usuário existente (se houver)..."
sudo -u postgres -H psql -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true

# Remover banco existente se houver problemas
log_info "Removendo banco existente (se houver)..."
sudo -u postgres -H psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true

# Aguardar um pouco para garantir que a remoção foi processada
sleep 2

# Criar usuário novamente
log_info "Criando usuário $DB_USER..."
sudo -u postgres -H psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || {
    log_warning "Usuário já existe, tentando alterar senha..."
    sudo -u postgres -H psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || {
        log_error "Erro ao configurar usuário!"
        exit 1
    }
}

# Criar banco de dados novamente
log_info "Criando banco de dados $DB_NAME..."
sudo -u postgres -H psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || {
    log_warning "Banco já existe, tentando alterar proprietário..."
    sudo -u postgres -H psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;" || {
        log_error "Erro ao configurar banco de dados!"
        exit 1
    }
}

# Conceder privilégios
log_info "Configurando privilégios..."
sudo -u postgres -H psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || true
sudo -u postgres -H psql -c "ALTER USER $DB_USER CREATEDB;" || true

# Configurar senha do postgres
log_info "Configurando senha do usuário postgres..."
sudo -u postgres -H psql -c "ALTER USER postgres PASSWORD '$ADMIN_PASSWORD';" || true

# Testar conexão final
log_info "Testando conexão final..."
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
    log_success "PostgreSQL configurado com sucesso!"
else
    log_error "Erro na conexão final!"
    
    # Diagnóstico adicional
    log_info "Fazendo diagnóstico adicional..."
    
    # Verificar se o usuário existe
    log_info "Verificando se o usuário existe..."
    sudo -u postgres -H psql -c "SELECT usename FROM pg_user WHERE usename = '$DB_USER';"
    
    # Verificar se o banco existe
    log_info "Verificando se o banco existe..."
    sudo -u postgres -H psql -c "SELECT datname FROM pg_database WHERE datname = '$DB_NAME';"
    
    # Tentar conectar com senha diferente
    log_info "Tentando conectar com senha do postgres..."
    if PGPASSWORD=$ADMIN_PASSWORD psql -h localhost -U postgres -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
        log_success "Conexão com postgres funcionando!"
        log_info "O problema pode ser com a senha do usuário $DB_USER"
    else
        log_error "Conexão com postgres também falhou!"
    fi
    
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
