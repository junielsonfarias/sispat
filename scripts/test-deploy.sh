#!/bin/bash

# ============================================
# SISPAT 2.0 - SCRIPT DE TESTES COMPLETOS
# ============================================
# Descrição: Testa todo o sistema após deploy
# Autor: SISPAT Team
# Data: 09/10/2025
# ============================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configurações
API_URL="${API_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:8080}"
APP_DIR="${APP_DIR:-/var/www/sispat}"

# Contadores
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Função para executar teste
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "$(printf '%3d' $TOTAL_TESTS). $test_name... "
    
    if eval "$test_command" &> /dev/null; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo ""
echo "============================================="
echo "  SISPAT 2.0 - TESTES COMPLETOS"
echo "============================================="
echo ""
echo "API URL: $API_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""
echo "============================================="
echo ""

# ============================================
# TESTES DE INFRAESTRUTURA
# ============================================

echo -e "${BLUE}▶ INFRAESTRUTURA${NC}"
echo ""

run_test "Node.js instalado" "command -v node"
run_test "npm instalado" "command -v npm"
run_test "pnpm instalado" "command -v pnpm"
run_test "Docker instalado" "command -v docker"
run_test "PM2 instalado" "command -v pm2"
run_test "Nginx instalado" "command -v nginx"

echo ""

# ============================================
# TESTES DE SERVIÇOS
# ============================================

echo -e "${BLUE}▶ SERVIÇOS${NC}"
echo ""

run_test "PostgreSQL rodando" "docker ps | grep -q sispat-postgres"
run_test "PostgreSQL aceitando conexões" "docker exec sispat-postgres pg_isready -U postgres"
run_test "PM2 rodando" "pm2 jlist | grep -q sispat-backend"
run_test "Backend no PM2" "pm2 jlist | jq -e '.[] | select(.name==\"sispat-backend\" and .pm2_env.status==\"online\")'"
run_test "Nginx ativo" "systemctl is-active --quiet nginx"

echo ""

# ============================================
# TESTES DE API (BACKEND)
# ============================================

echo -e "${BLUE}▶ API (BACKEND)${NC}"
echo ""

run_test "API respondendo" "curl -f -s $API_URL/api/health"
run_test "Health check OK" "curl -s $API_URL/api/health | grep -q '\"status\":\"ok\"'"
run_test "API root acessível" "curl -f -s $API_URL/"
run_test "Rota de auth existe" "curl -f -s -X POST $API_URL/api/auth/login -H 'Content-Type: application/json' -d '{}' -o /dev/null -w '%{http_code}' | grep -q '400\\|401'"
run_test "CORS configurado" "curl -s -I $API_URL/api/health | grep -q 'Access-Control-Allow-Origin'"

# Testes de rotas públicas
run_test "Rota pública de patrimônios" "curl -f -s $API_URL/api/public/patrimonios"
run_test "Rota de customização pública" "curl -f -s $API_URL/api/customization/public"

echo ""

# ============================================
# TESTES DE FRONTEND
# ============================================

echo -e "${BLUE}▶ FRONTEND${NC}"
echo ""

if [ -d "$APP_DIR/dist" ]; then
    run_test "Build de produção existe" "test -f $APP_DIR/dist/index.html"
    run_test "Assets de produção existem" "test -d $APP_DIR/dist/assets"
    run_test "Frontend acessível" "curl -f -s -o /dev/null $FRONTEND_URL"
    run_test "Index.html carrega" "curl -s $FRONTEND_URL | grep -q '<title>'"
else
    echo "  ⚠️  Build de produção não encontrado em $APP_DIR/dist"
    FAILED_TESTS=$((FAILED_TESTS + 4))
    TOTAL_TESTS=$((TOTAL_TESTS + 4))
fi

echo ""

# ============================================
# TESTES DE BANCO DE DADOS
# ============================================

echo -e "${BLUE}▶ BANCO DE DADOS${NC}"
echo ""

run_test "Usuários existem" "docker exec sispat-postgres psql -U postgres -d sispat_prod -c 'SELECT COUNT(*) FROM users' | grep -q '[0-9]'"
run_test "Tabela de patrimônios existe" "docker exec sispat-postgres psql -U postgres -d sispat_prod -c '\\dt' | grep -q patrimonios"
run_test "Tabela de imóveis existe" "docker exec sispat-postgres psql -U postgres -d sispat_prod -c '\\dt' | grep -q imoveis"
run_test "Migrations aplicadas" "docker exec sispat-postgres psql -U postgres -d sispat_prod -c '\\dt' | grep -q _prisma_migrations"

echo ""

# ============================================
# TESTES DE ARQUIVOS
# ============================================

echo -e "${BLUE}▶ ARQUIVOS E DIRETÓRIOS${NC}"
echo ""

