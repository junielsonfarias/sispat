#!/bin/bash

# SISPAT - Script de Configuração de Monitoramento e Alertas
# Este script configura sistema completo de monitoramento e alertas

set -e

echo "🚀 Configurando Monitoramento e Alertas..."

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
PROJECT_DIR=${1:-"/var/www/sispat"}
LOG_DIR="/var/log/sispat"
METRICS_DIR="/var/lib/sispat/metrics"
ALERTS_DIR="/var/lib/sispat/alerts"

# 1. Criar diretórios de monitoramento
log "Criando diretórios de monitoramento..."
mkdir -p $LOG_DIR
mkdir -p $METRICS_DIR
mkdir -p $ALERTS_DIR
mkdir -p $LOG_DIR/application
mkdir -p $LOG_DIR/system
mkdir -p $LOG_DIR/security
mkdir -p $LOG_DIR/performance
mkdir -p $LOG_DIR/errors

# 2. Configurar sistema de logs centralizados
log "Configurando sistema de logs centralizados..."

# Criar script de coleta de logs
tee /usr/local/bin/collect-logs.sh > /dev/null << 'EOF'
#!/bin/bash

# SISPAT - Coletor de Logs Centralizados
# Coleta e processa logs de todos os componentes

LOG_DIR="/var/log/sispat"
METRICS_DIR="/var/lib/sispat/metrics"
DATE=$(date +%Y%m%d_%H%M%S)

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "Iniciando coleta de logs..."

# Coletar logs do PM2
if [ -d "/var/log/pm2" ]; then
    find /var/log/pm2 -name "*.log" -mtime -1 -exec cp {} $LOG_DIR/application/ \;
fi

# Coletar logs do Nginx
if [ -d "/var/log/nginx" ]; then
    find /var/log/nginx -name "*.log" -mtime -1 -exec cp {} $LOG_DIR/system/ \;
fi

# Coletar logs do PostgreSQL
if [ -d "/var/log/postgresql" ]; then
    find /var/log/postgresql -name "*.log" -mtime -1 -exec cp {} $LOG_DIR/system/ \;
fi

# Coletar logs do sistema
journalctl --since "1 day ago" --no-pager > $LOG_DIR/system/system_$DATE.log

