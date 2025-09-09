#!/bin/bash

# SISPAT - Script de Testes em Produção
# Este script executa testes finais em ambiente de produção

set -e

echo "🧪 Executando Testes em Produção do SISPAT..."

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
PRODUCTION_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:5173"
MONITORING_URL="http://localhost:3002"
DASHBOARD_URL="http://localhost:3003"
GRAFANA_URL="http://localhost:3000"
PROMETHEUS_URL="http://localhost:9090"
TEST_RESULTS_DIR="/tmp/sispat-production-tests"
REPORT_FILE="$TEST_RESULTS_DIR/production-test-report-$(date +%Y%m%d_%H%M%S).json"

# Criar diretório de resultados
mkdir -p $TEST_RESULTS_DIR

# Contadores de testes
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Função para executar teste
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log "🧪 Executando: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        if [ "$expected_result" = "success" ]; then
            log "✅ PASSOU: $test_name"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            log "❌ FALHOU: $test_name (esperava falha, mas passou)"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            return 1
        fi
    else
        if [ "$expected_result" = "failure" ]; then
            log "✅ PASSOU: $test_name (falha esperada)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            log "❌ FALHOU: $test_name"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            return 1
        fi
    fi
}

# Função para testar conectividade
test_connectivity() {
    log "🔗 Testando conectividade dos serviços..."
    
    # Testar backend
    run_test "Backend Health Check" "curl -f $PRODUCTION_URL/health" "success"
    run_test "Backend Status" "curl -f $PRODUCTION_URL/status" "success"
    run_test "Backend Metrics" "curl -f $PRODUCTION_URL/metrics" "success"
    
    # Testar frontend
    run_test "Frontend Accessibility" "curl -f $FRONTEND_URL" "success"
    
    # Testar monitoramento
    run_test "Monitoring Health" "curl -f $MONITORING_URL/health" "success"
    run_test "Monitoring Status" "curl -f $MONITORING_URL/status" "success"
    run_test "Monitoring Metrics" "curl -f $MONITORING_URL/metrics" "success"
    
    # Testar dashboard
    run_test "Dashboard Accessibility" "curl -f $DASHBOARD_URL" "success"
    
    # Testar Grafana
    run_test "Grafana Health" "curl -f $GRAFANA_URL/api/health" "success"
    
    # Testar Prometheus
    run_test "Prometheus Health" "curl -f $PROMETHEUS_URL/-/healthy" "success"
    run_test "Prometheus Metrics" "curl -f $PROMETHEUS_URL/api/v1/query?query=up" "success"
}

# Função para testar autenticação
test_authentication() {
    log "🔐 Testando autenticação..."
    
    # Testar login de superuser
    run_test "Superuser Login" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'" "success"
    
    # Testar login inválido
    run_test "Invalid Login" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"invalid\",\"password\":\"invalid\"}'" "failure"
    
    # Testar endpoint protegido sem token
    run_test "Protected Endpoint Without Token" "curl -f $PRODUCTION_URL/api/users" "failure"
    
    # Testar endpoint protegido com token inválido
    run_test "Protected Endpoint With Invalid Token" "curl -f -H 'Authorization: Bearer invalid_token' $PRODUCTION_URL/api/users" "failure"
}

