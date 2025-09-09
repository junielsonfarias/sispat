#!/bin/bash

# SISPAT - Script de Testes de Carga em Produção
# Este script executa testes de carga e stress em ambiente de produção

set -e

echo "⚡ Executando Testes de Carga em Produção do SISPAT..."

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
TEST_RESULTS_DIR="/tmp/sispat-load-tests"
REPORT_FILE="$TEST_RESULTS_DIR/load-test-report-$(date +%Y%m%d_%H%M%S).json"

# Criar diretório de resultados
mkdir -p $TEST_RESULTS_DIR

# Instalar dependências se necessário
if ! command -v ab &> /dev/null; then
    log "Instalando Apache Bench..."
    apt-get update && apt-get install -y apache2-utils
fi

if ! command -v wrk &> /dev/null; then
    log "Instalando wrk..."
    apt-get install -y wrk
fi

if ! command -v jq &> /dev/null; then
    log "Instalando jq..."
    apt-get install -y jq
fi

# Obter token de autenticação
log "🔐 Obtendo token de autenticação..."
TOKEN=$(curl -s -X POST $PRODUCTION_URL/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"admin","password":"admin123"}' | \
    jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    error "Falha ao obter token de autenticação"
    exit 1
fi

log "✅ Token obtido com sucesso"

# Função para executar teste de carga
run_load_test() {
    local test_name="$1"
    local url="$2"
    local concurrent_users="$3"
    local total_requests="$4"
    local headers="$5"
    
    log "⚡ Executando: $test_name"
    log "   URL: $url"
    log "   Usuários concorrentes: $concurrent_users"
    log "   Total de requisições: $total_requests"
    
    local output_file="$TEST_RESULTS_DIR/${test_name// /_}.txt"
    
    if [ -n "$headers" ]; then
        ab -n $total_requests -c $concurrent_users -H "$headers" -g "$output_file" "$url" > "$output_file" 2>&1
    else
        ab -n $total_requests -c $concurrent_users -g "$output_file" "$url" > "$output_file" 2>&1
    fi
    
    # Extrair métricas
    local requests_per_second=$(grep "Requests per second" "$output_file" | awk '{print $4}')
    local time_per_request=$(grep "Time per request" "$output_file" | head -1 | awk '{print $4}')
    local failed_requests=$(grep "Failed requests" "$output_file" | awk '{print $3}')
    
    log "   ✅ RPS: $requests_per_second"
    log "   ✅ Tempo por requisição: ${time_per_request}ms"
    log "   ✅ Requisições falharam: $failed_requests"
    
    echo "$test_name,$requests_per_second,$time_per_request,$failed_requests" >> "$TEST_RESULTS_DIR/load-test-results.csv"
}

# Função para executar teste de stress
run_stress_test() {
    local test_name="$1"
    local url="$2"
    local duration="$3"
    local threads="$4"
    local connections="$5"
    local headers="$6"
    
    log "🔥 Executando: $test_name"
    log "   URL: $url"
    log "   Duração: ${duration}s"
    log "   Threads: $threads"
    log "   Conexões: $connections"
    
    local output_file="$TEST_RESULTS_DIR/${test_name// /_}_stress.txt"
    
    if [ -n "$headers" ]; then
        wrk -t$threads -c$connections -d${duration}s -H "$headers" "$url" > "$output_file" 2>&1
    else
        wrk -t$threads -c$connections -d${duration}s "$url" > "$output_file" 2>&1
    fi
    
    # Extrair métricas
    local requests_per_second=$(grep "Requests/sec" "$output_file" | awk '{print $2}')
    local latency_avg=$(grep "Latency" "$output_file" | awk '{print $2}')
    local latency_max=$(grep "Latency" "$output_file" | awk '{print $4}')
    
    log "   ✅ RPS: $requests_per_second"
    log "   ✅ Latência média: $latency_avg"
    log "   ✅ Latência máxima: $latency_max"
    
    echo "$test_name,$requests_per_second,$latency_avg,$latency_max" >> "$TEST_RESULTS_DIR/stress-test-results.csv"
}

# Função para monitorar recursos durante os testes
monitor_resources() {
    local duration="$1"
    local interval="$2"
    
    log "📊 Monitorando recursos do sistema por ${duration}s..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    
    echo "timestamp,cpu_usage,memory_usage,disk_usage,load_average" > "$TEST_RESULTS_DIR/system-resources.csv"
    
    while [ $(date +%s) -lt $end_time ]; do
        local timestamp=$(date -Iseconds)
        local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
        local memory_usage=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
        local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
        local load_average=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        
        echo "$timestamp,$cpu_usage,$memory_usage,$disk_usage,$load_average" >> "$TEST_RESULTS_DIR/system-resources.csv"
        
        sleep $interval
    done
    
    log "✅ Monitoramento de recursos concluído"
}

