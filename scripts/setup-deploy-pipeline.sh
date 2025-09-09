#!/bin/bash

# SISPAT - Script de Configuração do Pipeline de Deploy
# Este script configura o pipeline de deploy automatizado

set -e

echo "🚀 Configurando Pipeline de Deploy Automatizado do SISPAT..."

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
PRODUCTION_DIR="/opt/sispat"
SERVICE_USER="sispat"
GIT_REPO=${1:-"https://github.com/seu-usuario/sispat.git"}
GIT_BRANCH=${2:-"main"}
DEPLOY_HOOK_SECRET=${3:-"CHANGE_THIS_SECRET"}

# 1. Configurar repositório Git
log "Configurando repositório Git..."

# Criar diretório de deploy
mkdir -p $PRODUCTION_DIR/deploy
cd $PRODUCTION_DIR/deploy

# Clonar repositório se não existir
if [ ! -d "sispat.git" ]; then
    git clone --bare $GIT_REPO sispat.git
    log "✅ Repositório Git clonado"
else
    log "✅ Repositório Git já existe"
fi

# Configurar Git hooks
log "Configurando Git hooks..."

# Criar hook de post-receive
cat > $PRODUCTION_DIR/deploy/sispat.git/hooks/post-receive << 'EOF'
#!/bin/bash

# SISPAT - Git Hook de Deploy
PRODUCTION_DIR="/opt/sispat"
APP_DIR="$PRODUCTION_DIR/app"
DEPLOY_DIR="$PRODUCTION_DIR/deploy"
LOG_FILE="/var/log/sispat/application/deploy.log"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

log "Iniciando deploy automático..."

# Ler branch
while read oldrev newrev refname; do
    branch=$(git rev-parse --symbolic --abbrev-ref $refname)
    
    if [ "$branch" = "main" ]; then
        log "Deploy da branch $branch iniciado"
        
        # Fazer checkout do código
        git --work-tree=$APP_DIR --git-dir=$DEPLOY_DIR/sispat.git checkout -f $branch
        
        # Executar deploy
        cd $APP_DIR
        $PRODUCTION_DIR/scripts/deploy.sh
        
        log "Deploy da branch $branch concluído"
    fi
done
EOF

# Tornar hook executável
chmod +x $PRODUCTION_DIR/deploy/sispat.git/hooks/post-receive
chown -R $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/deploy

log "✅ Git hooks configurados"

# 2. Configurar webhook para deploy
log "Configurando webhook para deploy..."

# Criar servidor webhook
cat > $PRODUCTION_DIR/scripts/webhook-server.js << 'EOF'
const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');

const PORT = 3003;
const SECRET = process.env.WEBHOOK_SECRET || 'CHANGE_THIS_SECRET';
const LOG_FILE = '/var/log/sispat/application/webhook.log';

// Função para log
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    
    // Salvar no arquivo de log
    require('fs').appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
}

