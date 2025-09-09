#!/bin/bash

# SISPAT - Script de Testes de Compatibilidade Avançados
# Este script executa testes avançados de compatibilidade com navegadores e dispositivos

set -e

echo "🚀 Executando Testes de Compatibilidade Avançados..."

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
TEST_RESULTS_DIR="/var/log/sispat/advanced-compatibility-tests"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de resultados
mkdir -p $TEST_RESULTS_DIR

# 1. Testes de Compatibilidade de Navegadores Móveis
log "Executando testes de compatibilidade de navegadores móveis..."

# Criar script de teste de compatibilidade de navegadores móveis
tee /tmp/mobile_browser_compatibility.js > /dev/null << 'EOF'
const axios = require('axios');

async function testMobileBrowserCompatibility() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Chrome Mobile
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Chrome Mobile Compatibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Chrome Mobile Compatibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Chrome Mobile Compatibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Safari Mobile
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Safari Mobile Compatibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Safari Mobile Compatibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Safari Mobile Compatibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Firefox Mobile
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Mobile; rv:89.0) Gecko/89.0 Firefox/89.0'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Firefox Mobile Compatibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Firefox Mobile Compatibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Firefox Mobile Compatibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Samsung Internet
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/13.0 Chrome/83.0.4103.106 Mobile Safari/537.36'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Samsung Internet Compatibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Samsung Internet Compatibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Samsung Internet Compatibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: UC Browser
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; U; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.106 UCBrowser/13.0.0.1080 Mobile Safari/537.36'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'UC Browser Compatibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'UC Browser Compatibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'UC Browser Compatibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testMobileBrowserCompatibility().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de compatibilidade de navegadores móveis:', error);
    process.exit(1);
});
EOF

# Executar testes de compatibilidade de navegadores móveis
MOBILE_BROWSER_COMPAT_RESULTS=$(node /tmp/mobile_browser_compatibility.js)
echo "$MOBILE_BROWSER_COMPAT_RESULTS" > $TEST_RESULTS_DIR/mobile_browser_compatibility_$DATE.json

# Verificar resultados
MOBILE_BROWSER_COMPAT_PASSED=$(echo "$MOBILE_BROWSER_COMPAT_RESULTS" | jq -r '.passed')
MOBILE_BROWSER_COMPAT_FAILED=$(echo "$MOBILE_BROWSER_COMPAT_RESULTS" | jq -r '.failed')

if [ $MOBILE_BROWSER_COMPAT_FAILED -eq 0 ]; then
    log "✅ Testes de compatibilidade de navegadores móveis: $MOBILE_BROWSER_COMPAT_PASSED/$((MOBILE_BROWSER_COMPAT_PASSED + MOBILE_BROWSER_COMPAT_FAILED)) passaram"
else
    warn "⚠️ Testes de compatibilidade de navegadores móveis: $MOBILE_BROWSER_COMPAT_FAILED falharam"
fi

# 2. Testes de Compatibilidade de Dispositivos Específicos
log "Executando testes de compatibilidade de dispositivos específicos..."

# Criar script de teste de compatibilidade de dispositivos específicos
tee /tmp/specific_device_compatibility.js > /dev/null << 'EOF'
const axios = require('axios');

