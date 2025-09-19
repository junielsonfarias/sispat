#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO RÁPIDA - BANCO DE DADOS SISPAT
# Para corrigir o erro "relation imoveis does not exist"
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

log_header "Corrigindo banco de dados SISPAT..."

# Navegar para um diretório seguro
cd /root

# Definir credenciais do banco
DB_NAME="sispat_db"
DB_USER="postgres"
DB_PASSWORD="postgres"

# Baixar e executar script de inicialização do banco
log_info "Baixando script de inicialização do banco..."
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/init-database.sh -o init-db.sh
chmod +x init-db.sh

log_info "Executando inicialização do banco..."
./init-db.sh

# Navegar para o diretório do SISPAT se existir
if [ -d "/var/www/sispat" ]; then
    cd /var/www/sispat
    
    # Executar scripts adicionais se existirem
    if [ -f "server/database/create-sample-data.js" ]; then
        log_info "Executando script de dados de exemplo..."
        node server/database/create-sample-data.js || log_warning "Falha nos dados de exemplo - continuando..."
    fi
    
    # Configurar PM2
    log_info "Configurando PM2..."
    pm2 kill 2>/dev/null || true
    
    # Criar arquivo de configuração do PM2 se não existir
    if [ ! -f "ecosystem.production.config.cjs" ]; then
        cat > ecosystem.production.config.cjs << EOF
module.exports = {
  apps: [{
    name: 'sispat-backend',
    script: 'server/index.js',
    cwd: '/var/www/sispat',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: '/var/www/sispat/logs/pm2.log',
    out_file: '/var/www/sispat/logs/pm2-out.log',
    error_file: '/var/www/sispat/logs/pm2-error.log',
    merge_logs: true,
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF
    fi
    
    # Iniciar aplicação com PM2
    log_info "Iniciando aplicação com PM2..."
    pm2 start ecosystem.production.config.cjs --env production
    pm2 save
    
    # Testar configuração do Nginx
    log_info "Testando configuração do Nginx..."
    nginx -t && systemctl reload nginx
    
else
    log_warning "Diretório /var/www/sispat não encontrado!"
fi

log_header "Correção Concluída!"
echo -e "\n${GREEN}🎉 Banco de dados SISPAT corrigido com sucesso!${NC}"
echo -e "\n${BLUE}📋 PRÓXIMOS PASSOS:${NC}"
echo -e "1. ${YELLOW}Verificar se PM2 está rodando: pm2 status${NC}"
echo -e "2. ${YELLOW}Verificar logs: pm2 logs${NC}"
echo -e "3. ${YELLOW}Acessar o sistema: https://sispat.vps-kinghost.net${NC}"

echo -e "\n${BLUE}🔑 LOGIN PADRÃO:${NC}"
echo -e "📧 Email: ${YELLOW}admin@sispat.com${NC}"
echo -e "🔒 Senha: ${YELLOW}admin123${NC}"
