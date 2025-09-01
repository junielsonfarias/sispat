#!/bin/bash

# =================================
# CORREÇÃO RÁPIDA POSTGRESQL - UBUNTU 20.04
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

log "🔧 CORREÇÃO RÁPIDA - PostgreSQL Ubuntu 20.04..."

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

# 3. Instalar PostgreSQL do repositório padrão Ubuntu
log "📦 Instalando PostgreSQL do repositório padrão..."
apt install -y postgresql postgresql-contrib
success "PostgreSQL instalado do repositório padrão"

# 4. Verificar instalação
log "🔍 Verificando instalação..."
if command -v psql &> /dev/null; then
    success "PostgreSQL instalado: $(psql --version)"
else
    error "Falha na instalação do PostgreSQL"
fi

# 5. Configurar PostgreSQL
log "⚙️ Configurando PostgreSQL..."
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

# 8. Informações de conexão
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

# 9. Testar com psql
log "🧪 Testando conexão com psql..."
if PGPASSWORD=sispat123456 psql -h localhost -U sispat_user -d sispat_production -c "SELECT 'Conexão OK' as status;" 2>/dev/null; then
    success "✅ Conexão com psql funcionando perfeitamente!"
else
    warning "⚠️ Conexão com psql falhou. Verifique as configurações."
fi

# 10. Instruções para continuar
log "📝 Próximos passos:"
echo ""
echo "🔧 AGORA VOCÊ PODE CONTINUAR COM A INSTALAÇÃO:"
echo "================================================"
echo ""
echo "1. Volte ao diretório da aplicação:"
echo "   cd /var/www/sispat"
echo ""
echo "2. Execute o setup de produção:"
echo "   ./scripts/setup-production.sh"
echo ""
echo "3. Execute o deploy:"
echo "   ./scripts/deploy-production-simple.sh"
echo ""
echo "4. Ou execute o script completo novamente:"
echo "   ./install-vps-complete.sh"
echo ""

success "🎉 Correção rápida do PostgreSQL concluída!"
success "✅ Agora você pode continuar com a instalação do SISPAT!"
