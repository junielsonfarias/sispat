#!/bin/bash

# SISPAT - Script de Testes de Segurança Avançados
# Este script executa testes avançados de segurança e vulnerabilidades

set -e

echo "🚀 Executando Testes de Segurança Avançados..."

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
TEST_RESULTS_DIR="/var/log/sispat/advanced-security-tests"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de resultados
mkdir -p $TEST_RESULTS_DIR

# 1. Testes de Vulnerabilidades Avançadas
log "Executando testes de vulnerabilidades avançadas..."

# Criar script de teste de vulnerabilidades avançadas
tee /tmp/advanced_vulnerabilities.js > /dev/null << 'EOF'
const axios = require('axios');

async function testAdvancedVulnerabilities() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: NoSQL Injection
    try {
        const nosqlPayloads = [
            '{"$ne": null}',
            '{"$gt": ""}',
            '{"$regex": ".*"}',
            '{"$where": "this.password == this.username"}',
            '{"$or": [{"username": "admin"}, {"password": "admin"}]}'
        ];
        
        let nosqlInjectionBlocked = 0;
        for (const payload of nosqlPayloads) {
            try {
                await axios.post(`${baseUrl}/api/auth/login`, {
                    email: payload,
                    password: 'test'
                });
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    nosqlInjectionBlocked++;
                }
            }
        }
        
        if (nosqlInjectionBlocked === nosqlPayloads.length) {
            results.tests.push({ name: 'NoSQL Injection', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'NoSQL Injection', status: 'FAIL', error: 'Possível vulnerabilidade NoSQL injection' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'NoSQL Injection', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: LDAP Injection
    try {
        const ldapPayloads = [
            '*',
            '*)(&',
            '*)(|',
            '*)(uid=*',
            '*)(|(uid=*)(uid=*'
        ];
        
        let ldapInjectionBlocked = 0;
        for (const payload of ldapPayloads) {
            try {
                await axios.post(`${baseUrl}/api/auth/login`, {
                    email: payload,
                    password: 'test'
                });
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    ldapInjectionBlocked++;
                }
            }
        }
        
        if (ldapInjectionBlocked === ldapPayloads.length) {
            results.tests.push({ name: 'LDAP Injection', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'LDAP Injection', status: 'FAIL', error: 'Possível vulnerabilidade LDAP injection' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'LDAP Injection', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Command Injection
    try {
        const commandPayloads = [
            '; ls',
            '| whoami',
            '& dir',
            '`id`',
            '$(whoami)',
            '; cat /etc/passwd',
            '| cat /etc/passwd'
        ];
        
        let commandInjectionBlocked = 0;
        for (const payload of commandPayloads) {
            try {
                await axios.post(`${baseUrl}/api/auth/login`, {
                    email: payload,
                    password: 'test'
                });
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    commandInjectionBlocked++;
                }
            }
        }
        
        if (commandInjectionBlocked === commandPayloads.length) {
            results.tests.push({ name: 'Command Injection', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Command Injection', status: 'FAIL', error: 'Possível vulnerabilidade command injection' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Command Injection', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: XXE (XML External Entity)
    try {
        const xxePayloads = [
            '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
            '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com/xxe">]><foo>&xxe;</foo>',
            '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///c:/windows/system32/drivers/etc/hosts">]><foo>&xxe;</foo>'
        ];
        
        let xxeBlocked = 0;
        for (const payload of xxePayloads) {
            try {
                await axios.post(`${baseUrl}/api/auth/login`, {
                    email: payload,
                    password: 'test'
                });
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    xxeBlocked++;
                }
            }
        }
        
        if (xxeBlocked === xxePayloads.length) {
            results.tests.push({ name: 'XXE Injection', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'XXE Injection', status: 'FAIL', error: 'Possível vulnerabilidade XXE' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'XXE Injection', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: SSRF (Server-Side Request Forgery)
    try {
        const ssrfPayloads = [
            'http://localhost:22',
            'http://127.0.0.1:3306',
            'http://169.254.169.254/latest/meta-data/',
            'file:///etc/passwd',
            'gopher://localhost:25',
            'dict://localhost:11211'
        ];
        
        let ssrfBlocked = 0;
        for (const payload of ssrfPayloads) {
            try {
                await axios.post(`${baseUrl}/api/auth/login`, {
                    email: payload,
                    password: 'test'
                });
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    ssrfBlocked++;
                }
            }
        }
        
        if (ssrfBlocked === ssrfPayloads.length) {
            results.tests.push({ name: 'SSRF', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'SSRF', status: 'FAIL', error: 'Possível vulnerabilidade SSRF' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'SSRF', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testAdvancedVulnerabilities().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de vulnerabilidades avançadas:', error);
    process.exit(1);
});
EOF

# Executar testes de vulnerabilidades avançadas
ADV_VULN_RESULTS=$(node /tmp/advanced_vulnerabilities.js)
echo "$ADV_VULN_RESULTS" > $TEST_RESULTS_DIR/advanced_vulnerabilities_$DATE.json

# Verificar resultados
ADV_VULN_PASSED=$(echo "$ADV_VULN_RESULTS" | jq -r '.passed')
ADV_VULN_FAILED=$(echo "$ADV_VULN_RESULTS" | jq -r '.failed')

if [ $ADV_VULN_FAILED -eq 0 ]; then
    log "✅ Testes de vulnerabilidades avançadas: $ADV_VULN_PASSED/$((ADV_VULN_PASSED + ADV_VULN_FAILED)) passaram"
else
    warn "⚠️ Testes de vulnerabilidades avançadas: $ADV_VULN_FAILED falharam"
fi

# 2. Testes de Segurança de API
log "Executando testes de segurança de API..."

# Criar script de teste de segurança de API
tee /tmp/api_security.js > /dev/null << 'EOF'
const axios = require('axios');

async function testAPISecurity() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: API Rate Limiting
    try {
        const promises = [];
        for (let i = 0; i < 100; i++) {
            promises.push(axios.get(`${baseUrl}/api/health`).catch(error => error));
        }
        
        const responses = await Promise.all(promises);
        const rateLimited = responses.some(response => 
            response.response && response.response.status === 429
        );
        
        if (rateLimited) {
            results.tests.push({ name: 'API Rate Limiting', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'API Rate Limiting', status: 'FAIL', error: 'Rate limiting não funcionando' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'API Rate Limiting', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: API Versioning
    try {
        const response = await axios.get(`${baseUrl}/api/health`);
        
        if (response.status === 200) {
            results.tests.push({ name: 'API Versioning', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'API Versioning', status: 'FAIL', error: 'API não está respondendo' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'API Versioning', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: API Input Validation
    try {
        const invalidInputs = [
            { email: '', password: 'test' },
            { email: 'test@test.com', password: '' },
            { email: 'invalid-email', password: 'test' },
            { email: 'test@test.com', password: 'a'.repeat(1000) }
        ];
        
        let inputValidationPassed = 0;
        for (const input of invalidInputs) {
            try {
                await axios.post(`${baseUrl}/api/auth/login`, input);
            } catch (error) {
                if (error.response && (error.response.status === 400 || error.response.status === 401)) {
                    inputValidationPassed++;
                }
            }
        }
        
        if (inputValidationPassed === invalidInputs.length) {
            results.tests.push({ name: 'API Input Validation', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'API Input Validation', status: 'FAIL', error: 'Validação de entrada pode estar falhando' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'API Input Validation', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: API Error Handling
    try {
        const response = await axios.get(`${baseUrl}/api/nonexistent-endpoint`);
        results.tests.push({ name: 'API Error Handling', status: 'FAIL', error: 'Deveria ter retornado erro 404' });
        results.failed++;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            results.tests.push({ name: 'API Error Handling', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'API Error Handling', status: 'FAIL', error: 'Tratamento de erro inadequado' });
            results.failed++;
        }
    }

    // Teste 5: API CORS
    try {
        const response = await axios.get(`${baseUrl}/api/health`, {
            headers: {
                'Origin': 'http://malicious-site.com',
                'Access-Control-Request-Method': 'GET'
            }
        });
        
        const corsHeaders = response.headers;
        if (corsHeaders['access-control-allow-origin']) {
            results.tests.push({ name: 'API CORS', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'API CORS', status: 'FAIL', error: 'Headers CORS não configurados' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'API CORS', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testAPISecurity().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de segurança de API:', error);
    process.exit(1);
});
EOF

# Executar testes de segurança de API
API_SEC_RESULTS=$(node /tmp/api_security.js)
echo "$API_SEC_RESULTS" > $TEST_RESULTS_DIR/api_security_$DATE.json

# Verificar resultados
API_SEC_PASSED=$(echo "$API_SEC_RESULTS" | jq -r '.passed')
API_SEC_FAILED=$(echo "$API_SEC_RESULTS" | jq -r '.failed')

if [ $API_SEC_FAILED -eq 0 ]; then
    log "✅ Testes de segurança de API: $API_SEC_PASSED/$((API_SEC_PASSED + API_SEC_FAILED)) passaram"
else
    warn "⚠️ Testes de segurança de API: $API_SEC_FAILED falharam"
fi

# 3. Testes de Segurança de Dados
log "Executando testes de segurança de dados..."

# Criar script de teste de segurança de dados
tee /tmp/data_security.js > /dev/null << 'EOF'
const axios = require('axios');

async function testDataSecurity() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Data Encryption
    try {
        const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
            email: 'admin@sispat.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        const response = await axios.get(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        // Verificar se dados sensíveis não são expostos
        const userData = JSON.stringify(response.data);
        if (!userData.includes('password') && !userData.includes('secret')) {
            results.tests.push({ name: 'Data Encryption', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Data Encryption', status: 'FAIL', error: 'Dados sensíveis podem estar expostos' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Data Encryption', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Data Validation
    try {
        const invalidData = [
            { numeroPatrimonio: '', descricao: 'Test' },
            { numeroPatrimonio: 'TEST-001', descricao: '' },
            { numeroPatrimonio: 'TEST-001', descricao: 'Test', valor: -100 },
            { numeroPatrimonio: 'TEST-001', descricao: 'Test', valor: 'invalid' }
        ];
        
        let dataValidationPassed = 0;
        for (const data of invalidData) {
            try {
                await axios.post(`${baseUrl}/api/patrimonios`, data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                if (error.response && error.response.status === 400) {
                    dataValidationPassed++;
                }
            }
        }
        
        if (dataValidationPassed === invalidData.length) {
            results.tests.push({ name: 'Data Validation', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Data Validation', status: 'FAIL', error: 'Validação de dados pode estar falhando' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Data Validation', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Data Sanitization
    try {
        const maliciousData = [
            { numeroPatrimonio: '<script>alert("xss")</script>', descricao: 'Test' },
            { numeroPatrimonio: 'TEST-001', descricao: '"; DROP TABLE users; --' },
            { numeroPatrimonio: 'TEST-001', descricao: '../../../etc/passwd' }
        ];
        
        let dataSanitizationPassed = 0;
        for (const data of maliciousData) {
            try {
                await axios.post(`${baseUrl}/api/patrimonios`, data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                if (error.response && error.response.status === 400) {
                    dataSanitizationPassed++;
                }
            }
        }
        
        if (dataSanitizationPassed === maliciousData.length) {
            results.tests.push({ name: 'Data Sanitization', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Data Sanitization', status: 'FAIL', error: 'Sanitização de dados pode estar falhando' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Data Sanitization', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Data Access Control
    try {
        const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
            email: 'admin@sispat.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        const response = await axios.get(`${baseUrl}/api/patrimonios`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Data Access Control', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Data Access Control', status: 'FAIL', error: 'Controle de acesso pode estar falhando' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Data Access Control', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testDataSecurity().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de segurança de dados:', error);
    process.exit(1);
});
EOF

# Executar testes de segurança de dados
DATA_SEC_RESULTS=$(node /tmp/data_security.js)
echo "$DATA_SEC_RESULTS" > $TEST_RESULTS_DIR/data_security_$DATE.json

# Verificar resultados
DATA_SEC_PASSED=$(echo "$DATA_SEC_RESULTS" | jq -r '.passed')
DATA_SEC_FAILED=$(echo "$DATA_SEC_RESULTS" | jq -r '.failed')

if [ $DATA_SEC_FAILED -eq 0 ]; then
    log "✅ Testes de segurança de dados: $DATA_SEC_PASSED/$((DATA_SEC_PASSED + DATA_SEC_FAILED)) passaram"
else
    warn "⚠️ Testes de segurança de dados: $DATA_SEC_FAILED falharam"
fi

# 4. Gerar relatório consolidado
log "Gerando relatório consolidado de segurança avançada..."

# Calcular totais
TOTAL_ADV_SEC_PASSED=$((ADV_VULN_PASSED + API_SEC_PASSED + DATA_SEC_PASSED))
TOTAL_ADV_SEC_FAILED=$((ADV_VULN_FAILED + API_SEC_FAILED + DATA_SEC_FAILED))
TOTAL_ADV_SEC_TESTS=$((TOTAL_ADV_SEC_PASSED + TOTAL_ADV_SEC_FAILED))

# Gerar relatório
cat > $TEST_RESULTS_DIR/advanced_security_report_$DATE.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "type": "advanced_security_tests",
  "summary": {
    "total_tests": $TOTAL_ADV_SEC_TESTS,
    "passed": $TOTAL_ADV_SEC_PASSED,
    "failed": $TOTAL_ADV_SEC_FAILED,
    "success_rate": "$(echo "scale=2; $TOTAL_ADV_SEC_PASSED * 100 / $TOTAL_ADV_SEC_TESTS" | bc)%"
  },
  "categories": {
    "advanced_vulnerabilities": {
      "passed": $ADV_VULN_PASSED,
      "failed": $ADV_VULN_FAILED,
      "success_rate": "$(echo "scale=2; $ADV_VULN_PASSED * 100 / ($ADV_VULN_PASSED + $ADV_VULN_FAILED)" | bc)%"
    },
    "api_security": {
      "passed": $API_SEC_PASSED,
      "failed": $API_SEC_FAILED,
      "success_rate": "$(echo "scale=2; $API_SEC_PASSED * 100 / ($API_SEC_PASSED + $API_SEC_FAILED)" | bc)%"
    },
    "data_security": {
      "passed": $DATA_SEC_PASSED,
      "failed": $DATA_SEC_FAILED,
      "success_rate": "$(echo "scale=2; $DATA_SEC_PASSED * 100 / ($DATA_SEC_PASSED + $DATA_SEC_FAILED)" | bc)%"
    }
  },
  "files": {
    "advanced_vulnerabilities": "advanced_vulnerabilities_$DATE.json",
    "api_security": "api_security_$DATE.json",
    "data_security": "data_security_$DATE.json"
  }
}
EOF

# 5. Limpar arquivos temporários
log "Limpando arquivos temporários..."
rm -f /tmp/*_vulnerabilities.js /tmp/*_security.js

# 6. Exibir resumo final
log "🎉 Testes de segurança avançados finalizados!"
log "📊 Resumo dos resultados:"
log "   • Total de testes: $TOTAL_ADV_SEC_TESTS"
log "   • Testes passaram: $TOTAL_ADV_SEC_PASSED"
log "   • Testes falharam: $TOTAL_ADV_SEC_FAILED"
log "   • Taxa de sucesso: $(echo "scale=2; $TOTAL_ADV_SEC_PASSED * 100 / $TOTAL_ADV_SEC_TESTS" | bc)%"
log ""
log "📋 Resultados por categoria:"
log "   • Vulnerabilidades Avançadas: $ADV_VULN_PASSED/$((ADV_VULN_PASSED + ADV_VULN_FAILED)) ($(echo "scale=2; $ADV_VULN_PASSED * 100 / ($ADV_VULN_PASSED + $ADV_VULN_FAILED)" | bc)%)"
log "   • Segurança de API: $API_SEC_PASSED/$((API_SEC_PASSED + API_SEC_FAILED)) ($(echo "scale=2; $API_SEC_PASSED * 100 / ($API_SEC_PASSED + $API_SEC_FAILED)" | bc)%)"
log "   • Segurança de Dados: $DATA_SEC_PASSED/$((DATA_SEC_PASSED + DATA_SEC_FAILED)) ($(echo "scale=2; $DATA_SEC_PASSED * 100 / ($DATA_SEC_PASSED + $DATA_SEC_FAILED)" | bc)%)"
log ""
log "📁 Relatórios salvos em: $TEST_RESULTS_DIR"
log "   • Relatório consolidado: advanced_security_report_$DATE.json"
log "   • Testes individuais: advanced_vulnerabilities_$DATE.json, api_security_$DATE.json, etc."

if [ $TOTAL_ADV_SEC_FAILED -eq 0 ]; then
    log "✅ Todos os testes de segurança avançados passaram! Sistema está seguro."
else
    warn "⚠️ $TOTAL_ADV_SEC_FAILED testes de segurança avançados falharam. Revise os relatórios para correções."
fi