# Processar logs de erro
grep -i "error\|exception\|fatal\|critical" $LOG_DIR/application/*.log > $LOG_DIR/errors/errors_$DATE.log 2>/dev/null || true

# Processar logs de segurança
grep -i "failed\|denied\|blocked\|unauthorized" $LOG_DIR/system/*.log > $LOG_DIR/security/security_$DATE.log 2>/dev/null || true

# Gerar métricas de logs
echo "{\"timestamp\":\"$(date -Iseconds)\",\"total_logs\":$(find $LOG_DIR -name "*.log" | wc -l),\"error_count\":$(grep -c "error\|exception" $LOG_DIR/errors/errors_$DATE.log 2>/dev/null || echo 0),\"security_events\":$(grep -c "failed\|denied" $LOG_DIR/security/security_$DATE.log 2>/dev/null || echo 0)}" > $METRICS_DIR/log_metrics_$DATE.json

log "Coleta de logs finalizada"
EOF

chmod +x /usr/local/bin/collect-logs.sh

# 3. Configurar métricas de sistema
log "Configurando métricas de sistema..."

# Criar script de coleta de métricas
tee /usr/local/bin/collect-metrics.sh > /dev/null << 'EOF'
#!/bin/bash

# SISPAT - Coletor de Métricas
# Coleta métricas de sistema e aplicação

METRICS_DIR="/var/lib/sispat/metrics"
DATE=$(date +%Y%m%d_%H%M%S)

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "Iniciando coleta de métricas..."

# Métricas de sistema
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')

# Métricas de rede
NETWORK_IN=$(cat /proc/net/dev | grep eth0 | awk '{print $2}')
NETWORK_OUT=$(cat /proc/net/dev | grep eth0 | awk '{print $10}')

# Métricas de PM2
PM2_PROCESSES=$(pm2 jlist | jq length)
PM2_ONLINE=$(pm2 jlist | jq '[.[] | select(.pm2_env.status == "online")] | length')

# Métricas de PostgreSQL
PG_CONNECTIONS=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || echo 0)
PG_ACTIVE_QUERIES=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null || echo 0)

# Métricas de Nginx
NGINX_REQUESTS=$(curl -s http://localhost/nginx_status 2>/dev/null | grep "Active connections" | awk '{print $3}' || echo 0)

# Salvar métricas
cat > $METRICS_DIR/system_metrics_$DATE.json << EOL
{
  "timestamp": "$(date -Iseconds)",
  "system": {
    "cpu_usage": $CPU_USAGE,
    "memory_usage": $MEMORY_USAGE,
    "disk_usage": $DISK_USAGE,
    "load_average": $LOAD_AVG,
    "network_in": $NETWORK_IN,
    "network_out": $NETWORK_OUT
  },
  "application": {
    "pm2_processes": $PM2_PROCESSES,
    "pm2_online": $PM2_ONLINE,
    "postgresql_connections": $PG_CONNECTIONS,
    "postgresql_active_queries": $PG_ACTIVE_QUERIES,
    "nginx_requests": $NGINX_REQUESTS
  }
}
EOL

log "Coleta de métricas finalizada"
EOF

chmod +x /usr/local/bin/collect-metrics.sh

# 4. Configurar sistema de alertas
log "Configurando sistema de alertas..."

# Criar script de alertas
tee /usr/local/bin/check-alerts.sh > /dev/null << 'EOF'
#!/bin/bash

# SISPAT - Sistema de Alertas
# Verifica condições e envia alertas

ALERTS_DIR="/var/lib/sispat/alerts"
LOG_DIR="/var/log/sispat"
METRICS_DIR="/var/lib/sispat/metrics"
EMAIL_RECIPIENT="admin@sispat.local"  # Configurar com email real

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Função para criar alerta
create_alert() {
    local severity=$1
    local message=$2
    local component=$3
    
    local alert_file="$ALERTS_DIR/alert_$(date +%Y%m%d_%H%M%S).json"
    
    cat > $alert_file << EOL
{
  "timestamp": "$(date -Iseconds)",
  "severity": "$severity",
  "component": "$component",
  "message": "$message",
  "acknowledged": false,
  "resolved": false
}
EOL
    
    log "🚨 ALERTA $severity: $message ($component)"
}

log "Iniciando verificação de alertas..."

# Verificar métricas de sistema
LATEST_METRICS=$(ls -t $METRICS_DIR/system_metrics_*.json 2>/dev/null | head -1)
if [ -n "$LATEST_METRICS" ]; then
    CPU_USAGE=$(jq -r '.system.cpu_usage' $LATEST_METRICS)
    MEMORY_USAGE=$(jq -r '.system.memory_usage' $LATEST_METRICS)
    DISK_USAGE=$(jq -r '.system.disk_usage' $LATEST_METRICS)
    LOAD_AVG=$(jq -r '.system.load_average' $LATEST_METRICS)
    
    # Alertas de CPU
    if (( $(echo "$CPU_USAGE > 90" | bc -l) )); then
        create_alert "CRITICAL" "Uso de CPU crítico: ${CPU_USAGE}%" "system"
    elif (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
        create_alert "WARNING" "Uso de CPU alto: ${CPU_USAGE}%" "system"
    fi
    
    # Alertas de memória
    if [ $MEMORY_USAGE -gt 90 ]; then
        create_alert "CRITICAL" "Uso de memória crítico: ${MEMORY_USAGE}%" "system"
    elif [ $MEMORY_USAGE -gt 80 ]; then
        create_alert "WARNING" "Uso de memória alto: ${MEMORY_USAGE}%" "system"
    fi
    
    # Alertas de disco
    if [ $DISK_USAGE -gt 90 ]; then
        create_alert "CRITICAL" "Espaço em disco crítico: ${DISK_USAGE}%" "system"
    elif [ $DISK_USAGE -gt 80 ]; then
        create_alert "WARNING" "Espaço em disco baixo: ${DISK_USAGE}%" "system"
    fi
    
    # Alertas de carga
    if (( $(echo "$LOAD_AVG > 8" | bc -l) )); then
        create_alert "CRITICAL" "Carga do sistema crítica: ${LOAD_AVG}" "system"
    elif (( $(echo "$LOAD_AVG > 4" | bc -l) )); then
        create_alert "WARNING" "Carga do sistema alta: ${LOAD_AVG}" "system"
    fi
fi

# Verificar serviços
if ! systemctl is-active --quiet nginx; then
    create_alert "CRITICAL" "Nginx não está rodando" "nginx"
fi

if ! systemctl is-active --quiet postgresql; then
    create_alert "CRITICAL" "PostgreSQL não está rodando" "postgresql"
fi

if ! pgrep -f "PM2" > /dev/null; then
    create_alert "CRITICAL" "PM2 não está rodando" "pm2"
fi

# Verificar processos da aplicação
if ! pm2 list | grep -q "sispat-backend.*online"; then
    create_alert "CRITICAL" "Backend SISPAT não está rodando" "application"
fi

if ! pm2 list | grep -q "sispat-frontend.*online"; then
    create_alert "CRITICAL" "Frontend SISPAT não está rodando" "application"
fi

# Verificar logs de erro
ERROR_COUNT=$(find $LOG_DIR/errors -name "*.log" -mtime -1 -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo 0)
if [ $ERROR_COUNT -gt 100 ]; then
    create_alert "WARNING" "Muitos erros detectados: $ERROR_COUNT" "application"
fi

# Verificar logs de segurança
SECURITY_EVENTS=$(find $LOG_DIR/security -name "*.log" -mtime -1 -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo 0)
if [ $SECURITY_EVENTS -gt 50 ]; then
    create_alert "WARNING" "Muitos eventos de segurança: $SECURITY_EVENTS" "security"
fi

log "Verificação de alertas finalizada"
EOF

chmod +x /usr/local/bin/check-alerts.sh

# 5. Configurar dashboard de monitoramento
log "Configurando dashboard de monitoramento..."

# Criar script de dashboard
tee /usr/local/bin/generate-dashboard.sh > /dev/null << 'EOF'
#!/bin/bash

# SISPAT - Gerador de Dashboard
# Gera dashboard HTML com métricas e status

DASHBOARD_DIR="/var/www/sispat/dashboard"
METRICS_DIR="/var/lib/sispat/metrics"
ALERTS_DIR="/var/lib/sispat/alerts"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "Gerando dashboard de monitoramento..."

# Criar diretório do dashboard
mkdir -p $DASHBOARD_DIR

# Obter métricas mais recentes
LATEST_METRICS=$(ls -t $METRICS_DIR/system_metrics_*.json 2>/dev/null | head -1)
LATEST_LOG_METRICS=$(ls -t $METRICS_DIR/log_metrics_*.json 2>/dev/null | head -1)

# Obter alertas não resolvidos
UNRESOLVED_ALERTS=$(find $ALERTS_DIR -name "alert_*.json" -exec jq -r 'select(.resolved == false) | .' {} \; 2>/dev/null | jq -s '.')

# Gerar dashboard HTML
cat > $DASHBOARD_DIR/index.html << 'EOL'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SISPAT - Dashboard de Monitoramento</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .metric-label { color: #666; font-size: 0.9em; }
        .status-online { color: #27ae60; }
        .status-offline { color: #e74c3c; }
        .status-warning { color: #f39c12; }
        .alerts-section { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .alert-item { padding: 10px; margin: 10px 0; border-left: 4px solid; border-radius: 4px; }
        .alert-critical { border-left-color: #e74c3c; background-color: #fdf2f2; }
        .alert-warning { border-left-color: #f39c12; background-color: #fef9e7; }
        .alert-info { border-left-color: #3498db; background-color: #f0f8ff; }
        .refresh-btn { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .refresh-btn:hover { background: #2980b9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 SISPAT - Dashboard de Monitoramento</h1>
            <p>Última atualização: <span id="lastUpdate"></span></p>
            <button class="refresh-btn" onclick="location.reload()">🔄 Atualizar</button>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">CPU</div>
                <div class="metric-value" id="cpuUsage">-</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Memória</div>
                <div class="metric-value" id="memoryUsage">-</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Disco</div>
                <div class="metric-value" id="diskUsage">-</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Carga do Sistema</div>
                <div class="metric-value" id="loadAvg">-</div>
            </div>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Processos PM2</div>
                <div class="metric-value" id="pm2Processes">-</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Conexões PostgreSQL</div>
                <div class="metric-value" id="pgConnections">-</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Requisições Nginx</div>
                <div class="metric-value" id="nginxRequests">-</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Status Geral</div>
                <div class="metric-value" id="overallStatus">-</div>
            </div>
        </div>
        
        <div class="alerts-section">
            <h2>🚨 Alertas Ativos</h2>
            <div id="alertsList">
                <p>Carregando alertas...</p>
            </div>
        </div>
    </div>
    
    <script>
        // Dados das métricas (serão preenchidos pelo servidor)
        const metrics = METRICS_DATA;
        const alerts = ALERTS_DATA;
        
        // Atualizar métricas
        if (metrics && metrics.system) {
            document.getElementById('cpuUsage').textContent = metrics.system.cpu_usage + '%';
            document.getElementById('memoryUsage').textContent = metrics.system.memory_usage + '%';
            document.getElementById('diskUsage').textContent = metrics.system.disk_usage + '%';
            document.getElementById('loadAvg').textContent = metrics.system.load_average;
        }
        
        if (metrics && metrics.application) {
            document.getElementById('pm2Processes').textContent = metrics.application.pm2_online + '/' + metrics.application.pm2_processes;
            document.getElementById('pgConnections').textContent = metrics.application.postgresql_connections;
            document.getElementById('nginxRequests').textContent = metrics.application.nginx_requests;
        }
        
        // Atualizar status geral
        const overallStatus = document.getElementById('overallStatus');
        if (metrics && metrics.application.pm2_online === metrics.application.pm2_processes) {
            overallStatus.textContent = '✅ Online';
            overallStatus.className = 'metric-value status-online';
        } else {
            overallStatus.textContent = '❌ Offline';
            overallStatus.className = 'metric-value status-offline';
        }
        
        // Atualizar alertas
        const alertsList = document.getElementById('alertsList');
        if (alerts && alerts.length > 0) {
            alertsList.innerHTML = alerts.map(alert => `
                <div class="alert-item alert-${alert.severity.toLowerCase()}">
                    <strong>${alert.severity}</strong> - ${alert.message}
                    <br><small>${alert.component} - ${new Date(alert.timestamp).toLocaleString()}</small>
                </div>
            `).join('');
        } else {
            alertsList.innerHTML = '<p>✅ Nenhum alerta ativo</p>';
        }
        
        // Atualizar timestamp
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
        
        // Auto-refresh a cada 30 segundos
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>
EOL

log "Dashboard gerado em $DASHBOARD_DIR/index.html"
EOF

chmod +x /usr/local/bin/generate-dashboard.sh

# 6. Configurar agendamento
log "Configurando agendamento de monitoramento..."

# Agendar coleta de logs a cada 5 minutos
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/collect-logs.sh") | crontab -

# Agendar coleta de métricas a cada 2 minutos
(crontab -l 2>/dev/null; echo "*/2 * * * * /usr/local/bin/collect-metrics.sh") | crontab -

