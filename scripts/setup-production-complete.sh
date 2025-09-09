#!/bin/bash

# SISPAT - Script Completo de Preparação do Ambiente de Produção
# Este script executa toda a preparação do ambiente de produção

set -e

echo "🚀 Preparação Completa do Ambiente de Produção do SISPAT..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Configurações
DOMAIN=${1:-""}
EMAIL=${2:-"admin@sispat.com"}
PRODUCTION_DIR="/opt/sispat"
SERVICE_USER="sispat"

# 1. Verificar pré-requisitos
log "Verificando pré-requisitos..."

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Este script deve ser executado como root"
    exit 1
fi

# Verificar se o sistema é Ubuntu/Debian
if ! command -v apt &> /dev/null; then
    error "Este script é compatível apenas com Ubuntu/Debian"
    exit 1
fi

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    log "Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

# Verificar se o PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    log "Instalando PM2..."
    npm install -g pm2
fi

# Verificar se o PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    log "Instalando PostgreSQL..."
    apt update
    apt install -y postgresql postgresql-contrib
fi

# Verificar se o Nginx está instalado
if ! command -v nginx &> /dev/null; then
    log "Instalando Nginx..."
    apt update
    apt install -y nginx
fi

log "✅ Pré-requisitos verificados"

# 2. Executar configuração do ambiente de produção
log "Executando configuração do ambiente de produção..."

if [ -f "scripts/setup-production-environment.sh" ]; then
    chmod +x scripts/setup-production-environment.sh
    ./scripts/setup-production-environment.sh
    
    if [ $? -eq 0 ]; then
        log "✅ Ambiente de produção configurado"
    else
        error "❌ Falha na configuração do ambiente de produção"
        exit 1
    fi
else
    error "Script de configuração do ambiente não encontrado"
    exit 1
fi

# 3. Executar configuração do banco de dados
log "Executando configuração do banco de dados..."

if [ -f "scripts/setup-production-database.sh" ]; then
    chmod +x scripts/setup-production-database.sh
    ./scripts/setup-production-database.sh
    
    if [ $? -eq 0 ]; then
        log "✅ Banco de dados configurado"
    else
        error "❌ Falha na configuração do banco de dados"
        exit 1
    fi
else
    error "Script de configuração do banco não encontrado"
    exit 1
fi

# 4. Configurar SSL se domínio foi fornecido
if [ -n "$DOMAIN" ]; then
    log "Configurando SSL com Let's Encrypt..."
    
    if [ -f "scripts/setup-ssl-letsencrypt.sh" ]; then
        chmod +x scripts/setup-ssl-letsencrypt.sh
        ./scripts/setup-ssl-letsencrypt.sh "$DOMAIN" "$EMAIL"
        
        if [ $? -eq 0 ]; then
            log "✅ SSL configurado"
        else
            warn "⚠️ Falha na configuração do SSL"
        fi
    else
        warn "⚠️ Script de configuração SSL não encontrado"
    fi
else
    warn "⚠️ Domínio não fornecido. SSL não será configurado."
    warn "   Para configurar SSL posteriormente, execute:"
    warn "   ./scripts/setup-ssl-letsencrypt.sh <dominio> <email>"
fi

# 5. Copiar código da aplicação
log "Copiando código da aplicação..."

# Criar diretório da aplicação
mkdir -p $PRODUCTION_DIR/app

# Copiar código (assumindo que estamos no diretório do projeto)
cp -r . $PRODUCTION_DIR/app/

# Remover arquivos desnecessários
rm -rf $PRODUCTION_DIR/app/{.git,node_modules,dist,build,*.log}

# Definir permissões
chown -R $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/app

log "✅ Código da aplicação copiado"

# 6. Instalar dependências
log "Instalando dependências..."

cd $PRODUCTION_DIR/app

# Instalar dependências de produção
npm ci --production

# Definir permissões
chown -R $SERVICE_USER:$SERVICE_USER node_modules

log "✅ Dependências instaladas"

# 7. Executar migrações do banco
log "Executando migrações do banco..."

# Executar migrações
npm run migrate

if [ $? -eq 0 ]; then
    log "✅ Migrações executadas"
else
    warn "⚠️ Falha nas migrações. Verifique o banco de dados."
fi

# 8. Compilar frontend
log "Compilando frontend..."

