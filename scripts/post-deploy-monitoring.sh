#!/bin/bash

# 📊 SCRIPT DE MONITORAMENTO PÓS-DEPLOY - SISPAT 2025
# Este script implementa monitoramento contínuo pós-deploy e suporte

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
LOG_DIR="$PROJECT_ROOT/logs/post-deploy"
ALERT_LOG="$LOG_DIR/alerts.log"
METRICS_LOG="$LOG_DIR/metrics.log"
HEALTH_LOG="$LOG_DIR/health.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Criar diretórios necessários
mkdir -p "$LOG_DIR"

# Configurações de monitoramento
MONITORING_INTERVAL=300  # 5 minutos
HEALTH_CHECK_INTERVAL=60  # 1 minuto
ALERT_COOLDOWN=1800      # 30 minutos
MAX_RETRIES=3
RETRY_DELAY=30

# Configurações de alertas
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
RESPONSE_TIME_THRESHOLD=2.0
ERROR_RATE_THRESHOLD=10
UPTIME_THRESHOLD=99.9

# Função de logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_DIR/post-deploy-$TIMESTAMP.log"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_DIR/post-deploy-$TIMESTAMP.log"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_DIR/post-deploy-$TIMESTAMP.log"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_DIR/post-deploy-$TIMESTAMP.log"
}

# Função para verificar se um alerta já foi enviado recentemente
is_alert_cooldown() {
    local alert_type=$1
    local cooldown_file="$LOG_DIR/.cooldown_$alert_type"
    
    if [ -f "$cooldown_file" ]; then
        local last_alert=$(cat "$cooldown_file")
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_alert))
        
        if [ $time_diff -lt $ALERT_COOLDOWN ]; then
            return 0  # Em cooldown
        fi
    fi
    
    return 1  # Não está em cooldown
}

# Função para registrar alerta
register_alert() {
    local alert_type=$1
    local cooldown_file="$LOG_DIR/.cooldown_$alert_type"
    echo "$(date +%s)" > "$cooldown_file"
}

# Função para obter métricas detalhadas
get_detailed_metrics() {
    local metrics=()
    
    # CPU detalhado
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    local cpu_cores=$(nproc)
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | cut -d',' -f1)
    metrics+=("cpu_usage:$cpu_usage")
    metrics+=("cpu_cores:$cpu_cores")
    metrics+=("load_avg:$load_avg")
    
    # Memória detalhada
    local memory_total=$(free -m | grep Mem | awk '{print $2}')
    local memory_used=$(free -m | grep Mem | awk '{print $3}')
    local memory_free=$(free -m | grep Mem | awk '{print $4}')
    local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    metrics+=("memory_total:${memory_total}MB")
    metrics+=("memory_used:${memory_used}MB")
    metrics+=("memory_free:${memory_free}MB")
    metrics+=("memory_usage:$memory_usage")
    
    # Disco detalhado
    local disk_total=$(df -h / | awk 'NR==2{print $2}')
    local disk_used=$(df -h / | awk 'NR==2{print $3}')
    local disk_free=$(df -h / | awk 'NR==2{print $4}')
    local disk_usage=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)
    metrics+=("disk_total:$disk_total")
    metrics+=("disk_used:$disk_used")
    metrics+=("disk_free:$disk_free")
    metrics+=("disk_usage:$disk_usage")
    
    # Rede
    local network_in=$(cat /proc/net/dev | grep eth0 | awk '{print $2}' 2>/dev/null || echo "0")
    local network_out=$(cat /proc/net/dev | grep eth0 | awk '{print $10}' 2>/dev/null || echo "0")
    metrics+=("network_in:$network_in")
    metrics+=("network_out:$network_out")
    
    # Uptime
    local uptime_seconds=$(cat /proc/uptime | awk '{print $1}')
    local uptime_days=$(echo "scale=0; $uptime_seconds/86400" | bc)
    local uptime_hours=$(echo "scale=0; ($uptime_seconds%86400)/3600" | bc)
    metrics+=("uptime_days:$uptime_days")
    metrics+=("uptime_hours:$uptime_hours")
    
    echo "${metrics[@]}"
}

