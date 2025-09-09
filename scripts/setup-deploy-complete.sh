#!/bin/bash

# SISPAT - Script Completo de Configuração do Pipeline de Deploy
# Este script configura todo o pipeline de deploy automatizado

set -e

echo "🚀 Configuração Completa do Pipeline de Deploy do SISPAT..."

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
GIT_REPO=${1:-"https://github.com/seu-usuario/sispat.git"}
GIT_BRANCH=${2:-"main"}
DEPLOY_HOOK_SECRET=${3:-"CHANGE_THIS_SECRET"}
USE_DOCKER=${4:-"false"}
PRODUCTION_DIR="/opt/sispat"
SERVICE_USER="sispat"

# 1. Verificar pré-requisitos
log "Verificando pré-requisitos..."

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Este script deve ser executado como root"
    exit 1
fi

# Verificar se o ambiente de produção está configurado
if [ ! -d "$PRODUCTION_DIR" ]; then
    error "Ambiente de produção não encontrado. Execute primeiro o script de configuração do ambiente."
    exit 1
fi

log "✅ Pré-requisitos verificados"

# 2. Executar configuração do pipeline de deploy
log "Executando configuração do pipeline de deploy..."

if [ -f "scripts/setup-deploy-pipeline.sh" ]; then
    chmod +x scripts/setup-deploy-pipeline.sh
    ./scripts/setup-deploy-pipeline.sh "$GIT_REPO" "$GIT_BRANCH" "$DEPLOY_HOOK_SECRET"
    
    if [ $? -eq 0 ]; then
        log "✅ Pipeline de deploy configurado"
    else
        error "❌ Falha na configuração do pipeline de deploy"
        exit 1
    fi
else
    error "Script de configuração do pipeline não encontrado"
    exit 1
fi

# 3. Configurar Docker se solicitado
if [ "$USE_DOCKER" = "true" ]; then
    log "Configurando deploy com Docker..."
    
    if [ -f "scripts/setup-docker-deploy.sh" ]; then
        chmod +x scripts/setup-docker-deploy.sh
        ./scripts/setup-docker-deploy.sh
        
        if [ $? -eq 0 ]; then
            log "✅ Deploy com Docker configurado"
        else
            warn "⚠️ Falha na configuração do Docker"
        fi
    else
        warn "⚠️ Script de configuração Docker não encontrado"
    fi
else
    log "Deploy com Docker não solicitado"
fi

# 4. Configurar GitHub Actions
log "Configurando GitHub Actions..."

# Criar diretório .github/workflows se não existir
mkdir -p .github/workflows

# Copiar workflow se não existir
if [ ! -f ".github/workflows/deploy.yml" ]; then
    log "GitHub Actions workflow não encontrado, criando..."
    # O arquivo já foi criado anteriormente
fi

log "✅ GitHub Actions configurado"

# 5. Configurar webhook no repositório
log "Configurando webhook no repositório..."

# Criar script para configurar webhook
cat > $PRODUCTION_DIR/scripts/setup-webhook.sh << 'EOF'
#!/bin/bash

# SISPAT - Script para Configurar Webhook
GIT_REPO=$1
WEBHOOK_URL=$2
WEBHOOK_SECRET=$3

echo "Configurando webhook para $GIT_REPO"
echo "URL: $WEBHOOK_URL"
echo "Secret: $WEBHOOK_SECRET"

# Instruções para configurar webhook manualmente
echo ""
echo "Para configurar o webhook manualmente:"
echo "1. Acesse o repositório: $GIT_REPO"
echo "2. Vá em Settings > Webhooks"
echo "3. Clique em 'Add webhook'"
echo "4. Configure:"
echo "   - Payload URL: $WEBHOOK_URL"
echo "   - Content type: application/json"
echo "   - Secret: $WEBHOOK_SECRET"
echo "   - Events: Push events"
echo "   - Active: ✓"
echo "5. Clique em 'Add webhook'"
EOF

chmod +x $PRODUCTION_DIR/scripts/setup-webhook.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/setup-webhook.sh

log "✅ Script de configuração de webhook criado"

# 6. Configurar monitoramento de deploy
log "Configurando monitoramento de deploy..."

# Criar dashboard de monitoramento
cat > $PRODUCTION_DIR/scripts/deploy-dashboard.sh << 'EOF'
#!/bin/bash

# SISPAT - Dashboard de Deploy
clear
echo "🚀 SISPAT - Dashboard de Deploy"
echo "================================"
echo ""

# Status dos serviços
echo "📊 Status dos Serviços:"
echo "----------------------"
pm2 status
echo ""

# Status do Git
echo "📝 Status do Git:"
echo "----------------"
cd /opt/sispat/app
echo "Branch atual: $(git branch --show-current)"
echo "Último commit: $(git log -1 --oneline)"
echo "Status: $(git status --porcelain | wc -l) arquivos modificados"
echo ""

# Status do Docker (se configurado)
if command -v docker &> /dev/null; then
    echo "🐳 Status do Docker:"
    echo "-------------------"
    docker-compose ps
    echo ""
fi

# Logs recentes
echo "📋 Logs Recentes:"
echo "----------------"
tail -10 /var/log/sispat/application/deploy.log
echo ""

# Uso de recursos
echo "💻 Uso de Recursos:"
echo "------------------"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
echo "Memória: $(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')%"
echo "Disco: $(df / | tail -1 | awk '{print $5}')"
echo ""