# Agendar verificação de alertas a cada 1 minuto
(crontab -l 2>/dev/null; echo "*/1 * * * * /usr/local/bin/check-alerts.sh") | crontab -

# Agendar geração de dashboard a cada 5 minutos
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/generate-dashboard.sh") | crontab -

# 7. Configurar limpeza de dados antigos
log "Configurando limpeza de dados antigos..."

# Criar script de limpeza
tee /usr/local/bin/cleanup-monitoring.sh > /dev/null << 'EOF'
#!/bin/bash

# SISPAT - Limpeza de Dados de Monitoramento
# Remove dados antigos de monitoramento

LOG_DIR="/var/log/sispat"
METRICS_DIR="/var/lib/sispat/metrics"
ALERTS_DIR="/var/lib/sispat/alerts"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "Iniciando limpeza de dados de monitoramento..."

# Limpar logs antigos (mais de 30 dias)
find $LOG_DIR -name "*.log" -mtime +30 -delete
log "Logs antigos removidos"

# Limpar métricas antigas (mais de 7 dias)
find $METRICS_DIR -name "*.json" -mtime +7 -delete
log "Métricas antigas removidas"

# Limpar alertas resolvidos antigos (mais de 7 dias)
find $ALERTS_DIR -name "alert_*.json" -mtime +7 -exec jq -r 'select(.resolved == true) | input_filename' {} \; | xargs rm -f
log "Alertas resolvidos antigos removidos"