# Função para verificar saúde da aplicação
check_application_health() {
    local health_status="healthy"
    local issues=()
    
    # Verificar backend
    local backend_status="down"
    local response_time="N/A"
    local http_code="N/A"
    
    if command -v curl >/dev/null 2>&1; then
        local curl_output=$(curl -s -o /dev/null -w "%{http_code}:%{time_total}" http://localhost:3001/api/health 2>/dev/null || echo "000:0")
        http_code=$(echo "$curl_output" | cut -d':' -f1)
        response_time=$(echo "$curl_output" | cut -d':' -f2)
        
        if [ "$http_code" = "200" ]; then
            backend_status="up"
        else
            health_status="unhealthy"
            issues+=("Backend retornou código $http_code")
        fi
        
        if [ "$response_time" != "N/A" ] && (( $(echo "$response_time > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
            health_status="degraded"
            issues+=("Tempo de resposta alto: ${response_time}s")
        fi
    else
        health_status="unhealthy"
        issues+=("curl não disponível para verificação")
    fi
    
    # Verificar banco de dados
    local db_status="down"
    if command -v psql >/dev/null 2>&1; then
        if psql -h localhost -U postgres -d sispat -c "SELECT 1;" >/dev/null 2>&1; then
            db_status="up"
        else
            health_status="unhealthy"
            issues+=("Banco de dados não acessível")
        fi
    else
        health_status="unhealthy"
        issues+=("psql não disponível para verificação")
    fi
    
    # Verificar processos PM2
    local pm2_processes=$(pm2 list 2>/dev/null | grep -c "online" || echo "0")
    if [ "$pm2_processes" -eq 0 ]; then
        health_status="unhealthy"
        issues+=("Nenhum processo PM2 online")
    fi
    
    # Verificar logs de erro
    local error_count=$(check_error_logs)
    if [ "$error_count" -gt "$ERROR_RATE_THRESHOLD" ]; then
        health_status="degraded"
        issues+=("Alto número de erros: $error_count")
    fi
    
    echo "$health_status|${issues[*]}"
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

# Função para verificar serviços críticos
check_critical_services() {
    local services=()
    local failed_services=()
    
    # PostgreSQL
    if netstat -tuln | grep -q ":5432 "; then
        services+=("postgresql:up")
    else
        services+=("postgresql:down")
        failed_services+=("postgresql")
    fi
    
    # Nginx
    if netstat -tuln | grep -q ":80 "; then
        services+=("nginx:up")
    else
        services+=("nginx:down")
        failed_services+=("nginx")
    fi
    
    # SISPAT Backend
    if netstat -tuln | grep -q ":3001 "; then
        services+=("sispat_backend:up")
    else
        services+=("sispat_backend:down")
        failed_services+=("sispat_backend")
    fi
    
    # SISPAT Frontend
    if netstat -tuln | grep -q ":5173 "; then
        services+=("sispat_frontend:up")
    else
        services+=("sispat_frontend:down")
        failed_services+=("sispat_frontend")
    fi
    
    echo "${services[@]}|${failed_services[*]}"
}

# Função para executar ações de recuperação
execute_recovery_actions() {
    local issue_type=$1
    local retry_count=${2:-0}
    
    log "Executando ações de recuperação para: $issue_type (tentativa $((retry_count + 1)))"
    
    case $issue_type in
        "backend_down")
            log "Tentando reiniciar backend..."
            pm2 restart all 2>/dev/null || true
            sleep 10
            ;;
        "database_down")
            log "Tentando reiniciar PostgreSQL..."
            systemctl restart postgresql 2>/dev/null || true
            sleep 15
            ;;
        "nginx_down")
            log "Tentando reiniciar Nginx..."
            systemctl restart nginx 2>/dev/null || true
            sleep 5
            ;;
        "high_cpu")
            log "Verificando processos com alto uso de CPU..."
            top -bn1 | head -20
            ;;
        "high_memory")
            log "Verificando processos com alto uso de memória..."
            ps aux --sort=-%mem | head -10
            ;;
        "disk_full")
            log "Verificando uso de disco..."
            df -h
            log "Limpando logs antigos..."
            find "$PROJECT_ROOT/logs" -name "*.log" -mtime +7 -delete 2>/dev/null || true
            ;;
    esac
    
    # Aguardar e verificar se o problema foi resolvido
    sleep 30
    return 0
}

