#!/bin/bash

# 📊 SCRIPT DE MONITORAMENTO EM PRODUÇÃO - SISPAT 2025
# Este script monitora o sistema SISPAT em produção em tempo real

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs/monitoring"
ALERT_LOG="$LOG_DIR/alerts.log"
METRICS_LOG="$LOG_DIR/metrics.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Criar diretórios necessários
mkdir -p "$LOG_DIR"

# Configurações de alertas
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
RESPONSE_TIME_THRESHOLD=2.0
ERROR_RATE_THRESHOLD=5

# Função de logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_alert() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "CRITICAL")
            echo -e "${RED}[$timestamp] 🚨 CRITICAL: $message${NC}"
            echo "[$timestamp] CRITICAL: $message" >> "$ALERT_LOG"
            ;;
        "WARNING")
            echo -e "${YELLOW}[$timestamp] ⚠️  WARNING: $message${NC}"
            echo "[$timestamp] WARNING: $message" >> "$ALERT_LOG"
            ;;
        "INFO")
            echo -e "${CYAN}[$timestamp] ℹ️  INFO: $message${NC}"
            echo "[$timestamp] INFO: $message" >> "$ALERT_LOG"
            ;;
    esac
}

# Função para obter métricas do sistema
get_system_metrics() {
    local metrics=()
    
    # CPU
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    metrics+=("cpu:$cpu_usage")
    
    # Memória
    local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    metrics+=("memory:$memory_usage")
    
    # Disco
    local disk_usage=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)
    metrics+=("disk:$disk_usage")
    
    # Load Average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | cut -d',' -f1)
    metrics+=("load:$load_avg")
    
    # Uptime
    local uptime_seconds=$(cat /proc/uptime | awk '{print $1}')
    local uptime_days=$(echo "scale=0; $uptime_seconds/86400" | bc)
    metrics+=("uptime:$uptime_days")
    
    echo "${metrics[@]}"
}

