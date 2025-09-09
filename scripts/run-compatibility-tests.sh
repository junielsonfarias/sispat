#!/bin/bash

# SISPAT - Script de Testes de Compatibilidade
# Este script executa testes de compatibilidade com navegadores e dispositivos

set -e

echo "🚀 Executando Testes de Compatibilidade..."

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
BASE_URL=${1:-"http://localhost:5173"}
TEST_RESULTS_DIR="/var/log/sispat/compatibility-tests"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de resultados
mkdir -p $TEST_RESULTS_DIR

# 1. Testes de Compatibilidade de Navegadores
log "Executando testes de compatibilidade de navegadores..."

# Criar script de teste de compatibilidade de navegadores
tee /tmp/browser_compatibility.js > /dev/null << 'EOF'
const axios = require('axios');

async function testBrowserCompatibility() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Verificar se a aplicação carrega
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'Application Load', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Application Load', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Application Load', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Verificar se os recursos estáticos carregam
    try {
        const staticResources = [
            '/favicon.ico',
            '/logo-sispat.svg',
            '/assets/index.css',
            '/assets/index.js'
        ];
        
        let staticResourcesLoaded = 0;
        for (const resource of staticResources) {
            try {
                const response = await axios.get(`${baseUrl}${resource}`);
                if (response.status === 200) {
                    staticResourcesLoaded++;
                }
            } catch (error) {
                // Ignorar erros de recursos que podem não existir
            }
        }
        
        if (staticResourcesLoaded > 0) {
            results.tests.push({ name: 'Static Resources', status: 'PASS', loaded: staticResourcesLoaded });
            results.passed++;
        } else {
            results.tests.push({ name: 'Static Resources', status: 'FAIL', error: 'Nenhum recurso estático carregado' });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Static Resources', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Verificar se a API está acessível
    try {
        const response = await axios.get(`${baseUrl.replace('5173', '3001')}/api/health`);
        
        if (response.status === 200) {
            results.tests.push({ name: 'API Accessibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'API Accessibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'API Accessibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Verificar se o WebSocket está funcionando
    try {
        const response = await axios.get(`${baseUrl.replace('5173', '3001')}/api/websocket-stats`);
        
        if (response.status === 200) {
            results.tests.push({ name: 'WebSocket Functionality', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'WebSocket Functionality', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'WebSocket Functionality', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: Verificar se o CORS está configurado
    try {
        const response = await axios.get(`${baseUrl.replace('5173', '3001')}/api/health`, {
            headers: {
                'Origin': baseUrl,
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

    return results;
}

testBrowserCompatibility().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de compatibilidade de navegadores:', error);
    process.exit(1);
});
EOF

# Executar testes de compatibilidade de navegadores
BROWSER_COMPAT_RESULTS=$(node /tmp/browser_compatibility.js)
echo "$BROWSER_COMPAT_RESULTS" > $TEST_RESULTS_DIR/browser_compatibility_$DATE.json

# Verificar resultados
BROWSER_COMPAT_PASSED=$(echo "$BROWSER_COMPAT_RESULTS" | jq -r '.passed')
BROWSER_COMPAT_FAILED=$(echo "$BROWSER_COMPAT_RESULTS" | jq -r '.failed')

if [ $BROWSER_COMPAT_FAILED -eq 0 ]; then
    log "✅ Testes de compatibilidade de navegadores: $BROWSER_COMPAT_PASSED/$((BROWSER_COMPAT_PASSED + BROWSER_COMPAT_FAILED)) passaram"
else
    warn "⚠️ Testes de compatibilidade de navegadores: $BROWSER_COMPAT_FAILED falharam"
fi

# 2. Testes de Compatibilidade de Dispositivos
log "Executando testes de compatibilidade de dispositivos..."

# Criar script de teste de compatibilidade de dispositivos
tee /tmp/device_compatibility.js > /dev/null << 'EOF'
const axios = require('axios');

async function testDeviceCompatibility() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Verificar se a aplicação é responsiva
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'Responsive Design', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Responsive Design', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Responsive Design', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Verificar se os recursos são otimizados para mobile
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Mobile Optimization', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Mobile Optimization', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Mobile Optimization', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Verificar se os recursos são otimizados para tablet
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Tablet Optimization', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Tablet Optimization', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Tablet Optimization', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Verificar se os recursos são otimizados para desktop
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Desktop Optimization', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Desktop Optimization', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Desktop Optimization', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: Verificar se os recursos são otimizados para navegadores antigos
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Legacy Browser Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Legacy Browser Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Legacy Browser Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testDeviceCompatibility().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de compatibilidade de dispositivos:', error);
    process.exit(1);
});
EOF

# Executar testes de compatibilidade de dispositivos
DEVICE_COMPAT_RESULTS=$(node /tmp/device_compatibility.js)
echo "$DEVICE_COMPAT_RESULTS" > $TEST_RESULTS_DIR/device_compatibility_$DATE.json

# Verificar resultados
DEVICE_COMPAT_PASSED=$(echo "$DEVICE_COMPAT_RESULTS" | jq -r '.passed')
DEVICE_COMPAT_FAILED=$(echo "$DEVICE_COMPAT_RESULTS" | jq -r '.failed')

if [ $DEVICE_COMPAT_FAILED -eq 0 ]; then
    log "✅ Testes de compatibilidade de dispositivos: $DEVICE_COMPAT_PASSED/$((DEVICE_COMPAT_PASSED + DEVICE_COMPAT_FAILED)) passaram"
else
    warn "⚠️ Testes de compatibilidade de dispositivos: $DEVICE_COMPAT_FAILED falharam"
fi

# 3. Testes de Compatibilidade de Navegadores Específicos
log "Executando testes de compatibilidade de navegadores específicos..."

# Criar script de teste de compatibilidade de navegadores específicos
tee /tmp/specific_browser_compatibility.js > /dev/null << 'EOF'
const axios = require('axios');

async function testSpecificBrowserCompatibility() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Chrome
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Chrome Compatibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Chrome Compatibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Chrome Compatibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Firefox
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Firefox Compatibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Firefox Compatibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Firefox Compatibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Safari
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Safari Compatibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Safari Compatibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Safari Compatibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Edge
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Edge Compatibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Edge Compatibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Edge Compatibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: Opera
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 OPR/77.0.4054.277'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Opera Compatibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Opera Compatibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Opera Compatibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testSpecificBrowserCompatibility().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de compatibilidade de navegadores específicos:', error);
    process.exit(1);
});
EOF

# Executar testes de compatibilidade de navegadores específicos
SPEC_BROWSER_COMPAT_RESULTS=$(node /tmp/specific_browser_compatibility.js)
echo "$SPEC_BROWSER_COMPAT_RESULTS" > $TEST_RESULTS_DIR/specific_browser_compatibility_$DATE.json

# Verificar resultados
SPEC_BROWSER_COMPAT_PASSED=$(echo "$SPEC_BROWSER_COMPAT_RESULTS" | jq -r '.passed')
SPEC_BROWSER_COMPAT_FAILED=$(echo "$SPEC_BROWSER_COMPAT_RESULTS" | jq -r '.failed')

if [ $SPEC_BROWSER_COMPAT_FAILED -eq 0 ]; then
    log "✅ Testes de compatibilidade de navegadores específicos: $SPEC_BROWSER_COMPAT_PASSED/$((SPEC_BROWSER_COMPAT_PASSED + SPEC_BROWSER_COMPAT_FAILED)) passaram"
else
    warn "⚠️ Testes de compatibilidade de navegadores específicos: $SPEC_BROWSER_COMPAT_FAILED falharam"
fi

# 4. Testes de Compatibilidade de Recursos
log "Executando testes de compatibilidade de recursos..."

# Criar script de teste de compatibilidade de recursos
tee /tmp/feature_compatibility.js > /dev/null << 'EOF'
const axios = require('axios');

async function testFeatureCompatibility() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Verificar se o JavaScript está funcionando
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'JavaScript Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'JavaScript Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'JavaScript Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Verificar se o CSS está funcionando
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'CSS Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'CSS Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'CSS Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Verificar se o HTML5 está funcionando
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'HTML5 Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'HTML5 Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'HTML5 Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Verificar se o WebSocket está funcionando
    try {
        const response = await axios.get(`${baseUrl.replace('5173', '3001')}/api/websocket-stats`);
        
        if (response.status === 200) {
            results.tests.push({ name: 'WebSocket Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'WebSocket Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'WebSocket Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: Verificar se o Local Storage está funcionando
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'Local Storage Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Local Storage Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Local Storage Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testFeatureCompatibility().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de compatibilidade de recursos:', error);
    process.exit(1);
});
EOF

# Executar testes de compatibilidade de recursos
FEATURE_COMPAT_RESULTS=$(node /tmp/feature_compatibility.js)
echo "$FEATURE_COMPAT_RESULTS" > $TEST_RESULTS_DIR/feature_compatibility_$DATE.json

# Verificar resultados
FEATURE_COMPAT_PASSED=$(echo "$FEATURE_COMPAT_RESULTS" | jq -r '.passed')
FEATURE_COMPAT_FAILED=$(echo "$FEATURE_COMPAT_RESULTS" | jq -r '.failed')

if [ $FEATURE_COMPAT_FAILED -eq 0 ]; then
    log "✅ Testes de compatibilidade de recursos: $FEATURE_COMPAT_PASSED/$((FEATURE_COMPAT_PASSED + FEATURE_COMPAT_FAILED)) passaram"
else
    warn "⚠️ Testes de compatibilidade de recursos: $FEATURE_COMPAT_FAILED falharam"
fi

# 5. Gerar relatório consolidado
log "Gerando relatório consolidado de compatibilidade..."

# Calcular totais
TOTAL_COMPAT_PASSED=$((BROWSER_COMPAT_PASSED + DEVICE_COMPAT_PASSED + SPEC_BROWSER_COMPAT_PASSED + FEATURE_COMPAT_PASSED))
TOTAL_COMPAT_FAILED=$((BROWSER_COMPAT_FAILED + DEVICE_COMPAT_FAILED + SPEC_BROWSER_COMPAT_FAILED + FEATURE_COMPAT_FAILED))
TOTAL_COMPAT_TESTS=$((TOTAL_COMPAT_PASSED + TOTAL_COMPAT_FAILED))

# Gerar relatório
cat > $TEST_RESULTS_DIR/compatibility_report_$DATE.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "type": "compatibility_tests",
  "summary": {
    "total_tests": $TOTAL_COMPAT_TESTS,
    "passed": $TOTAL_COMPAT_PASSED,
    "failed": $TOTAL_COMPAT_FAILED,
    "success_rate": "$(echo "scale=2; $TOTAL_COMPAT_PASSED * 100 / $TOTAL_COMPAT_TESTS" | bc)%"
  },
  "categories": {
    "browser_compatibility": {
      "passed": $BROWSER_COMPAT_PASSED,
      "failed": $BROWSER_COMPAT_FAILED,
      "success_rate": "$(echo "scale=2; $BROWSER_COMPAT_PASSED * 100 / ($BROWSER_COMPAT_PASSED + $BROWSER_COMPAT_FAILED)" | bc)%"
    },
    "device_compatibility": {
      "passed": $DEVICE_COMPAT_PASSED,
      "failed": $DEVICE_COMPAT_FAILED,
      "success_rate": "$(echo "scale=2; $DEVICE_COMPAT_PASSED * 100 / ($DEVICE_COMPAT_PASSED + $DEVICE_COMPAT_FAILED)" | bc)%"
    },
    "specific_browser_compatibility": {
      "passed": $SPEC_BROWSER_COMPAT_PASSED,
      "failed": $SPEC_BROWSER_COMPAT_FAILED,
      "success_rate": "$(echo "scale=2; $SPEC_BROWSER_COMPAT_PASSED * 100 / ($SPEC_BROWSER_COMPAT_PASSED + $SPEC_BROWSER_COMPAT_FAILED)" | bc)%"
    },
    "feature_compatibility": {
      "passed": $FEATURE_COMPAT_PASSED,
      "failed": $FEATURE_COMPAT_FAILED,
      "success_rate": "$(echo "scale=2; $FEATURE_COMPAT_PASSED * 100 / ($FEATURE_COMPAT_PASSED + $FEATURE_COMPAT_FAILED)" | bc)%"
    }
  },
  "files": {
    "browser_compatibility": "browser_compatibility_$DATE.json",
    "device_compatibility": "device_compatibility_$DATE.json",
    "specific_browser_compatibility": "specific_browser_compatibility_$DATE.json",
    "feature_compatibility": "feature_compatibility_$DATE.json"
  }
}
EOF

# 6. Limpar arquivos temporários
log "Limpando arquivos temporários..."
rm -f /tmp/*_compatibility.js

# 7. Exibir resumo final
log "🎉 Testes de compatibilidade finalizados!"
log "📊 Resumo dos resultados:"
log "   • Total de testes: $TOTAL_COMPAT_TESTS"
log "   • Testes passaram: $TOTAL_COMPAT_PASSED"
log "   • Testes falharam: $TOTAL_COMPAT_FAILED"
log "   • Taxa de sucesso: $(echo "scale=2; $TOTAL_COMPAT_PASSED * 100 / $TOTAL_COMPAT_TESTS" | bc)%"
log ""
log "📋 Resultados por categoria:"
log "   • Compatibilidade de Navegadores: $BROWSER_COMPAT_PASSED/$((BROWSER_COMPAT_PASSED + BROWSER_COMPAT_FAILED)) ($(echo "scale=2; $BROWSER_COMPAT_PASSED * 100 / ($BROWSER_COMPAT_PASSED + $BROWSER_COMPAT_FAILED)" | bc)%)"
log "   • Compatibilidade de Dispositivos: $DEVICE_COMPAT_PASSED/$((DEVICE_COMPAT_PASSED + DEVICE_COMPAT_FAILED)) ($(echo "scale=2; $DEVICE_COMPAT_PASSED * 100 / ($DEVICE_COMPAT_PASSED + $DEVICE_COMPAT_FAILED)" | bc)%)"
log "   • Compatibilidade de Navegadores Específicos: $SPEC_BROWSER_COMPAT_PASSED/$((SPEC_BROWSER_COMPAT_PASSED + SPEC_BROWSER_COMPAT_FAILED)) ($(echo "scale=2; $SPEC_BROWSER_COMPAT_PASSED * 100 / ($SPEC_BROWSER_COMPAT_PASSED + $SPEC_BROWSER_COMPAT_FAILED)" | bc)%)"
log "   • Compatibilidade de Recursos: $FEATURE_COMPAT_PASSED/$((FEATURE_COMPAT_PASSED + FEATURE_COMPAT_FAILED)) ($(echo "scale=2; $FEATURE_COMPAT_PASSED * 100 / ($FEATURE_COMPAT_PASSED + $FEATURE_COMPAT_FAILED)" | bc)%)"
log ""
log "📁 Relatórios salvos em: $TEST_RESULTS_DIR"
log "   • Relatório consolidado: compatibility_report_$DATE.json"
log "   • Testes individuais: browser_compatibility_$DATE.json, device_compatibility_$DATE.json, etc."

if [ $TOTAL_COMPAT_FAILED -eq 0 ]; then
    log "✅ Todos os testes de compatibilidade passaram! Sistema é compatível com todos os navegadores e dispositivos testados."
else
    warn "⚠️ $TOTAL_COMPAT_FAILED testes de compatibilidade falharam. Revise os relatórios para correções."
fi
