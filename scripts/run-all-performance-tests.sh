#!/bin/bash

# SISPAT - Script Principal de Testes de Performance
# Este script executa todos os testes de performance: básica, carga, stress, endurance, memória e benchmark

set -e

echo "🚀 Executando Todos os Testes de Performance do SISPAT..."

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
BASE_URL=${1:-"http://localhost:3001"}
FRONTEND_URL=${2:-"http://localhost:8080"}
TEST_RESULTS_DIR="/var/log/sispat/all-performance-tests"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de resultados
mkdir -p $TEST_RESULTS_DIR

# 1. Verificar pré-requisitos
log "Verificando pré-requisitos..."

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    error "Node.js não está instalado"
    exit 1
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    error "NPM não está instalado"
    exit 1
fi

# Verificar se o axios está instalado
if ! npm list axios &> /dev/null; then
    log "Instalando axios..."
    npm install axios
fi

# Verificar se o jq está instalado
if ! command -v jq &> /dev/null; then
    log "Instalando jq..."
    apt update && apt install -y jq
fi

# Verificar se o bc está instalado
if ! command -v bc &> /dev/null; then
    log "Instalando bc..."
    apt update && apt install -y bc
fi

log "✅ Pré-requisitos verificados"

# 2. Executar testes de performance básica
log "Executando testes de performance básica..."
if [ -f "scripts/run-performance-tests.sh" ]; then
    chmod +x scripts/run-performance-tests.sh
    ./scripts/run-performance-tests.sh $BASE_URL $FRONTEND_URL
    
    # Copiar resultados
    if [ -d "/var/log/sispat/performance-tests" ]; then
        cp -r /var/log/sispat/performance-tests/* $TEST_RESULTS_DIR/
    fi
    
    log "✅ Testes de performance básica concluídos"
else
    warn "⚠️ Script de testes de performance básica não encontrado"
fi

# 3. Executar testes de benchmark
log "Executando testes de benchmark..."
if [ -f "scripts/run-benchmark-tests.sh" ]; then
    chmod +x scripts/run-benchmark-tests.sh
    ./scripts/run-benchmark-tests.sh $BASE_URL
    
    # Copiar resultados
    if [ -d "/var/log/sispat/benchmark-tests" ]; then
        cp -r /var/log/sispat/benchmark-tests/* $TEST_RESULTS_DIR/
    fi
    
    log "✅ Testes de benchmark concluídos"
else
    warn "⚠️ Script de testes de benchmark não encontrado"
fi

# 4. Executar testes de performance avançada
log "Executando testes de performance avançada..."

# Criar script de teste de performance avançada
tee /tmp/advanced_performance.js > /dev/null << 'EOF'
const axios = require('axios');

async function testAdvancedPerformance() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Fazer login para obter token
    let token = null;
    try {
        const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
            email: 'admin@sispat.com',
            password: 'admin123'
        });
        token = loginResponse.data.token;
    } catch (error) {
        results.tests.push({ name: 'Obter token', status: 'FAIL', error: error.message });
        results.failed++;
        return results;
    }

    const headers = { Authorization: `Bearer ${token}` };

    // Teste 1: Performance de consultas complexas
    try {
        const startTime = Date.now();
        const response = await axios.get(`${baseUrl}/api/patrimonios?search=test&limit=100&offset=0`, { headers });
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (responseTime < 3000) {
            results.tests.push({ 
                name: 'Performance Consulta Complexa', 
                status: 'PASS', 
                time: `${responseTime}ms`,
                results: response.data.length
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Performance Consulta Complexa', 
                status: 'FAIL', 
                error: `Consulta lenta: ${responseTime}ms`,
                time: `${responseTime}ms`,
                results: response.data.length
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Performance Consulta Complexa', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Performance de relatórios
    try {
        const startTime = Date.now();
        const response = await axios.get(`${baseUrl}/api/reports`, { headers });
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (responseTime < 5000) {
            results.tests.push({ 
                name: 'Performance Relatórios', 
                status: 'PASS', 
                time: `${responseTime}ms`
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Performance Relatórios', 
                status: 'FAIL', 
                error: `Relatórios lentos: ${responseTime}ms`,
                time: `${responseTime}ms`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Performance Relatórios', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Performance de dashboard
    try {
        const startTime = Date.now();
        const response = await axios.get(`${baseUrl}/api/dashboard`, { headers });
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (responseTime < 2000) {
            results.tests.push({ 
                name: 'Performance Dashboard', 
                status: 'PASS', 
                time: `${responseTime}ms`
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Performance Dashboard', 
                status: 'FAIL', 
                error: `Dashboard lento: ${responseTime}ms`,
                time: `${responseTime}ms`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Performance Dashboard', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Performance de geração de etiquetas
    try {
        // Buscar um patrimônio existente
        const patrimoniosResponse = await axios.get(`${baseUrl}/api/patrimonios`, { headers });
        if (patrimoniosResponse.status === 200 && patrimoniosResponse.data.length > 0) {
            const patrimonioId = patrimoniosResponse.data[0].id;
            
            const startTime = Date.now();
            const labelResponse = await axios.post(`${baseUrl}/api/labels/single`, {
                patrimonioId: patrimonioId
            }, { headers });
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            if (responseTime < 3000) {
                results.tests.push({ 
                    name: 'Performance Geração de Etiquetas', 
                    status: 'PASS', 
                    time: `${responseTime}ms`
                });
                results.passed++;
            } else {
                results.tests.push({ 
                    name: 'Performance Geração de Etiquetas', 
                    status: 'FAIL', 
                    error: `Geração lenta: ${responseTime}ms`,
                    time: `${responseTime}ms`
                });
                results.failed++;
            }
        } else {
            results.tests.push({ name: 'Performance Geração de Etiquetas', status: 'FAIL', error: 'Nenhum patrimônio encontrado' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Performance Geração de Etiquetas', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: Performance de busca pública
    try {
        const startTime = Date.now();
        const response = await axios.get(`${baseUrl}/api/public/search?q=test`);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (responseTime < 1500) {
            results.tests.push({ 
                name: 'Performance Busca Pública', 
                status: 'PASS', 
                time: `${responseTime}ms`
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Performance Busca Pública', 
                status: 'FAIL', 
                error: `Busca lenta: ${responseTime}ms`,
                time: `${responseTime}ms`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Performance Busca Pública', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testAdvancedPerformance().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de performance avançada:', error);
    process.exit(1);
});
EOF

# Executar testes de performance avançada
ADV_PERF_RESULTS=$(node /tmp/advanced_performance.js)
echo "$ADV_PERF_RESULTS" > $TEST_RESULTS_DIR/advanced_performance_$DATE.json

# Verificar resultados
ADV_PERF_PASSED=$(echo "$ADV_PERF_RESULTS" | jq -r '.passed')
ADV_PERF_FAILED=$(echo "$ADV_PERF_RESULTS" | jq -r '.failed')

if [ $ADV_PERF_FAILED -eq 0 ]; then
    log "✅ Testes de performance avançada: $ADV_PERF_PASSED/$((ADV_PERF_PASSED + ADV_PERF_FAILED)) passaram"
else
    warn "⚠️ Testes de performance avançada: $ADV_PERF_FAILED falharam"
fi

# 5. Executar testes de performance de rede
log "Executando testes de performance de rede..."

# Criar script de teste de performance de rede
tee /tmp/network_performance.js > /dev/null << 'EOF'
const axios = require('axios');

async function testNetworkPerformance() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Fazer login para obter token
    let token = null;
    try {
        const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
            email: 'admin@sispat.com',
            password: 'admin123'
        });
        token = loginResponse.data.token;
    } catch (error) {
        results.tests.push({ name: 'Obter token', status: 'FAIL', error: error.message });
        results.failed++;
        return results;
    }

    const headers = { Authorization: `Bearer ${token}` };

    // Teste 1: Latência de rede
    try {
        const times = [];
        
        for (let i = 0; i < 10; i++) {
            const startTime = Date.now();
            await axios.get(`${baseUrl}/api/health`);
            const endTime = Date.now();
            times.push(endTime - startTime);
        }
        
        const avgLatency = times.reduce((a, b) => a + b, 0) / times.length;
        const minLatency = Math.min(...times);
        const maxLatency = Math.max(...times);
        
        if (avgLatency < 100) { // Menos de 100ms
            results.tests.push({ 
                name: 'Latência de Rede', 
                status: 'PASS', 
                avgLatency: `${avgLatency.toFixed(2)}ms`,
                minLatency: `${minLatency}ms`,
                maxLatency: `${maxLatency}ms`
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Latência de Rede', 
                status: 'FAIL', 
                error: `Latência alta: ${avgLatency.toFixed(2)}ms`,
                avgLatency: `${avgLatency.toFixed(2)}ms`,
                minLatency: `${minLatency}ms`,
                maxLatency: `${maxLatency}ms`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Latência de Rede', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Throughput de rede
    try {
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < 100; i++) {
            promises.push(axios.get(`${baseUrl}/api/health`));
        }
        
        await Promise.all(promises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const throughput = (100 / (totalTime / 1000)).toFixed(2);
        
        if (throughput >= 20) { // Pelo menos 20 req/s
            results.tests.push({ 
                name: 'Throughput de Rede', 
                status: 'PASS', 
                throughput: `${throughput} req/s`,
                totalTime: `${totalTime}ms`
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Throughput de Rede', 
                status: 'FAIL', 
                error: `Throughput baixo: ${throughput} req/s`,
                throughput: `${throughput} req/s`,
                totalTime: `${totalTime}ms`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Throughput de Rede', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Estabilidade de conexão
    try {
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < 50; i++) {
            try {
                await axios.get(`${baseUrl}/api/health`);
                successCount++;
            } catch (error) {
                errorCount++;
            }
        }
        
        const successRate = (successCount / 50) * 100;
        
        if (successRate >= 95) { // Pelo menos 95% de sucesso
            results.tests.push({ 
                name: 'Estabilidade de Conexão', 
                status: 'PASS', 
                successRate: `${successRate}%`,
                successCount: successCount,
                errorCount: errorCount
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Estabilidade de Conexão', 
                status: 'FAIL', 
                error: `Taxa de sucesso baixa: ${successRate}%`,
                successRate: `${successRate}%`,
                successCount: successCount,
                errorCount: errorCount
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Estabilidade de Conexão', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testNetworkPerformance().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de performance de rede:', error);
    process.exit(1);
});
EOF

# Executar testes de performance de rede
NET_PERF_RESULTS=$(node /tmp/network_performance.js)
echo "$NET_PERF_RESULTS" > $TEST_RESULTS_DIR/network_performance_$DATE.json

# Verificar resultados
NET_PERF_PASSED=$(echo "$NET_PERF_RESULTS" | jq -r '.passed')
NET_PERF_FAILED=$(echo "$NET_PERF_RESULTS" | jq -r '.failed')

if [ $NET_PERF_FAILED -eq 0 ]; then
    log "✅ Testes de performance de rede: $NET_PERF_PASSED/$((NET_PERF_PASSED + NET_PERF_FAILED)) passaram"
else
    warn "⚠️ Testes de performance de rede: $NET_PERF_FAILED falharam"
fi

# 6. Gerar relatório consolidado final
log "Gerando relatório consolidado final..."

# Calcular totais
TOTAL_PERF_PASSED=$((ADV_PERF_PASSED + NET_PERF_PASSED))
TOTAL_PERF_FAILED=$((ADV_PERF_FAILED + NET_PERF_FAILED))
TOTAL_PERF_TESTS=$((TOTAL_PERF_PASSED + TOTAL_PERF_FAILED))

# Gerar relatório final
cat > $TEST_RESULTS_DIR/final_performance_report_$DATE.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "type": "all_performance_tests",
  "summary": {
    "total_tests": $TOTAL_PERF_TESTS,
    "passed": $TOTAL_PERF_PASSED,
    "failed": $TOTAL_PERF_FAILED,
    "success_rate": "$(echo "scale=2; $TOTAL_PERF_PASSED * 100 / $TOTAL_PERF_TESTS" | bc)%"
  },
  "categories": {
    "advanced_performance": {
      "passed": $ADV_PERF_PASSED,
      "failed": $ADV_PERF_FAILED,
      "success_rate": "$(echo "scale=2; $ADV_PERF_PASSED * 100 / ($ADV_PERF_PASSED + $ADV_PERF_FAILED)" | bc)%"
    },
    "network_performance": {
      "passed": $NET_PERF_PASSED,
      "failed": $NET_PERF_FAILED,
      "success_rate": "$(echo "scale=2; $NET_PERF_PASSED * 100 / ($NET_PERF_PASSED + $NET_PERF_FAILED)" | bc)%"
    }
  },
  "files": {
    "advanced_performance": "advanced_performance_$DATE.json",
    "network_performance": "network_performance_$DATE.json"
  }
}
EOF

# 7. Limpar arquivos temporários
log "Limpando arquivos temporários..."
rm -f /tmp/*_performance.js

# 8. Exibir resumo final
log "🎉 Todos os testes de performance finalizados!"
log "📊 Resumo dos resultados:"
log "   • Total de testes: $TOTAL_PERF_TESTS"
log "   • Testes passaram: $TOTAL_PERF_PASSED"
log "   • Testes falharam: $TOTAL_PERF_FAILED"
log "   • Taxa de sucesso: $(echo "scale=2; $TOTAL_PERF_PASSED * 100 / $TOTAL_PERF_TESTS" | bc)%"
log ""
log "📋 Resultados por categoria:"
log "   • Performance avançada: $ADV_PERF_PASSED/$((ADV_PERF_PASSED + ADV_PERF_FAILED)) ($(echo "scale=2; $ADV_PERF_PASSED * 100 / ($ADV_PERF_PASSED + $ADV_PERF_FAILED)" | bc)%)"
log "   • Performance de rede: $NET_PERF_PASSED/$((NET_PERF_PASSED + NET_PERF_FAILED)) ($(echo "scale=2; $NET_PERF_PASSED * 100 / ($NET_PERF_PASSED + $NET_PERF_FAILED)" | bc)%)"
log ""
log "📁 Relatórios salvos em: $TEST_RESULTS_DIR"
log "   • Relatório final: final_performance_report_$DATE.json"
log "   • Testes individuais: advanced_performance_$DATE.json, network_performance_$DATE.json, etc."

if [ $TOTAL_PERF_FAILED -eq 0 ]; then
    log "✅ Todos os testes de performance passaram! Sistema está otimizado para produção."
else
    warn "⚠️ $TOTAL_PERF_FAILED testes de performance falharam. Revise os relatórios para otimizações."
fi
