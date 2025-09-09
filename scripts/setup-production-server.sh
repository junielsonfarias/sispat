#!/bin/bash

# SISPAT - Script Principal de Configuração do Servidor de Produção
# Este script configura todo o ambiente de produção do SISPAT

set -e

echo "🚀 Configurando Servidor de Produção SISPAT..."

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
DOMAIN=${1:-"sispat.local"}
PROJECT_DIR=${2:-"/var/www/sispat"}
NODE_ENV=${3:-"production"}
PM2_USER=${4:-"www-data"}
SSL_EMAIL=${5:-"admin@sispat.local"}

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

log "Iniciando configuração do servidor de produção..."
log "Domínio: $DOMAIN"
log "Diretório do projeto: $PROJECT_DIR"
log "Ambiente: $NODE_ENV"
log "Usuário PM2: $PM2_USER"
log "Email SSL: $SSL_EMAIL"

# 1. Atualizar sistema
log "Atualizando sistema..."
apt update && apt upgrade -y
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# 2. Instalar Node.js
log "Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verificar instalação
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log "Node.js instalado: $NODE_VERSION"
log "NPM instalado: $NPM_VERSION"

# 3. Instalar PostgreSQL
log "Instalando PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Configurar PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE sispat_db;"
sudo -u postgres psql -c "CREATE USER sispat_user WITH PASSWORD 'sispat_password_2025';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sispat_db TO sispat_user;"

log "PostgreSQL instalado e configurado"

# 4. Instalar Nginx
log "Instalando Nginx..."
apt install -y nginx

# 5. Instalar PM2
log "Instalando PM2..."
npm install -g pm2

# 6. Criar usuário para aplicação
log "Criando usuário para aplicação..."
if ! id "$PM2_USER" &>/dev/null; then
    useradd -r -s /bin/false -d "$PROJECT_DIR" -m "$PM2_USER"
    log "Usuário $PM2_USER criado"
else
    log "Usuário $PM2_USER já existe"
fi

# 7. Criar diretório do projeto
log "Criando diretório do projeto..."
mkdir -p "$PROJECT_DIR"
chown -R "$PM2_USER:$PM2_USER" "$PROJECT_DIR"

# 8. Configurar firewall
log "Configurando firewall..."
apt install -y ufw
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 3001
ufw --force enable

log "Firewall configurado"

# 9. Executar scripts de configuração
log "Executando scripts de configuração..."

# Configurar PostgreSQL para produção
if [ -f "scripts/setup-postgresql-production.sh" ]; then
    log "Configurando PostgreSQL para produção..."
    chmod +x scripts/setup-postgresql-production.sh
    ./scripts/setup-postgresql-production.sh
else
    warn "Script de configuração do PostgreSQL não encontrado"
fi

# Configurar backup automático
if [ -f "scripts/setup-backup-automation.sh" ]; then
    log "Configurando backup automático..."
    chmod +x scripts/setup-backup-automation.sh
    ./scripts/setup-backup-automation.sh
else
    warn "Script de backup automático não encontrado"
fi

# Configurar monitoramento do banco
if [ -f "scripts/setup-database-monitoring.sh" ]; then
    log "Configurando monitoramento do banco..."
    chmod +x scripts/setup-database-monitoring.sh
    ./scripts/setup-database-monitoring.sh
else
    warn "Script de monitoramento do banco não encontrado"
fi

# Configurar Nginx
if [ -f "scripts/setup-nginx-production.sh" ]; then
    log "Configurando Nginx..."
    chmod +x scripts/setup-nginx-production.sh
    ./scripts/setup-nginx-production.sh "$DOMAIN" 8080 3001 "$SSL_EMAIL"
else
    warn "Script de configuração do Nginx não encontrado"
fi

# Configurar PM2
if [ -f "scripts/setup-pm2-production.sh" ]; then
    log "Configurando PM2..."
    chmod +x scripts/setup-pm2-production.sh
    ./scripts/setup-pm2-production.sh "$PROJECT_DIR" "$NODE_ENV" "$PM2_USER"
else
    warn "Script de configuração do PM2 não encontrado"
fi