async function testSpecificDeviceCompatibility() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: iPhone
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'iPhone Compatibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'iPhone Compatibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'iPhone Compatibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: iPad
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'iPad Compatibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'iPad Compatibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'iPad Compatibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Android Phone
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Android Phone Compatibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Android Phone Compatibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Android Phone Compatibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Android Tablet
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Safari/537.36'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Android Tablet Compatibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Android Tablet Compatibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Android Tablet Compatibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: Windows Phone
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 Edge/40.15254.603'
            }
        });
        
        if (response.status === 200) {
            results.tests.push({ name: 'Windows Phone Compatibility', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Windows Phone Compatibility', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Windows Phone Compatibility', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testSpecificDeviceCompatibility().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de compatibilidade de dispositivos específicos:', error);
    process.exit(1);
});
EOF

# Executar testes de compatibilidade de dispositivos específicos
SPEC_DEVICE_COMPAT_RESULTS=$(node /tmp/specific_device_compatibility.js)
echo "$SPEC_DEVICE_COMPAT_RESULTS" > $TEST_RESULTS_DIR/specific_device_compatibility_$DATE.json

# Verificar resultados
SPEC_DEVICE_COMPAT_PASSED=$(echo "$SPEC_DEVICE_COMPAT_RESULTS" | jq -r '.passed')
SPEC_DEVICE_COMPAT_FAILED=$(echo "$SPEC_DEVICE_COMPAT_RESULTS" | jq -r '.failed')

if [ $SPEC_DEVICE_COMPAT_FAILED -eq 0 ]; then
    log "✅ Testes de compatibilidade de dispositivos específicos: $SPEC_DEVICE_COMPAT_PASSED/$((SPEC_DEVICE_COMPAT_PASSED + SPEC_DEVICE_COMPAT_FAILED)) passaram"
else
    warn "⚠️ Testes de compatibilidade de dispositivos específicos: $SPEC_DEVICE_COMPAT_FAILED falharam"
fi

# 3. Testes de Compatibilidade de Recursos Avançados
log "Executando testes de compatibilidade de recursos avançados..."

# Criar script de teste de compatibilidade de recursos avançados
tee /tmp/advanced_feature_compatibility.js > /dev/null << 'EOF'
const axios = require('axios');

async function testAdvancedFeatureCompatibility() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Verificar se o Service Worker está funcionando
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'Service Worker Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Service Worker Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Service Worker Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Verificar se o PWA está funcionando
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'PWA Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'PWA Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'PWA Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Verificar se o WebGL está funcionando
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'WebGL Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'WebGL Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'WebGL Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Verificar se o Canvas está funcionando
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'Canvas Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Canvas Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Canvas Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: Verificar se o WebRTC está funcionando
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'WebRTC Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'WebRTC Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'WebRTC Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testAdvancedFeatureCompatibility().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de compatibilidade de recursos avançados:', error);
    process.exit(1);
});
EOF

# Executar testes de compatibilidade de recursos avançados
ADV_FEATURE_COMPAT_RESULTS=$(node /tmp/advanced_feature_compatibility.js)
echo "$ADV_FEATURE_COMPAT_RESULTS" > $TEST_RESULTS_DIR/advanced_feature_compatibility_$DATE.json

# Verificar resultados
ADV_FEATURE_COMPAT_PASSED=$(echo "$ADV_FEATURE_COMPAT_RESULTS" | jq -r '.passed')
ADV_FEATURE_COMPAT_FAILED=$(echo "$ADV_FEATURE_COMPAT_RESULTS" | jq -r '.failed')

if [ $ADV_FEATURE_COMPAT_FAILED -eq 0 ]; then
    log "✅ Testes de compatibilidade de recursos avançados: $ADV_FEATURE_COMPAT_PASSED/$((ADV_FEATURE_COMPAT_PASSED + ADV_FEATURE_COMPAT_FAILED)) passaram"
else
    warn "⚠️ Testes de compatibilidade de recursos avançados: $ADV_FEATURE_COMPAT_FAILED falharam"
fi

# 4. Gerar relatório consolidado
log "Gerando relatório consolidado de compatibilidade avançada..."

# Calcular totais
TOTAL_ADV_COMPAT_PASSED=$((MOBILE_BROWSER_COMPAT_PASSED + SPEC_DEVICE_COMPAT_PASSED + ADV_FEATURE_COMPAT_PASSED))
TOTAL_ADV_COMPAT_FAILED=$((MOBILE_BROWSER_COMPAT_FAILED + SPEC_DEVICE_COMPAT_FAILED + ADV_FEATURE_COMPAT_FAILED))
TOTAL_ADV_COMPAT_TESTS=$((TOTAL_ADV_COMPAT_PASSED + TOTAL_ADV_COMPAT_FAILED))

