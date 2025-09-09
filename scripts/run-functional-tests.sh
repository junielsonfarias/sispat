#!/bin/bash

# SISPAT - Script de Testes Funcionais Completos
# Este script executa testes de funcionalidades, integração e regressão

set -e

echo "🚀 Executando Testes Funcionais Completos..."

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
TEST_RESULTS_DIR="/var/log/sispat/test-results"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de resultados
mkdir -p $TEST_RESULTS_DIR

# 1. Testes de Conectividade
log "Executando testes de conectividade..."

# Testar backend
if curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health | grep -q "200"; then
    log "✅ Backend: Conectividade OK"
else
    error "❌ Backend: Falha na conectividade"
    exit 1
fi

# Testar frontend
if curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL | grep -q "200"; then
    log "✅ Frontend: Conectividade OK"
else
    error "❌ Frontend: Falha na conectividade"
    exit 1
fi

# Testar banco de dados
if sudo -u postgres psql -c "SELECT 1;" > /dev/null 2>&1; then
    log "✅ PostgreSQL: Conectividade OK"
else
    error "❌ PostgreSQL: Falha na conectividade"
    exit 1
fi

# 2. Testes de Autenticação
log "Executando testes de autenticação..."

# Criar script de teste de autenticação
tee /tmp/test_auth.js > /dev/null << 'EOF'
const axios = require('axios');