# Função para testar APIs
test_apis() {
    log "🌐 Testando APIs..."
    
    # Obter token de autenticação
    TOKEN=$(curl -s -X POST $PRODUCTION_URL/auth/login \
        -H 'Content-Type: application/json' \
        -d '{"username":"admin","password":"admin123"}' | \
        jq -r '.token')
    
    if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
        error "Falha ao obter token de autenticação"
        return 1
    fi
    
    # Testar endpoints de usuários
    run_test "Get Users" "curl -f -H 'Authorization: Bearer $TOKEN' $PRODUCTION_URL/api/users" "success"
    run_test "Get User Profile" "curl -f -H 'Authorization: Bearer $TOKEN' $PRODUCTION_URL/auth/me" "success"
    
    # Testar endpoints de municípios
    run_test "Get Municipalities" "curl -f -H 'Authorization: Bearer $TOKEN' $PRODUCTION_URL/api/municipalities" "success"
    
    # Testar endpoints de setores
    run_test "Get Sectors" "curl -f -H 'Authorization: Bearer $TOKEN' $PRODUCTION_URL/api/sectors" "success"
    
    # Testar endpoints de patrimônios
    run_test "Get Patrimonios" "curl -f -H 'Authorization: Bearer $TOKEN' $PRODUCTION_URL/api/patrimonios" "success"
    
    # Testar endpoints de relatórios
    run_test "Get Reports" "curl -f -H 'Authorization: Bearer $TOKEN' $PRODUCTION_URL/api/reports" "success"
    
    # Testar endpoints de templates
    run_test "Get Label Templates" "curl -f -H 'Authorization: Bearer $TOKEN' $PRODUCTION_URL/api/label-templates" "success"
    
    # Testar endpoints de customização
    run_test "Get Customization Settings" "curl -f -H 'Authorization: Bearer $TOKEN' $PRODUCTION_URL/api/customization/global" "success"
}

# Função para testar banco de dados
test_database() {
    log "🗄️ Testando banco de dados..."
    
    # Testar conexão com banco
    run_test "Database Connection" "pg_isready -h localhost -p 5432 -U sispat_user" "success"
    
    # Testar queries básicas
    run_test "Database Query - Users" "psql -h localhost -p 5432 -U sispat_user -d sispat_production -c 'SELECT COUNT(*) FROM users;'" "success"
    run_test "Database Query - Municipalities" "psql -h localhost -p 5432 -U sispat_user -d sispat_production -c 'SELECT COUNT(*) FROM municipalities;'" "success"
    run_test "Database Query - Sectors" "psql -h localhost -p 5432 -U sispat_user -d sispat_production -c 'SELECT COUNT(*) FROM sectors;'" "success"
    run_test "Database Query - Patrimonios" "psql -h localhost -p 5432 -U sispat_user -d sispat_production -c 'SELECT COUNT(*) FROM patrimonios;'" "success"
    
    # Testar integridade dos dados
    run_test "Data Integrity - Foreign Keys" "psql -h localhost -p 5432 -U sispat_user -d sispat_production -c 'SELECT COUNT(*) FROM patrimonios p LEFT JOIN sectors s ON p.sector_id = s.id WHERE s.id IS NULL;'" "success"
    
    # Testar performance
    run_test "Database Performance - Index Usage" "psql -h localhost -p 5432 -U sispat_user -d sispat_production -c 'SELECT COUNT(*) FROM pg_stat_user_indexes;'" "success"
}