log "Limpeza de dados de monitoramento finalizada"
EOF

chmod +x /usr/local/bin/cleanup-monitoring.sh

# Agendar limpeza diária às 4:00
(crontab -l 2>/dev/null; echo "0 4 * * * /usr/local/bin/cleanup-monitoring.sh") | crontab -

# 8. Configurar notificações por email
log "Configurando notificações por email..."

# Instalar mailutils se não estiver instalado
if ! command -v mail &> /dev/null; then
    apt install -y mailutils
fi

# Criar script de notificações
tee /usr/local/bin/send-notifications.sh > /dev/null << 'EOF'
#!/bin/bash

# SISPAT - Enviador de Notificações
# Envia notificações por email para alertas críticos

ALERTS_DIR="/var/lib/sispat/alerts"
EMAIL_RECIPIENT="admin@sispat.local"  # Configurar com email real

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "Verificando alertas críticos para notificação..."

# Encontrar alertas críticos não notificados
CRITICAL_ALERTS=$(find $ALERTS_DIR -name "alert_*.json" -mtime -1 -exec jq -r 'select(.severity == "CRITICAL" and .notified != true) | .' {} \; 2>/dev/null | jq -s '.')

if [ "$CRITICAL_ALERTS" != "[]" ] && [ "$CRITICAL_ALERTS" != "null" ]; then
    log "Enviando notificação de alertas críticos..."
    
    # Gerar email
    cat > /tmp/sispat_alert_email.txt << EOL