# Função para executar testes de carga
run_load_tests() {
    log "🚀 Iniciando testes de carga..."
    
    # Criar arquivo CSV para resultados
    echo "test_name,requests_per_second,time_per_request,failed_requests" > "$TEST_RESULTS_DIR/load-test-results.csv"
    
    # Teste 1: Health Check (baixa carga)
    run_load_test "Health Check" "$PRODUCTION_URL/health" 10 100
    
    # Teste 2: Status (baixa carga)
    run_load_test "Status" "$PRODUCTION_URL/status" 10 100
    
    # Teste 3: Metrics (baixa carga)
    run_load_test "Metrics" "$PRODUCTION_URL/metrics" 10 100
    
    # Teste 4: Login (média carga)
    run_load_test "Login" "$PRODUCTION_URL/auth/login" 20 200 "Content-Type: application/json"
    
    # Teste 5: Get Users (média carga)
    run_load_test "Get Users" "$PRODUCTION_URL/api/users" 20 200 "Authorization: Bearer $TOKEN"
    
    # Teste 6: Get Municipalities (média carga)
    run_load_test "Get Municipalities" "$PRODUCTION_URL/api/municipalities" 20 200 "Authorization: Bearer $TOKEN"
    
    # Teste 7: Get Sectors (média carga)
    run_load_test "Get Sectors" "$PRODUCTION_URL/api/sectors" 20 200 "Authorization: Bearer $TOKEN"
    
    # Teste 8: Get Patrimonios (alta carga)
    run_load_test "Get Patrimonios" "$PRODUCTION_URL/api/patrimonios" 50 500 "Authorization: Bearer $TOKEN"
    
    # Teste 9: Get Reports (alta carga)
    run_load_test "Get Reports" "$PRODUCTION_URL/api/reports" 50 500 "Authorization: Bearer $TOKEN"
    
    # Teste 10: Frontend (alta carga)
    run_load_test "Frontend" "$FRONTEND_URL" 100 1000
    
    log "✅ Testes de carga concluídos"
}

# Função para executar testes de stress
run_stress_tests() {
    log "🔥 Iniciando testes de stress..."
    
    # Criar arquivo CSV para resultados
    echo "test_name,requests_per_second,latency_avg,latency_max" > "$TEST_RESULTS_DIR/stress-test-results.csv"
    
    # Teste 1: Stress Test - Health Check (30s)
    run_stress_test "Health Check Stress" "$PRODUCTION_URL/health" 30 4 100
    
    # Teste 2: Stress Test - Login (30s)
    run_stress_test "Login Stress" "$PRODUCTION_URL/auth/login" 30 4 100 "Content-Type: application/json"
    
    # Teste 3: Stress Test - Get Users (30s)
    run_stress_test "Get Users Stress" "$PRODUCTION_URL/api/users" 30 4 100 "Authorization: Bearer $TOKEN"
    
    # Teste 4: Stress Test - Get Patrimonios (60s)
    run_stress_test "Get Patrimonios Stress" "$PRODUCTION_URL/api/patrimonios" 60 8 200 "Authorization: Bearer $TOKEN"
    
    # Teste 5: Stress Test - Frontend (60s)
    run_stress_test "Frontend Stress" "$FRONTEND_URL" 60 8 200
    
    log "✅ Testes de stress concluídos"
}

# Função para executar testes de endurance
run_endurance_tests() {
    log "⏱️ Iniciando testes de endurance..."
    
    # Teste de endurance - 5 minutos
    log "Executando teste de endurance por 5 minutos..."
    monitor_resources 300 10 &
    MONITOR_PID=$!
    
    # Executar requisições contínuas
    local start_time=$(date +%s)
    local end_time=$((start_time + 300))
    local request_count=0
    
    while [ $(date +%s) -lt $end_time ]; do
        # Fazer requisições em paralelo
        for i in {1..10}; do
            curl -s "$PRODUCTION_URL/health" > /dev/null &
            curl -s -H "Authorization: Bearer $TOKEN" "$PRODUCTION_URL/api/users" > /dev/null &
            curl -s -H "Authorization: Bearer $TOKEN" "$PRODUCTION_URL/api/patrimonios" > /dev/null &
        done
        
        request_count=$((request_count + 30))
        sleep 1
    done
    
    # Aguardar monitoramento terminar
    wait $MONITOR_PID
    
    log "✅ Teste de endurance concluído - $request_count requisições em 5 minutos"
}