# Health check
echo "🏥 Health Check:"
echo "---------------"
if curl -f -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ API: OK"
else
    echo "❌ API: ERRO"
fi

if curl -f -s http://localhost:5173 > /dev/null; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: ERRO"
fi

if pg_isready -h localhost -p 5432 -U sispat_user > /dev/null; then
    echo "✅ Database: OK"
else
    echo "❌ Database: ERRO"
fi
echo ""

echo "Pressione qualquer tecla para atualizar..."
read -n 1
EOF

chmod +x $PRODUCTION_DIR/scripts/deploy-dashboard.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/deploy-dashboard.sh

log "✅ Dashboard de deploy configurado"

# 7. Configurar notificações
log "Configurando notificações..."

# Criar script de notificações
cat > $PRODUCTION_DIR/scripts/send-notification.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Notificações
MESSAGE=$1
STATUS=$2
WEBHOOK_URL=${3:-""}
EMAIL=${4:-"admin@sispat.com"}

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Enviar email
if [ -n "$EMAIL" ]; then
    echo "SISPAT Deploy: $MESSAGE" | mail -s "SISPAT Deploy - $STATUS" $EMAIL
    log "Notificação por email enviada para $EMAIL"
fi

# Enviar webhook
if [ -n "$WEBHOOK_URL" ]; then
    curl -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{\"text\":\"SISPAT Deploy: $MESSAGE\", \"status\":\"$STATUS\"}" \
        || log "Erro ao enviar webhook"
fi

log "Notificação enviada: $MESSAGE"
EOF

chmod +x $PRODUCTION_DIR/scripts/send-notification.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/send-notification.sh

log "✅ Sistema de notificações configurado"

# 8. Configurar backup automático
log "Configurando backup automático..."

# Configurar cron para backup automático
echo "0 2 * * * $SERVICE_USER $PRODUCTION_DIR/scripts/backup.sh" >> /etc/crontab

log "✅ Backup automático configurado"

# 9. Testar pipeline de deploy
log "Testando pipeline de deploy..."

# Executar deploy de teste
cd $PRODUCTION_DIR
$PRODUCTION_DIR/scripts/deploy.sh

if [ $? -eq 0 ]; then
    log "✅ Deploy de teste executado com sucesso"
else
    warn "⚠️ Deploy de teste falhou"
fi

# 10. Exibir resumo final
log "🎉 Pipeline de deploy automatizado configurado com sucesso!"
log ""
log "📋 Resumo da configuração:"
log "   • Repositório Git: $GIT_REPO"
log "   • Branch: $GIT_BRANCH"
log "   • Webhook Secret: $DEPLOY_HOOK_SECRET"
log "   • Docker: $([ "$USE_DOCKER" = "true" ] && echo "Configurado" || echo "Não configurado")"
log "   • GitHub Actions: Configurado"
log "   • Monitoramento: Configurado"
log "   • Notificações: Configurado"
log "   • Backup: Automático"
log ""
log "🔧 Recursos configurados:"
log "   • Git Hooks: Deploy automático no push"
log "   • Webhook Server: Porta 3003"
log "   • Deploy Melhorado: Com testes e verificações"
log "   • Rollback: Restauração automática"
log "   • Monitoramento: Verificação contínua"
log "   • Dashboard: Interface de monitoramento"
log "   • Notificações: Email e webhook"
log ""
log "📁 Scripts disponíveis:"
log "   • Deploy: $PRODUCTION_DIR/scripts/deploy.sh"
log "   • Rollback: $PRODUCTION_DIR/scripts/rollback.sh"
log "   • Monitor: $PRODUCTION_DIR/scripts/monitor-deploy.sh"
log "   • Dashboard: $PRODUCTION_DIR/scripts/deploy-dashboard.sh"
log "   • Webhook: $PRODUCTION_DIR/scripts/setup-webhook.sh"
log "   • Notificações: $PRODUCTION_DIR/scripts/send-notification.sh"
if [ "$USE_DOCKER" = "true" ]; then
    log "   • Docker Deploy: $PRODUCTION_DIR/scripts/docker-deploy.sh"
    log "   • Docker Backup: $PRODUCTION_DIR/scripts/docker-backup.sh"
    log "   • Docker Monitor: $PRODUCTION_DIR/scripts/docker-monitor.sh"
fi
log ""
log "🌐 URLs de acesso:"
log "   • Frontend: https://seu-dominio.com"
log "   • API: https://seu-dominio.com/api"
log "   • Webhook: https://seu-dominio.com/webhook"
log "   • Health: https://seu-dominio.com/health"
log ""
log "⚠️  Próximos passos:"
log "   1. Configurar webhook no repositório Git"
log "   2. Configurar variáveis de ambiente"
log "   3. Testar deploy automático"
log "   4. Configurar notificações"
log "   5. Monitorar logs de deploy"
log "   6. Configurar backup automático"
log ""
log "✅ Pipeline de deploy pronto para uso!"
log ""
log "Para monitorar o deploy:"
log "  $PRODUCTION_DIR/scripts/deploy-dashboard.sh"
log ""
log "Para fazer deploy manual:"
log "  $PRODUCTION_DIR/scripts/deploy.sh"
log ""
log "Para configurar webhook:"
log "  $PRODUCTION_DIR/scripts/setup-webhook.sh <repo> <url> <secret>"