# Função para enviar alerta
send_alert() {
    local level=$1
    local message=$2
    local alert_type=$3
    
    # Verificar cooldown
    if is_alert_cooldown "$alert_type"; then
        return 0
    fi
    
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
    
    # Registrar alerta
    register_alert "$alert_type"
    
    # Tentar executar ações de recuperação para alertas críticos
    if [ "$level" = "CRITICAL" ]; then
        case $alert_type in
            "backend_down")
                execute_recovery_actions "backend_down"
                ;;
            "database_down")
                execute_recovery_actions "database_down"
                ;;
            "nginx_down")
                execute_recovery_actions "nginx_down"
                ;;
            "disk_full")
                execute_recovery_actions "disk_full"
                ;;
        esac
    fi
}

# Função para monitoramento contínuo
monitor_continuous() {
    local duration=${1:-86400}  # 24 horas por padrão
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    
    log "Iniciando monitoramento pós-deploy por $((duration / 3600)) horas"
    
    while [ $(date +%s) -lt $end_time ]; do
        local current_time=$(date '+%Y-%m-%d %H:%M:%S')
        log "=== Verificação de Saúde - $current_time ==="
        
        # Obter métricas detalhadas
        local metrics=($(get_detailed_metrics))
        local health_info=$(check_application_health)
        local health_status=$(echo "$health_info" | cut -d'|' -f1)
        local health_issues=$(echo "$health_info" | cut -d'|' -f2)
        local services_info=$(check_critical_services)
        local services=$(echo "$services_info" | cut -d'|' -f1)
        local failed_services=$(echo "$services_info" | cut -d'|' -f2)
        
        # Log das métricas
        echo "[$current_time] METRICS: ${metrics[*]}" >> "$METRICS_LOG"
        echo "[$current_time] HEALTH: $health_status - $health_issues" >> "$HEALTH_LOG"
        
        # Verificar alertas
        for metric in "${metrics[@]}"; do
            local name=$(echo "$metric" | cut -d':' -f1)
            local value=$(echo "$metric" | cut -d':' -f2)
            
            case $name in
                "cpu_usage")
                    if (( $(echo "$value > $CPU_THRESHOLD" | bc -l) )); then
                        send_alert "WARNING" "Uso de CPU alto: ${value}% (limite: ${CPU_THRESHOLD}%)" "high_cpu"
                    fi
                    ;;
                "memory_usage")
                    if (( $(echo "$value > $MEMORY_THRESHOLD" | bc -l) )); then
                        send_alert "WARNING" "Uso de memória alto: ${value}% (limite: ${MEMORY_THRESHOLD}%)" "high_memory"
                    fi
                    ;;
                "disk_usage")
                    if [ "$value" -gt "$DISK_THRESHOLD" ]; then
                        send_alert "CRITICAL" "Uso de disco alto: ${value}% (limite: ${DISK_THRESHOLD}%)" "disk_full"
                    fi
                    ;;
            esac
        done
        
        # Verificar saúde da aplicação
        if [ "$health_status" = "unhealthy" ]; then
            send_alert "CRITICAL" "Aplicação não saudável: $health_issues" "app_unhealthy"
        elif [ "$health_status" = "degraded" ]; then
            send_alert "WARNING" "Aplicação com problemas: $health_issues" "app_degraded"
        else
            log_success "Aplicação saudável"
        fi
        
        # Verificar serviços críticos
        if [ -n "$failed_services" ]; then
            for service in $failed_services; do
                send_alert "CRITICAL" "Serviço crítico offline: $service" "${service}_down"
            done
        else
            log_success "Todos os serviços críticos online"
        fi
        
        # Aguardar próxima verificação
        sleep $MONITORING_INTERVAL
    done
    
    log_success "Monitoramento pós-deploy concluído"
}