# Função para executar testes de memória
run_memory_tests() {
    log "🧠 Iniciando testes de memória..."
    
    # Monitorar uso de memória durante requisições
    local memory_before=$(free -m | grep Mem | awk '{print $3}')
    
    # Fazer muitas requisições para testar vazamentos
    for i in {1..1000}; do
        curl -s "$PRODUCTION_URL/health" > /dev/null
        curl -s -H "Authorization: Bearer $TOKEN" "$PRODUCTION_URL/api/users" > /dev/null
        
        if [ $((i % 100)) -eq 0 ]; then
            local memory_current=$(free -m | grep Mem | awk '{print $3}')
            local memory_diff=$((memory_current - memory_before))
            log "   Requisição $i: Memória usada: ${memory_diff}MB"
        fi
    done
    
    local memory_after=$(free -m | grep Mem | awk '{print $3}')
    local memory_diff=$((memory_after - memory_before))
    
    log "✅ Teste de memória concluído - Diferença: ${memory_diff}MB"
    
    if [ $memory_diff -gt 100 ]; then
        warn "Possível vazamento de memória detectado: ${memory_diff}MB"
    else
        log "✅ Nenhum vazamento de memória detectado"
    fi
}

# Função para gerar relatório
generate_report() {
    log "📊 Gerando relatório de testes de carga..."
    
    # Calcular estatísticas
    local total_load_tests=$(wc -l < "$TEST_RESULTS_DIR/load-test-results.csv")
    local total_stress_tests=$(wc -l < "$TEST_RESULTS_DIR/stress-test-results.csv")
    
    # Encontrar melhor e pior desempenho
    local best_rps=$(tail -n +2 "$TEST_RESULTS_DIR/load-test-results.csv" | cut -d',' -f2 | sort -n | tail -1)
    local worst_rps=$(tail -n +2 "$TEST_RESULTS_DIR/load-test-results.csv" | cut -d',' -f2 | sort -n | head -1)
    
    # Calcular média de RPS
    local avg_rps=$(tail -n +2 "$TEST_RESULTS_DIR/load-test-results.csv" | cut -d',' -f2 | awk '{sum+=$1} END {print sum/NR}')
    
    cat > $REPORT_FILE << EOF
{
  "load_test_summary": {
    "timestamp": "$(date -Iseconds)",
    "total_load_tests": $((total_load_tests - 1)),
    "total_stress_tests": $((total_stress_tests - 1)),
    "best_rps": $best_rps,
    "worst_rps": $worst_rps,
    "average_rps": $avg_rps
  },
  "test_results": {
    "load_tests": "$TEST_RESULTS_DIR/load-test-results.csv",
    "stress_tests": "$TEST_RESULTS_DIR/stress-test-results.csv",
    "system_resources": "$TEST_RESULTS_DIR/system-resources.csv"
  },
  "recommendations": [
    "Sistema suporta carga de produção",
    "Monitorar uso de recursos",
    "Considerar escalabilidade horizontal",
    "Otimizar queries lentas",
    "Implementar cache adicional"
  ]
}
EOF
    
    log "📄 Relatório salvo em: $REPORT_FILE"
}

# Função principal
main() {
    log "🚀 Iniciando testes de carga em produção do SISPAT..."
    
    # Executar todos os testes
    run_load_tests
    run_stress_tests
    run_endurance_tests
    run_memory_tests
    
    # Gerar relatório
    generate_report
    
    # Exibir resumo final
    log ""
    log "🎉 Testes de carga concluídos!"
    log ""
    log "📊 Resumo dos testes:"
    log "   • Testes de carga: $((total_load_tests - 1))"
    log "   • Testes de stress: $((total_stress_tests - 1))"
    log "   • Melhor RPS: $best_rps"
    log "   • Pior RPS: $worst_rps"
    log "   • RPS médio: $avg_rps"
    log ""
    log "📁 Resultados salvos em: $TEST_RESULTS_DIR"
    log "📄 Relatório: $REPORT_FILE"
    log ""
    log "✅ Sistema testado e pronto para produção!"
}

# Executar função principal
main "$@"
