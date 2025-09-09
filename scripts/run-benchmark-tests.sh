#!/bin/bash

# SISPAT - Script de Testes de Benchmark
# Este script executa testes de benchmark para comparar performance com métricas de referência

set -e

echo "🚀 Executando Testes de Benchmark..."

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
TEST_RESULTS_DIR="/var/log/sispat/benchmark-tests"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de resultados
mkdir -p $TEST_RESULTS_DIR

# 1. Testes de Benchmark de API
log "Executando testes de benchmark de API..."

# Criar script de teste de benchmark de API
tee /tmp/benchmark_api.js > /dev/null << 'EOF'
const axios = require('axios');

async function benchmarkAPI() {
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

    // Benchmark 1: Tempo de resposta por endpoint
    const endpoints = [
        { path: '/api/patrimonios', name: 'Patrimônios', benchmark: 1000 },
        { path: '/api/municipalities', name: 'Municípios', benchmark: 800 },
        { path: '/api/sectors', name: 'Setores', benchmark: 600 },
        { path: '/api/users', name: 'Usuários', benchmark: 500 },
        { path: '/api/dashboard', name: 'Dashboard', benchmark: 1500 },
        { path: '/api/reports', name: 'Relatórios', benchmark: 2000 }
    ];

    for (const endpoint of endpoints) {
        try {
            const times = [];
            
            // Fazer 10 requisições para calcular média
            for (let i = 0; i < 10; i++) {
                const startTime = Date.now();
                const response = await axios.get(`${baseUrl}${endpoint.path}`, { headers });
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                times.push(responseTime);
            }
            
            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            const minTime = Math.min(...times);
            const maxTime = Math.max(...times);
            
            if (avgTime <= endpoint.benchmark) {
                results.tests.push({ 
                    name: `Benchmark ${endpoint.name}`, 
                    status: 'PASS', 
                    avgTime: `${avgTime.toFixed(2)}ms`,
                    minTime: `${minTime}ms`,
                    maxTime: `${maxTime}ms`,
                    benchmark: `${endpoint.benchmark}ms`,
                    performance: `${((endpoint.benchmark / avgTime) * 100).toFixed(1)}%`
                });
                results.passed++;
            } else {
                results.tests.push({ 
                    name: `Benchmark ${endpoint.name}`, 
                    status: 'FAIL', 
                    error: `Tempo médio: ${avgTime.toFixed(2)}ms (benchmark: ${endpoint.benchmark}ms)`,
                    avgTime: `${avgTime.toFixed(2)}ms`,
                    minTime: `${minTime}ms`,
                    maxTime: `${maxTime}ms`,
                    benchmark: `${endpoint.benchmark}ms`,
                    performance: `${((endpoint.benchmark / avgTime) * 100).toFixed(1)}%`
                });
                results.failed++;
            }
        } catch (error) {
            results.tests.push({ 
                name: `Benchmark ${endpoint.name}`, 
                status: 'FAIL', 
                error: error.message 
            });
            results.failed++;
        }
    }

    // Benchmark 2: Throughput (requisições por segundo)
    try {
        const startTime = Date.now();
        const promises = [];
        
        // Fazer 100 requisições simultâneas
        for (let i = 0; i < 100; i++) {
            promises.push(axios.get(`${baseUrl}/api/patrimonios`, { headers }));
        }
        
        await Promise.all(promises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const throughput = (100 / (totalTime / 1000)).toFixed(2);
        
        if (throughput >= 10) { // Pelo menos 10 req/s
            results.tests.push({ 
                name: 'Benchmark Throughput', 
                status: 'PASS', 
                throughput: `${throughput} req/s`,
                totalTime: `${totalTime}ms`,
                requests: 100
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Benchmark Throughput', 
                status: 'FAIL', 
                error: `Throughput baixo: ${throughput} req/s`,
                throughput: `${throughput} req/s`,
                totalTime: `${totalTime}ms`,
                requests: 100
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Benchmark Throughput', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Benchmark 3: Latência percentil
    try {
        const times = [];
        
        // Fazer 1000 requisições para calcular percentis
        for (let i = 0; i < 1000; i++) {
            const startTime = Date.now();
            await axios.get(`${baseUrl}/api/patrimonios`, { headers });
            const endTime = Date.now();
            times.push(endTime - startTime);
        }
        
        // Ordenar tempos
        times.sort((a, b) => a - b);
        
        const p50 = times[Math.floor(times.length * 0.5)];
        const p90 = times[Math.floor(times.length * 0.9)];
        const p95 = times[Math.floor(times.length * 0.95)];
        const p99 = times[Math.floor(times.length * 0.99)];
        
        if (p95 <= 2000 && p99 <= 5000) { // P95 <= 2s, P99 <= 5s
            results.tests.push({ 
                name: 'Benchmark Latência Percentil', 
                status: 'PASS', 
                p50: `${p50}ms`,
                p90: `${p90}ms`,
                p95: `${p95}ms`,
                p99: `${p99}ms`,
                requests: times.length
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Benchmark Latência Percentil', 
                status: 'FAIL', 
                error: `P95: ${p95}ms, P99: ${p99}ms`,
                p50: `${p50}ms`,
                p90: `${p90}ms`,
                p95: `${p95}ms`,
                p99: `${p99}ms`,
                requests: times.length
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Benchmark Latência Percentil', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

benchmarkAPI().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de benchmark de API:', error);
    process.exit(1);
});
EOF

# Executar testes de benchmark de API
API_BENCH_RESULTS=$(node /tmp/benchmark_api.js)
echo "$API_BENCH_RESULTS" > $TEST_RESULTS_DIR/api_benchmark_$DATE.json

# Verificar resultados
API_BENCH_PASSED=$(echo "$API_BENCH_RESULTS" | jq -r '.passed')
API_BENCH_FAILED=$(echo "$API_BENCH_RESULTS" | jq -r '.failed')

if [ $API_BENCH_FAILED -eq 0 ]; then
    log "✅ Testes de benchmark de API: $API_BENCH_PASSED/$((API_BENCH_PASSED + API_BENCH_FAILED)) passaram"
else
    warn "⚠️ Testes de benchmark de API: $API_BENCH_FAILED falharam"
fi

# 2. Testes de Benchmark de Banco de Dados
log "Executando testes de benchmark de banco de dados..."

# Criar script de teste de benchmark de banco
tee /tmp/benchmark_database.js > /dev/null << 'EOF'
const { Pool } = require('pg');

async function benchmarkDatabase() {
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'sispat_db',
        user: 'postgres',
        password: '6273'
    });

    try {
        // Benchmark 1: Consultas simples
        const startTime = Date.now();
        const result = await pool.query('SELECT COUNT(*) FROM patrimonios');
        const endTime = Date.now();
        const queryTime = endTime - startTime;
        
        if (queryTime <= 100) { // Menos de 100ms
            results.tests.push({ 
                name: 'Benchmark Consulta Simples', 
                status: 'PASS', 
                time: `${queryTime}ms`,
                query: 'SELECT COUNT(*) FROM patrimonios'
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Benchmark Consulta Simples', 
                status: 'FAIL', 
                error: `Consulta lenta: ${queryTime}ms`,
                time: `${queryTime}ms`,
                query: 'SELECT COUNT(*) FROM patrimonios'
            });
            results.failed++;
        }

        // Benchmark 2: Consultas com JOIN
        const startTime2 = Date.now();
        const result2 = await pool.query(`
            SELECT p.*, m.name as municipality_name, s.name as sector_name 
            FROM patrimonios p 
            LEFT JOIN municipalities m ON p.municipality_id = m.id 
            LEFT JOIN sectors s ON p.sector_id = s.id 
            LIMIT 100
        `);
        const endTime2 = Date.now();
        const queryTime2 = endTime2 - startTime2;
        
        if (queryTime2 <= 500) { // Menos de 500ms
            results.tests.push({ 
                name: 'Benchmark Consulta com JOIN', 
                status: 'PASS', 
                time: `${queryTime2}ms`,
                rows: result2.rows.length,
                query: 'SELECT com JOIN'
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Benchmark Consulta com JOIN', 
                status: 'FAIL', 
                error: `Consulta lenta: ${queryTime2}ms`,
                time: `${queryTime2}ms`,
                rows: result2.rows.length,
                query: 'SELECT com JOIN'
            });
            results.failed++;
        }

        // Benchmark 3: Inserção
        const startTime3 = Date.now();
        const result3 = await pool.query(`
            INSERT INTO patrimonios (numero_patrimonio, descricao, valor, data_aquisicao, estado) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id
        `, [`BENCH-${Date.now()}`, 'Patrimônio de benchmark', 1000.00, new Date().toISOString().split('T')[0], 'ativo']);
        const endTime3 = Date.now();
        const insertTime = endTime3 - startTime3;
        
        if (insertTime <= 200) { // Menos de 200ms
            results.tests.push({ 
                name: 'Benchmark Inserção', 
                status: 'PASS', 
                time: `${insertTime}ms`,
                insertedId: result3.rows[0].id
            });
            results.passed++;
            
            // Limpar registro inserido
            await pool.query('DELETE FROM patrimonios WHERE id = $1', [result3.rows[0].id]);
        } else {
            results.tests.push({ 
                name: 'Benchmark Inserção', 
                status: 'FAIL', 
                error: `Inserção lenta: ${insertTime}ms`,
                time: `${insertTime}ms`
            });
            results.failed++;
        }

        // Benchmark 4: Atualização
        const startTime4 = Date.now();
        const result4 = await pool.query(`
            UPDATE patrimonios 
            SET descricao = $1 
            WHERE id = (SELECT id FROM patrimonios LIMIT 1)
        `, ['Descrição atualizada']);
        const endTime4 = Date.now();
        const updateTime = endTime4 - startTime4;
        
        if (updateTime <= 300) { // Menos de 300ms
            results.tests.push({ 
                name: 'Benchmark Atualização', 
                status: 'PASS', 
                time: `${updateTime}ms`,
                affectedRows: result4.rowCount
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Benchmark Atualização', 
                status: 'FAIL', 
                error: `Atualização lenta: ${updateTime}ms`,
                time: `${updateTime}ms`,
                affectedRows: result4.rowCount
            });
            results.failed++;
        }

        // Benchmark 5: Consultas simultâneas
        const startTime5 = Date.now();
        const promises = [];
        
        for (let i = 0; i < 50; i++) {
            promises.push(pool.query('SELECT COUNT(*) FROM patrimonios'));
        }
        
        await Promise.all(promises);
        const endTime5 = Date.now();
        const concurrentTime = endTime5 - startTime5;
        
        if (concurrentTime <= 2000) { // Menos de 2s para 50 consultas
            results.tests.push({ 
                name: 'Benchmark Consultas Simultâneas', 
                status: 'PASS', 
                time: `${concurrentTime}ms`,
                queries: 50,
                avgTime: `${(concurrentTime / 50).toFixed(2)}ms`
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Benchmark Consultas Simultâneas', 
                status: 'FAIL', 
                error: `Consultas lentas: ${concurrentTime}ms`,
                time: `${concurrentTime}ms`,
                queries: 50,
                avgTime: `${(concurrentTime / 50).toFixed(2)}ms`
            });
            results.failed++;
        }

    } catch (error) {
        results.tests.push({ name: 'Erro geral', status: 'FAIL', error: error.message });
        results.failed++;
    } finally {
        await pool.end();
    }

    return results;
}

benchmarkDatabase().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de benchmark de banco:', error);
    process.exit(1);
});
EOF

# Executar testes de benchmark de banco
DB_BENCH_RESULTS=$(node /tmp/benchmark_database.js)
echo "$DB_BENCH_RESULTS" > $TEST_RESULTS_DIR/database_benchmark_$DATE.json

# Verificar resultados
DB_BENCH_PASSED=$(echo "$DB_BENCH_RESULTS" | jq -r '.passed')
DB_BENCH_FAILED=$(echo "$DB_BENCH_RESULTS" | jq -r '.failed')

if [ $DB_BENCH_FAILED -eq 0 ]; then
    log "✅ Testes de benchmark de banco: $DB_BENCH_PASSED/$((DB_BENCH_PASSED + DB_BENCH_FAILED)) passaram"
else
    warn "⚠️ Testes de benchmark de banco: $DB_BENCH_FAILED falharam"
fi

# 3. Testes de Benchmark de Sistema
log "Executando testes de benchmark de sistema..."

# Criar script de teste de benchmark de sistema
tee /tmp/benchmark_system.js > /dev/null << 'EOF'
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function benchmarkSystem() {
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    try {
        // Benchmark 1: CPU
        const startTime = Date.now();
        const { stdout: cpuInfo } = await execAsync('cat /proc/cpuinfo | grep "model name" | head -1');
        const { stdout: cpuUsage } = await execAsync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | awk -F\'%\' \'{print $1}\'');
        const endTime = Date.now();
        
        const cpuUsageNum = parseFloat(cpuUsage);
        if (cpuUsageNum <= 80) { // CPU usage <= 80%
            results.tests.push({ 
                name: 'Benchmark CPU', 
                status: 'PASS', 
                usage: `${cpuUsageNum}%`,
                model: cpuInfo.trim()
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Benchmark CPU', 
                status: 'FAIL', 
                error: `Uso de CPU alto: ${cpuUsageNum}%`,
                usage: `${cpuUsageNum}%`,
                model: cpuInfo.trim()
            });
            results.failed++;
        }

        // Benchmark 2: Memória
        const { stdout: memInfo } = await execAsync('free -m');
        const memLines = memInfo.split('\n');
        const memLine = memLines[1].split(/\s+/);
        const totalMem = parseInt(memLine[1]);
        const usedMem = parseInt(memLine[2]);
        const memUsage = (usedMem / totalMem) * 100;
        
        if (memUsage <= 85) { // Memory usage <= 85%
            results.tests.push({ 
                name: 'Benchmark Memória', 
                status: 'PASS', 
                usage: `${memUsage.toFixed(1)}%`,
                total: `${totalMem}MB`,
                used: `${usedMem}MB`
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Benchmark Memória', 
                status: 'FAIL', 
                error: `Uso de memória alto: ${memUsage.toFixed(1)}%`,
                usage: `${memUsage.toFixed(1)}%`,
                total: `${totalMem}MB`,
                used: `${usedMem}MB`
            });
            results.failed++;
        }

        // Benchmark 3: Disco
        const { stdout: diskInfo } = await execAsync('df -h / | tail -1');
        const diskParts = diskInfo.split(/\s+/);
        const diskUsage = parseInt(diskParts[4].replace('%', ''));
        
        if (diskUsage <= 90) { // Disk usage <= 90%
            results.tests.push({ 
                name: 'Benchmark Disco', 
                status: 'PASS', 
                usage: `${diskUsage}%`,
                total: diskParts[1],
                used: diskParts[2],
                available: diskParts[3]
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Benchmark Disco', 
                status: 'FAIL', 
                error: `Uso de disco alto: ${diskUsage}%`,
                usage: `${diskUsage}%`,
                total: diskParts[1],
                used: diskParts[2],
                available: diskParts[3]
            });
            results.failed++;
        }

        // Benchmark 4: Rede
        const startTime4 = Date.now();
        const { stdout: netInfo } = await execAsync('cat /proc/net/dev | grep eth0 | awk \'{print $2, $10}\'');
        const endTime4 = Date.now();
        
        if (endTime4 - startTime4 <= 100) { // Network check <= 100ms
            results.tests.push({ 
                name: 'Benchmark Rede', 
                status: 'PASS', 
                time: `${endTime4 - startTime4}ms`,
                info: netInfo.trim()
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Benchmark Rede', 
                status: 'FAIL', 
                error: `Verificação de rede lenta: ${endTime4 - startTime4}ms`,
                time: `${endTime4 - startTime4}ms`,
                info: netInfo.trim()
            });
            results.failed++;
        }

        // Benchmark 5: Carga do sistema
        const { stdout: loadInfo } = await execAsync('uptime | awk -F\'load average:\' \'{print $2}\' | awk \'{print $1}\' | sed \'s/,//\'');
        const loadAvg = parseFloat(loadInfo);
        
        if (loadAvg <= 4.0) { // Load average <= 4.0
            results.tests.push({ 
                name: 'Benchmark Carga do Sistema', 
                status: 'PASS', 
                load: loadAvg.toFixed(2)
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Benchmark Carga do Sistema', 
                status: 'FAIL', 
                error: `Carga do sistema alta: ${loadAvg.toFixed(2)}`,
                load: loadAvg.toFixed(2)
            });
            results.failed++;
        }

    } catch (error) {
        results.tests.push({ name: 'Erro geral', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

benchmarkSystem().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de benchmark de sistema:', error);
    process.exit(1);
});
EOF

# Executar testes de benchmark de sistema
SYS_BENCH_RESULTS=$(node /tmp/benchmark_system.js)
echo "$SYS_BENCH_RESULTS" > $TEST_RESULTS_DIR/system_benchmark_$DATE.json

# Verificar resultados
SYS_BENCH_PASSED=$(echo "$SYS_BENCH_RESULTS" | jq -r '.passed')
SYS_BENCH_FAILED=$(echo "$SYS_BENCH_RESULTS" | jq -r '.failed')

if [ $SYS_BENCH_FAILED -eq 0 ]; then
    log "✅ Testes de benchmark de sistema: $SYS_BENCH_PASSED/$((SYS_BENCH_PASSED + SYS_BENCH_FAILED)) passaram"
else
    warn "⚠️ Testes de benchmark de sistema: $SYS_BENCH_FAILED falharam"
fi

# 4. Gerar relatório consolidado
log "Gerando relatório consolidado de benchmark..."

# Calcular totais
TOTAL_BENCH_PASSED=$((API_BENCH_PASSED + DB_BENCH_PASSED + SYS_BENCH_PASSED))
TOTAL_BENCH_FAILED=$((API_BENCH_FAILED + DB_BENCH_FAILED + SYS_BENCH_FAILED))
TOTAL_BENCH_TESTS=$((TOTAL_BENCH_PASSED + TOTAL_BENCH_FAILED))

# Gerar relatório
cat > $TEST_RESULTS_DIR/benchmark_report_$DATE.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "type": "benchmark_tests",
  "summary": {
    "total_tests": $TOTAL_BENCH_TESTS,
    "passed": $TOTAL_BENCH_PASSED,
    "failed": $TOTAL_BENCH_FAILED,
    "success_rate": "$(echo "scale=2; $TOTAL_BENCH_PASSED * 100 / $TOTAL_BENCH_TESTS" | bc)%"
  },
  "categories": {
    "api_benchmark": {
      "passed": $API_BENCH_PASSED,
      "failed": $API_BENCH_FAILED,
      "success_rate": "$(echo "scale=2; $API_BENCH_PASSED * 100 / ($API_BENCH_PASSED + $API_BENCH_FAILED)" | bc)%"
    },
    "database_benchmark": {
      "passed": $DB_BENCH_PASSED,
      "failed": $DB_BENCH_FAILED,
      "success_rate": "$(echo "scale=2; $DB_BENCH_PASSED * 100 / ($DB_BENCH_PASSED + $DB_BENCH_FAILED)" | bc)%"
    },
    "system_benchmark": {
      "passed": $SYS_BENCH_PASSED,
      "failed": $SYS_BENCH_FAILED,
      "success_rate": "$(echo "scale=2; $SYS_BENCH_PASSED * 100 / ($SYS_BENCH_PASSED + $SYS_BENCH_FAILED)" | bc)%"
    }
  },
  "files": {
    "api_benchmark": "api_benchmark_$DATE.json",
    "database_benchmark": "database_benchmark_$DATE.json",
    "system_benchmark": "system_benchmark_$DATE.json"
  }
}
EOF

# 5. Limpar arquivos temporários
log "Limpando arquivos temporários..."
rm -f /tmp/benchmark_*.js

# 6. Exibir resumo final
log "🎉 Testes de benchmark finalizados!"
log "📊 Resumo dos resultados:"
log "   • Total de testes: $TOTAL_BENCH_TESTS"
log "   • Testes passaram: $TOTAL_BENCH_PASSED"
log "   • Testes falharam: $TOTAL_BENCH_FAILED"
log "   • Taxa de sucesso: $(echo "scale=2; $TOTAL_BENCH_PASSED * 100 / $TOTAL_BENCH_TESTS" | bc)%"
log ""
log "📋 Resultados por categoria:"
log "   • Benchmark de API: $API_BENCH_PASSED/$((API_BENCH_PASSED + API_BENCH_FAILED)) ($(echo "scale=2; $API_BENCH_PASSED * 100 / ($API_BENCH_PASSED + $API_BENCH_FAILED)" | bc)%)"
log "   • Benchmark de Banco: $DB_BENCH_PASSED/$((DB_BENCH_PASSED + DB_BENCH_FAILED)) ($(echo "scale=2; $DB_BENCH_PASSED * 100 / ($DB_BENCH_PASSED + $DB_BENCH_FAILED)" | bc)%)"
log "   • Benchmark de Sistema: $SYS_BENCH_PASSED/$((SYS_BENCH_PASSED + SYS_BENCH_FAILED)) ($(echo "scale=2; $SYS_BENCH_PASSED * 100 / ($SYS_BENCH_PASSED + $SYS_BENCH_FAILED)" | bc)%)"
log ""
log "📁 Relatórios salvos em: $TEST_RESULTS_DIR"
log "   • Relatório consolidado: benchmark_report_$DATE.json"
log "   • Testes individuais: api_benchmark_$DATE.json, database_benchmark_$DATE.json, etc."

if [ $TOTAL_BENCH_FAILED -eq 0 ]; then
    log "✅ Todos os testes de benchmark passaram! Sistema está dentro dos padrões de performance."
else
    warn "⚠️ $TOTAL_BENCH_FAILED testes de benchmark falharam. Revise os relatórios para otimizações."
fi