# Função para verificação única
check_once() {
    log "Executando verificação única de saúde do sistema..."
    
    # Obter métricas
    local metrics=($(get_detailed_metrics))
    local health_info=$(check_application_health)
    local health_status=$(echo "$health_info" | cut -d'|' -f1)
    local health_issues=$(echo "$health_info" | cut -d'|' -f2)
    local services_info=$(check_critical_services)
    local services=$(echo "$services_info" | cut -d'|' -f1)
    local failed_services=$(echo "$services_info" | cut -d'|' -f2)
    
    # Exibir resultados
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                    📊 VERIFICAÇÃO DE SAÚDE                  ║${NC}"
    echo -e "${PURPLE}║                        $(date '+%Y-%m-%d %H:%M:%S')                    ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    # Métricas do sistema
    echo -e "${CYAN}🖥️  MÉTRICAS DO SISTEMA${NC}"
    echo "────────────────────────────────────────────────────────────"
    for metric in "${metrics[@]}"; do
        local name=$(echo "$metric" | cut -d':' -f1)
        local value=$(echo "$metric" | cut -d':' -f2)
        echo -e "  $name: ${BLUE}$value${NC}"
    done
    echo
    
    # Status da aplicação
    echo -e "${CYAN}🏥 SAÚDE DA APLICAÇÃO${NC}"
    echo "────────────────────────────────────────────────────────────"
    case $health_status in
        "healthy")
            echo -e "  Status: ${GREEN}✅ Saudável${NC}"
            ;;
        "degraded")
            echo -e "  Status: ${YELLOW}⚠️  Degradado${NC}"
            echo -e "  Problemas: ${YELLOW}$health_issues${NC}"
            ;;
        "unhealthy")
            echo -e "  Status: ${RED}❌ Não Saudável${NC}"
            echo -e "  Problemas: ${RED}$health_issues${NC}"
            ;;
    esac
    echo
    
    # Status dos serviços
    echo -e "${CYAN}🔧 SERVIÇOS CRÍTICOS${NC}"
    echo "────────────────────────────────────────────────────────────"
    for service in $services; do
        local name=$(echo "$service" | cut -d':' -f1)
        local status=$(echo "$service" | cut -d':' -f2)
        
        case $status in
            "up")
                echo -e "  $name: ${GREEN}✅ Online${NC}"
                ;;
            "down")
                echo -e "  $name: ${RED}❌ Offline${NC}"
                ;;
        esac
    done
    echo
    
    # Resumo
    echo -e "${CYAN}📋 RESUMO${NC}"
    echo "────────────────────────────────────────────────────────────"
    if [ "$health_status" = "healthy" ] && [ -z "$failed_services" ]; then
        echo -e "  ${GREEN}✅ Sistema funcionando normalmente${NC}"
    else
        echo -e "  ${YELLOW}⚠️  Sistema com problemas identificados${NC}"
        if [ -n "$failed_services" ]; then
            echo -e "  ${RED}❌ Serviços offline: $failed_services${NC}"
        fi
    fi
}