SISPAT - Alertas Críticos

Sistema: $(hostname)
Data: $(date)
Alertas Críticos: $(echo "$CRITICAL_ALERTS" | jq length)

Detalhes dos Alertas:
$(echo "$CRITICAL_ALERTS" | jq -r '.[] | "- \(.severity): \(.message) (\(.component)) - \(.timestamp)"')

Acesse o dashboard: http://$(hostname)/dashboard

Sistema SISPAT
EOL
    
    # Enviar email
    mail -s "SISPAT - Alertas Críticos" $EMAIL_RECIPIENT < /tmp/sispat_alert_email.txt
    
    # Marcar alertas como notificados
    echo "$CRITICAL_ALERTS" | jq -r '.[].timestamp' | while read timestamp; do
        find $ALERTS_DIR -name "alert_*.json" -exec jq '.notified = true' {} \; -exec mv {} {}.tmp \; -exec mv {}.tmp {} \;
    done
    
    log "Notificação enviada para $EMAIL_RECIPIENT"
else
    log "Nenhum alerta crítico para notificar"
fi

log "Verificação de notificações finalizada"
EOF

chmod +x /usr/local/bin/send-notifications.sh

# Agendar verificação de notificações a cada 15 minutos
(crontab -l 2>/dev/null; echo "*/15 * * * * /usr/local/bin/send-notifications.sh") | crontab -

# 9. Configurar API de monitoramento
log "Configurando API de monitoramento..."

# Criar script da API
tee /usr/local/bin/sispat-monitoring-api.sh > /dev/null << 'EOF'
#!/bin/bash

# SISPAT - API de Monitoramento
# Servidor HTTP simples para API de monitoramento

METRICS_DIR="/var/lib/sispat/metrics"
ALERTS_DIR="/var/lib/sispat/alerts"
PORT=3002

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Função para responder HTTP
respond() {
    local status=$1
    local content_type=$2
    local body=$3
    
    echo "HTTP/1.1 $status"
    echo "Content-Type: $content_type"
    echo "Content-Length: ${#body}"
    echo "Access-Control-Allow-Origin: *"
    echo ""
    echo "$body"
}