# Função para obter métricas da aplicação
get_application_metrics() {
    local metrics=()
    
    # Verificar se o backend está respondendo
    local backend_status="down"
    local response_time="N/A"
    local http_code="N/A"
    
    if command -v curl >/dev/null 2>&1; then
        local curl_output=$(curl -s -o /dev/null -w "%{http_code}:%{time_total}" http://localhost:3001/api/health 2>/dev/null || echo "000:0")
        http_code=$(echo "$curl_output" | cut -d':' -f1)
        response_time=$(echo "$curl_output" | cut -d':' -f2)
        
        if [ "$http_code" = "200" ]; then
            backend_status="up"
        fi
    fi
    
    metrics+=("backend_status:$backend_status")
    metrics+=("response_time:$response_time")
    metrics+=("http_code:$http_code")
    
    # Verificar processos PM2
    local pm2_processes=$(pm2 list 2>/dev/null | grep -c "online" || echo "0")
    metrics+=("pm2_processes:$pm2_processes")
    
    # Verificar conexões de banco
    local db_connections=$(psql -h localhost -U postgres -d sispat -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ' || echo "0")
    metrics+=("db_connections:$db_connections")
    
    echo "${metrics[@]}"
}

# Função para verificar logs de erro
check_error_logs() {
    local error_count=0
    local today=$(date '+%Y-%m-%d')
    
    # Verificar logs de aplicação
    if [ -f "$PROJECT_ROOT/logs/application/error.log" ]; then
        error_count=$((error_count + $(grep -c "$today" "$PROJECT_ROOT/logs/application/error.log" 2>/dev/null || echo "0")))
    fi
    
    # Verificar logs do sistema
    if [ -f "/var/log/syslog" ]; then
        error_count=$((error_count + $(grep -c "$today.*error" /var/log/syslog 2>/dev/null || echo "0")))
    fi
    
    echo "$error_count"
}

# Função para verificar serviços
check_services() {
    local services=()
    
    # PostgreSQL
    if netstat -tuln | grep -q ":5432 "; then
        services+=("postgresql:up")
    else
        services+=("postgresql:down")
    fi
    
    # Nginx
    if netstat -tuln | grep -q ":80 "; then
        services+=("nginx:up")
    else
        services+=("nginx:down")
    fi
    
    # SISPAT Backend
    if netstat -tuln | grep -q ":3001 "; then
        services+=("sispat_backend:up")
    else
        services+=("sispat_backend:down")
    fi
    
    # SISPAT Frontend
    if netstat -tuln | grep -q ":5173 "; then
        services+=("sispat_frontend:up")
    else
        services+=("sispat_frontend:down")
    fi
    
    echo "${services[@]}"
}

# Função para verificar alertas
check_alerts() {
    local system_metrics=($(get_system_metrics))
    local app_metrics=($(get_application_metrics))
    local services=($(check_services))
    local error_count=$(check_error_logs)
    
    # Verificar CPU
    local cpu_usage=$(echo "${system_metrics[@]}" | grep -o 'cpu:[0-9.]*' | cut -d':' -f2)
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
        log_alert "WARNING" "Uso de CPU alto: ${cpu_usage}% (limite: ${CPU_THRESHOLD}%)"
    fi
    
    # Verificar Memória
    local memory_usage=$(echo "${system_metrics[@]}" | grep -o 'memory:[0-9.]*' | cut -d':' -f2)
    if (( $(echo "$memory_usage > $MEMORY_THRESHOLD" | bc -l) )); then
        log_alert "WARNING" "Uso de memória alto: ${memory_usage}% (limite: ${MEMORY_THRESHOLD}%)"
    fi
    
    # Verificar Disco
    local disk_usage=$(echo "${system_metrics[@]}" | grep -o 'disk:[0-9]*' | cut -d':' -f2)
    if [ "$disk_usage" -gt "$DISK_THRESHOLD" ]; then
        log_alert "WARNING" "Uso de disco alto: ${disk_usage}% (limite: ${DISK_THRESHOLD}%)"
    fi
    
    # Verificar Tempo de Resposta
    local response_time=$(echo "${app_metrics[@]}" | grep -o 'response_time:[0-9.]*' | cut -d':' -f2)
    if [ "$response_time" != "N/A" ] && (( $(echo "$response_time > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
        log_alert "WARNING" "Tempo de resposta alto: ${response_time}s (limite: ${RESPONSE_TIME_THRESHOLD}s)"
    fi
    
    # Verificar Status do Backend
    local backend_status=$(echo "${app_metrics[@]}" | grep -o 'backend_status:[a-z]*' | cut -d':' -f2)
    if [ "$backend_status" = "down" ]; then
        log_alert "CRITICAL" "Backend SISPAT está offline"
    fi
    
    # Verificar Serviços
    for service in "${services[@]}"; do
        local service_name=$(echo "$service" | cut -d':' -f1)
        local service_status=$(echo "$service" | cut -d':' -f2)
        
        if [ "$service_status" = "down" ]; then
            log_alert "CRITICAL" "Serviço $service_name está offline"
        fi
    done
    
    # Verificar Erros
    if [ "$error_count" -gt "$ERROR_RATE_THRESHOLD" ]; then
        log_alert "WARNING" "Alto número de erros hoje: $error_count (limite: $ERROR_RATE_THRESHOLD)"
    fi
}

# Função para exibir dashboard
show_dashboard() {
    clear
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                    📊 SISPAT MONITORING DASHBOARD            ║${NC}"
    echo -e "${PURPLE}║                        $(date '+%Y-%m-%d %H:%M:%S')                    ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    # Métricas do Sistema
    echo -e "${CYAN}🖥️  MÉTRICAS DO SISTEMA${NC}"
    echo "────────────────────────────────────────────────────────────"
    
    local system_metrics=($(get_system_metrics))
    for metric in "${system_metrics[@]}"; do
        local name=$(echo "$metric" | cut -d':' -f1)
        local value=$(echo "$metric" | cut -d':' -f2)
        
        case $name in
            "cpu")
                if (( $(echo "$value > $CPU_THRESHOLD" | bc -l) )); then
                    echo -e "  CPU: ${RED}$value%${NC} ⚠️"
                else
                    echo -e "  CPU: ${GREEN}$value%${NC} ✅"
                fi
                ;;
            "memory")
                if (( $(echo "$value > $MEMORY_THRESHOLD" | bc -l) )); then
                    echo -e "  Memória: ${RED}$value%${NC} ⚠️"
                else
                    echo -e "  Memória: ${GREEN}$value%${NC} ✅"
                fi
                ;;
            "disk")
                if [ "$value" -gt "$DISK_THRESHOLD" ]; then
                    echo -e "  Disco: ${RED}$value%${NC} ⚠️"
                else
                    echo -e "  Disco: ${GREEN}$value%${NC} ✅"
                fi
                ;;
            "load")
                echo -e "  Load Average: ${BLUE}$value${NC}"
                ;;
            "uptime")
                echo -e "  Uptime: ${BLUE}${value} dias${NC}"
                ;;
        esac
    done
    echo
    
    # Status dos Serviços
    echo -e "${CYAN}🔧 STATUS DOS SERVIÇOS${NC}"
    echo "────────────────────────────────────────────────────────────"
    
    local services=($(check_services))
    for service in "${services[@]}"; do
        local name=$(echo "$service" | cut -d':' -f1)
        local status=$(echo "$service" | cut -d':' -f2)
        
        case $name in
            "postgresql")
                if [ "$status" = "up" ]; then
                    echo -e "  PostgreSQL: ${GREEN}✅ Online${NC}"
                else
                    echo -e "  PostgreSQL: ${RED}❌ Offline${NC}"
                fi
                ;;
            "nginx")
                if [ "$status" = "up" ]; then
                    echo -e "  Nginx: ${GREEN}✅ Online${NC}"
                else
                    echo -e "  Nginx: ${RED}❌ Offline${NC}"
                fi
                ;;
            "sispat_backend")
                if [ "$status" = "up" ]; then
                    echo -e "  SISPAT Backend: ${GREEN}✅ Online${NC}"
                else
                    echo -e "  SISPAT Backend: ${RED}❌ Offline${NC}"
                fi
                ;;
            "sispat_frontend")
                if [ "$status" = "up" ]; then
                    echo -e "  SISPAT Frontend: ${GREEN}✅ Online${NC}"
                else
                    echo -e "  SISPAT Frontend: ${RED}❌ Offline${NC}"
                fi
                ;;
        esac
    done
    echo
    
    # Métricas da Aplicação
    echo -e "${CYAN}📱 MÉTRICAS DA APLICAÇÃO${NC}"
    echo "────────────────────────────────────────────────────────────"
    
    local app_metrics=($(get_application_metrics))
    for metric in "${app_metrics[@]}"; do
        local name=$(echo "$metric" | cut -d':' -f1)
        local value=$(echo "$metric" | cut -d':' -f2)
        
        case $name in
            "backend_status")
                if [ "$value" = "up" ]; then
                    echo -e "  Status da API: ${GREEN}✅ Online${NC}"
                else
                    echo -e "  Status da API: ${RED}❌ Offline${NC}"
                fi
                ;;
            "response_time")
                if [ "$value" != "N/A" ]; then
                    if (( $(echo "$value > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
                        echo -e "  Tempo de Resposta: ${RED}${value}s${NC} ⚠️"
                    else
                        echo -e "  Tempo de Resposta: ${GREEN}${value}s${NC} ✅"
                    fi
                else
                    echo -e "  Tempo de Resposta: ${YELLOW}N/A${NC}"
                fi
                ;;
            "http_code")
                if [ "$value" = "200" ]; then
                    echo -e "  HTTP Status: ${GREEN}$value${NC} ✅"
                else
                    echo -e "  HTTP Status: ${RED}$value${NC} ❌"
                fi
                ;;
            "pm2_processes")
                echo -e "  Processos PM2: ${BLUE}$value${NC}"
                ;;
            "db_connections")
                echo -e "  Conexões DB: ${BLUE}$value${NC}"
                ;;
        esac
    done
    echo
    
    # Estatísticas de Erro
    echo -e "${CYAN}📊 ESTATÍSTICAS DE ERRO${NC}"
    echo "────────────────────────────────────────────────────────────"
    
    local error_count=$(check_error_logs)
    if [ "$error_count" -gt "$ERROR_RATE_THRESHOLD" ]; then
        echo -e "  Erros Hoje: ${RED}$error_count${NC} ⚠️"
    else
        echo -e "  Erros Hoje: ${GREEN}$error_count${NC} ✅"
    fi
    echo
    
    # Últimos Alertas
    echo -e "${CYAN}🚨 ÚLTIMOS ALERTAS${NC}"
    echo "────────────────────────────────────────────────────────────"
    
    if [ -f "$ALERT_LOG" ]; then
        tail -n 5 "$ALERT_LOG" | while read line; do
            if [[ "$line" == *"CRITICAL"* ]]; then
                echo -e "  ${RED}$line${NC}"
            elif [[ "$line" == *"WARNING"* ]]; then
                echo -e "  ${YELLOW}$line${NC}"
            else
                echo -e "  ${CYAN}$line${NC}"
            fi
        done
    else
        echo -e "  ${GREEN}Nenhum alerta recente${NC}"
    fi
    echo
    
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║  Pressione Ctrl+C para sair | Atualização automática: 30s  ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
}

