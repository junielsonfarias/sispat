#!/bin/bash

# =================================
# CORREÇÃO AUTENTICAÇÃO POSTGRESQL - SISPAT
# Corrige problemas de autenticação PostgreSQL
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

# Banner
echo ""
echo "🔧 ================================================"
echo "🔧    CORREÇÃO AUTENTICAÇÃO POSTGRESQL - SISPAT"
echo "🔧    Corrige problemas de autenticação PostgreSQL"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

# Obter senha do usuário
read -p "🔐 Digite a senha para o usuário PostgreSQL (ou pressione Enter para usar 'sispat123456'): " DB_PASSWORD
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD="sispat123456"
fi

log "🔧 Iniciando correção de autenticação PostgreSQL..."

# 1. Parar PostgreSQL
log "🛑 Parando PostgreSQL..."
systemctl stop postgresql || warning "PostgreSQL não estava rodando"

# 2. Iniciar PostgreSQL
log "🚀 Iniciando PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql
success "PostgreSQL iniciado"

# 3. Verificar se PostgreSQL está rodando
log "🔍 Verificando status do PostgreSQL..."
if systemctl is-active --quiet postgresql; then
    success "✅ PostgreSQL está rodando"
else
    error "❌ PostgreSQL não está rodando"
fi

# 4. Remover usuário existente se necessário
log "🗑️ Removendo usuário sispat_user existente (se houver)..."
sudo -u postgres psql -c "DROP USER IF EXISTS sispat_user;" 2>/dev/null || warning "Erro ao remover usuário (pode não existir)"
success "Usuário antigo removido"

# 5. Remover banco existente se necessário
log "🗑️ Removendo banco sispat_production existente (se houver)..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS sispat_production;" 2>/dev/null || warning "Erro ao remover banco (pode não existir)"
success "Banco antigo removido"

# 6. Criar usuário PostgreSQL
log "👤 Criando usuário PostgreSQL..."
sudo -u postgres psql -c "CREATE USER sispat_user WITH PASSWORD '$DB_PASSWORD';" || error "Falha ao criar usuário"
success "Usuário sispat_user criado"

# 7. Criar banco de dados
log "🗄️ Criando banco de dados..."
sudo -u postgres psql -c "CREATE DATABASE sispat_production OWNER sispat_user;" || error "Falha ao criar banco"
success "Banco sispat_production criado"

# 8. Conceder privilégios
log "🔑 Concedendo privilégios..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;" || error "Falha ao conceder privilégios"
sudo -u postgres psql -c "ALTER USER sispat_user CREATEDB;" || error "Falha ao conceder privilégio CREATEDB"
success "Privilégios concedidos"

# 9. Habilitar extensões PostgreSQL
log "🔧 Habilitando extensões PostgreSQL..."
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" || error "Falha ao habilitar pgcrypto"
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" || error "Falha ao habilitar uuid-ossp"
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS unaccent;" || error "Falha ao habilitar unaccent"
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" || error "Falha ao habilitar pg_trgm"
success "Extensões PostgreSQL habilitadas"

# 10. Testar conexão
log "🧪 Testando conexão com o banco..."
if sudo -u postgres psql -d sispat_production -c "SELECT version();" > /dev/null 2>&1; then
    success "✅ Conexão com PostgreSQL funcionando"
else
    error "❌ Falha na conexão com PostgreSQL"
fi

# 11. Atualizar arquivo .env
log "📝 Atualizando arquivo .env..."
if [ -f ".env.production" ]; then
    # Atualizar senha no arquivo .env
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env.production
    sed -i "s/DATABASE_URL=.*/DATABASE_URL=postgresql:\/\/sispat_user:$DB_PASSWORD@localhost:5432\/sispat_production/" .env.production
    success "Arquivo .env.production atualizado"
else
    warning "Arquivo .env.production não encontrado"
fi

# 12. Executar migrações
log "🗄️ Executando migrações do banco de dados..."
if [ -f "server/database/migrate.js" ]; then
    if node server/database/migrate.js; then
        success "✅ Migrações executadas com sucesso"
    else
        error "❌ Falha ao executar migrações"
    fi
else
    error "Arquivo de migração server/database/migrate.js não encontrado"
fi

# 13. Verificar tabelas criadas
log "🔍 Verificando tabelas criadas..."
TABLES=$(sudo -u postgres psql -d sispat_production -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d '[:space:]')
if [ "$TABLES" -gt "0" ]; then
    success "✅ $TABLES tabelas criadas no banco de dados"
else
    warning "⚠️ Nenhuma tabela encontrada no banco de dados"
fi

# 14. Testar conexão da aplicação
log "🧪 Testando conexão da aplicação com o banco..."
if node -e "
const { Pool } = require('pg');
const pool = new Pool({
  user: 'sispat_user',
  host: 'localhost',
  database: 'sispat_production',
  password: '$DB_PASSWORD',
  port: 5432,
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erro:', err);
    process.exit(1);
  } else {
    console.log('Conexão da aplicação funcionando!');
    process.exit(0);
  }
});
" 2>/dev/null; then
    success "✅ Conexão da aplicação com PostgreSQL funcionando"
else
    warning "⚠️ Falha na conexão da aplicação com PostgreSQL"
fi

# Instruções finais
log "📝 CORREÇÃO CONCLUÍDA!"
echo ""
echo "🎉 AUTENTICAÇÃO POSTGRESQL CORRIGIDA!"
echo "====================================="
    echo ""
echo "📋 O que foi feito:"
echo "✅ PostgreSQL parado e reiniciado"
echo "✅ Usuário sispat_user removido e recriado"
echo "✅ Banco sispat_production removido e recriado"
echo "✅ Privilégios concedidos"
echo "✅ Extensões PostgreSQL habilitadas"
echo "✅ Conexão testada"
echo "✅ Arquivo .env atualizado"
echo "✅ Migrações executadas"
echo "✅ Tabelas verificadas"
echo ""
echo "🔐 Credenciais do banco:"
echo "   - Usuário: sispat_user"
echo "   - Senha: $DB_PASSWORD"
echo "   - Banco: sispat_production"
echo "   - Host: localhost"
echo "   - Porta: 5432"
echo ""
echo "📞 Comandos úteis:"
echo "   - Conectar ao banco: sudo -u postgres psql -d sispat_production"
echo "   - Ver status: systemctl status postgresql"
echo "   - Ver logs: journalctl -u postgresql -f"
echo "   - Listar tabelas: sudo -u postgres psql -d sispat_production -c \"\\dt\""
echo ""

success "🎉 Correção de autenticação PostgreSQL concluída!"