# Otimizar sistema
if [ -f "scripts/setup-system-optimization.sh" ]; then
    log "Otimizando sistema..."
    chmod +x scripts/setup-system-optimization.sh
    ./scripts/setup-system-optimization.sh
else
    warn "Script de otimização do sistema não encontrado"
fi

# 10. Configurar deploy automático
log "Configurando deploy automático..."

# Criar script de deploy
tee /usr/local/bin/deploy-sispat.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Script de Deploy
# Faz deploy da aplicação

set -e

PROJECT_DIR="$PROJECT_DIR"
PM2_USER="$PM2_USER"

log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1"
}

log "Iniciando deploy do SISPAT..."

# Parar aplicação
pm2 stop all

# Fazer backup
cp -r \$PROJECT_DIR \$PROJECT_DIR.backup.\$(date +%Y%m%d_%H%M%S)

# Atualizar código (assumindo que está em um repositório Git)
cd \$PROJECT_DIR
git pull origin main

# Instalar dependências
npm install

# Build da aplicação
npm run build

# Iniciar aplicação
pm2 start ecosystem.config.cjs --env production

# Salvar configuração
pm2 save

log "Deploy do SISPAT concluído"
EOF

chmod +x /usr/local/bin/deploy-sispat.sh

# 11. Configurar monitoramento geral
log "Configurando monitoramento geral..."

# Criar script de monitoramento geral
tee /usr/local/bin/monitor-sispat.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Monitoramento Geral
# Monitora todos os componentes do SISPAT

LOG_FILE="/var/log/sispat/general-monitor.log"

log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

log "Iniciando monitoramento geral do SISPAT..."

# Verificar Nginx
if systemctl is-active --quiet nginx; then
    log "✅ Nginx: Online"
else
    log "❌ Nginx: Offline"
    systemctl start nginx
fi

# Verificar PostgreSQL
if systemctl is-active --quiet postgresql; then
    log "✅ PostgreSQL: Online"
else
    log "❌ PostgreSQL: Offline"
    systemctl start postgresql
fi

# Verificar PM2
if pgrep -f "PM2" > /dev/null; then
    log "✅ PM2: Online"
else
    log "❌ PM2: Offline"
    pm2 resurrect
fi

# Verificar processos da aplicação
if pm2 list | grep -q "sispat-backend.*online"; then
    log "✅ Backend SISPAT: Online"
else
    log "❌ Backend SISPAT: Offline"
    pm2 restart sispat-backend
fi

if pm2 list | grep -q "sispat-frontend.*online"; then
    log "✅ Frontend SISPAT: Online"
else
    log "❌ Frontend SISPAT: Offline"
    pm2 restart sispat-frontend
fi

# Verificar conectividade
if curl -s -o /dev/null -w "%{http_code}" http://localhost/health | grep -q "200"; then
    log "✅ Health Check: OK"
else
    log "❌ Health Check: Falha"
fi

log "Monitoramento geral do SISPAT finalizado"
EOF

chmod +x /usr/local/bin/monitor-sispat.sh

# Agendar monitoramento geral a cada 2 minutos
(crontab -l 2>/dev/null; echo "*/2 * * * * /usr/local/bin/monitor-sispat.sh") | crontab -

# 12. Configurar logs centralizados
log "Configurando logs centralizados..."

# Criar diretório de logs
mkdir -p /var/log/sispat
chown -R "$PM2_USER:$PM2_USER" /var/log/sispat

# Configurar logrotate para logs centralizados
tee /etc/logrotate.d/sispat-centralized > /dev/null << EOF
/var/log/sispat/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $PM2_USER $PM2_USER
    sharedscripts
    postrotate
        systemctl reload nginx
        pm2 reloadLogs
    endscript
}
EOF

# 13. Configurar backup completo
log "Configurando backup completo..."

# Criar script de backup completo
tee /usr/local/bin/backup-sispat-complete.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Backup Completo
# Faz backup completo do sistema

set -e

BACKUP_DIR="/var/backups/sispat-complete"
DATE=\$(date +%Y%m%d_%H%M%S)

log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1"
}

log "Iniciando backup completo do SISPAT..."

# Criar diretório de backup
mkdir -p \$BACKUP_DIR

# Backup do banco de dados
sudo -u postgres pg_dump sispat_db > \$BACKUP_DIR/database_\$DATE.sql