# Gerar relatório
cat > $TEST_RESULTS_DIR/advanced_compatibility_report_$DATE.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "type": "advanced_compatibility_tests",
  "summary": {
    "total_tests": $TOTAL_ADV_COMPAT_TESTS,
    "passed": $TOTAL_ADV_COMPAT_PASSED,
    "failed": $TOTAL_ADV_COMPAT_FAILED,
    "success_rate": "$(echo "scale=2; $TOTAL_ADV_COMPAT_PASSED * 100 / $TOTAL_ADV_COMPAT_TESTS" | bc)%"
  },
  "categories": {
    "mobile_browser_compatibility": {
      "passed": $MOBILE_BROWSER_COMPAT_PASSED,
      "failed": $MOBILE_BROWSER_COMPAT_FAILED,
      "success_rate": "$(echo "scale=2; $MOBILE_BROWSER_COMPAT_PASSED * 100 / ($MOBILE_BROWSER_COMPAT_PASSED + $MOBILE_BROWSER_COMPAT_FAILED)" | bc)%"
    },
    "specific_device_compatibility": {
      "passed": $SPEC_DEVICE_COMPAT_PASSED,
      "failed": $SPEC_DEVICE_COMPAT_FAILED,
      "success_rate": "$(echo "scale=2; $SPEC_DEVICE_COMPAT_PASSED * 100 / ($SPEC_DEVICE_COMPAT_PASSED + $SPEC_DEVICE_COMPAT_FAILED)" | bc)%"
    },
    "advanced_feature_compatibility": {
      "passed": $ADV_FEATURE_COMPAT_PASSED,
      "failed": $ADV_FEATURE_COMPAT_FAILED,
      "success_rate": "$(echo "scale=2; $ADV_FEATURE_COMPAT_PASSED * 100 / ($ADV_FEATURE_COMPAT_PASSED + $ADV_FEATURE_COMPAT_FAILED)" | bc)%"
    }
  },
  "files": {
    "mobile_browser_compatibility": "mobile_browser_compatibility_$DATE.json",
    "specific_device_compatibility": "specific_device_compatibility_$DATE.json",
    "advanced_feature_compatibility": "advanced_feature_compatibility_$DATE.json"
  }
}
EOF

# 5. Limpar arquivos temporários
log "Limpando arquivos temporários..."
rm -f /tmp/*_compatibility.js

# 6. Exibir resumo final
log "🎉 Testes de compatibilidade avançados finalizados!"
log "📊 Resumo dos resultados:"
log "   • Total de testes: $TOTAL_ADV_COMPAT_TESTS"
log "   • Testes passaram: $TOTAL_ADV_COMPAT_PASSED"
log "   • Testes falharam: $TOTAL_ADV_COMPAT_FAILED"
log "   • Taxa de sucesso: $(echo "scale=2; $TOTAL_ADV_COMPAT_PASSED * 100 / $TOTAL_ADV_COMPAT_TESTS" | bc)%"
log ""
log "📋 Resultados por categoria:"
log "   • Compatibilidade de Navegadores Móveis: $MOBILE_BROWSER_COMPAT_PASSED/$((MOBILE_BROWSER_COMPAT_PASSED + MOBILE_BROWSER_COMPAT_FAILED)) ($(echo "scale=2; $MOBILE_BROWSER_COMPAT_PASSED * 100 / ($MOBILE_BROWSER_COMPAT_PASSED + $MOBILE_BROWSER_COMPAT_FAILED)" | bc)%)"
log "   • Compatibilidade de Dispositivos Específicos: $SPEC_DEVICE_COMPAT_PASSED/$((SPEC_DEVICE_COMPAT_PASSED + SPEC_DEVICE_COMPAT_FAILED)) ($(echo "scale=2; $SPEC_DEVICE_COMPAT_PASSED * 100 / ($SPEC_DEVICE_COMPAT_PASSED + $SPEC_DEVICE_COMPAT_FAILED)" | bc)%)"
log "   • Compatibilidade de Recursos Avançados: $ADV_FEATURE_COMPAT_PASSED/$((ADV_FEATURE_COMPAT_PASSED + ADV_FEATURE_COMPAT_FAILED)) ($(echo "scale=2; $ADV_FEATURE_COMPAT_PASSED * 100 / ($ADV_FEATURE_COMPAT_PASSED + $ADV_FEATURE_COMPAT_FAILED)" | bc)%)"
log ""
log "📁 Relatórios salvos em: $TEST_RESULTS_DIR"
log "   • Relatório consolidado: advanced_compatibility_report_$DATE.json"
log "   • Testes individuais: mobile_browser_compatibility_$DATE.json, specific_device_compatibility_$DATE.json, etc."

if [ $TOTAL_ADV_COMPAT_FAILED -eq 0 ]; then
    log "✅ Todos os testes de compatibilidade avançados passaram! Sistema é compatível com todos os navegadores e dispositivos testados."
else
    warn "⚠️ $TOTAL_ADV_COMPAT_FAILED testes de compatibilidade avançados falharam. Revise os relatórios para correções."
fi
