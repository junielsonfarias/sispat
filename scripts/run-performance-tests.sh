#!/bin/bash

# SISPAT - Script de Testes de Performance e Carga
# Este script executa testes avançados de performance, carga e stress

set -e

echo "🚀 Executando Testes de Performance e Carga..."

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
TEST_RESULTS_DIR="/var/log/sispat/performance-tests"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de resultados
mkdir -p $TEST_RESULTS_DIR

# 1. Testes de Performance Básica
log "Executando testes de performance básica..."

# Criar script de teste de performance básica
tee /tmp/performance_basic.js > /dev/null << 'EOF'
const axios = require('axios');

async function testBasicPerformance() {
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

    // Teste 1: Performance de endpoints principais
    const endpoints = [
        { path: '/api/patrimonios', name: 'Listagem de Patrimônios' },
        { path: '/api/municipalities', name: 'Listagem de Municípios' },
        { path: '/api/sectors', name: 'Listagem de Setores' },
        { path: '/api/users', name: 'Listagem de Usuários' },
        { path: '/api/dashboard', name: 'Dashboard' },
        { path: '/api/reports', name: 'Relatórios' }
    ];

    for (const endpoint of endpoints) {
        try {
            const startTime = Date.now();
            const response = await axios.get(`${baseUrl}${endpoint.path}`, { headers });
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            if (responseTime < 2000) {
                results.tests.push({ 
                    name: endpoint.name, 
                    status: 'PASS', 
                    time: `${responseTime}ms`,
                    dataSize: JSON.stringify(response.data).length
                });
                results.passed++;
            } else {
                results.tests.push({ 
                    name: endpoint.name, 
                    status: 'FAIL', 
                    error: `Resposta lenta: ${responseTime}ms` 
                });
                results.failed++;
            }
        } catch (error) {
            results.tests.push({ 
                name: endpoint.name, 
                status: 'FAIL', 
                error: error.message 
            });
            results.failed++;
        }
    }

    // Teste 2: Performance de operações CRUD
    try {
        // CREATE
        const startCreate = Date.now();
        const patrimonioData = {
            numeroPatrimonio: `PERF-${Date.now()}`,
            descricao: 'Patrimônio de performance',
            valor: 1000.00,
            dataAquisicao: new Date().toISOString().split('T')[0],
            estado: 'ativo'
        };
        
        const createResponse = await axios.post(`${baseUrl}/api/patrimonios`, patrimonioData, { headers });
        const endCreate = Date.now();
        const createTime = endCreate - startCreate;
        
        if (createResponse.status === 201) {
            const patrimonioId = createResponse.data.id;
            
            // READ
            const startRead = Date.now();
            const readResponse = await axios.get(`${baseUrl}/api/patrimonios/${patrimonioId}`, { headers });
            const endRead = Date.now();
            const readTime = endRead - startRead;
            
            // UPDATE
            const startUpdate = Date.now();
            const updateData = { ...patrimonioData, descricao: 'Patrimônio atualizado' };
            const updateResponse = await axios.put(`${baseUrl}/api/patrimonios/${patrimonioId}`, updateData, { headers });
            const endUpdate = Date.now();
            const updateTime = endUpdate - startUpdate;
            
            // DELETE
            const startDelete = Date.now();
            const deleteResponse = await axios.delete(`${baseUrl}/api/patrimonios/${patrimonioId}`, { headers });
            const endDelete = Date.now();
            const deleteTime = endDelete - startDelete;
            
            // Verificar tempos
            const crudTimes = { create: createTime, read: readTime, update: updateTime, delete: deleteTime };
            const maxTime = Math.max(...Object.values(crudTimes));
            
            if (maxTime < 3000) {
                results.tests.push({ 
                    name: 'Performance CRUD', 
                    status: 'PASS', 
                    times: crudTimes,
                    maxTime: `${maxTime}ms`
                });
                results.passed++;
            } else {
                results.tests.push({ 
                    name: 'Performance CRUD', 
                    status: 'FAIL', 
                    error: `Operação lenta: ${maxTime}ms`,
                    times: crudTimes
                });
                results.failed++;
            }
        } else {
            results.tests.push({ name: 'Performance CRUD', status: 'FAIL', error: 'Falha ao criar patrimônio' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Performance CRUD', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testBasicPerformance().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de performance básica:', error);
    process.exit(1);
});
EOF

# Executar testes de performance básica
BASIC_PERF_RESULTS=$(node /tmp/performance_basic.js)
echo "$BASIC_PERF_RESULTS" > $TEST_RESULTS_DIR/basic_performance_$DATE.json

# Verificar resultados
BASIC_PERF_PASSED=$(echo "$BASIC_PERF_RESULTS" | jq -r '.passed')
BASIC_PERF_FAILED=$(echo "$BASIC_PERF_RESULTS" | jq -r '.failed')

if [ $BASIC_PERF_FAILED -eq 0 ]; then
    log "✅ Testes de performance básica: $BASIC_PERF_PASSED/$((BASIC_PERF_PASSED + BASIC_PERF_FAILED)) passaram"
else
    warn "⚠️ Testes de performance básica: $BASIC_PERF_FAILED falharam"
fi

# 2. Testes de Carga
log "Executando testes de carga..."

# Criar script de teste de carga
tee /tmp/load_tests.js > /dev/null << 'EOF'
const axios = require('axios');

async function testLoad() {
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

    // Teste 1: Carga baixa (10 usuários simultâneos)
    try {
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < 10; i++) {
            promises.push(axios.get(`${baseUrl}/api/patrimonios`, { headers }));
        }
        
        const responses = await Promise.all(promises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        const successCount = responses.filter(r => r.status === 200).length;
        const successRate = (successCount / responses.length) * 100;
        
        if (totalTime < 5000 && successRate >= 95) {
            results.tests.push({ 
                name: 'Carga baixa (10 usuários)', 
                status: 'PASS', 
                time: `${totalTime}ms`,
                successRate: `${successRate}%`,
                requests: responses.length
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Carga baixa (10 usuários)', 
                status: 'FAIL', 
                error: `Tempo: ${totalTime}ms, Taxa de sucesso: ${successRate}%`,
                time: `${totalTime}ms`,
                successRate: `${successRate}%`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Carga baixa (10 usuários)', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Carga média (25 usuários simultâneos)
    try {
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < 25; i++) {
            promises.push(axios.get(`${baseUrl}/api/patrimonios`, { headers }));
        }
        
        const responses = await Promise.all(promises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        const successCount = responses.filter(r => r.status === 200).length;
        const successRate = (successCount / responses.length) * 100;
        
        if (totalTime < 10000 && successRate >= 90) {
            results.tests.push({ 
                name: 'Carga média (25 usuários)', 
                status: 'PASS', 
                time: `${totalTime}ms`,
                successRate: `${successRate}%`,
                requests: responses.length
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Carga média (25 usuários)', 
                status: 'FAIL', 
                error: `Tempo: ${totalTime}ms, Taxa de sucesso: ${successRate}%`,
                time: `${totalTime}ms`,
                successRate: `${successRate}%`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Carga média (25 usuários)', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Carga alta (50 usuários simultâneos)
    try {
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < 50; i++) {
            promises.push(axios.get(`${baseUrl}/api/patrimonios`, { headers }));
        }
        
        const responses = await Promise.all(promises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        const successCount = responses.filter(r => r.status === 200).length;
        const successRate = (successCount / responses.length) * 100;
        
        if (totalTime < 15000 && successRate >= 85) {
            results.tests.push({ 
                name: 'Carga alta (50 usuários)', 
                status: 'PASS', 
                time: `${totalTime}ms`,
                successRate: `${successRate}%`,
                requests: responses.length
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Carga alta (50 usuários)', 
                status: 'FAIL', 
                error: `Tempo: ${totalTime}ms, Taxa de sucesso: ${successRate}%`,
                time: `${totalTime}ms`,
                successRate: `${successRate}%`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Carga alta (50 usuários)', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Carga mista (diferentes endpoints)
    try {
        const startTime = Date.now();
        const promises = [];
        
        // 10 requisições para cada endpoint
        for (let i = 0; i < 10; i++) {
            promises.push(axios.get(`${baseUrl}/api/patrimonios`, { headers }));
            promises.push(axios.get(`${baseUrl}/api/municipalities`, { headers }));
            promises.push(axios.get(`${baseUrl}/api/sectors`, { headers }));
            promises.push(axios.get(`${baseUrl}/api/dashboard`, { headers }));
        }
        
        const responses = await Promise.all(promises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        const successCount = responses.filter(r => r.status === 200).length;
        const successRate = (successCount / responses.length) * 100;
        
        if (totalTime < 20000 && successRate >= 90) {
            results.tests.push({ 
                name: 'Carga mista (40 requisições)', 
                status: 'PASS', 
                time: `${totalTime}ms`,
                successRate: `${successRate}%`,
                requests: responses.length
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Carga mista (40 requisições)', 
                status: 'FAIL', 
                error: `Tempo: ${totalTime}ms, Taxa de sucesso: ${successRate}%`,
                time: `${totalTime}ms`,
                successRate: `${successRate}%`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Carga mista (40 requisições)', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testLoad().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de carga:', error);
    process.exit(1);
});
EOF

# Executar testes de carga
LOAD_RESULTS=$(node /tmp/load_tests.js)
echo "$LOAD_RESULTS" > $TEST_RESULTS_DIR/load_tests_$DATE.json

# Verificar resultados
LOAD_PASSED=$(echo "$LOAD_RESULTS" | jq -r '.passed')
LOAD_FAILED=$(echo "$LOAD_RESULTS" | jq -r '.failed')

if [ $LOAD_FAILED -eq 0 ]; then
    log "✅ Testes de carga: $LOAD_PASSED/$((LOAD_PASSED + LOAD_FAILED)) passaram"
else
    warn "⚠️ Testes de carga: $LOAD_FAILED falharam"
fi

# 3. Testes de Stress
log "Executando testes de stress..."

# Criar script de teste de stress
tee /tmp/stress_tests.js > /dev/null << 'EOF'
const axios = require('axios');

async function testStress() {
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

    // Teste 1: Stress baixo (100 requisições)
    try {
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < 100; i++) {
            promises.push(axios.get(`${baseUrl}/api/health`));
        }
        
        const responses = await Promise.all(promises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        const successCount = responses.filter(r => r.status === 200).length;
        const successRate = (successCount / responses.length) * 100;
        const avgResponseTime = totalTime / responses.length;
        
        if (totalTime < 30000 && successRate >= 95 && avgResponseTime < 500) {
            results.tests.push({ 
                name: 'Stress baixo (100 requisições)', 
                status: 'PASS', 
                time: `${totalTime}ms`,
                avgTime: `${avgResponseTime.toFixed(2)}ms`,
                successRate: `${successRate}%`,
                requests: responses.length
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Stress baixo (100 requisições)', 
                status: 'FAIL', 
                error: `Tempo: ${totalTime}ms, Taxa: ${successRate}%, Média: ${avgResponseTime.toFixed(2)}ms`,
                time: `${totalTime}ms`,
                avgTime: `${avgResponseTime.toFixed(2)}ms`,
                successRate: `${successRate}%`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Stress baixo (100 requisições)', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Stress médio (200 requisições)
    try {
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < 200; i++) {
            promises.push(axios.get(`${baseUrl}/api/health`));
        }
        
        const responses = await Promise.all(promises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        const successCount = responses.filter(r => r.status === 200).length;
        const successRate = (successCount / responses.length) * 100;
        const avgResponseTime = totalTime / responses.length;
        
        if (totalTime < 60000 && successRate >= 90 && avgResponseTime < 1000) {
            results.tests.push({ 
                name: 'Stress médio (200 requisições)', 
                status: 'PASS', 
                time: `${totalTime}ms`,
                avgTime: `${avgResponseTime.toFixed(2)}ms`,
                successRate: `${successRate}%`,
                requests: responses.length
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Stress médio (200 requisições)', 
                status: 'FAIL', 
                error: `Tempo: ${totalTime}ms, Taxa: ${successRate}%, Média: ${avgResponseTime.toFixed(2)}ms`,
                time: `${totalTime}ms`,
                avgTime: `${avgResponseTime.toFixed(2)}ms`,
                successRate: `${successRate}%`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Stress médio (200 requisições)', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Stress alto (500 requisições)
    try {
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < 500; i++) {
            promises.push(axios.get(`${baseUrl}/api/health`));
        }
        
        const responses = await Promise.all(promises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        const successCount = responses.filter(r => r.status === 200).length;
        const successRate = (successCount / responses.length) * 100;
        const avgResponseTime = totalTime / responses.length;
        
        if (totalTime < 120000 && successRate >= 80 && avgResponseTime < 2000) {
            results.tests.push({ 
                name: 'Stress alto (500 requisições)', 
                status: 'PASS', 
                time: `${totalTime}ms`,
                avgTime: `${avgResponseTime.toFixed(2)}ms`,
                successRate: `${successRate}%`,
                requests: responses.length
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Stress alto (500 requisições)', 
                status: 'FAIL', 
                error: `Tempo: ${totalTime}ms, Taxa: ${successRate}%, Média: ${avgResponseTime.toFixed(2)}ms`,
                time: `${totalTime}ms`,
                avgTime: `${avgResponseTime.toFixed(2)}ms`,
                successRate: `${successRate}%`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Stress alto (500 requisições)', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Stress extremo (1000 requisições)
    try {
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < 1000; i++) {
            promises.push(axios.get(`${baseUrl}/api/health`));
        }
        
        const responses = await Promise.all(promises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        const successCount = responses.filter(r => r.status === 200).length;
        const successRate = (successCount / responses.length) * 100;
        const avgResponseTime = totalTime / responses.length;
        
        if (totalTime < 300000 && successRate >= 70 && avgResponseTime < 5000) {
            results.tests.push({ 
                name: 'Stress extremo (1000 requisições)', 
                status: 'PASS', 
                time: `${totalTime}ms`,
                avgTime: `${avgResponseTime.toFixed(2)}ms`,
                successRate: `${successRate}%`,
                requests: responses.length
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Stress extremo (1000 requisições)', 
                status: 'FAIL', 
                error: `Tempo: ${totalTime}ms, Taxa: ${successRate}%, Média: ${avgResponseTime.toFixed(2)}ms`,
                time: `${totalTime}ms`,
                avgTime: `${avgResponseTime.toFixed(2)}ms`,
                successRate: `${successRate}%`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Stress extremo (1000 requisições)', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testStress().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de stress:', error);
    process.exit(1);
});
EOF

# Executar testes de stress
STRESS_RESULTS=$(node /tmp/stress_tests.js)
echo "$STRESS_RESULTS" > $TEST_RESULTS_DIR/stress_tests_$DATE.json

# Verificar resultados
STRESS_PASSED=$(echo "$STRESS_RESULTS" | jq -r '.passed')
STRESS_FAILED=$(echo "$STRESS_RESULTS" | jq -r '.failed')

if [ $STRESS_FAILED -eq 0 ]; then
    log "✅ Testes de stress: $STRESS_PASSED/$((STRESS_PASSED + STRESS_FAILED)) passaram"
else
    warn "⚠️ Testes de stress: $STRESS_FAILED falharam"
fi

# 4. Testes de Endurance
log "Executando testes de endurance..."

# Criar script de teste de endurance
tee /tmp/endurance_tests.js > /dev/null << 'EOF'
const axios = require('axios');

async function testEndurance() {
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

    // Teste 1: Endurance curto (5 minutos)
    try {
        const startTime = Date.now();
        const endTime = startTime + (5 * 60 * 1000); // 5 minutos
        let requestCount = 0;
        let successCount = 0;
        let errorCount = 0;
        
        while (Date.now() < endTime) {
            try {
                const response = await axios.get(`${baseUrl}/api/patrimonios`, { headers });
                if (response.status === 200) {
                    successCount++;
                } else {
                    errorCount++;
                }
                requestCount++;
                
                // Pequena pausa para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                errorCount++;
                requestCount++;
            }
        }
        
        const totalTime = Date.now() - startTime;
        const successRate = (successCount / requestCount) * 100;
        const requestsPerSecond = requestCount / (totalTime / 1000);
        
        if (successRate >= 95 && requestsPerSecond >= 5) {
            results.tests.push({ 
                name: 'Endurance curto (5 min)', 
                status: 'PASS', 
                time: `${totalTime}ms`,
                requests: requestCount,
                successRate: `${successRate}%`,
                rps: `${requestsPerSecond.toFixed(2)}`
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Endurance curto (5 min)', 
                status: 'FAIL', 
                error: `Taxa: ${successRate}%, RPS: ${requestsPerSecond.toFixed(2)}`,
                time: `${totalTime}ms`,
                requests: requestCount,
                successRate: `${successRate}%`,
                rps: `${requestsPerSecond.toFixed(2)}`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Endurance curto (5 min)', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Endurance médio (10 minutos)
    try {
        const startTime = Date.now();
        const endTime = startTime + (10 * 60 * 1000); // 10 minutos
        let requestCount = 0;
        let successCount = 0;
        let errorCount = 0;
        
        while (Date.now() < endTime) {
            try {
                const response = await axios.get(`${baseUrl}/api/patrimonios`, { headers });
                if (response.status === 200) {
                    successCount++;
                } else {
                    errorCount++;
                }
                requestCount++;
                
                // Pequena pausa para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                errorCount++;
                requestCount++;
            }
        }
        
        const totalTime = Date.now() - startTime;
        const successRate = (successCount / requestCount) * 100;
        const requestsPerSecond = requestCount / (totalTime / 1000);
        
        if (successRate >= 90 && requestsPerSecond >= 3) {
            results.tests.push({ 
                name: 'Endurance médio (10 min)', 
                status: 'PASS', 
                time: `${totalTime}ms`,
                requests: requestCount,
                successRate: `${successRate}%`,
                rps: `${requestsPerSecond.toFixed(2)}`
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Endurance médio (10 min)', 
                status: 'FAIL', 
                error: `Taxa: ${successRate}%, RPS: ${requestsPerSecond.toFixed(2)}`,
                time: `${totalTime}ms`,
                requests: requestCount,
                successRate: `${successRate}%`,
                rps: `${requestsPerSecond.toFixed(2)}`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Endurance médio (10 min)', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testEndurance().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de endurance:', error);
    process.exit(1);
});
EOF

# Executar testes de endurance
ENDURANCE_RESULTS=$(node /tmp/endurance_tests.js)
echo "$ENDURANCE_RESULTS" > $TEST_RESULTS_DIR/endurance_tests_$DATE.json

# Verificar resultados
ENDURANCE_PASSED=$(echo "$ENDURANCE_RESULTS" | jq -r '.passed')
ENDURANCE_FAILED=$(echo "$ENDURANCE_RESULTS" | jq -r '.failed')

if [ $ENDURANCE_FAILED -eq 0 ]; then
    log "✅ Testes de endurance: $ENDURANCE_PASSED/$((ENDURANCE_PASSED + ENDURANCE_FAILED)) passaram"
else
    warn "⚠️ Testes de endurance: $ENDURANCE_FAILED falharam"
fi

# 5. Testes de Memória
log "Executando testes de memória..."

# Criar script de teste de memória
tee /tmp/memory_tests.js > /dev/null << 'EOF'
const axios = require('axios');

async function testMemory() {
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

    // Teste 1: Vazamento de memória (múltiplas requisições)
    try {
        const initialMemory = process.memoryUsage();
        const promises = [];
        
        // Fazer 1000 requisições para testar vazamento de memória
        for (let i = 0; i < 1000; i++) {
            promises.push(axios.get(`${baseUrl}/api/patrimonios`, { headers }));
        }
        
        await Promise.all(promises);
        
        // Forçar garbage collection se disponível
        if (global.gc) {
            global.gc();
        }
        
        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
        
        if (memoryIncreaseMB < 100) { // Menos de 100MB de aumento
            results.tests.push({ 
                name: 'Vazamento de memória', 
                status: 'PASS', 
                memoryIncrease: `${memoryIncreaseMB.toFixed(2)}MB`,
                initialMemory: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                finalMemory: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Vazamento de memória', 
                status: 'FAIL', 
                error: `Aumento de memória: ${memoryIncreaseMB.toFixed(2)}MB`,
                memoryIncrease: `${memoryIncreaseMB.toFixed(2)}MB`,
                initialMemory: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                finalMemory: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Vazamento de memória', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Uso de memória por requisição
    try {
        const memoryUsages = [];
        
        for (let i = 0; i < 100; i++) {
            const beforeMemory = process.memoryUsage();
            await axios.get(`${baseUrl}/api/patrimonios`, { headers });
            const afterMemory = process.memoryUsage();
            
            const memoryUsed = afterMemory.heapUsed - beforeMemory.heapUsed;
            memoryUsages.push(memoryUsed);
        }
        
        const avgMemoryPerRequest = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
        const maxMemoryPerRequest = Math.max(...memoryUsages);
        const avgMemoryMB = avgMemoryPerRequest / 1024 / 1024;
        const maxMemoryMB = maxMemoryPerRequest / 1024 / 1024;
        
        if (avgMemoryMB < 1 && maxMemoryMB < 5) { // Menos de 1MB média, 5MB máximo
            results.tests.push({ 
                name: 'Uso de memória por requisição', 
                status: 'PASS', 
                avgMemory: `${avgMemoryMB.toFixed(2)}MB`,
                maxMemory: `${maxMemoryMB.toFixed(2)}MB`
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Uso de memória por requisição', 
                status: 'FAIL', 
                error: `Média: ${avgMemoryMB.toFixed(2)}MB, Máximo: ${maxMemoryMB.toFixed(2)}MB`,
                avgMemory: `${avgMemoryMB.toFixed(2)}MB`,
                maxMemory: `${maxMemoryMB.toFixed(2)}MB`
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Uso de memória por requisição', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testMemory().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de memória:', error);
    process.exit(1);
});
EOF

# Executar testes de memória
MEMORY_RESULTS=$(node /tmp/memory_tests.js)
echo "$MEMORY_RESULTS" > $TEST_RESULTS_DIR/memory_tests_$DATE.json

# Verificar resultados
MEMORY_PASSED=$(echo "$MEMORY_RESULTS" | jq -r '.passed')
MEMORY_FAILED=$(echo "$MEMORY_RESULTS" | jq -r '.failed')

if [ $MEMORY_FAILED -eq 0 ]; then
    log "✅ Testes de memória: $MEMORY_PASSED/$((MEMORY_PASSED + MEMORY_FAILED)) passaram"
else
    warn "⚠️ Testes de memória: $MEMORY_FAILED falharam"
fi

# 6. Gerar relatório consolidado
log "Gerando relatório consolidado de performance..."

# Calcular totais
TOTAL_PERF_PASSED=$((BASIC_PERF_PASSED + LOAD_PASSED + STRESS_PASSED + ENDURANCE_PASSED + MEMORY_PASSED))
TOTAL_PERF_FAILED=$((BASIC_PERF_FAILED + LOAD_FAILED + STRESS_FAILED + ENDURANCE_FAILED + MEMORY_FAILED))
TOTAL_PERF_TESTS=$((TOTAL_PERF_PASSED + TOTAL_PERF_FAILED))

# Gerar relatório
cat > $TEST_RESULTS_DIR/performance_report_$DATE.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "type": "performance_tests",
  "summary": {
    "total_tests": $TOTAL_PERF_TESTS,
    "passed": $TOTAL_PERF_PASSED,
    "failed": $TOTAL_PERF_FAILED,
    "success_rate": "$(echo "scale=2; $TOTAL_PERF_PASSED * 100 / $TOTAL_PERF_TESTS" | bc)%"
  },
  "categories": {
    "basic_performance": {
      "passed": $BASIC_PERF_PASSED,
      "failed": $BASIC_PERF_FAILED,
      "success_rate": "$(echo "scale=2; $BASIC_PERF_PASSED * 100 / ($BASIC_PERF_PASSED + $BASIC_PERF_FAILED)" | bc)%"
    },
    "load_tests": {
      "passed": $LOAD_PASSED,
      "failed": $LOAD_FAILED,
      "success_rate": "$(echo "scale=2; $LOAD_PASSED * 100 / ($LOAD_PASSED + $LOAD_FAILED)" | bc)%"
    },
    "stress_tests": {
      "passed": $STRESS_PASSED,
      "failed": $STRESS_FAILED,
      "success_rate": "$(echo "scale=2; $STRESS_PASSED * 100 / ($STRESS_PASSED + $STRESS_FAILED)" | bc)%"
    },
    "endurance_tests": {
      "passed": $ENDURANCE_PASSED,
      "failed": $ENDURANCE_FAILED,
      "success_rate": "$(echo "scale=2; $ENDURANCE_PASSED * 100 / ($ENDURANCE_PASSED + $ENDURANCE_FAILED)" | bc)%"
    },
    "memory_tests": {
      "passed": $MEMORY_PASSED,
      "failed": $MEMORY_FAILED,
      "success_rate": "$(echo "scale=2; $MEMORY_PASSED * 100 / ($MEMORY_PASSED + $MEMORY_FAILED)" | bc)%"
    }
  },
  "files": {
    "basic_performance": "basic_performance_$DATE.json",
    "load_tests": "load_tests_$DATE.json",
    "stress_tests": "stress_tests_$DATE.json",
    "endurance_tests": "endurance_tests_$DATE.json",
    "memory_tests": "memory_tests_$DATE.json"
  }
}
EOF

# 7. Limpar arquivos temporários
log "Limpando arquivos temporários..."
rm -f /tmp/*_tests.js

# 8. Exibir resumo final
log "🎉 Testes de performance e carga finalizados!"
log "📊 Resumo dos resultados:"
log "   • Total de testes: $TOTAL_PERF_TESTS"
log "   • Testes passaram: $TOTAL_PERF_PASSED"
log "   • Testes falharam: $TOTAL_PERF_FAILED"
log "   • Taxa de sucesso: $(echo "scale=2; $TOTAL_PERF_PASSED * 100 / $TOTAL_PERF_TESTS" | bc)%"
log ""
log "📋 Resultados por categoria:"
log "   • Performance básica: $BASIC_PERF_PASSED/$((BASIC_PERF_PASSED + BASIC_PERF_FAILED)) ($(echo "scale=2; $BASIC_PERF_PASSED * 100 / ($BASIC_PERF_PASSED + $BASIC_PERF_FAILED)" | bc)%)"
log "   • Testes de carga: $LOAD_PASSED/$((LOAD_PASSED + LOAD_FAILED)) ($(echo "scale=2; $LOAD_PASSED * 100 / ($LOAD_PASSED + $LOAD_FAILED)" | bc)%)"
log "   • Testes de stress: $STRESS_PASSED/$((STRESS_PASSED + STRESS_FAILED)) ($(echo "scale=2; $STRESS_PASSED * 100 / ($STRESS_PASSED + $STRESS_FAILED)" | bc)%)"
log "   • Testes de endurance: $ENDURANCE_PASSED/$((ENDURANCE_PASSED + ENDURANCE_FAILED)) ($(echo "scale=2; $ENDURANCE_PASSED * 100 / ($ENDURANCE_PASSED + $ENDURANCE_FAILED)" | bc)%)"
log "   • Testes de memória: $MEMORY_PASSED/$((MEMORY_PASSED + MEMORY_FAILED)) ($(echo "scale=2; $MEMORY_PASSED * 100 / ($MEMORY_PASSED + $MEMORY_FAILED)" | bc)%)"
log ""
log "📁 Relatórios salvos em: $TEST_RESULTS_DIR"
log "   • Relatório consolidado: performance_report_$DATE.json"
log "   • Testes individuais: basic_performance_$DATE.json, load_tests_$DATE.json, etc."

if [ $TOTAL_PERF_FAILED -eq 0 ]; then
    log "✅ Todos os testes de performance passaram! Sistema está otimizado."
else
    warn "⚠️ $TOTAL_PERF_FAILED testes de performance falharam. Revise os relatórios para otimizações."
fi
