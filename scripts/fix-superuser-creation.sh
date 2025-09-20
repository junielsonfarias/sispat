#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO - CRIAÇÃO DO SUPERUSUÁRIO
# Corrige problemas com ES modules vs CommonJS
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

log_header "CORREÇÃO DE CRIAÇÃO DO SUPERUSUÁRIO"

# Navegar para o diretório do SISPAT
cd /var/www/sispat

# Verificar se o diretório existe
if [ ! -d "/var/www/sispat" ]; then
    log_error "Diretório /var/www/sispat não encontrado!"
    exit 1
fi

log_info "Criando superusuário usando método direto..."

# Método 1: Tentar com script .cjs se existir
if [ -f "scripts/create-superuser.cjs" ]; then
    log_info "Tentando com script .cjs..."
    node scripts/create-superuser.cjs
    if [ $? -eq 0 ]; then
        log_success "Superusuário criado com sucesso usando .cjs!"
        exit 0
    fi
fi

# Método 2: Tentar com script .js se existir
if [ -f "scripts/create-superuser.js" ]; then
    log_info "Tentando com script .js..."
    node scripts/create-superuser.js
    if [ $? -eq 0 ]; then
        log_success "Superusuário criado com sucesso usando .js!"
        exit 0
    fi
fi

# Método 3: Usar SQL direto
log_info "Usando método SQL direto..."

# Verificar se o PostgreSQL está rodando
if ! systemctl is-active --quiet postgresql; then
    log_error "PostgreSQL não está rodando!"
    systemctl start postgresql
    sleep 5
fi

# Criar superusuário usando SQL direto
log_info "Criando superusuário via SQL..."

PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "
INSERT INTO users (name, email, password, role, municipality_id, is_active)
VALUES ('Junielson Farias', 'junielsonfarias@gmail.com', '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2O', 'superuser', 1, true)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP;
"

if [ $? -eq 0 ]; then
    log_success "Superusuário criado/atualizado com sucesso via SQL!"
    
    # Criar arquivo de credenciais
    log_info "Criando arquivo de credenciais..."
    cat > /root/sispat-superuser-credentials.json << 'EOF'
{
  "name": "Junielson Farias",
  "email": "junielsonfarias@gmail.com",
  "password": "Tiko6273@",
  "role": "superuser",
  "created_at": "2025-01-27T00:00:00.000Z",
  "note": "Credenciais do superusuário criadas automaticamente durante a instalação"
}
EOF
    
    chmod 600 /root/sispat-superuser-credentials.json
    log_success "Credenciais salvas em: /root/sispat-superuser-credentials.json"
    
    # Verificar se foi criado
    log_info "Verificando superusuário criado..."
    PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "
    SELECT id, name, email, role, is_active FROM users WHERE email = 'junielsonfarias@gmail.com';
    "
    
    log_success "Superusuário configurado com sucesso!"
    log_info "Email: junielsonfarias@gmail.com"
    log_info "Nome: Junielson Farias"
    log_info "Senha: Tiko6273@"
    log_info "Role: superuser"
    
else
    log_error "Falha ao criar superusuário via SQL!"
    exit 1
fi

log_header "CORREÇÃO CONCLUÍDA"

echo -e "\n${GREEN}📋 INFORMAÇÕES DO SUPERUSUÁRIO:${NC}"
echo -e "• Email: ${YELLOW}junielsonfarias@gmail.com${NC}"
echo -e "• Nome: ${YELLOW}Junielson Farias${NC}"
echo -e "• Senha: ${YELLOW}Tiko6273@${NC}"
echo -e "• Role: ${YELLOW}superuser${NC}"
echo -e "• Credenciais: ${YELLOW}/root/sispat-superuser-credentials.json${NC}"

echo -e "\n${BLUE}🔧 Próximos passos:${NC}"
echo -e "• O superusuário está criado e pronto para uso"
echo -e "• Continue com a instalação normalmente"
echo -e "• Use as credenciais acima para fazer login"
