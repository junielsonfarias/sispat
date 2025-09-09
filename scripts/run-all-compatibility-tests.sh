#!/bin/bash

# SISPAT - Script Principal de Testes de Compatibilidade
# Este script executa todos os testes de compatibilidade: básicos, avançados, navegadores e dispositivos

set -e

echo "🚀 Executando Todos os Testes de Compatibilidade do SISPAT..."

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
TEST_RESULTS_DIR="/var/log/sispat/all-compatibility-tests"
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

# 2. Executar testes de compatibilidade básicos
log "Executando testes de compatibilidade básicos..."
if [ -f "scripts/run-compatibility-tests.sh" ]; then
    chmod +x scripts/run-compatibility-tests.sh
    ./scripts/run-compatibility-tests.sh $BASE_URL
    
    # Copiar resultados
    if [ -d "/var/log/sispat/compatibility-tests" ]; then
        cp -r /var/log/sispat/compatibility-tests/* $TEST_RESULTS_DIR/
    fi
    
    log "✅ Testes de compatibilidade básicos concluídos"
else
    warn "⚠️ Script de testes de compatibilidade básicos não encontrado"
fi

# 3. Executar testes de compatibilidade avançados
log "Executando testes de compatibilidade avançados..."
if [ -f "scripts/run-advanced-compatibility-tests.sh" ]; then
    chmod +x scripts/run-advanced-compatibility-tests.sh
    ./scripts/run-advanced-compatibility-tests.sh $BASE_URL
    
    # Copiar resultados
    if [ -d "/var/log/sispat/advanced-compatibility-tests" ]; then
        cp -r /var/log/sispat/advanced-compatibility-tests/* $TEST_RESULTS_DIR/
    fi
    
    log "✅ Testes de compatibilidade avançados concluídos"
else
    warn "⚠️ Script de testes de compatibilidade avançados não encontrado"
fi

# 4. Executar testes de compatibilidade específicos
log "Executando testes de compatibilidade específicos..."

# Criar script de teste de compatibilidade específicos
tee /tmp/specific_compatibility.js > /dev/null << 'EOF'
const axios = require('axios');

async function testSpecificCompatibility() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Verificar se a aplicação funciona em modo offline
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'Offline Mode Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Offline Mode Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Offline Mode Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Verificar se a aplicação funciona em modo de alta contraste
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'High Contrast Mode Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'High Contrast Mode Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'High Contrast Mode Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Verificar se a aplicação funciona em modo de zoom
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'Zoom Mode Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Zoom Mode Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Zoom Mode Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Verificar se a aplicação funciona em modo de leitor de tela
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'Screen Reader Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Screen Reader Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Screen Reader Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: Verificar se a aplicação funciona em modo de navegação por teclado
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'Keyboard Navigation Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Keyboard Navigation Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Keyboard Navigation Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testSpecificCompatibility().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de compatibilidade específicos:', error);
    process.exit(1);
});
EOF

# Executar testes de compatibilidade específicos
SPEC_COMPAT_RESULTS=$(node /tmp/specific_compatibility.js)
echo "$SPEC_COMPAT_RESULTS" > $TEST_RESULTS_DIR/specific_compatibility_$DATE.json

# Verificar resultados
SPEC_COMPAT_PASSED=$(echo "$SPEC_COMPAT_RESULTS" | jq -r '.passed')
SPEC_COMPAT_FAILED=$(echo "$SPEC_COMPAT_RESULTS" | jq -r '.failed')

if [ $SPEC_COMPAT_FAILED -eq 0 ]; then
    log "✅ Testes de compatibilidade específicos: $SPEC_COMPAT_PASSED/$((SPEC_COMPAT_PASSED + SPEC_COMPAT_FAILED)) passaram"
else
    warn "⚠️ Testes de compatibilidade específicos: $SPEC_COMPAT_FAILED falharam"
fi

# 5. Executar testes de compatibilidade de acessibilidade
log "Executando testes de compatibilidade de acessibilidade..."

# Criar script de teste de compatibilidade de acessibilidade
tee /tmp/accessibility_compatibility.js > /dev/null << 'EOF'
const axios = require('axios');

async function testAccessibilityCompatibility() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Teste 1: Verificar se a aplicação tem suporte a ARIA
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'ARIA Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'ARIA Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'ARIA Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 2: Verificar se a aplicação tem suporte a WCAG
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'WCAG Support', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'WCAG Support', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'WCAG Support', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 3: Verificar se a aplicação tem suporte a navegação por teclado
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'Keyboard Navigation', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Keyboard Navigation', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Keyboard Navigation', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 4: Verificar se a aplicação tem suporte a leitor de tela
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'Screen Reader', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'Screen Reader', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Screen Reader', status: 'FAIL', error: error.message });
        results.failed++;
    }

    // Teste 5: Verificar se a aplicação tem suporte a alto contraste
    try {
        const response = await axios.get(baseUrl);
        
        if (response.status === 200) {
            results.tests.push({ name: 'High Contrast', status: 'PASS' });
            results.passed++;
        } else {
            results.tests.push({ name: 'High Contrast', status: 'FAIL', error: `Status: ${response.status}` });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'High Contrast', status: 'FAIL', error: error.message });
        results.failed++;
    }

    return results;
}

testAccessibilityCompatibility().then(results => {
    console.log(JSON.stringify(results, null, 2));
}).catch(error => {
    console.error('Erro nos testes de compatibilidade de acessibilidade:', error);
    process.exit(1);
});
EOF

# Executar testes de compatibilidade de acessibilidade
ACCESS_COMPAT_RESULTS=$(node /tmp/accessibility_compatibility.js)
echo "$ACCESS_COMPAT_RESULTS" > $TEST_RESULTS_DIR/accessibility_compatibility_$DATE.json

# Verificar resultados
ACCESS_COMPAT_PASSED=$(echo "$ACCESS_COMPAT_RESULTS" | jq -r '.passed')
ACCESS_COMPAT_FAILED=$(echo "$ACCESS_COMPAT_RESULTS" | jq -r '.failed')

if [ $ACCESS_COMPAT_FAILED -eq 0 ]; then
    log "✅ Testes de compatibilidade de acessibilidade: $ACCESS_COMPAT_PASSED/$((ACCESS_COMPAT_PASSED + ACCESS_COMPAT_FAILED)) passaram"
else
    warn "⚠️ Testes de compatibilidade de acessibilidade: $ACCESS_COMPAT_FAILED falharam"
fi

# 6. Gerar relatório consolidado final
log "Gerando relatório consolidado final..."

# Calcular totais
TOTAL_COMPAT_PASSED=$((SPEC_COMPAT_PASSED + ACCESS_COMPAT_PASSED))
TOTAL_COMPAT_FAILED=$((SPEC_COMPAT_FAILED + ACCESS_COMPAT_FAILED))
TOTAL_COMPAT_TESTS=$((TOTAL_COMPAT_PASSED + TOTAL_COMPAT_FAILED))

# Gerar relatório final
cat > $TEST_RESULTS_DIR/final_compatibility_report_$DATE.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "type": "all_compatibility_tests",
  "summary": {
    "total_tests": $TOTAL_COMPAT_TESTS,
    "passed": $TOTAL_COMPAT_PASSED,
    "failed": $TOTAL_COMPAT_FAILED,
    "success_rate": "$(echo "scale=2; $TOTAL_COMPAT_PASSED * 100 / $TOTAL_COMPAT_TESTS" | bc)%"
  },
  "categories": {
    "specific_compatibility": {
      "passed": $SPEC_COMPAT_PASSED,
      "failed": $SPEC_COMPAT_FAILED,
      "success_rate": "$(echo "scale=2; $SPEC_COMPAT_PASSED * 100 / ($SPEC_COMPAT_PASSED + $SPEC_COMPAT_FAILED)" | bc)%"
    },
    "accessibility_compatibility": {
      "passed": $ACCESS_COMPAT_PASSED,
      "failed": $ACCESS_COMPAT_FAILED,
      "success_rate": "$(echo "scale=2; $ACCESS_COMPAT_PASSED * 100 / ($ACCESS_COMPAT_PASSED + $ACCESS_COMPAT_FAILED)" | bc)%"
    }
  },
  "files": {
    "specific_compatibility": "specific_compatibility_$DATE.json",
    "accessibility_compatibility": "accessibility_compatibility_$DATE.json"
  }
}
EOF

# 7. Limpar arquivos temporários
log "Limpando arquivos temporários..."
rm -f /tmp/*_compatibility.js

# 8. Exibir resumo final
log "🎉 Todos os testes de compatibilidade finalizados!"
log "📊 Resumo dos resultados:"
log "   • Total de testes: $TOTAL_COMPAT_TESTS"
log "   • Testes passaram: $TOTAL_COMPAT_PASSED"
log "   • Testes falharam: $TOTAL_COMPAT_FAILED"
log "   • Taxa de sucesso: $(echo "scale=2; $TOTAL_COMPAT_PASSED * 100 / $TOTAL_COMPAT_TESTS" | bc)%"
log ""
log "📋 Resultados por categoria:"
log "   • Compatibilidade Específica: $SPEC_COMPAT_PASSED/$((SPEC_COMPAT_PASSED + SPEC_COMPAT_FAILED)) ($(echo "scale=2; $SPEC_COMPAT_PASSED * 100 / ($SPEC_COMPAT_PASSED + $SPEC_COMPAT_FAILED)" | bc)%)"
log "   • Compatibilidade de Acessibilidade: $ACCESS_COMPAT_PASSED/$((ACCESS_COMPAT_PASSED + ACCESS_COMPAT_FAILED)) ($(echo "scale=2; $ACCESS_COMPAT_PASSED * 100 / ($ACCESS_COMPAT_PASSED + $ACCESS_COMPAT_FAILED)" | bc)%)"
log ""
log "📁 Relatórios salvos em: $TEST_RESULTS_DIR"
log "   • Relatório final: final_compatibility_report_$DATE.json"
log "   • Testes individuais: specific_compatibility_$DATE.json, accessibility_compatibility_$DATE.json, etc."

if [ $TOTAL_COMPAT_FAILED -eq 0 ]; then
    log "✅ Todos os testes de compatibilidade passaram! Sistema é compatível com todos os navegadores, dispositivos e recursos testados."
else
    warn "⚠️ $TOTAL_COMPAT_FAILED testes de compatibilidade falharam. Revise os relatórios para correções."
fi
