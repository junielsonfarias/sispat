#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO ESPECÍFICA - ERRO PM2 USER
# Para corrigir o erro "User sispat cannot be found"
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

log_header "Corrigindo erro de usuário PM2..."

# Navegar para um diretório seguro
cd /root

# Parar PM2 completamente
log_info "Parando PM2..."
pm2 kill 2>/dev/null || true
sleep 2

# Navegar para o diretório do SISPAT
cd /var/www/sispat

# Corrigir arquivo de configuração do PM2
log_info "Corrigindo configuração do PM2..."
cat > ecosystem.production.config.cjs << 'EOF'
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

log_success "Configuração do PM2 corrigida!"

# Iniciar aplicação com PM2
log_info "Iniciando aplicação com PM2..."
pm2 start ecosystem.production.config.cjs --env production
pm2 save

# Verificar status
log_info "Verificando status do PM2..."
pm2 status

log_header "Correção Concluída!"
echo -e "\n${GREEN}🎉 Erro de usuário PM2 corrigido com sucesso!${NC}"
echo -e "\n${BLUE}📋 STATUS:${NC}"
echo -e "🔧 PM2: ${YELLOW}Configurado e rodando${NC}"

echo -e "\n${BLUE}🔧 COMANDOS ÚTEIS:${NC}"
echo -e "📊 Status PM2: ${YELLOW}pm2 status${NC}"
echo -e "📋 Logs PM2: ${YELLOW}pm2 logs${NC}"
echo -e "🔄 Reiniciar: ${YELLOW}pm2 restart all${NC}"
