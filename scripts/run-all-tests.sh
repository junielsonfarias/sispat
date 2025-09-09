#!/bin/bash

# SISPAT - Script Principal de Testes
# Este script executa todos os testes: funcionais, regressão, performance e segurança

set -e

echo "🚀 Executando Todos os Testes do SISPAT..."

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
TEST_RESULTS_DIR="/var/log/sispat/all-tests"
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

# 2. Executar testes funcionais
log "Executando testes funcionais..."
if [ -f "scripts/run-functional-tests.sh" ]; then
    chmod +x scripts/run-functional-tests.sh
    ./scripts/run-functional-tests.sh $BASE_URL $FRONTEND_URL
    
    # Copiar resultados
    if [ -d "/var/log/sispat/test-results" ]; then
        cp -r /var/log/sispat/test-results/* $TEST_RESULTS_DIR/
    fi
    
    log "✅ Testes funcionais concluídos"
else
    warn "⚠️ Script de testes funcionais não encontrado"
fi

# 3. Executar testes de regressão
log "Executando testes de regressão..."
if [ -f "scripts/run-regression-tests.sh" ]; then
    chmod +x scripts/run-regression-tests.sh
    ./scripts/run-regression-tests.sh $BASE_URL $FRONTEND_URL
    
    # Copiar resultados
    if [ -d "/var/log/sispat/regression-tests" ]; then
        cp -r /var/log/sispat/regression-tests/* $TEST_RESULTS_DIR/
    fi
    
    log "✅ Testes de regressão concluídos"
else
    warn "⚠️ Script de testes de regressão não encontrado"
fi

# 4. Executar testes de performance
log "Executando testes de performance..."

# Criar script de teste de performance
tee /tmp/performance_tests.js > /dev/null << 'EOF'
const axios = require('axios');

async function testPerformance() {
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

    // Teste 1: Tempo de resposta da API
    const endpoints = [
        '/api/patrimonios',
        '/api/municipalities',
        '/api/sectors',
        '/api/users',
        '/api/dashboard'
    ];

    for (const endpoint of endpoints) {
        try {
            const startTime = Date.now();
            const response = await axios.get(`${baseUrl}${endpoint}`, { headers });
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            if (responseTime < 2000) {
                results.tests.push({ name: `Performance ${endpoint}`, status: 'PASS', time: `${responseTime}ms` });
                results.passed++;
            } else {
                results.tests.push({ name: `Performance ${endpoint}`, status: 'FAIL', error: `Resposta lenta: ${responseTime}ms` });
                results.failed++;
            }
        } catch (error) {
            results.tests.push({ name: `Performance ${endpoint}`, status: 'FAIL', error: error.message });
            results.failed++;
        }
    }

    // Teste 2: Teste de carga
    try {
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < 20; i++) {
            promises.push(axios.get(`${baseUrl}/api/patrimonios`, { headers }));
        }
        
        await Promise.all(promises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        if (totalTime < 10000) {
            results.tests.push({ name: 'Teste de carga (20 requisições)', status: 'PASS', time: `${totalTime}ms` });
            results.passed++;
        } else {
            results.tests.push({ name: 'Teste de carga (20 requisições)', status: 'FAIL', error: `Tempo total alto: ${totalTime}ms` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Teste de carga (20 requisições)', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Teste de stress
    try {
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < 50; i++) {
            promises.push(axios.get(`${baseUrl}/api/health`));
        }
        
        await Promise.all(promises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        if (totalTime < 15000) {
            results.tests.push({ name: 'Teste de stress (50 requisições)', status: 'PASS', time: `${totalTime}ms` });
            results.passed++;
        } else {
            results.tests.push({ name: 'Teste de stress (50 requisições)', status: 'FAIL', error: `Tempo total alto: ${totalTime}ms` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Teste de stress (50 requisições)', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testPerformance().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de performance:', error);
    process.exit(1);
});
EOF

# Executar testes de performance
PERF_RESULTS=$(node /tmp/performance_tests.js)
echo "$PERF_RESULTS" > $TEST_RESULTS_DIR/performance_tests_$DATE.json

# Verificar resultados
PERF_PASSED=$(echo "$PERF_RESULTS" | jq -r '.passed')
PERF_FAILED=$(echo "$PERF_RESULTS" | jq -r '.failed')

if [ $PERF_FAILED -eq 0 ]; then
    log "✅ Testes de performance: $PERF_PASSED/$((PERF_PASSED + PERF_FAILED)) passaram"
else
    warn "⚠️ Testes de performance: $PERF_FAILED falharam"
fi

# 5. Executar testes de segurança
log "Executando testes de segurança..."

# Criar script de teste de segurança
tee /tmp/security_tests.js > /dev/null << 'EOF'
const axios = require('axios');

async function testSecurity() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Rate limiting
    try {
        const promises = [];
        for (let i = 0; i < 30; i++) {
            promises.push(axios.post(`${baseUrl}/api/auth/login`, {
                email: 'test@test.com',
                password: 'wrongpassword'
            }).catch(error => error));
        }
        
        const responses = await Promise.all(promises);
        const rateLimited = responses.some(response => 
            response.response && response.response.status === 429
        );
        
        if (rateLimited) {
            results.tests.push({ name: 'Rate limiting', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Rate limiting', status: 'FAIL', error: 'Rate limiting não funcionando' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Rate limiting', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Headers de segurança
    try {
        const response = await axios.get(`${baseUrl}/api/health`);
        const headers = response.headers;
        
        const securityHeaders = [
            'x-frame-options',
            'x-content-type-options',
            'x-xss-protection',
            'referrer-policy'
        ];
        
        let securityHeadersPresent = 0;
        for (const header of securityHeaders) {
            if (headers[header]) {
                securityHeadersPresent++;
            }
        }
        
        if (securityHeadersPresent >= 2) {
            results.tests.push({ name: 'Headers de segurança', status: 'PASS', count: securityHeadersPresent });
            results.passed++;
        } else {
            results.tests.push({ name: 'Headers de segurança', status: 'FAIL', error: `Apenas ${securityHeadersPresent} headers encontrados` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Headers de segurança', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: SQL Injection
    try {
        const maliciousInputs = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "'; DELETE FROM users; --",
            "' UNION SELECT * FROM users --"
        ];
        
        let sqlInjectionBlocked = 0;
        for (const input of maliciousInputs) {
            try {
                await axios.post(`${baseUrl}/api/auth/login`, {
                    email: input,
                    password: 'test'
                });
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    sqlInjectionBlocked++;
                }
            }
        }
        
        if (sqlInjectionBlocked === maliciousInputs.length) {
            results.tests.push({ name: 'SQL Injection', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'SQL Injection', status: 'FAIL', error: 'Possível vulnerabilidade SQL injection' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'SQL Injection', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: XSS
    try {
        const xssPayloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "<svg onload=alert('xss')>"
        ];
        
        let xssBlocked = 0;
        for (const payload of xssPayloads) {
            try {
                await axios.post(`${baseUrl}/api/auth/login`, {
                    email: payload,
                    password: 'test'
                });
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    xssBlocked++;
                }
            }
        }
        
        if (xssBlocked === xssPayloads.length) {
            results.tests.push({ name: 'XSS', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'XSS', status: 'FAIL', error: 'Possível vulnerabilidade XSS' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'XSS', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: Acesso não autorizado
    try {
        const protectedEndpoints = [
            '/api/users',
            '/api/patrimonios',
            '/api/municipalities',
            '/api/sectors'
        ];
        
        let unauthorizedBlocked = 0;
        for (const endpoint of protectedEndpoints) {
            try {
                await axios.get(`${baseUrl}${endpoint}`);
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    unauthorizedBlocked++;
                }
            }
        }
        
        if (unauthorizedBlocked === protectedEndpoints.length) {
            results.tests.push({ name: 'Acesso não autorizado', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Acesso não autorizado', status: 'FAIL', error: 'Endpoints protegidos acessíveis sem autenticação' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Acesso não autorizado', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testSecurity().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de segurança:', error);
    process.exit(1);
});
EOF

# Executar testes de segurança
SEC_RESULTS=$(node /tmp/security_tests.js)
echo "$SEC_RESULTS" > $TEST_RESULTS_DIR/security_tests_$DATE.json

# Verificar resultados
SEC_PASSED=$(echo "$SEC_RESULTS" | jq -r '.passed')
SEC_FAILED=$(echo "$SEC_RESULTS" | jq -r '.failed')

if [ $SEC_FAILED -eq 0 ]; then
    log "✅ Testes de segurança: $SEC_PASSED/$((SEC_PASSED + SEC_FAILED)) passaram"
else
    warn "⚠️ Testes de segurança: $SEC_FAILED falharam"
fi

# 6. Executar testes de compatibilidade
log "Executando testes de compatibilidade..."

# Criar script de teste de compatibilidade
tee /tmp/compatibility_tests.js > /dev/null << 'EOF'
const axios = require('axios');

async function testCompatibility() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Compatibilidade de navegadores (User-Agent)
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ];

    for (const userAgent of userAgents) {
        try {
            const response = await axios.get(`${baseUrl}/api/health`, {
                headers: { 'User-Agent': userAgent }
            });
            
            if (response.status === 200) {
                results.tests.push({ name: `Compatibilidade ${userAgent.split(' ')[0]}`, status: 'PASS' });
                results.passed++;
            } else {
                results.tests.push({ name: `Compatibilidade ${userAgent.split(' ')[0]}`, status: 'FAIL', error: `Status ${response.status}` });
                results.failed++;
            }
        } catch (error) {
            results.tests.push({ name: `Compatibilidade ${userAgent.split(' ')[0]}`, status: 'FAIL', error: error.message });
            results.failed++;
        }
    }

    // Teste 2: Compatibilidade de métodos HTTP
    const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    
    for (const method of httpMethods) {
        try {
            let response;
            if (method === 'GET') {
                response = await axios.get(`${baseUrl}/api/health`);
            } else if (method === 'POST') {
                response = await axios.post(`${baseUrl}/api/health`);
            } else if (method === 'PUT') {
                response = await axios.put(`${baseUrl}/api/health`);
            } else if (method === 'DELETE') {
                response = await axios.delete(`${baseUrl}/api/health`);
            } else if (method === 'OPTIONS') {
                response = await axios.options(`${baseUrl}/api/health`);
            }
            
            if (response && (response.status === 200 || response.status === 405)) {
                results.tests.push({ name: `Método HTTP ${method}`, status: 'PASS' });
                results.passed++;
            } else {
                results.tests.push({ name: `Método HTTP ${method}`, status: 'FAIL', error: `Status ${response.status}` });
                results.failed++;
            }
        } catch (error) {
            if (error.response && error.response.status === 405) {
                results.tests.push({ name: `Método HTTP ${method}`, status: 'PASS' });
                results.passed++;
            } else {
                results.tests.push({ name: `Método HTTP ${method}`, status: 'FAIL', error: error.message });
                results.failed++;
            }
        }
    }

    // Teste 3: Compatibilidade de Content-Type
    const contentTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'text/plain',
        'multipart/form-data'
    ];

    for (const contentType of contentTypes) {
        try {
            const response = await axios.post(`${baseUrl}/api/health`, {}, {
                headers: { 'Content-Type': contentType }
            });
            
            if (response.status === 200 || response.status === 405) {
                results.tests.push({ name: `Content-Type ${contentType}`, status: 'PASS' });
                results.passed++;
            } else {
                results.tests.push({ name: `Content-Type ${contentType}`, status: 'FAIL', error: `Status ${response.status}` });
                results.failed++;
            }
        } catch (error) {
            if (error.response && (error.response.status === 405 || error.response.status === 400)) {
                results.tests.push({ name: `Content-Type ${contentType}`, status: 'PASS' });
                results.passed++;
            } else {
                results.tests.push({ name: `Content-Type ${contentType}`, status: 'FAIL', error: error.message });
                results.failed++;
            }
        }
    }

    return results;
}

testCompatibility().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de compatibilidade:', error);
    process.exit(1);
});
EOF

# Executar testes de compatibilidade
COMP_RESULTS=$(node /tmp/compatibility_tests.js)
echo "$COMP_RESULTS" > $TEST_RESULTS_DIR/compatibility_tests_$DATE.json

# Verificar resultados
COMP_PASSED=$(echo "$COMP_RESULTS" | jq -r '.passed')
COMP_FAILED=$(echo "$COMP_RESULTS" | jq -r '.failed')

if [ $COMP_FAILED -eq 0 ]; then
    log "✅ Testes de compatibilidade: $COMP_PASSED/$((COMP_PASSED + COMP_FAILED)) passaram"
else
    warn "⚠️ Testes de compatibilidade: $COMP_FAILED falharam"
fi

# 7. Gerar relatório consolidado final
log "Gerando relatório consolidado final..."

# Calcular totais
TOTAL_PASSED=$((PERF_PASSED + SEC_PASSED + COMP_PASSED))
TOTAL_FAILED=$((PERF_FAILED + SEC_FAILED + COMP_FAILED))
TOTAL_TESTS=$((TOTAL_PASSED + TOTAL_FAILED))

# Gerar relatório final
cat > $TEST_RESULTS_DIR/final_report_$DATE.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "type": "all_tests",
  "summary": {
    "total_tests": $TOTAL_TESTS,
    "passed": $TOTAL_PASSED,
    "failed": $TOTAL_FAILED,
    "success_rate": "$(echo "scale=2; $TOTAL_PASSED * 100 / $TOTAL_TESTS" | bc)%"
  },
  "categories": {
    "performance": {
      "passed": $PERF_PASSED,
      "failed": $PERF_FAILED,
      "success_rate": "$(echo "scale=2; $PERF_PASSED * 100 / ($PERF_PASSED + $PERF_FAILED)" | bc)%"
    },
    "security": {
      "passed": $SEC_PASSED,
      "failed": $SEC_FAILED,
      "success_rate": "$(echo "scale=2; $SEC_PASSED * 100 / ($SEC_PASSED + $SEC_FAILED)" | bc)%"
    },
    "compatibility": {
      "passed": $COMP_PASSED,
      "failed": $COMP_FAILED,
      "success_rate": "$(echo "scale=2; $COMP_PASSED * 100 / ($COMP_PASSED + $COMP_FAILED)" | bc)%"
    }
  },
  "files": {
    "performance": "performance_tests_$DATE.json",
    "security": "security_tests_$DATE.json",
    "compatibility": "compatibility_tests_$DATE.json"
  }
}
EOF

# 8. Limpar arquivos temporários
log "Limpando arquivos temporários..."
rm -f /tmp/*_tests.js

# 9. Exibir resumo final
log "🎉 Todos os testes finalizados!"
log "📊 Resumo dos resultados:"
log "   • Total de testes: $TOTAL_TESTS"
log "   • Testes passaram: $TOTAL_PASSED"
log "   • Testes falharam: $TOTAL_FAILED"
log "   • Taxa de sucesso: $(echo "scale=2; $TOTAL_PASSED * 100 / $TOTAL_TESTS" | bc)%"
log ""
log "📋 Resultados por categoria:"
log "   • Performance: $PERF_PASSED/$((PERF_PASSED + PERF_FAILED)) ($(echo "scale=2; $PERF_PASSED * 100 / ($PERF_PASSED + $PERF_FAILED)" | bc)%)"
log "   • Segurança: $SEC_PASSED/$((SEC_PASSED + SEC_FAILED)) ($(echo "scale=2; $SEC_PASSED * 100 / ($SEC_PASSED + $SEC_FAILED)" | bc)%)"
log "   • Compatibilidade: $COMP_PASSED/$((COMP_PASSED + COMP_FAILED)) ($(echo "scale=2; $COMP_PASSED * 100 / ($COMP_PASSED + $COMP_FAILED)" | bc)%)"
log ""
log "📁 Relatórios salvos em: $TEST_RESULTS_DIR"
log "   • Relatório final: final_report_$DATE.json"
log "   • Testes individuais: performance_tests_$DATE.json, security_tests_$DATE.json, etc."

if [ $TOTAL_FAILED -eq 0 ]; then
    log "✅ Todos os testes passaram! Sistema pronto para produção."
else
    warn "⚠️ $TOTAL_FAILED testes falharam. Revise os relatórios para detalhes."
fi
