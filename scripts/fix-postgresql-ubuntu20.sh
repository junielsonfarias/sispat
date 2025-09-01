#!/bin/bash

# =================================
# SCRIPT PARA CORRIGIR POSTGRESQL NO UBUNTU 20.04
# SISPAT - Sistema de Patrimônio
# =================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Função para erro
error() {
    echo -e "${RED}[ERRO]${NC} $1"
    exit 1
}

# Função para sucesso
success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

# Função para aviso
warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

log "🔧 Corrigindo PostgreSQL no Ubuntu 20.04..."

# Verificar se estamos rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Este script deve ser executado como root (sudo)"
fi

# Verificar versão do Ubuntu
UBUNTU_VERSION=$(lsb_release -cs)
log "📋 Versão do Ubuntu detectada: $UBUNTU_VERSION"

if [[ "$UBUNTU_VERSION" != "focal" ]]; then
    warning "⚠️ Este script é específico para Ubuntu 20.04 (focal)"
    warning "⚠️ Sua versão: $UBUNTU_VERSION"
    read -p "Continuar mesmo assim? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 1. Remover repositórios PostgreSQL problemáticos
log "🧹 Removendo repositórios PostgreSQL problemáticos..."
rm -f /etc/apt/sources.list.d/pgdg.list
apt-key del ACCC4CF8 2>/dev/null || true
success "Repositórios antigos removidos"

# 2. Limpar cache do apt
log "🧹 Limpando cache do apt..."
apt clean
apt update
success "Cache limpo"

# 3. Instalar PostgreSQL do repositório padrão do Ubuntu
log "📦 Instalando PostgreSQL do repositório padrão..."
apt install -y postgresql postgresql-contrib
success "PostgreSQL instalado do repositório padrão"

# 4. Verificar versão instalada
POSTGRES_VERSION=$(psql --version | awk '{print $3}' | cut -d'.' -f1)
log "📋 Versão do PostgreSQL instalada: $POSTGRES_VERSION"

# 5. Configurar PostgreSQL
log "⚙️ Configurando PostgreSQL..."

# Habilitar e iniciar PostgreSQL
systemctl enable postgresql
systemctl start postgresql

# Verificar status
if systemctl is-active --quiet postgresql; then
    success "PostgreSQL está rodando"
else
    error "PostgreSQL não está rodando"
fi

# 6. Criar usuário e banco para SISPAT
log "🗄️ Criando usuário e banco para SISPAT..."

# Verificar se o usuário já existe
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='sispat_user'" | grep -q 1; then
    log "⚠️ Usuário sispat_user já existe"
else
    sudo -u postgres psql -c "CREATE USER sispat_user WITH PASSWORD 'sispat123456';"
    success "Usuário sispat_user criado"
fi

# Verificar se o banco já existe
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw sispat_production; then
    log "⚠️ Banco sispat_production já existe"
else
    sudo -u postgres psql -c "CREATE DATABASE sispat_production OWNER sispat_user;"
    success "Banco sispat_production criado"
fi

# Garantir privilégios
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;"
sudo -u postgres psql -c "ALTER USER sispat_user CREATEDB;"
success "Privilégios configurados"

# 7. Testar conexão
log "🧪 Testando conexão com o banco..."
if sudo -u postgres psql -d sispat_production -c "SELECT version();" > /dev/null 2>&1; then
    success "Conexão com o banco testada com sucesso"
else
    error "Falha na conexão com o banco"
fi

# 8. Configurar acesso remoto (opcional)
log "🌐 Configurando acesso remoto (opcional)..."

# Fazer backup da configuração
cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup

# Adicionar linha para permitir conexões locais com senha
echo "local   all             sispat_user                                md5" >> /etc/postgresql/*/main/pg_hba.conf

# Recarregar PostgreSQL
systemctl reload postgresql
success "Configuração de acesso atualizada"

# 9. Verificar status final
log "🔍 Verificando status final..."
echo ""
echo "📊 STATUS DO POSTGRESQL:"
echo "========================"
systemctl status postgresql --no-pager -l
echo ""

# 10. Informações de conexão
log "🎯 Informações de conexão:"
echo ""
echo "🔗 DADOS DE CONEXÃO:"
echo "===================="
echo "Host: localhost"
echo "Porta: 5432"
echo "Banco: sispat_production"
echo "Usuário: sispat_user"
echo "Senha: sispat123456"
echo ""
echo "📝 STRING DE CONEXÃO:"
echo "postgresql://sispat_user:sispat123456@localhost:5432/sispat_production"
echo ""

# 11. Testar com psql
log "🧪 Testando conexão com psql..."
if PGPASSWORD=sispat123456 psql -h localhost -U sispat_user -d sispat_production -c "SELECT 'Conexão OK' as status;" 2>/dev/null; then
    success "✅ Conexão com psql funcionando perfeitamente!"
else
    warning "⚠️ Conexão com psql falhou. Verifique as configurações."
fi

# 12. Instruções para o .env.production
log "📝 Configuração para o .env.production:"
echo ""
echo "🔧 ADICIONE AO SEU .env.production:"
echo "===================================="
echo "DB_HOST=localhost"
echo "DB_PORT=5432"
echo "DB_NAME=sispat_production"
echo "DB_USER=sispat_user"
echo "DB_PASSWORD=sispat123456"
echo "DATABASE_URL=postgresql://sispat_user:sispat123456@localhost:5432/sispat_production"
echo ""

success "🎉 Correção do PostgreSQL concluída com sucesso!"
success "✅ Agora você pode continuar com a instalação do SISPAT!"