run_test "Diretório de uploads existe" "test -d $APP_DIR/backend/uploads"
run_test "Diretório de logs existe" "test -d $APP_DIR/backend/logs"
run_test ".env backend existe" "test -f $APP_DIR/backend/.env"
run_test "ecosystem.config.js existe" "test -f $APP_DIR/backend/ecosystem.config.js"
run_test "Prisma schema existe" "test -f $APP_DIR/backend/prisma/schema.prisma"

echo ""

# ============================================
# TESTES DE SEGURANÇA
# ============================================

echo -e "${BLUE}▶ SEGURANÇA${NC}"
echo ""

run_test "Helmet headers presente" "curl -s -I $API_URL/api/health | grep -q 'X-Content-Type-Options'"
run_test "JWT secret configurado" "grep -q 'JWT_SECRET=' $APP_DIR/backend/.env"
run_test "Porta 3000 interna apenas" "! nc -z -w1 0.0.0.0 3000 2>/dev/null || netstat -tuln | grep ':3000' | grep -q '127.0.0.1'"

if [ -f "/etc/letsencrypt/live/*/fullchain.pem" ]; then
    run_test "Certificado SSL instalado" "test -f /etc/letsencrypt/live/*/fullchain.pem"
else
    echo "  $(printf '%3d' $((TOTAL_TESTS + 1))). Certificado SSL instalado... ${YELLOW}⚠ SKIP${NC} (desenvolvimento)"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

echo ""

# ============================================
# TESTES DE PERFORMANCE
# ============================================

echo -e "${BLUE}▶ PERFORMANCE${NC}"
echo ""

# Teste de tempo de resposta
START_TIME=$(date +%s%3N)
if curl -s -o /dev/null $API_URL/api/health; then
    END_TIME=$(date +%s%3N)
    RESPONSE_TIME=$((END_TIME - START_TIME))
    
    if [ "$RESPONSE_TIME" -lt 1000 ]; then
        echo "  $(printf '%3d' $((TOTAL_TESTS + 1))). Tempo de resposta < 1s... ${GREEN}✓ PASS${NC} (${RESPONSE_TIME}ms)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "  $(printf '%3d' $((TOTAL_TESTS + 1))). Tempo de resposta < 1s... ${YELLOW}⚠ SLOW${NC} (${RESPONSE_TIME}ms)"
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# Uso de recursos
CPU_USAGE=$(ps aux | grep "node.*sispat" | grep -v grep | awk '{sum+=$3} END {print int(sum)}')
if [ -n "$CPU_USAGE" ] && [ "$CPU_USAGE" -lt 50 ]; then
    echo "  $(printf '%3d' $((TOTAL_TESTS + 1))). CPU < 50%... ${GREEN}✓ PASS${NC} (${CPU_USAGE}%)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
elif [ -n "$CPU_USAGE" ]; then
    echo "  $(printf '%3d' $((TOTAL_TESTS + 1))). CPU < 50%... ${YELLOW}⚠ HIGH${NC} (${CPU_USAGE}%)"
else
    echo "  $(printf '%3d' $((TOTAL_TESTS + 1))). CPU < 50%... ${YELLOW}⚠ SKIP${NC} (não detectado)"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""

# ============================================
# TESTES DE BACKUP
# ============================================

echo -e "${BLUE}▶ BACKUP E MONITORAMENTO${NC}"
echo ""

run_test "Script de backup instalado" "test -f /usr/local/bin/backup-sispat.sh"
run_test "Script de restore instalado" "test -f /usr/local/bin/restore-sispat.sh"
run_test "Script de monitor instalado" "test -f /usr/local/bin/monitor-sispat.sh"
run_test "Diretório de backup existe" "test -d /var/backups/sispat || test -d $APP_DIR/backups"
run_test "Cron job de backup configurado" "crontab -l | grep -q backup-sispat"

echo ""

# ============================================
# RESUMO
# ============================================

echo "============================================="
echo -e "${MAGENTA}RESUMO DOS TESTES${NC}"
echo "============================================="
echo ""
echo "Total de testes:  $TOTAL_TESTS"
echo -e "Testes passados:  ${GREEN}$PASSED_TESTS${NC}"
echo -e "Testes falhados:  ${RED}$FAILED_TESTS${NC}"
echo ""

# Calcular porcentagem
if [ "$TOTAL_TESTS" -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
    echo -e "Taxa de sucesso:  ${SUCCESS_RATE}%"
fi

echo ""
echo "============================================="

# Determinar resultado final
if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "${GREEN}✅ TODOS OS TESTES PASSARAM!${NC}"
    echo ""
    echo "Sistema está pronto para uso!"
    exit 0
elif [ "$FAILED_TESTS" -lt 5 ]; then
    echo -e "${YELLOW}⚠️  ALGUNS TESTES FALHARAM${NC}"
    echo ""
    echo "Sistema funcional, mas requer atenção."
    exit 1
else
    echo -e "${RED}❌ MUITOS TESTES FALHARAM${NC}"
    echo ""
    echo "Sistema requer correções antes de uso."
    exit 2
fi