// Função para verificar assinatura
function verifySignature(payload, signature) {
    const expectedSignature = crypto
        .createHmac('sha256', SECRET)
        .update(payload)
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

// Servidor webhook
const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            const signature = req.headers['x-hub-signature-256'];
            
            if (!signature || !verifySignature(body, signature)) {
                log('Webhook: Assinatura inválida');
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            
            try {
                const payload = JSON.parse(body);
                
                if (payload.ref === 'refs/heads/main') {
                    log('Webhook: Deploy iniciado');
                    
                    // Executar deploy
                    exec('/opt/sispat/scripts/deploy.sh', (error, stdout, stderr) => {
                        if (error) {
                            log(`Webhook: Erro no deploy - ${error.message}`);
                        } else {
                            log('Webhook: Deploy concluído com sucesso');
                        }
                    });
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Deploy iniciado' }));
                } else {
                    log(`Webhook: Branch ${payload.ref} ignorada`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Branch ignorada' }));
                }
            } catch (error) {
                log(`Webhook: Erro ao processar payload - ${error.message}`);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid payload' }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    log(`Webhook server rodando na porta ${PORT}`);
});

// Tratar erros não capturados
process.on('uncaughtException', (error) => {
    log(`Erro não capturado: ${error.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`Promise rejeitada: ${reason}`);
    process.exit(1);
});
EOF

# Tornar script executável
chmod +x $PRODUCTION_DIR/scripts/webhook-server.js
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/webhook-server.js

log "✅ Webhook server configurado"

# 3. Configurar PM2 para webhook
log "Configurando PM2 para webhook..."

# Atualizar configuração do PM2
cat >> /etc/sispat/pm2/ecosystem.config.js << 'EOF'
    },
    {
      name: 'sispat-webhook',
      script: '/opt/sispat/scripts/webhook-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'CHANGE_THIS_SECRET'
      },
      log_file: '/var/log/sispat/application/webhook.log',
      out_file: '/var/log/sispat/application/webhook-out.log',
      error_file: '/var/log/sispat/application/webhook-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '256M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      kill_timeout: 5000
    }
  ]
};
EOF

log "✅ PM2 configurado para webhook"

# 4. Configurar Nginx para webhook
log "Configurando Nginx para webhook..."

# Adicionar configuração do webhook ao Nginx
cat >> /etc/nginx/sites-available/sispat << 'EOF'

    # Webhook endpoint
    location /webhook {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Hub-Signature-256 $http_x_hub_signature_256;
    }
EOF

# Testar configuração do Nginx
nginx -t
systemctl reload nginx

log "✅ Nginx configurado para webhook"

# 5. Configurar script de deploy melhorado
log "Configurando script de deploy melhorado..."

# Atualizar script de deploy
cat > $PRODUCTION_DIR/scripts/deploy.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Deploy Melhorado
set -e

PRODUCTION_DIR="/opt/sispat"
APP_DIR="$PRODUCTION_DIR/app"
LOG_FILE="/var/log/sispat/application/deploy.log"
BACKUP_DIR="$PRODUCTION_DIR/backups"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Função para enviar notificação
send_notification() {
    local message="$1"
    local status="$2"
    
    # Enviar para webhook (opcional)
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"SISPAT Deploy: $message\", \"status\":\"$status\"}" \
            || true
    fi
    
    log "NOTIFICAÇÃO: $message"
}

log "🚀 Iniciando deploy do SISPAT..."

# Verificar se está no diretório correto
if [ ! -f "$APP_DIR/package.json" ]; then
    log "ERRO: package.json não encontrado em $APP_DIR"
    exit 1
fi

# Fazer backup antes do deploy
log "Fazendo backup antes do deploy..."
$PRODUCTION_DIR/scripts/backup.sh

# Parar aplicação
log "Parando aplicação..."
pm2 stop all

# Atualizar código
log "Atualizando código..."
cd $APP_DIR

# Verificar se há mudanças
if git diff --quiet HEAD~1 HEAD; then
    log "Nenhuma mudança detectada, deploy cancelado"
    pm2 start all
    exit 0
fi

# Instalar dependências
log "Instalando dependências..."
npm ci --production

# Executar migrações do banco
log "Executando migrações do banco..."
npm run migrate

# Compilar frontend
log "Compilando frontend..."
npm run build

# Verificar se a compilação foi bem-sucedida
if [ ! -d "dist" ]; then
    log "ERRO: Compilação do frontend falhou"
    send_notification "Deploy falhou: Compilação do frontend" "error"
    exit 1
fi

# Executar testes (opcional)
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    log "Executando testes..."
    npm test || {
        log "ERRO: Testes falharam"
        send_notification "Deploy falhou: Testes falharam" "error"
        exit 1
    }
fi

# Reiniciar aplicação
log "Reiniciando aplicação..."
pm2 start /etc/sispat/pm2/ecosystem.config.js --env production

# Aguardar aplicação inicializar
sleep 10

# Verificar se a aplicação está rodando
if ! pm2 list | grep -q "sispat-backend.*online"; then
    log "ERRO: Backend não está rodando"
    send_notification "Deploy falhou: Backend não está rodando" "error"
    exit 1
fi

if ! pm2 list | grep -q "sispat-frontend.*online"; then
    log "ERRO: Frontend não está rodando"
    send_notification "Deploy falhou: Frontend não está rodando" "error"
    exit 1
fi

# Verificar saúde da aplicação
log "Verificando saúde da aplicação..."
if ! curl -f -s http://localhost:3001/api/health > /dev/null; then
    log "ERRO: API não está respondendo"
    send_notification "Deploy falhou: API não está respondendo" "error"
    exit 1
fi

# Salvar configuração do PM2
pm2 save

# Limpar cache
log "Limpando cache..."
npm cache clean --force

# Limpar logs antigos
log "Limpando logs antigos..."
find /var/log/sispat -name "*.log" -mtime +30 -delete

# Verificar uso de disco
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    log "AVISO: Uso de disco alto: ${DISK_USAGE}%"
    send_notification "Deploy concluído com aviso: Uso de disco alto" "warning"
fi

# Obter versão atual
VERSION=$(git rev-parse --short HEAD)
log "Deploy concluído com sucesso! Versão: $VERSION"

# Enviar notificação de sucesso
send_notification "Deploy concluído com sucesso! Versão: $VERSION" "success"

log "✅ Deploy do SISPAT concluído com sucesso!"
EOF

# Tornar script executável
chmod +x $PRODUCTION_DIR/scripts/deploy.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/deploy.sh

log "✅ Script de deploy melhorado configurado"

# 6. Configurar rollback automático
log "Configurando rollback automático..."

# Criar script de rollback
cat > $PRODUCTION_DIR/scripts/rollback.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Rollback
set -e

PRODUCTION_DIR="/opt/sispat"
APP_DIR="$PRODUCTION_DIR/app"
LOG_FILE="/var/log/sispat/application/rollback.log"
BACKUP_DIR="$PRODUCTION_DIR/backups"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "🔄 Iniciando rollback do SISPAT..."

# Verificar se há backup disponível
if [ ! -d "$BACKUP_DIR" ]; then
    log "ERRO: Diretório de backup não encontrado"
    exit 1
fi

# Listar backups disponíveis
log "Backups disponíveis:"
ls -la $BACKUP_DIR/database/ | grep "\.sql\.gz$" | tail -5

# Parar aplicação
log "Parando aplicação..."
pm2 stop all

# Restaurar backup do banco
log "Restaurando backup do banco..."
LATEST_BACKUP=$(ls -t $BACKUP_DIR/database/*.sql.gz | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    gunzip -c $LATEST_BACKUP | psql -h localhost -U sispat_user -d sispat_production
    log "Backup do banco restaurado: $LATEST_BACKUP"
else
    log "ERRO: Nenhum backup do banco encontrado"
    exit 1
fi

# Restaurar código (voltar para commit anterior)
log "Restaurando código..."
cd $APP_DIR
git reset --hard HEAD~1

# Instalar dependências
log "Instalando dependências..."
npm ci --production

# Compilar frontend
log "Compilando frontend..."
npm run build

# Reiniciar aplicação
log "Reiniciando aplicação..."
pm2 start /etc/sispat/pm2/ecosystem.config.js --env production

# Aguardar aplicação inicializar
sleep 10

# Verificar se a aplicação está rodando
if ! pm2 list | grep -q "sispat-backend.*online"; then
    log "ERRO: Backend não está rodando após rollback"
    exit 1
fi

# Verificar saúde da aplicação
log "Verificando saúde da aplicação..."
if ! curl -f -s http://localhost:3001/api/health > /dev/null; then
    log "ERRO: API não está respondendo após rollback"
    exit 1
fi

log "✅ Rollback do SISPAT concluído com sucesso!"
EOF

# Tornar script executável
chmod +x $PRODUCTION_DIR/scripts/rollback.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/rollback.sh

log "✅ Script de rollback configurado"

# 7. Configurar monitoramento de deploy
log "Configurando monitoramento de deploy..."

# Criar script de monitoramento de deploy
cat > $PRODUCTION_DIR/scripts/monitor-deploy.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Monitoramento de Deploy
LOG_FILE="/var/log/sispat/application/monitor-deploy.log"
ALERT_EMAIL="admin@sispat.com"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Função para enviar alerta
send_alert() {
    local message="$1"
    echo "$message" | mail -s "SISPAT Deploy Alert" $ALERT_EMAIL
    log "ALERTA ENVIADO: $message"
}

# Verificar se o deploy está funcionando
if ! pm2 list | grep -q "sispat-backend.*online"; then
    send_alert "Backend não está rodando após deploy!"
    exit 1
fi

if ! pm2 list | grep -q "sispat-frontend.*online"; then
    send_alert "Frontend não está rodando após deploy!"
    exit 1
fi

# Verificar se a API está respondendo
if ! curl -f -s http://localhost:3001/api/health > /dev/null; then
    send_alert "API não está respondendo após deploy!"
    exit 1
fi

# Verificar se o frontend está respondendo
if ! curl -f -s http://localhost:5173 > /dev/null; then
    send_alert "Frontend não está respondendo após deploy!"
    exit 1
fi

# Verificar uso de memória
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
if (( $(echo "$MEMORY_USAGE > 90" | bc -l) )); then
    send_alert "Uso de memória alto após deploy: ${MEMORY_USAGE}%"
fi

# Verificar uso de CPU
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
if (( $(echo "$CPU_USAGE > 90" | bc -l) )); then
    send_alert "Uso de CPU alto após deploy: ${CPU_USAGE}%"
fi

log "Monitoramento de deploy executado com sucesso"
EOF

# Tornar script executável
chmod +x $PRODUCTION_DIR/scripts/monitor-deploy.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/monitor-deploy.sh

# Configurar cron para monitoramento de deploy (a cada 2 minutos após deploy)
echo "*/2 * * * * $SERVICE_USER $PRODUCTION_DIR/scripts/monitor-deploy.sh" >> /etc/crontab

log "✅ Monitoramento de deploy configurado"

# 8. Configurar variáveis de ambiente
log "Configurando variáveis de ambiente..."

# Adicionar variáveis de deploy ao arquivo de ambiente
cat >> /etc/sispat/.env.production << EOF

# Deploy
WEBHOOK_SECRET=$DEPLOY_HOOK_SECRET
WEBHOOK_URL=
GIT_REPO=$GIT_REPO
GIT_BRANCH=$GIT_BRANCH
EOF

log "✅ Variáveis de ambiente configuradas"

# 9. Iniciar webhook server
log "Iniciando webhook server..."

# Iniciar webhook com PM2
pm2 start /opt/sispat/scripts/webhook-server.js --name sispat-webhook

# Salvar configuração do PM2
pm2 save

log "✅ Webhook server iniciado"

# 10. Exibir resumo final
log "🎉 Pipeline de deploy automatizado configurado com sucesso!"
log ""
log "📋 Resumo da configuração:"
log "   • Repositório Git: $GIT_REPO"
log "   • Branch: $GIT_BRANCH"
log "   • Webhook Secret: $DEPLOY_HOOK_SECRET"
log "   • Webhook URL: https://seu-dominio.com/webhook"
log ""
log "🔧 Recursos configurados:"
log "   • Git Hooks: Deploy automático no push"
log "   • Webhook Server: Porta 3003"
log "   • Deploy Melhorado: Com testes e verificações"
log "   • Rollback: Restauração automática"
log "   • Monitoramento: Verificação contínua"
log ""
log "📁 Scripts disponíveis:"
log "   • Deploy: $PRODUCTION_DIR/scripts/deploy.sh"
log "   • Rollback: $PRODUCTION_DIR/scripts/rollback.sh"
log "   • Monitor: $PRODUCTION_DIR/scripts/monitor-deploy.sh"
log "   • Webhook: $PRODUCTION_DIR/scripts/webhook-server.js"
log ""
log "⚠️  Próximos passos:"
log "   1. Configurar webhook no GitHub/GitLab"
log "   2. Testar deploy automático"
log "   3. Configurar notificações"
log "   4. Testar rollback"
log "   5. Monitorar logs de deploy"
log ""
log "✅ Pipeline de deploy pronto para uso!"