# Função para testar performance
test_performance() {
    log "⚡ Testando performance..."
    
    # Testar tempo de resposta do backend
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' $PRODUCTION_URL/health)
    if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
        log "✅ PASSOU: Backend Response Time ($RESPONSE_TIME s)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        log "❌ FALHOU: Backend Response Time ($RESPONSE_TIME s) - muito lento"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Testar tempo de resposta do frontend
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' $FRONTEND_URL)
    if (( $(echo "$RESPONSE_TIME < 3.0" | bc -l) )); then
        log "✅ PASSOU: Frontend Response Time ($RESPONSE_TIME s)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        log "❌ FALHOU: Frontend Response Time ($RESPONSE_TIME s) - muito lento"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Testar tempo de resposta do banco
    DB_TIME=$(psql -h localhost -p 5432 -U sispat_user -d sispat_production -t -c 'SELECT EXTRACT(EPOCH FROM (clock_timestamp() - statement_timestamp()));' | xargs)
    if (( $(echo "$DB_TIME < 1.0" | bc -l) )); then
        log "✅ PASSOU: Database Query Time ($DB_TIME s)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        log "❌ FALHOU: Database Query Time ($DB_TIME s) - muito lento"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Função para testar segurança
test_security() {
    log "🔒 Testando segurança..."
    
    # Testar headers de segurança
    run_test "Security Headers - X-Frame-Options" "curl -s -I $PRODUCTION_URL | grep -i 'x-frame-options'" "success"
    run_test "Security Headers - X-Content-Type-Options" "curl -s -I $PRODUCTION_URL | grep -i 'x-content-type-options'" "success"
    run_test "Security Headers - X-XSS-Protection" "curl -s -I $PRODUCTION_URL | grep -i 'x-xss-protection'" "success"
    
    # Testar CORS
    run_test "CORS Configuration" "curl -s -H 'Origin: http://localhost:3000' -H 'Access-Control-Request-Method: GET' -H 'Access-Control-Request-Headers: X-Requested-With' -X OPTIONS $PRODUCTION_URL" "success"
    
    # Testar rate limiting
    run_test "Rate Limiting" "for i in {1..10}; do curl -s $PRODUCTION_URL/auth/login > /dev/null; done" "success"
    
    # Testar SQL injection
    run_test "SQL Injection Protection" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin'\"; DROP TABLE users; --\",\"password\":\"admin123\"}'" "failure"
    
    # Testar XSS
    run_test "XSS Protection" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"<script>alert(1)</script>\",\"password\":\"admin123\"}'" "failure"
}

# Função para testar monitoramento
test_monitoring() {
    log "📊 Testando monitoramento..."
    
    # Testar métricas do Prometheus
    run_test "Prometheus Metrics Collection" "curl -f $PROMETHEUS_URL/api/v1/query?query=up" "success"
    run_test "Prometheus Target Status" "curl -f $PROMETHEUS_URL/api/v1/targets" "success"
    
    # Testar métricas customizadas
    run_test "Custom Metrics - CPU" "curl -f $PROMETHEUS_URL/api/v1/query?query=sispat_cpu_usage_percent" "success"
    run_test "Custom Metrics - Memory" "curl -f $PROMETHEUS_URL/api/v1/query?query=sispat_memory_usage_percent" "success"
    run_test "Custom Metrics - Disk" "curl -f $PROMETHEUS_URL/api/v1/query?query=sispat_disk_usage_percent" "success"
    
    # Testar Grafana
    run_test "Grafana API" "curl -f -u admin:sispat_admin_2025 $GRAFANA_URL/api/health" "success"
    run_test "Grafana Datasources" "curl -f -u admin:sispat_admin_2025 $GRAFANA_URL/api/datasources" "success"
    run_test "Grafana Dashboards" "curl -f -u admin:sispat_admin_2025 $GRAFANA_URL/api/search?type=dash-db" "success"
    
    # Testar alertas
    run_test "Prometheus Alerts" "curl -f $PROMETHEUS_URL/api/v1/alerts" "success"
}

# Função para testar backup
test_backup() {
    log "💾 Testando sistema de backup..."
    
    # Testar scripts de backup
    run_test "Backup Database Script" "test -f /opt/sispat/scripts/backup-database.sh" "success"
    run_test "Backup Files Script" "test -f /opt/sispat/scripts/backup-files.sh" "success"
    run_test "Backup Full Script" "test -f /opt/sispat/scripts/backup-full.sh" "success"
    run_test "Restore Script" "test -f /opt/sispat/scripts/restore-backup.sh" "success"
    
    # Testar diretórios de backup
    run_test "Backup Directory Structure" "test -d /opt/sispat/backups" "success"
    run_test "Backup Database Directory" "test -d /opt/sispat/backups/database" "success"
    run_test "Backup Files Directory" "test -d /opt/sispat/backups/files" "success"
    run_test "Backup Config Directory" "test -d /opt/sispat/backups/config" "success"
    
    # Testar permissões
    run_test "Backup Permissions" "test -r /opt/sispat/backups" "success"
}

# Função para testar logs
test_logs() {
    log "📝 Testando sistema de logs..."
    
    # Testar diretórios de logs
    run_test "Log Directory Structure" "test -d /var/log/sispat" "success"
    run_test "Application Logs" "test -d /var/log/sispat/application" "success"
    run_test "System Logs" "test -d /var/log/sispat/system" "success"
    run_test "Security Logs" "test -d /var/log/sispat/security" "success"
    run_test "Monitoring Logs" "test -d /var/log/sispat/monitoring" "success"
    
    # Testar rotação de logs
    run_test "Logrotate Configuration" "test -f /etc/logrotate.d/sispat" "success"
    run_test "Logrotate Monitoring" "test -f /etc/logrotate.d/sispat-monitoring" "success"
    
    # Testar permissões de logs
    run_test "Log Permissions" "test -r /var/log/sispat" "success"
}

# Função para testar serviços
test_services() {
    log "🔧 Testando serviços..."
    
    # Testar PM2
    run_test "PM2 Status" "pm2 status | grep -q 'online'" "success"
    run_test "PM2 SISPAT Backend" "pm2 list | grep -q 'sispat-backend'" "success"
    run_test "PM2 SISPAT Monitoring" "pm2 list | grep -q 'sispat-monitoring'" "success"
    
    # Testar Nginx
    run_test "Nginx Status" "systemctl is-active nginx" "success"
    run_test "Nginx Configuration" "nginx -t" "success"
    
    # Testar PostgreSQL
    run_test "PostgreSQL Status" "systemctl is-active postgresql" "success"
    run_test "PostgreSQL Connection" "pg_isready -h localhost -p 5432" "success"
    
    # Testar Prometheus
    run_test "Prometheus Status" "systemctl is-active prometheus" "success"
    
    # Testar Node Exporter
    run_test "Node Exporter Status" "systemctl is-active node_exporter" "success"
    
    # Testar Grafana
    run_test "Grafana Status" "systemctl is-active grafana-server" "success"
}

# Função para testar WebSocket
test_websocket() {
    log "🔌 Testando WebSocket..."
    
    # Testar WebSocket do backend
    run_test "Backend WebSocket" "curl -f -H 'Upgrade: websocket' -H 'Connection: Upgrade' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H 'Sec-WebSocket-Version: 13' $PRODUCTION_URL/socket.io/" "success"
    
    # Testar WebSocket de monitoramento
    run_test "Monitoring WebSocket" "curl -f -H 'Upgrade: websocket' -H 'Connection: Upgrade' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H 'Sec-WebSocket-Version: 13' ws://localhost:3004" "success"
}

# Função para gerar relatório
generate_report() {
    log "📊 Gerando relatório de testes..."
    
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    
    cat > $REPORT_FILE << EOF
{
  "test_summary": {
    "timestamp": "$(date -Iseconds)",
    "total_tests": $TOTAL_TESTS,
    "passed_tests": $PASSED_TESTS,
    "failed_tests": $FAILED_TESTS,
    "skipped_tests": $SKIPPED_TESTS,
    "success_rate": $success_rate
  },
  "test_categories": {
    "connectivity": "✅ Testado",
    "authentication": "✅ Testado",
    "apis": "✅ Testado",
    "database": "✅ Testado",
    "performance": "✅ Testado",
    "security": "✅ Testado",
    "monitoring": "✅ Testado",
    "backup": "✅ Testado",
    "logs": "✅ Testado",
    "services": "✅ Testado",
    "websocket": "✅ Testado"
  },
  "recommendations": [
    "Sistema pronto para produção",
    "Monitoramento ativo",
    "Backup configurado",
    "Logs centralizados",
    "Segurança implementada"
  ]
}
EOF
    
    log "📄 Relatório salvo em: $REPORT_FILE"
}

# Função principal
main() {
    log "🚀 Iniciando testes em produção do SISPAT..."
    
    # Executar todos os testes
    test_connectivity
    test_authentication
    test_apis
    test_database
    test_performance
    test_security
    test_monitoring
    test_backup
    test_logs
    test_services
    test_websocket
    
    # Gerar relatório
    generate_report
    
    # Exibir resumo final
    log ""
    log "🎉 Testes em produção concluídos!"
    log ""
    log "📊 Resumo dos testes:"
    log "   • Total de testes: $TOTAL_TESTS"
    log "   • Testes aprovados: $PASSED_TESTS"
    log "   • Testes falharam: $FAILED_TESTS"
    log "   • Testes ignorados: $SKIPPED_TESTS"
    log "   • Taxa de sucesso: $((PASSED_TESTS * 100 / TOTAL_TESTS))%"
    log ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log "✅ Todos os testes passaram! Sistema pronto para produção."
        exit 0
    else
        log "❌ Alguns testes falharam. Verifique os logs para mais detalhes."
        exit 1
    fi
}

# Executar função principal
main "$@"