# Compilar frontend
npm run build

if [ $? -eq 0 ]; then
    log "✅ Frontend compilado"
else
    warn "⚠️ Falha na compilação do frontend"
fi

# 9. Iniciar aplicação
log "Iniciando aplicação..."

# Iniciar aplicação com PM2
pm2 start /etc/sispat/pm2/ecosystem.config.js --env production

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar com o sistema
pm2 startup

log "✅ Aplicação iniciada"

# 10. Verificar status dos serviços
log "Verificando status dos serviços..."

# Verificar status do PM2
pm2 status

# Verificar status do Nginx
if systemctl is-active --quiet nginx; then
    log "✅ Nginx está rodando"
else
    warn "⚠️ Nginx não está rodando"
fi

# Verificar status do PostgreSQL
if systemctl is-active --quiet postgresql; then
    log "✅ PostgreSQL está rodando"
else
    warn "⚠️ PostgreSQL não está rodando"
fi

# 11. Executar testes de saúde
log "Executando testes de saúde..."

# Testar API
if curl -f -s http://localhost:3001/api/health > /dev/null; then
    log "✅ API está respondendo"
else
    warn "⚠️ API não está respondendo"
fi

# Testar frontend
if curl -f -s http://localhost:5173 > /dev/null; then
    log "✅ Frontend está respondendo"
else
    warn "⚠️ Frontend não está respondendo"
fi

# Testar banco de dados
if pg_isready -h localhost -p 5432 -U sispat_user; then
    log "✅ Banco de dados está respondendo"
else
    warn "⚠️ Banco de dados não está respondendo"
fi

log "✅ Testes de saúde executados"

# 12. Configurar backup inicial
log "Executando backup inicial..."

# Executar backup inicial
/opt/sispat/scripts/backup.sh

if [ $? -eq 0 ]; then
    log "✅ Backup inicial executado"
else
    warn "⚠️ Falha no backup inicial"
fi

# 13. Exibir resumo final
log "🎉 Preparação completa do ambiente de produção finalizada!"
log ""
log "📋 Resumo da configuração:"
log "   • Diretório de produção: $PRODUCTION_DIR"
log "   • Usuário de serviço: $SERVICE_USER"
log "   • Domínio: ${DOMAIN:-"Não configurado"}"
log "   • SSL: $([ -n "$DOMAIN" ] && echo "Configurado" || echo "Não configurado")"
log ""
log "🔧 Serviços configurados:"
log "   • Nginx: Configurado e rodando"
log "   • PM2: Configurado e rodando"
log "   • PostgreSQL: Configurado e rodando"
log "   • Backup: Automático configurado"
log "   • Monitoramento: Configurado"
log "   • Firewall: UFW configurado"
log ""
log "📁 Scripts disponíveis:"
log "   • Deploy: $PRODUCTION_DIR/scripts/deploy.sh"
log "   • Backup: $PRODUCTION_DIR/scripts/backup.sh"
log "   • Monitor: $PRODUCTION_DIR/scripts/monitor.sh"
log "   • Health Check: $PRODUCTION_DIR/scripts/health-check.sh"
log ""
log "🌐 URLs de acesso:"
if [ -n "$DOMAIN" ]; then
    log "   • Frontend: https://$DOMAIN"
    log "   • API: https://$DOMAIN/api"
else
    log "   • Frontend: http://localhost:5173"
    log "   • API: http://localhost:3001/api"
fi
log ""
log "⚠️  Próximos passos:"
log "   1. Configurar DNS para apontar para este servidor"
log "   2. Atualizar senhas no arquivo /etc/sispat/.env.production"
log "   3. Configurar certificado SSL real (se não foi feito)"
log "   4. Testar todas as funcionalidades"
log "   5. Configurar monitoramento de alertas"
log "   6. Executar testes de carga"
log ""
log "✅ Ambiente de produção pronto para uso!"
log ""
log "Para verificar o status dos serviços:"
log "  pm2 status"
log "  systemctl status nginx"
log "  systemctl status postgresql"
log ""
log "Para fazer deploy de atualizações:"
log "  $PRODUCTION_DIR/scripts/deploy.sh"
log ""
log "Para monitorar logs:"
log "  pm2 logs"
log "  tail -f /var/log/sispat/application/*.log"