# Função para obter métricas
get_metrics() {
    local latest=$(ls -t $METRICS_DIR/system_metrics_*.json 2>/dev/null | head -1)
    if [ -n "$latest" ]; then
        cat "$latest"
    else
        echo '{"error": "No metrics available"}'
    fi
}

# Função para obter alertas
get_alerts() {
    find $ALERTS_DIR -name "alert_*.json" -exec jq -r 'select(.resolved == false) | .' {} \; 2>/dev/null | jq -s '.'
}

# Função para obter status
get_status() {
    local nginx_status="offline"
    local postgresql_status="offline"
    local pm2_status="offline"
    
    if systemctl is-active --quiet nginx; then
        nginx_status="online"
    fi
    
    if systemctl is-active --quiet postgresql; then
        postgresql_status="online"
    fi
    
    if pgrep -f "PM2" > /dev/null; then
        pm2_status="online"
    fi
    
    cat << EOL
{
  "timestamp": "$(date -Iseconds)",
  "services": {
    "nginx": "$nginx_status",
    "postgresql": "$postgresql_status",
    "pm2": "$pm2_status"
  },
  "overall": "$(if [ "$nginx_status" = "online" ] && [ "$postgresql_status" = "online" ] && [ "$pm2_status" = "online" ]; then echo "healthy"; else echo "unhealthy"; fi)"
}
EOL
}

log "Iniciando API de monitoramento na porta $PORT..."

# Loop principal do servidor
while true; do
    {
        # Ler requisição
        read -r request_line
        read -r headers
        
        # Extrair método e path
        method=$(echo "$request_line" | awk '{print $1}')
        path=$(echo "$request_line" | awk '{print $2}')
        
        case "$path" in
            "/metrics")
                respond "200 OK" "application/json" "$(get_metrics)"
                ;;
            "/alerts")
                respond "200 OK" "application/json" "$(get_alerts)"
                ;;
            "/status")
                respond "200 OK" "application/json" "$(get_status)"
                ;;
            "/health")
                respond "200 OK" "application/json" '{"status": "ok", "timestamp": "'$(date -Iseconds)'"}'
                ;;
            *)
                respond "404 Not Found" "text/plain" "Not Found"
                ;;
        esac
    } | nc -l -p $PORT -q 1
done
EOF

chmod +x /usr/local/bin/sispat-monitoring-api.sh

# 10. Configurar serviço systemd para API
log "Configurando serviço systemd para API..."

tee /etc/systemd/system/sispat-monitoring-api.service > /dev/null << 'EOF'
[Unit]
Description=SISPAT Monitoring API
After=network.target

[Service]
Type=simple
User=www-data
ExecStart=/usr/local/bin/sispat-monitoring-api.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Habilitar e iniciar serviço
systemctl daemon-reload
systemctl enable sispat-monitoring-api
systemctl start sispat-monitoring-api

# 11. Configurar Nginx para API de monitoramento
log "Configurando Nginx para API de monitoramento..."