# Função para monitoramento contínuo
monitor_continuous() {
    local interval=${1:-30}
    
    log "Iniciando monitoramento contínuo (intervalo: ${interval}s)"
    
    while true; do
        show_dashboard
        check_alerts
        sleep "$interval"
    done
}

# Função para monitoramento único
monitor_once() {
    show_dashboard
    check_alerts
}

# Função para gerar relatório
generate_report() {
    local report_file="$LOG_DIR/monitoring-report-$TIMESTAMP.md"
    
    log "Gerando relatório de monitoramento..."
    
    cat > "$report_file" << EOF
# 📊 RELATÓRIO DE MONITORAMENTO - SISPAT 2025

**Data/Hora**: $(date)
**Período**: Última verificação

## 🖥️ Métricas do Sistema

EOF

    local system_metrics=($(get_system_metrics))
    for metric in "${system_metrics[@]}"; do
        local name=$(echo "$metric" | cut -d':' -f1)
        local value=$(echo "$metric" | cut -d':' -f2)
        echo "- **$name**: $value" >> "$report_file"
    done

    cat >> "$report_file" << EOF

## 🔧 Status dos Serviços

EOF

    local services=($(check_services))
    for service in "${services[@]}"; do
        local name=$(echo "$service" | cut -d':' -f1)
        local status=$(echo "$service" | cut -d':' -f2)
        echo "- **$name**: $status" >> "$report_file"
    done

    cat >> "$report_file" << EOF

## 📱 Métricas da Aplicação

EOF

    local app_metrics=($(get_application_metrics))
    for metric in "${app_metrics[@]}"; do
        local name=$(echo "$metric" | cut -d':' -f1)
        local value=$(echo "$metric" | cut -d':' -f2)
        echo "- **$name**: $value" >> "$report_file"
    done

    cat >> "$report_file" << EOF

## 📊 Estatísticas de Erro

- **Erros Hoje**: $(check_error_logs)

## 🚨 Alertas Recentes

EOF

    if [ -f "$ALERT_LOG" ]; then
        tail -n 10 "$ALERT_LOG" >> "$report_file"
    else
        echo "Nenhum alerta recente" >> "$report_file"
    fi

    cat >> "$report_file" << EOF

---

**© 2025 SISPAT - Sistema de Patrimônio**
EOF

    log "Relatório gerado: $report_file"
}