async function testAuthentication() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Login com credenciais válidas
    try {
        const response = await axios.post(`${baseUrl}/api/auth/login`, {
            email: 'admin@sispat.com',
            password: 'admin123'
        });
        
        if (response.status === 200 && response.data.token) {
            results.tests.push({ name: 'Login válido', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Login válido', status: 'FAIL', error: 'Token não retornado' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Login válido', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Login com credenciais inválidas
    try {
        await axios.post(`${baseUrl}/api/auth/login`, {
            email: 'invalid@test.com',
            password: 'wrongpassword'
        });
        results.tests.push({ name: 'Login inválido', status: 'FAIL', error: 'Deveria ter falhado' });
        results.failed++;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            results.tests.push({ name: 'Login inválido', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Login inválido', status: 'FAIL', error: error.message });
            results.failed++;
        }
    }

    // Teste 3: Acesso sem token
    try {
        await axios.get(`${baseUrl}/api/auth/me`);
        results.tests.push({ name: 'Acesso sem token', status: 'FAIL', error: 'Deveria ter falhado' });
        results.failed++;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            results.tests.push({ name: 'Acesso sem token', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Acesso sem token', status: 'FAIL', error: error.message });
            results.failed++;
        }
    }

    return results;
}

testAuthentication().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de autenticação:', error);
    process.exit(1);
});
EOF

# Executar testes de autenticação
AUTH_RESULTS=$(node /tmp/test_auth.js)
echo "$AUTH_RESULTS" > $TEST_RESULTS_DIR/auth_tests_$DATE.json

# Verificar resultados
AUTH_PASSED=$(echo "$AUTH_RESULTS" | jq -r '.passed')
AUTH_FAILED=$(echo "$AUTH_RESULTS" | jq -r '.failed')

if [ $AUTH_FAILED -eq 0 ]; then
    log "✅ Testes de autenticação: $AUTH_PASSED/$((AUTH_PASSED + AUTH_FAILED)) passaram"
else
    warn "⚠️ Testes de autenticação: $AUTH_FAILED falharam"
fi

# 3. Testes de API
log "Executando testes de API..."

# Criar script de teste de API
tee /tmp/test_api.js > /dev/null << 'EOF'
const axios = require('axios');

async function testAPI() {
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

    // Teste 1: GET /api/patrimonios
    try {
        const response = await axios.get(`${baseUrl}/api/patrimonios`, { headers });
        if (response.status === 200) {
            results.tests.push({ name: 'GET /api/patrimonios', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'GET /api/patrimonios', status: 'FAIL', error: `Status ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'GET /api/patrimonios', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: GET /api/municipalities
    try {
        const response = await axios.get(`${baseUrl}/api/municipalities`, { headers });
        if (response.status === 200) {
            results.tests.push({ name: 'GET /api/municipalities', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'GET /api/municipalities', status: 'FAIL', error: `Status ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'GET /api/municipalities', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: GET /api/sectors
    try {
        const response = await axios.get(`${baseUrl}/api/sectors`, { headers });
        if (response.status === 200) {
            results.tests.push({ name: 'GET /api/sectors', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'GET /api/sectors', status: 'FAIL', error: `Status ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'GET /api/sectors', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: GET /api/users
    try {
        const response = await axios.get(`${baseUrl}/api/users`, { headers });
        if (response.status === 200) {
            results.tests.push({ name: 'GET /api/users', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'GET /api/users', status: 'FAIL', error: `Status ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'GET /api/users', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: POST /api/patrimonios (criar patrimônio)
    try {
        const patrimonioData = {
            numeroPatrimonio: `TEST-${Date.now()}`,
            descricao: 'Patrimônio de teste',
            valor: 1000.00,
            dataAquisicao: new Date().toISOString().split('T')[0],
            estado: 'ativo',
            observacoes: 'Patrimônio criado para teste'
        };
        
        const response = await axios.post(`${baseUrl}/api/patrimonios`, patrimonioData, { headers });
        if (response.status === 201) {
            results.tests.push({ name: 'POST /api/patrimonios', status: 'PASS' });
            results.passed++;
            
            // Teste 6: PUT /api/patrimonios (atualizar patrimônio)
            try {
                const updateData = { ...patrimonioData, descricao: 'Patrimônio atualizado' };
                const updateResponse = await axios.put(`${baseUrl}/api/patrimonios/${response.data.id}`, updateData, { headers });
                if (updateResponse.status === 200) {
                    results.tests.push({ name: 'PUT /api/patrimonios', status: 'PASS' });
                    results.passed++;
                } else {
                    results.tests.push({ name: 'PUT /api/patrimonios', status: 'FAIL', error: `Status ${updateResponse.status}` });
                    results.failed++;
                }
            } catch (error) {
                results.tests.push({ name: 'PUT /api/patrimonios', status: 'FAIL', error: error.message });
                results.failed++;
            }
            
            // Teste 7: DELETE /api/patrimonios (deletar patrimônio)
            try {
                const deleteResponse = await axios.delete(`${baseUrl}/api/patrimonios/${response.data.id}`, { headers });
                if (deleteResponse.status === 200) {
                    results.tests.push({ name: 'DELETE /api/patrimonios', status: 'PASS' });
                    results.passed++;
                } else {
                    results.tests.push({ name: 'DELETE /api/patrimonios', status: 'FAIL', error: `Status ${deleteResponse.status}` });
                    results.failed++;
                }
            } catch (error) {
                results.tests.push({ name: 'DELETE /api/patrimonios', status: 'FAIL', error: error.message });
                results.failed++;
            }
        } else {
            results.tests.push({ name: 'POST /api/patrimonios', status: 'FAIL', error: `Status ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'POST /api/patrimonios', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testAPI().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de API:', error);
    process.exit(1);
});
EOF

# Executar testes de API
API_RESULTS=$(node /tmp/test_api.js)
echo "$API_RESULTS" > $TEST_RESULTS_DIR/api_tests_$DATE.json

# Verificar resultados
API_PASSED=$(echo "$API_RESULTS" | jq -r '.passed')
API_FAILED=$(echo "$API_RESULTS" | jq -r '.failed')

if [ $API_FAILED -eq 0 ]; then
    log "✅ Testes de API: $API_PASSED/$((API_PASSED + API_FAILED)) passaram"
else
    warn "⚠️ Testes de API: $API_FAILED falharam"
fi

# 4. Testes de Banco de Dados
log "Executando testes de banco de dados..."

# Criar script de teste de banco
tee /tmp/test_database.js > /dev/null << 'EOF'
const { Pool } = require('pg');

async function testDatabase() {
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
        // Teste 1: Conectividade
        const client = await pool.connect();
        results.tests.push({ name: 'Conectividade', status: 'PASS' });
        results.passed++;
        client.release();

        // Teste 2: Verificar tabelas principais
        const tables = ['users', 'municipalities', 'sectors', 'patrimonios', 'locals', 'imoveis'];
        for (const table of tables) {
            try {
                const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                results.tests.push({ name: `Tabela ${table}`, status: 'PASS', count: result.rows[0].count });
                results.passed++;
            } catch (error) {
                results.tests.push({ name: `Tabela ${table}`, status: 'FAIL', error: error.message });
                results.failed++;
            }
        }

        // Teste 3: Verificar índices
        const indexResult = await pool.query(`
            SELECT indexname, tablename 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname NOT LIKE '%_pkey'
        `);
        
        if (indexResult.rows.length > 0) {
            results.tests.push({ name: 'Índices', status: 'PASS', count: indexResult.rows.length });
            results.passed++;
        } else {
            results.tests.push({ name: 'Índices', status: 'FAIL', error: 'Nenhum índice encontrado' });
            results.failed++;
        }

        // Teste 4: Verificar extensões
        const extensionResult = await pool.query(`
            SELECT extname 
            FROM pg_extension 
            WHERE extname IN ('pg_stat_statements', 'pg_trgm', 'btree_gin', 'btree_gist')
        `);
        
        if (extensionResult.rows.length > 0) {
            results.tests.push({ name: 'Extensões', status: 'PASS', count: extensionResult.rows.length });
            results.passed++;
        } else {
            results.tests.push({ name: 'Extensões', status: 'FAIL', error: 'Extensões não encontradas' });
            results.failed++;
        }

        // Teste 5: Performance de consulta
        const startTime = Date.now();
        await pool.query('SELECT * FROM patrimonios LIMIT 100');
        const endTime = Date.now();
        const queryTime = endTime - startTime;
        
        if (queryTime < 1000) {
            results.tests.push({ name: 'Performance', status: 'PASS', time: `${queryTime}ms` });
            results.passed++;
        } else {
            results.tests.push({ name: 'Performance', status: 'FAIL', error: `Consulta lenta: ${queryTime}ms` });
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

testDatabase().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de banco:', error);
    process.exit(1);
});
EOF

# Executar testes de banco
DB_RESULTS=$(node /tmp/test_database.js)
echo "$DB_RESULTS" > $TEST_RESULTS_DIR/database_tests_$DATE.json

# Verificar resultados
DB_PASSED=$(echo "$DB_RESULTS" | jq -r '.passed')
DB_FAILED=$(echo "$DB_RESULTS" | jq -r '.failed')

if [ $DB_FAILED -eq 0 ]; then
    log "✅ Testes de banco de dados: $DB_PASSED/$((DB_PASSED + DB_FAILED)) passaram"
else
    warn "⚠️ Testes de banco de dados: $DB_FAILED falharam"
fi

# 5. Testes de Performance
log "Executando testes de performance..."

# Criar script de teste de performance
tee /tmp/test_performance.js > /dev/null << 'EOF'
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
        '/api/users'
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

    // Teste 2: Teste de carga (múltiplas requisições)
    try {
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < 10; i++) {
            promises.push(axios.get(`${baseUrl}/api/patrimonios`, { headers }));
        }
        
        await Promise.all(promises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        if (totalTime < 5000) {
            results.tests.push({ name: 'Teste de carga', status: 'PASS', time: `${totalTime}ms` });
            results.passed++;
        } else {
            results.tests.push({ name: 'Teste de carga', status: 'FAIL', error: `Tempo total alto: ${totalTime}ms` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Teste de carga', status: 'FAIL', error: error.message });
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
PERF_RESULTS=$(node /tmp/test_performance.js)
echo "$PERF_RESULTS" > $TEST_RESULTS_DIR/performance_tests_$DATE.json

# Verificar resultados
PERF_PASSED=$(echo "$PERF_RESULTS" | jq -r '.passed')
PERF_FAILED=$(echo "$PERF_RESULTS" | jq -r '.failed')

if [ $PERF_FAILED -eq 0 ]; then
    log "✅ Testes de performance: $PERF_PASSED/$((PERF_PASSED + PERF_FAILED)) passaram"
else
    warn "⚠️ Testes de performance: $PERF_FAILED falharam"
fi

# 6. Testes de Segurança
log "Executando testes de segurança..."

# Criar script de teste de segurança
tee /tmp/test_security.js > /dev/null << 'EOF'
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
        for (let i = 0; i < 20; i++) {
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

    // Teste 3: SQL Injection (básico)
    try {
        const maliciousInput = "'; DROP TABLE users; --";
        const response = await axios.post(`${baseUrl}/api/auth/login`, {
            email: maliciousInput,
            password: 'test'
        }).catch(error => error);
        
        if (response.response && response.response.status === 401) {
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

    // Teste 4: XSS (básico)
    try {
        const xssPayload = "<script>alert('xss')</script>";
        const response = await axios.post(`${baseUrl}/api/auth/login`, {
            email: xssPayload,
            password: 'test'
        }).catch(error => error);
        
        if (response.response && response.response.status === 401) {
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
SEC_RESULTS=$(node /tmp/test_security.js)
echo "$SEC_RESULTS" > $TEST_RESULTS_DIR/security_tests_$DATE.json

# Verificar resultados
SEC_PASSED=$(echo "$SEC_RESULTS" | jq -r '.passed')
SEC_FAILED=$(echo "$SEC_RESULTS" | jq -r '.failed')

if [ $SEC_FAILED -eq 0 ]; then
    log "✅ Testes de segurança: $SEC_PASSED/$((SEC_PASSED + SEC_FAILED)) passaram"
else
    warn "⚠️ Testes de segurança: $SEC_FAILED falharam"
fi

# 7. Testes de Integração
log "Executando testes de integração..."

# Criar script de teste de integração
tee /tmp/test_integration.js > /dev/null << 'EOF'
const axios = require('axios');

async function testIntegration() {
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

    // Teste 1: Fluxo completo de patrimônio
    try {
        // Criar patrimônio
        const patrimonioData = {
            numeroPatrimonio: `INTEGRATION-${Date.now()}`,
            descricao: 'Patrimônio de integração',
            valor: 2000.00,
            dataAquisicao: new Date().toISOString().split('T')[0],
            estado: 'ativo',
            observacoes: 'Teste de integração'
        };
        
        const createResponse = await axios.post(`${baseUrl}/api/patrimonios`, patrimonioData, { headers });
        if (createResponse.status === 201) {
            const patrimonioId = createResponse.data.id;
            
            // Buscar patrimônio criado
            const getResponse = await axios.get(`${baseUrl}/api/patrimonios/${patrimonioId}`, { headers });
            if (getResponse.status === 200) {
                // Atualizar patrimônio
                const updateData = { ...patrimonioData, descricao: 'Patrimônio atualizado' };
                const updateResponse = await axios.put(`${baseUrl}/api/patrimonios/${patrimonioId}`, updateData, { headers });
                if (updateResponse.status === 200) {
                    // Deletar patrimônio
                    const deleteResponse = await axios.delete(`${baseUrl}/api/patrimonios/${patrimonioId}`, { headers });
                    if (deleteResponse.status === 200) {
                        results.tests.push({ name: 'Fluxo completo de patrimônio', status: 'PASS' });
                        results.passed++;
                    } else {
                        results.tests.push({ name: 'Fluxo completo de patrimônio', status: 'FAIL', error: 'Falha ao deletar' });
                        results.failed++;
                    }
                } else {
                    results.tests.push({ name: 'Fluxo completo de patrimônio', status: 'FAIL', error: 'Falha ao atualizar' });
                    results.failed++;
                }
            } else {
                results.tests.push({ name: 'Fluxo completo de patrimônio', status: 'FAIL', error: 'Falha ao buscar' });
                results.failed++;
            }
        } else {
            results.tests.push({ name: 'Fluxo completo de patrimônio', status: 'FAIL', error: 'Falha ao criar' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Fluxo completo de patrimônio', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Integração com municípios e setores
    try {
        // Buscar municípios
        const municipalitiesResponse = await axios.get(`${baseUrl}/api/municipalities`, { headers });
        if (municipalitiesResponse.status === 200 && municipalitiesResponse.data.length > 0) {
            const municipalityId = municipalitiesResponse.data[0].id;
            
            // Buscar setores do município
            const sectorsResponse = await axios.get(`${baseUrl}/api/sectors/municipality/${municipalityId}`, { headers });
            if (sectorsResponse.status === 200) {
                results.tests.push({ name: 'Integração municípios/setores', status: 'PASS' });
                results.passed++;
            } else {
                results.tests.push({ name: 'Integração municípios/setores', status: 'FAIL', error: 'Falha ao buscar setores' });
                results.failed++;
            }
        } else {
            results.tests.push({ name: 'Integração municípios/setores', status: 'FAIL', error: 'Nenhum município encontrado' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Integração municípios/setores', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Integração com usuários
    try {
        // Buscar usuários
        const usersResponse = await axios.get(`${baseUrl}/api/users`, { headers });
        if (usersResponse.status === 200) {
            results.tests.push({ name: 'Integração com usuários', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Integração com usuários', status: 'FAIL', error: 'Falha ao buscar usuários' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Integração com usuários', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testIntegration().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de integração:', error);
    process.exit(1);
});
EOF

# Executar testes de integração
INT_RESULTS=$(node /tmp/test_integration.js)
echo "$INT_RESULTS" > $TEST_RESULTS_DIR/integration_tests_$DATE.json

# Verificar resultados
INT_PASSED=$(echo "$INT_RESULTS" | jq -r '.passed')
INT_FAILED=$(echo "$INT_RESULTS" | jq -r '.failed')

if [ $INT_FAILED -eq 0 ]; then
    log "✅ Testes de integração: $INT_PASSED/$((INT_PASSED + INT_FAILED)) passaram"
else
    warn "⚠️ Testes de integração: $INT_FAILED falharam"
fi

# 8. Gerar relatório consolidado
log "Gerando relatório consolidado..."

# Calcular totais
TOTAL_PASSED=$((AUTH_PASSED + API_PASSED + DB_PASSED + PERF_PASSED + SEC_PASSED + INT_PASSED))
TOTAL_FAILED=$((AUTH_FAILED + API_FAILED + DB_FAILED + PERF_FAILED + SEC_FAILED + INT_FAILED))
TOTAL_TESTS=$((TOTAL_PASSED + TOTAL_FAILED))

# Gerar relatório
cat > $TEST_RESULTS_DIR/consolidated_report_$DATE.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "summary": {
    "total_tests": $TOTAL_TESTS,
    "passed": $TOTAL_PASSED,
    "failed": $TOTAL_FAILED,
    "success_rate": "$(echo "scale=2; $TOTAL_PASSED * 100 / $TOTAL_TESTS" | bc)%"
  },
  "categories": {
    "authentication": {
      "passed": $AUTH_PASSED,
      "failed": $AUTH_FAILED,
      "success_rate": "$(echo "scale=2; $AUTH_PASSED * 100 / ($AUTH_PASSED + $AUTH_FAILED)" | bc)%"
    },
    "api": {
      "passed": $API_PASSED,
      "failed": $API_FAILED,
      "success_rate": "$(echo "scale=2; $API_PASSED * 100 / ($API_PASSED + $API_FAILED)" | bc)%"
    },
    "database": {
      "passed": $DB_PASSED,
      "failed": $DB_FAILED,
      "success_rate": "$(echo "scale=2; $DB_PASSED * 100 / ($DB_PASSED + $DB_FAILED)" | bc)%"
    },
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
    "integration": {
      "passed": $INT_PASSED,
      "failed": $INT_FAILED,
      "success_rate": "$(echo "scale=2; $INT_PASSED * 100 / ($INT_PASSED + $INT_FAILED)" | bc)%"
    }
  },
  "files": {
    "authentication": "auth_tests_$DATE.json",
    "api": "api_tests_$DATE.json",
    "database": "database_tests_$DATE.json",
    "performance": "performance_tests_$DATE.json",
    "security": "security_tests_$DATE.json",
    "integration": "integration_tests_$DATE.json"
  }
}
EOF

# 9. Limpar arquivos temporários
log "Limpando arquivos temporários..."
rm -f /tmp/test_*.js

# 10. Exibir resumo final
log "🎉 Testes funcionais completos finalizados!"
log "📊 Resumo dos resultados:"
log "   • Total de testes: $TOTAL_TESTS"
log "   • Testes passaram: $TOTAL_PASSED"
log "   • Testes falharam: $TOTAL_FAILED"
log "   • Taxa de sucesso: $(echo "scale=2; $TOTAL_PASSED * 100 / $TOTAL_TESTS" | bc)%"
log ""
log "📋 Resultados por categoria:"
log "   • Autenticação: $AUTH_PASSED/$((AUTH_PASSED + AUTH_FAILED)) ($(echo "scale=2; $AUTH_PASSED * 100 / ($AUTH_PASSED + $AUTH_FAILED)" | bc)%)"
log "   • API: $API_PASSED/$((API_PASSED + API_FAILED)) ($(echo "scale=2; $API_PASSED * 100 / ($API_PASSED + API_FAILED)" | bc)%)"
log "   • Banco de dados: $DB_PASSED/$((DB_PASSED + DB_FAILED)) ($(echo "scale=2; $DB_PASSED * 100 / ($DB_PASSED + $DB_FAILED)" | bc)%)"
log "   • Performance: $PERF_PASSED/$((PERF_PASSED + PERF_FAILED)) ($(echo "scale=2; $PERF_PASSED * 100 / ($PERF_PASSED + $PERF_FAILED)" | bc)%)"
log "   • Segurança: $SEC_PASSED/$((SEC_PASSED + SEC_FAILED)) ($(echo "scale=2; $SEC_PASSED * 100 / ($SEC_PASSED + $SEC_FAILED)" | bc)%)"
log "   • Integração: $INT_PASSED/$((INT_PASSED + INT_FAILED)) ($(echo "scale=2; $INT_PASSED * 100 / ($INT_PASSED + $INT_FAILED)" | bc)%)"
log ""
log "📁 Relatórios salvos em: $TEST_RESULTS_DIR"
log "   • Relatório consolidado: consolidated_report_$DATE.json"
log "   • Testes individuais: auth_tests_$DATE.json, api_tests_$DATE.json, etc."

if [ $TOTAL_FAILED -eq 0 ]; then
    log "✅ Todos os testes passaram! Sistema pronto para produção."
else
    warn "⚠️ $TOTAL_FAILED testes falharam. Revise os relatórios para detalhes."
fi