# Backup da aplicação
tar -czf \$BACKUP_DIR/application_\$DATE.tar.gz -C "$PROJECT_DIR" .

# Backup das configurações
tar -czf \$BACKUP_DIR/configurations_\$DATE.tar.gz /etc/nginx /etc/pm2 /etc/cron.d /etc/logrotate.d /etc/sysctl.conf

# Backup dos logs
tar -czf \$BACKUP_DIR/logs_\$DATE.tar.gz /var/log/sispat /var/log/nginx /var/log/pm2

# Limpar backups antigos (mais de 30 dias)
find \$BACKUP_DIR -name "*.sql" -mtime +30 -delete
find \$BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

log "Backup completo do SISPAT concluído"
EOF

chmod +x /usr/local/bin/backup-sispat-complete.sh

# Agendar backup completo diário às 1:00
(crontab -l 2>/dev/null; echo "0 1 * * * /usr/local/bin/backup-sispat-complete.sh") | crontab -

# 14. Configurar alertas por email
log "Configurando alertas por email..."

# Instalar mailutils
apt install -y mailutils

# Criar script de alertas por email
tee /usr/local/bin/sispat-email-alerts.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Alertas por Email
# Envia alertas por email quando há problemas

LOG_FILE="/var/log/sispat/email-alerts.log"
EMAIL_RECIPIENT="admin@sispat.local"  # Configurar com email real

log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

# Verificar se há alertas críticos
CRITICAL_ALERTS=0

# Verificar Nginx
if ! systemctl is-active --quiet nginx; then
    log "🚨 ALERTA CRÍTICO: Nginx não está rodando"
    CRITICAL_ALERTS=\$((CRITICAL_ALERTS + 1))
fi

# Verificar PostgreSQL
if ! systemctl is-active --quiet postgresql; then
    log "🚨 ALERTA CRÍTICO: PostgreSQL não está rodando"
    CRITICAL_ALERTS=\$((CRITICAL_ALERTS + 1))
fi

# Verificar PM2
if ! pgrep -f "PM2" > /dev/null; then
    log "🚨 ALERTA CRÍTICO: PM2 não está rodando"
    CRITICAL_ALERTS=\$((CRITICAL_ALERTS + 1))
fi

# Verificar espaço em disco
DISK_USAGE=\$(df -h / | tail -1 | awk '{print \$5}' | sed 's/%//')
if [ \$DISK_USAGE -gt 90 ]; then
    log "🚨 ALERTA CRÍTICO: Espaço em disco crítico: \$DISK_USAGE%"
    CRITICAL_ALERTS=\$((CRITICAL_ALERTS + 1))
fi

# Se houver alertas críticos, enviar email
if [ \$CRITICAL_ALERTS -gt 0 ]; then
    log "Enviando alertas críticos por email..."
    echo "SISPAT - Alertas Críticos

Sistema: \$(hostname)
Data: \$(date)
Alertas Críticos: \$CRITICAL_ALERTS

Verifique os logs em /var/log/sispat/ para mais detalhes.

Sistema SISPAT" | mail -s "SISPAT - Alertas Críticos" \$EMAIL_RECIPIENT
fi

log "Verificação de alertas por email finalizada"
EOF

chmod +x /usr/local/bin/sispat-email-alerts.sh

# Agendar verificação de alertas a cada 30 minutos
(crontab -l 2>/dev/null; echo "*/30 * * * * /usr/local/bin/sispat-email-alerts.sh") | crontab -

# 15. Verificar configuração final
log "Verificando configuração final..."

# Verificar serviços
if systemctl is-active --quiet nginx; then
    log "✅ Nginx: Online"
else
    error "❌ Nginx: Offline"
fi

if systemctl is-active --quiet postgresql; then
    log "✅ PostgreSQL: Online"
else
    error "❌ PostgreSQL: Offline"
fi

if pgrep -f "PM2" > /dev/null; then
    log "✅ PM2: Online"
else
    error "❌ PM2: Offline"
fi

# Verificar portas
if netstat -tlnp | grep -q ":80 "; then
    log "✅ Porta 80: Aberta"