# Função para gerar relatório de saúde
generate_health_report() {
    local report_file="$LOG_DIR/health-report-$TIMESTAMP.md"
    
    log "Gerando relatório de saúde do sistema..."
    
    # Obter métricas
    local metrics=($(get_detailed_metrics))
    local health_info=$(check_application_health)
    local health_status=$(echo "$health_info" | cut -d'|' -f1)
    local health_issues=$(echo "$health_info" | cut -d'|' -f2)
    local services_info=$(check_critical_services)
    local services=$(echo "$services_info" | cut -d'|' -f1)
    local failed_services=$(echo "$services_info" | cut -d'|' -f2)
    
    cat > "$report_file" << EOF
# 🏥 RELATÓRIO DE SAÚDE DO SISTEMA - SISPAT 2025

**Data/Hora**: $(date '+%d/%m/%Y %H:%M:%S')
**Status Geral**: $health_status

## 📊 Métricas do Sistema

EOF

    for metric in "${metrics[@]}"; do
        local name=$(echo "$metric" | cut -d':' -f1)
        local value=$(echo "$metric" | cut -d':' -f2)
        echo "- **$name**: $value" >> "$report_file"
    done

    cat >> "$report_file" << EOF

## 🏥 Saúde da Aplicação

- **Status**: $health_status
- **Problemas**: $health_issues

## 🔧 Serviços Críticos

EOF

    for service in $services; do
        local name=$(echo "$service" | cut -d':' -f1)
        local status=$(echo "$service" | cut -d':' -f2)
        echo "- **$name**: $status" >> "$report_file"
    done

    cat >> "$report_file" << EOF

## 🚨 Alertas Recentes

EOF

    if [ -f "$ALERT_LOG" ]; then
        tail -n 10 "$ALERT_LOG" >> "$report_file"
    else
        echo "Nenhum alerta recente" >> "$report_file"
    fi

    cat >> "$report_file" << EOF

## 📈 Recomendações

EOF

    if [ "$health_status" = "unhealthy" ]; then
        echo "- **Ação Imediata**: Investigar e corrigir problemas identificados" >> "$report_file"
    elif [ "$health_status" = "degraded" ]; then
        echo "- **Monitoramento**: Acompanhar problemas identificados" >> "$report_file"
    else
        echo "- **Manutenção**: Sistema funcionando normalmente" >> "$report_file"
    fi

    if [ -n "$failed_services" ]; then
        echo "- **Serviços**: Reiniciar serviços offline: $failed_services" >> "$report_file"
    fi

    cat >> "$report_file" << EOF

---

**© 2025 SISPAT - Sistema de Patrimônio**
EOF

    log_success "Relatório de saúde gerado: $report_file"
}

# Função para limpar logs antigos
cleanup_old_logs() {
    local days=${1:-7}
    
    log "Limpando logs antigos (mais de $days dias)..."
    
    find "$LOG_DIR" -name "*.log" -mtime +$days -delete 2>/dev/null || true
    find "$LOG_DIR" -name "*.md" -mtime +$days -delete 2>/dev/null || true
    find "$LOG_DIR" -name ".cooldown_*" -mtime +$days -delete 2>/dev/null || true
    
    log_success "Limpeza de logs concluída"
}

# Menu principal
show_menu() {
    echo -e "${BLUE}📊 MONITORAMENTO PÓS-DEPLOY - SISPAT 2025${NC}"
    echo "=============================================="
    echo "1. Monitoramento Contínuo (24h)"
    echo "2. Verificação Única"
    echo "3. Gerar Relatório de Saúde"
    echo "4. Limpar Logs Antigos"
    echo "5. Sair"
    echo "=============================================="
}

# Função principal
main() {
    case ${1:-"menu"} in
        "monitor"|"continuous")
            monitor_continuous ${2:-86400}
            ;;
        "check"|"once")
            check_once
            ;;
        "report"|"health")
            generate_health_report
            ;;
        "cleanup")
            cleanup_old_logs ${2:-7}
            ;;
        "menu"|*)
            show_menu
            read -p "Escolha uma opção: " choice
            case $choice in
                1) monitor_continuous 86400 ;;
                2) check_once ;;
                3) generate_health_report ;;
                4) cleanup_old_logs 7 ;;
                5) exit 0 ;;
                *) echo "Opção inválida" ;;
            esac
            ;;
    esac
}

# Executar função principal
main "$@"