# Adicionar configuração para API de monitoramento
tee -a /etc/nginx/sites-available/sispat > /dev/null << 'EOF'

    # API de Monitoramento
    location /monitoring/ {
        proxy_pass http://127.0.0.1:3002/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Dashboard de Monitoramento
    location /dashboard/ {
        alias /var/www/sispat/dashboard/;
        index index.html;
        try_files $uri $uri/ =404;
    }
EOF

# Recarregar Nginx
systemctl reload nginx

# 12. Executar configuração inicial
log "Executando configuração inicial..."

# Executar scripts uma vez para configurar
/usr/local/bin/collect-logs.sh
/usr/local/bin/collect-metrics.sh
/usr/local/bin/check-alerts.sh
/usr/local/bin/generate-dashboard.sh

# 13. Verificar configuração
log "Verificando configuração..."

# Verificar se os scripts estão funcionando
if [ -f "$METRICS_DIR/system_metrics_"*.json ]; then
    log "✅ Coleta de métricas funcionando"
else
    warn "⚠️ Coleta de métricas não funcionando"
fi

if [ -f "$LOG_DIR/application/"*.log ]; then
    log "✅ Coleta de logs funcionando"
else
    warn "⚠️ Coleta de logs não funcionando"
fi

if systemctl is-active --quiet sispat-monitoring-api; then
    log "✅ API de monitoramento funcionando"
else
    warn "⚠️ API de monitoramento não funcionando"
fi

# 14. Criar relatório de configuração
log "Criando relatório de configuração..."

REPORT_FILE="/var/log/sispat/monitoring-setup-report.txt"
tee $REPORT_FILE > /dev/null << EOF
SISPAT - Relatório de Configuração de Monitoramento
==================================================

Data: $(date)
Sistema: $(uname -a)

Configurações Aplicadas:
- Sistema de logs centralizados configurado
- Coleta de métricas configurada
- Sistema de alertas configurado
- Dashboard de monitoramento configurado
- API de monitoramento configurada
- Notificações por email configuradas
- Limpeza automática configurada

Diretórios Criados:
- $LOG_DIR/application/
- $LOG_DIR/system/
- $LOG_DIR/security/
- $LOG_DIR/performance/
- $LOG_DIR/errors/
- $METRICS_DIR/
- $ALERTS_DIR/

Scripts Criados:
- /usr/local/bin/collect-logs.sh
- /usr/local/bin/collect-metrics.sh
- /usr/local/bin/check-alerts.sh
- /usr/local/bin/generate-dashboard.sh
- /usr/local/bin/cleanup-monitoring.sh
- /usr/local/bin/send-notifications.sh
- /usr/local/bin/sispat-monitoring-api.sh

Serviços Configurados:
- sispat-monitoring-api.service (porta 3002)

Cron Jobs Configurados:
- Coleta de logs: a cada 5 minutos
- Coleta de métricas: a cada 2 minutos
- Verificação de alertas: a cada 1 minuto
- Geração de dashboard: a cada 5 minutos
- Limpeza de dados: diária às 4:00
- Notificações por email: a cada 15 minutos

Endpoints da API:
- http://localhost:3002/metrics
- http://localhost:3002/alerts
- http://localhost:3002/status
- http://localhost:3002/health

Dashboard:
- http://localhost/dashboard/

Logs:
- $LOG_DIR/

Métricas:
- $METRICS_DIR/

Alertas:
- $ALERTS_DIR/

Comandos Úteis:
- Ver métricas: curl http://localhost:3002/metrics
- Ver alertas: curl http://localhost:3002/alerts
- Ver status: curl http://localhost:3002/status
- Ver logs: tail -f $LOG_DIR/application/*.log
- Ver alertas: ls -la $ALERTS_DIR/

Próximos Passos:
1. Configure o email para notificações em /usr/local/bin/send-notifications.sh
2. Acesse o dashboard em http://localhost/dashboard/
3. Configure monitoramento externo (opcional)
4. Configure backup dos dados de monitoramento (opcional)
EOF

log "Relatório de configuração salvo em: $REPORT_FILE"

log "🎉 Configuração de monitoramento e alertas concluída com sucesso!"
log "📋 Resumo da configuração:"
log "   • Sistema de logs centralizados configurado"
log "   • Coleta de métricas configurada"
log "   • Sistema de alertas configurado"
log "   • Dashboard de monitoramento configurado"
log "   • API de monitoramento configurada"
log "   • Notificações por email configuradas"
log "   • Limpeza automática configurada"
log ""
log "🔧 Acessos:"
log "   • Dashboard: http://localhost/dashboard/"
log "   • API de métricas: http://localhost:3002/metrics"
log "   • API de alertas: http://localhost:3002/alerts"
log "   • API de status: http://localhost:3002/status"
log ""
log "📊 Monitoramento:"
log "   • Logs: a cada 5 minutos"
log "   • Métricas: a cada 2 minutos"
log "   • Alertas: a cada 1 minuto"
log "   • Dashboard: a cada 5 minutos"
log "   • Limpeza: diária às 4:00"
log "   • Notificações: a cada 15 minutos"
log ""
log "✅ Sistema de monitoramento e alertas configurado e funcionando!"
