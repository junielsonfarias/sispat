#!/bin/bash

# SISPAT - Script de Testes de Regressão
# Este script executa testes de regressão para verificar se mudanças não quebraram funcionalidades existentes

set -e

echo "🚀 Executando Testes de Regressão..."

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
TEST_RESULTS_DIR="/var/log/sispat/regression-tests"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de resultados
mkdir -p $TEST_RESULTS_DIR

# 1. Testes de Regressão de Autenticação
log "Executando testes de regressão de autenticação..."

# Criar script de teste de regressão de autenticação
tee /tmp/regression_auth.js > /dev/null << 'EOF'
const axios = require('axios');

async function testAuthRegression() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Login com superuser
    try {
        const response = await axios.post(`${baseUrl}/api/auth/login`, {
            email: 'admin@sispat.com',
            password: 'admin123'
        });
        
        if (response.status === 200 && response.data.token && response.data.user) {
            results.tests.push({ name: 'Login superuser', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Login superuser', status: 'FAIL', error: 'Resposta inválida' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Login superuser', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Verificar dados do usuário
    try {
        const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
            email: 'admin@sispat.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        const meResponse = await axios.get(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (meResponse.status === 200 && meResponse.data.id && meResponse.data.email) {
            results.tests.push({ name: 'Dados do usuário', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Dados do usuário', status: 'FAIL', error: 'Dados inválidos' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Dados do usuário', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Verificar setores do usuário
    try {
        const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
            email: 'admin@sispat.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        const meResponse = await axios.get(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (meResponse.data.sectors && Array.isArray(meResponse.data.sectors)) {
            results.tests.push({ name: 'Setores do usuário', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Setores do usuário', status: 'FAIL', error: 'Setores não encontrados' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Setores do usuário', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testAuthRegression().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de regressão de autenticação:', error);
    process.exit(1);
});
EOF

# Executar testes de regressão de autenticação
AUTH_REG_RESULTS=$(node /tmp/regression_auth.js)
echo "$AUTH_REG_RESULTS" > $TEST_RESULTS_DIR/auth_regression_$DATE.json

# Verificar resultados
AUTH_REG_PASSED=$(echo "$AUTH_REG_RESULTS" | jq -r '.passed')
AUTH_REG_FAILED=$(echo "$AUTH_REG_RESULTS" | jq -r '.failed')

if [ $AUTH_REG_FAILED -eq 0 ]; then
    log "✅ Testes de regressão de autenticação: $AUTH_REG_PASSED/$((AUTH_REG_PASSED + AUTH_REG_FAILED)) passaram"
else
    warn "⚠️ Testes de regressão de autenticação: $AUTH_REG_FAILED falharam"
fi

# 2. Testes de Regressão de CRUD
log "Executando testes de regressão de CRUD..."

# Criar script de teste de regressão de CRUD
tee /tmp/regression_crud.js > /dev/null << 'EOF'
const axios = require('axios');

async function testCRUDRegression() {
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

    // Teste 1: CRUD de Patrimônios
    try {
        // CREATE
        const patrimonioData = {
            numeroPatrimonio: `REG-${Date.now()}`,
            descricao: 'Patrimônio de regressão',
            valor: 1500.00,
            dataAquisicao: new Date().toISOString().split('T')[0],
            estado: 'ativo',
            observacoes: 'Teste de regressão CRUD'
        };
        
        const createResponse = await axios.post(`${baseUrl}/api/patrimonios`, patrimonioData, { headers });
        if (createResponse.status === 201) {
            const patrimonioId = createResponse.data.id;
            
            // READ
            const readResponse = await axios.get(`${baseUrl}/api/patrimonios/${patrimonioId}`, { headers });
            if (readResponse.status === 200) {
                // UPDATE
                const updateData = { ...patrimonioData, descricao: 'Patrimônio atualizado' };
                const updateResponse = await axios.put(`${baseUrl}/api/patrimonios/${patrimonioId}`, updateData, { headers });
                if (updateResponse.status === 200) {
                    // DELETE
                    const deleteResponse = await axios.delete(`${baseUrl}/api/patrimonios/${patrimonioId}`, { headers });
                    if (deleteResponse.status === 200) {
                        results.tests.push({ name: 'CRUD Patrimônios', status: 'PASS' });
                        results.passed++;
                    } else {
                        results.tests.push({ name: 'CRUD Patrimônios', status: 'FAIL', error: 'Falha no DELETE' });
                        results.failed++;
                    }
                } else {
                    results.tests.push({ name: 'CRUD Patrimônios', status: 'FAIL', error: 'Falha no UPDATE' });
                    results.failed++;
                }
            } else {
                results.tests.push({ name: 'CRUD Patrimônios', status: 'FAIL', error: 'Falha no READ' });
                results.failed++;
            }
        } else {
            results.tests.push({ name: 'CRUD Patrimônios', status: 'FAIL', error: 'Falha no CREATE' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'CRUD Patrimônios', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: CRUD de Municípios
    try {
        // CREATE
        const municipioData = {
            name: `Município Regressão ${Date.now()}`,
            state: 'SP',
            cep: '12345-678',
            address: 'Rua de Teste, 123',
            phone: '(11) 99999-9999',
            email: 'teste@municipio.com'
        };
        
        const createResponse = await axios.post(`${baseUrl}/api/municipalities`, municipioData, { headers });
        if (createResponse.status === 201) {
            const municipioId = createResponse.data.id;
            
            // READ
            const readResponse = await axios.get(`${baseUrl}/api/municipalities/${municipioId}`, { headers });
            if (readResponse.status === 200) {
                // UPDATE
                const updateData = { ...municipioData, name: 'Município Atualizado' };
                const updateResponse = await axios.put(`${baseUrl}/api/municipalities/${municipioId}`, updateData, { headers });
                if (updateResponse.status === 200) {
                    // DELETE
                    const deleteResponse = await axios.delete(`${baseUrl}/api/municipalities/${municipioId}`, { headers });
                    if (deleteResponse.status === 200) {
                        results.tests.push({ name: 'CRUD Municípios', status: 'PASS' });
                        results.passed++;
                    } else {
                        results.tests.push({ name: 'CRUD Municípios', status: 'FAIL', error: 'Falha no DELETE' });
                        results.failed++;
                    }
                } else {
                    results.tests.push({ name: 'CRUD Municípios', status: 'FAIL', error: 'Falha no UPDATE' });
                    results.failed++;
                }
            } else {
                results.tests.push({ name: 'CRUD Municípios', status: 'FAIL', error: 'Falha no READ' });
                results.failed++;
            }
        } else {
            results.tests.push({ name: 'CRUD Municípios', status: 'FAIL', error: 'Falha no CREATE' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'CRUD Municípios', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: CRUD de Setores
    try {
        // Buscar um município existente
        const municipalitiesResponse = await axios.get(`${baseUrl}/api/municipalities`, { headers });
        if (municipalitiesResponse.status === 200 && municipalitiesResponse.data.length > 0) {
            const municipalityId = municipalitiesResponse.data[0].id;
            
            // CREATE
            const sectorData = {
                name: `Setor Regressão ${Date.now()}`,
                description: 'Setor de teste de regressão',
                municipalityId: municipalityId
            };
            
            const createResponse = await axios.post(`${baseUrl}/api/sectors`, sectorData, { headers });
            if (createResponse.status === 201) {
                const sectorId = createResponse.data.id;
                
                // READ
                const readResponse = await axios.get(`${baseUrl}/api/sectors/${sectorId}`, { headers });
                if (readResponse.status === 200) {
                    // UPDATE
                    const updateData = { ...sectorData, name: 'Setor Atualizado' };
                    const updateResponse = await axios.put(`${baseUrl}/api/sectors/${sectorId}`, updateData, { headers });
                    if (updateResponse.status === 200) {
                        // DELETE
                        const deleteResponse = await axios.delete(`${baseUrl}/api/sectors/${sectorId}`, { headers });
                        if (deleteResponse.status === 200) {
                            results.tests.push({ name: 'CRUD Setores', status: 'PASS' });
                            results.passed++;
                        } else {
                            results.tests.push({ name: 'CRUD Setores', status: 'FAIL', error: 'Falha no DELETE' });
                            results.failed++;
                        }
                    } else {
                        results.tests.push({ name: 'CRUD Setores', status: 'FAIL', error: 'Falha no UPDATE' });
                        results.failed++;
                    }
                } else {
                    results.tests.push({ name: 'CRUD Setores', status: 'FAIL', error: 'Falha no READ' });
                    results.failed++;
                }
            } else {
                results.tests.push({ name: 'CRUD Setores', status: 'FAIL', error: 'Falha no CREATE' });
                results.failed++;
            }
        } else {
            results.tests.push({ name: 'CRUD Setores', status: 'FAIL', error: 'Nenhum município encontrado' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'CRUD Setores', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testCRUDRegression().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de regressão de CRUD:', error);
    process.exit(1);
});
EOF

# Executar testes de regressão de CRUD
CRUD_REG_RESULTS=$(node /tmp/regression_crud.js)
echo "$CRUD_REG_RESULTS" > $TEST_RESULTS_DIR/crud_regression_$DATE.json

# Verificar resultados
CRUD_REG_PASSED=$(echo "$CRUD_REG_RESULTS" | jq -r '.passed')
CRUD_REG_FAILED=$(echo "$CRUD_REG_RESULTS" | jq -r '.failed')

if [ $CRUD_REG_FAILED -eq 0 ]; then
    log "✅ Testes de regressão de CRUD: $CRUD_REG_PASSED/$((CRUD_REG_PASSED + CRUD_REG_FAILED)) passaram"
else
    warn "⚠️ Testes de regressão de CRUD: $CRUD_REG_FAILED falharam"
fi

# 3. Testes de Regressão de Funcionalidades Específicas
log "Executando testes de regressão de funcionalidades específicas..."

# Criar script de teste de regressão de funcionalidades
tee /tmp/regression_features.js > /dev/null << 'EOF'
const axios = require('axios');

async function testFeaturesRegression() {
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

    // Teste 1: Geração de etiquetas
    try {
        // Buscar um patrimônio existente
        const patrimoniosResponse = await axios.get(`${baseUrl}/api/patrimonios`, { headers });
        if (patrimoniosResponse.status === 200 && patrimoniosResponse.data.length > 0) {
            const patrimonioId = patrimoniosResponse.data[0].id;
            
            // Testar geração de etiqueta
            const labelResponse = await axios.post(`${baseUrl}/api/labels/single`, {
                patrimonioId: patrimonioId
            }, { headers });
            
            if (labelResponse.status === 200) {
                results.tests.push({ name: 'Geração de etiquetas', status: 'PASS' });
                results.passed++;
            } else {
                results.tests.push({ name: 'Geração de etiquetas', status: 'FAIL', error: 'Falha na geração' });
                results.failed++;
            }
        } else {
            results.tests.push({ name: 'Geração de etiquetas', status: 'FAIL', error: 'Nenhum patrimônio encontrado' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Geração de etiquetas', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Relatórios
    try {
        const reportsResponse = await axios.get(`${baseUrl}/api/reports`, { headers });
        if (reportsResponse.status === 200) {
            results.tests.push({ name: 'Relatórios', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Relatórios', status: 'FAIL', error: 'Falha ao buscar relatórios' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Relatórios', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Busca pública
    try {
        const publicSearchResponse = await axios.get(`${baseUrl}/api/public/search`);
        if (publicSearchResponse.status === 200) {
            results.tests.push({ name: 'Busca pública', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Busca pública', status: 'FAIL', error: 'Falha na busca pública' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Busca pública', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Dashboard
    try {
        const dashboardResponse = await axios.get(`${baseUrl}/api/dashboard`, { headers });
        if (dashboardResponse.status === 200) {
            results.tests.push({ name: 'Dashboard', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Dashboard', status: 'FAIL', error: 'Falha no dashboard' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Dashboard', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: Templates de etiquetas
    try {
        const templatesResponse = await axios.get(`${baseUrl}/api/label-templates/templates`, { headers });
        if (templatesResponse.status === 200) {
            results.tests.push({ name: 'Templates de etiquetas', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Templates de etiquetas', status: 'FAIL', error: 'Falha ao buscar templates' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Templates de etiquetas', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 6: Configurações de personalização
    try {
        const customizationResponse = await axios.get(`${baseUrl}/api/customization/global`, { headers });
        if (customizationResponse.status === 200) {
            results.tests.push({ name: 'Configurações de personalização', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Configurações de personalização', status: 'FAIL', error: 'Falha nas configurações' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Configurações de personalização', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testFeaturesRegression().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de regressão de funcionalidades:', error);
    process.exit(1);
});
EOF

# Executar testes de regressão de funcionalidades
FEATURES_REG_RESULTS=$(node /tmp/regression_features.js)
echo "$FEATURES_REG_RESULTS" > $TEST_RESULTS_DIR/features_regression_$DATE.json

# Verificar resultados
FEATURES_REG_PASSED=$(echo "$FEATURES_REG_RESULTS" | jq -r '.passed')
FEATURES_REG_FAILED=$(echo "$FEATURES_REG_RESULTS" | jq -r '.failed')

if [ $FEATURES_REG_FAILED -eq 0 ]; then
    log "✅ Testes de regressão de funcionalidades: $FEATURES_REG_PASSED/$((FEATURES_REG_PASSED + FEATURES_REG_FAILED)) passaram"
else
    warn "⚠️ Testes de regressão de funcionalidades: $FEATURES_REG_FAILED falharam"
fi

# 4. Testes de Regressão de Performance
log "Executando testes de regressão de performance..."

# Criar script de teste de regressão de performance
tee /tmp/regression_performance.js > /dev/null << 'EOF'
const axios = require('axios');

async function testPerformanceRegression() {
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

    // Teste 1: Performance de listagem de patrimônios
    try {
        const startTime = Date.now();
        const response = await axios.get(`${baseUrl}/api/patrimonios`, { headers });
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (responseTime < 3000) {
            results.tests.push({ name: 'Performance listagem patrimônios', status: 'PASS', time: `${responseTime}ms` });
            results.passed++;
        } else {
            results.tests.push({ name: 'Performance listagem patrimônios', status: 'FAIL', error: `Resposta lenta: ${responseTime}ms` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Performance listagem patrimônios', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Performance de dashboard
    try {
        const startTime = Date.now();
        const response = await axios.get(`${baseUrl}/api/dashboard`, { headers });
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (responseTime < 2000) {
            results.tests.push({ name: 'Performance dashboard', status: 'PASS', time: `${responseTime}ms` });
            results.passed++;
        } else {
            results.tests.push({ name: 'Performance dashboard', status: 'FAIL', error: `Resposta lenta: ${responseTime}ms` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Performance dashboard', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Performance de busca
    try {
        const startTime = Date.now();
        const response = await axios.get(`${baseUrl}/api/public/search?q=test`, { headers });
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (responseTime < 1500) {
            results.tests.push({ name: 'Performance busca', status: 'PASS', time: `${responseTime}ms` });
            results.passed++;
        } else {
            results.tests.push({ name: 'Performance busca', status: 'FAIL', error: `Resposta lenta: ${responseTime}ms` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Performance busca', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Performance de criação de patrimônio
    try {
        const patrimonioData = {
            numeroPatrimonio: `PERF-${Date.now()}`,
            descricao: 'Patrimônio de performance',
            valor: 1000.00,
            dataAquisicao: new Date().toISOString().split('T')[0],
            estado: 'ativo'
        };
        
        const startTime = Date.now();
        const response = await axios.post(`${baseUrl}/api/patrimonios`, patrimonioData, { headers });
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (responseTime < 2000) {
            results.tests.push({ name: 'Performance criação patrimônio', status: 'PASS', time: `${responseTime}ms` });
            results.passed++;
            
            // Limpar patrimônio criado
            if (response.status === 201) {
                await axios.delete(`${baseUrl}/api/patrimonios/${response.data.id}`, { headers });
            }
        } else {
            results.tests.push({ name: 'Performance criação patrimônio', status: 'FAIL', error: `Resposta lenta: ${responseTime}ms` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Performance criação patrimônio', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testPerformanceRegression().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de regressão de performance:', error);
    process.exit(1);
});
EOF

# Executar testes de regressão de performance
PERF_REG_RESULTS=$(node /tmp/regression_performance.js)
echo "$PERF_REG_RESULTS" > $TEST_RESULTS_DIR/performance_regression_$DATE.json

# Verificar resultados
PERF_REG_PASSED=$(echo "$PERF_REG_RESULTS" | jq -r '.passed')
PERF_REG_FAILED=$(echo "$PERF_REG_RESULTS" | jq -r '.failed')

if [ $PERF_REG_FAILED -eq 0 ]; then
    log "✅ Testes de regressão de performance: $PERF_REG_PASSED/$((PERF_REG_PASSED + PERF_REG_FAILED)) passaram"
else
    warn "⚠️ Testes de regressão de performance: $PERF_REG_FAILED falharam"
fi

# 5. Gerar relatório consolidado de regressão
log "Gerando relatório consolidado de regressão..."

# Calcular totais
TOTAL_REG_PASSED=$((AUTH_REG_PASSED + CRUD_REG_PASSED + FEATURES_REG_PASSED + PERF_REG_PASSED))
TOTAL_REG_FAILED=$((AUTH_REG_FAILED + CRUD_REG_FAILED + FEATURES_REG_FAILED + PERF_REG_FAILED))
TOTAL_REG_TESTS=$((TOTAL_REG_PASSED + TOTAL_REG_FAILED))

# Gerar relatório
cat > $TEST_RESULTS_DIR/regression_report_$DATE.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "type": "regression_tests",
  "summary": {
    "total_tests": $TOTAL_REG_TESTS,
    "passed": $TOTAL_REG_PASSED,
    "failed": $TOTAL_REG_FAILED,
    "success_rate": "$(echo "scale=2; $TOTAL_REG_PASSED * 100 / $TOTAL_REG_TESTS" | bc)%"
  },
  "categories": {
    "authentication": {
      "passed": $AUTH_REG_PASSED,
      "failed": $AUTH_REG_FAILED,
      "success_rate": "$(echo "scale=2; $AUTH_REG_PASSED * 100 / ($AUTH_REG_PASSED + $AUTH_REG_FAILED)" | bc)%"
    },
    "crud": {
      "passed": $CRUD_REG_PASSED,
      "failed": $CRUD_REG_FAILED,
      "success_rate": "$(echo "scale=2; $CRUD_REG_PASSED * 100 / ($CRUD_REG_PASSED + $CRUD_REG_FAILED)" | bc)%"
    },
    "features": {
      "passed": $FEATURES_REG_PASSED,
      "failed": $FEATURES_REG_FAILED,
      "success_rate": "$(echo "scale=2; $FEATURES_REG_PASSED * 100 / ($FEATURES_REG_PASSED + $FEATURES_REG_FAILED)" | bc)%"
    },
    "performance": {
      "passed": $PERF_REG_PASSED,
      "failed": $PERF_REG_FAILED,
      "success_rate": "$(echo "scale=2; $PERF_REG_PASSED * 100 / ($PERF_REG_PASSED + $PERF_REG_FAILED)" | bc)%"
    }
  },
  "files": {
    "authentication": "auth_regression_$DATE.json",
    "crud": "crud_regression_$DATE.json",
    "features": "features_regression_$DATE.json",
    "performance": "performance_regression_$DATE.json"
  }
}
EOF

# 6. Limpar arquivos temporários
log "Limpando arquivos temporários..."
rm -f /tmp/regression_*.js

# 7. Exibir resumo final
log "🎉 Testes de regressão finalizados!"
log "📊 Resumo dos resultados:"
log "   • Total de testes: $TOTAL_REG_TESTS"
log "   • Testes passaram: $TOTAL_REG_PASSED"
log "   • Testes falharam: $TOTAL_REG_FAILED"
log "   • Taxa de sucesso: $(echo "scale=2; $TOTAL_REG_PASSED * 100 / $TOTAL_REG_TESTS" | bc)%"
log ""
log "📋 Resultados por categoria:"
log "   • Autenticação: $AUTH_REG_PASSED/$((AUTH_REG_PASSED + AUTH_REG_FAILED)) ($(echo "scale=2; $AUTH_REG_PASSED * 100 / ($AUTH_REG_PASSED + $AUTH_REG_FAILED)" | bc)%)"
log "   • CRUD: $CRUD_REG_PASSED/$((CRUD_REG_PASSED + CRUD_REG_FAILED)) ($(echo "scale=2; $CRUD_REG_PASSED * 100 / ($CRUD_REG_PASSED + $CRUD_REG_FAILED)" | bc)%)"
log "   • Funcionalidades: $FEATURES_REG_PASSED/$((FEATURES_REG_PASSED + FEATURES_REG_FAILED)) ($(echo "scale=2; $FEATURES_REG_PASSED * 100 / ($FEATURES_REG_PASSED + $FEATURES_REG_FAILED)" | bc)%)"
log "   • Performance: $PERF_REG_PASSED/$((PERF_REG_PASSED + PERF_REG_FAILED)) ($(echo "scale=2; $PERF_REG_PASSED * 100 / ($PERF_REG_PASSED + $PERF_REG_FAILED)" | bc)%)"
log ""
log "📁 Relatórios salvos em: $TEST_RESULTS_DIR"
log "   • Relatório consolidado: regression_report_$DATE.json"
log "   • Testes individuais: auth_regression_$DATE.json, crud_regression_$DATE.json, etc."

if [ $TOTAL_REG_FAILED -eq 0 ]; then
    log "✅ Todos os testes de regressão passaram! Nenhuma funcionalidade foi quebrada."
else
    warn "⚠️ $TOTAL_REG_FAILED testes de regressão falharam. Funcionalidades podem ter sido quebradas."
fi