# Função para limpar logs antigos
cleanup_logs() {
    local days=${1:-7}
    
    log "Limpando logs antigos (mais de $days dias)..."
    
    find "$LOG_DIR" -name "*.log" -mtime +$days -delete 2>/dev/null || true
    find "$LOG_DIR" -name "*.md" -mtime +$days -delete 2>/dev/null || true
    
    log "Limpeza de logs concluída"
}

# Menu principal
show_menu() {
    echo -e "${BLUE}📊 SCRIPT DE MONITORAMENTO - SISPAT 2025${NC}"
    echo "=============================================="
    echo "1. Monitoramento Contínuo (Dashboard)"
    echo "2. Verificação Única"
    echo "3. Gerar Relatório"
    echo "4. Verificar Alertas"
    echo "5. Limpar Logs Antigos"
    echo "6. Sair"
    echo "=============================================="
}

# Função principal
main() {
    case ${1:-"menu"} in
        "continuous"|"monitor")
            monitor_continuous ${2:-30}
            ;;
        "once"|"check")
            monitor_once
            ;;
        "report")
            generate_report
            ;;
        "alerts")
            check_alerts
            ;;
        "cleanup")
            cleanup_logs ${2:-7}
            ;;
        "menu"|*)
            show_menu
            read -p "Escolha uma opção: " choice
            case $choice in
                1) monitor_continuous 30 ;;
                2) monitor_once ;;
                3) generate_report ;;
                4) check_alerts ;;
                5) cleanup_logs 7 ;;
                6) exit 0 ;;
                *) echo "Opção inválida" ;;
            esac
            ;;
    esac
}

# Executar função principal
main "$@"