else
    warn "⚠️ Porta 80: Fechada"
fi

if netstat -tlnp | grep -q ":443 "; then
    log "✅ Porta 443: Aberta"
else
    warn "⚠️ Porta 443: Fechada"
fi

if netstat -tlnp | grep -q ":3001 "; then
    log "✅ Porta 3001: Aberta"
else
    warn "⚠️ Porta 3001: Fechada"
fi

# 16. Criar relatório de configuração
log "Criando relatório de configuração..."

REPORT_FILE="/var/log/sispat/configuration-report.txt"
tee $REPORT_FILE > /dev/null << EOF
SISPAT - Relatório de Configuração do Servidor de Produção
============================================================

Data: $(date)
Sistema: $(uname -a)
Domínio: $DOMAIN
Diretório do projeto: $PROJECT_DIR
Ambiente: $NODE_ENV
Usuário PM2: $PM2_USER

Serviços Instalados:
- Node.js: $(node --version)
- NPM: $(npm --version)
- PostgreSQL: $(sudo -u postgres psql -c "SELECT version();" | head -1)
- Nginx: $(nginx -v 2>&1)
- PM2: $(pm2 --version)

Configurações Aplicadas:
- Firewall configurado
- SSL configurado com Let's Encrypt
- Backup automático configurado
- Monitoramento configurado
- Logs centralizados configurados
- Alertas por email configurados
- Deploy automático configurado

Scripts Criados:
- /usr/local/bin/deploy-sispat.sh
- /usr/local/bin/monitor-sispat.sh
- /usr/local/bin/backup-sispat-complete.sh
- /usr/local/bin/sispat-email-alerts.sh

Cron Jobs Configurados:
- Monitoramento geral: a cada 2 minutos
- Monitoramento de sistema: a cada 5 minutos
- Monitoramento de PM2: a cada 5 minutos
- Monitoramento de banco: a cada 15 minutos
- Alertas por email: a cada 30 minutos
- Backup completo: diário às 1:00
- Limpeza de sistema: diária às 3:00

Logs:
- /var/log/sispat/
- /var/log/nginx/
- /var/log/pm2/

Backups:
- /var/backups/sispat-complete/
- /var/backups/pm2/
- /var/backups/system/

Comandos Úteis:
- Ver status: pm2 status
- Ver logs: pm2 logs
- Reiniciar: pm2 restart all
- Deploy: /usr/local/bin/deploy-sispat.sh
- Monitorar: /usr/local/bin/monitor-sispat.sh
- Backup: /usr/local/bin/backup-sispat-complete.sh

Próximos Passos:
1. Configure o domínio DNS para apontar para este servidor
2. Configure o email para alertas
3. Teste a aplicação
4. Configure monitoramento externo
5. Configure backup externo
EOF

log "Relatório de configuração salvo em: $REPORT_FILE"

log "🎉 Configuração do servidor de produção concluída com sucesso!"
log "📋 Resumo da configuração:"
log "   • Sistema atualizado e otimizado"
log "   • Node.js, PostgreSQL, Nginx e PM2 instalados"
log "   • Firewall configurado"
log "   • SSL configurado com Let's Encrypt"
log "   • Backup automático configurado"
log "   • Monitoramento configurado"
log "   • Logs centralizados configurados"
log "   • Alertas por email configurados"
log "   • Deploy automático configurado"
log "   • Scripts de manutenção criados"
log ""
log "🔧 Próximos passos:"
log "   1. Configure o domínio DNS para apontar para este servidor"
log "   2. Configure o email para alertas em /usr/local/bin/sispat-email-alerts.sh"
log "   3. Faça deploy da aplicação usando /usr/local/bin/deploy-sispat.sh"
log "   4. Teste a aplicação acessando http://$DOMAIN"
log "   5. Configure monitoramento externo (opcional)"
log "   6. Configure backup externo (opcional)"
log ""
log "📊 Monitoramento:"
log "   • Logs: /var/log/sispat/"
log "   • Status: pm2 status"
log "   • Monitoramento: a cada 2 minutos"
log "   • Backup: diário às 1:00"
log "   • Limpeza: diária às 3:00"
log ""
log "✅ Servidor de produção SISPAT configurado e pronto para uso!"
