#!/bin/bash

# Script de análise completa da aplicação em produção
# Autor: GPT-4

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Arquivo de relatório
REPORT_FILE="/tmp/analise_producao_$(date +%Y%m%d_%H%M%S).txt"

log() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$REPORT_FILE"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$REPORT_FILE"
}

warning() {
    echo -e "${YELLOW}[⚠]${NC} $1" | tee -a "$REPORT_FILE"
}

error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$REPORT_FILE"
}

section() {
    echo -e "\n${CYAN}════════════════════════════════════════════════════${NC}" | tee -a "$REPORT_FILE"
    echo -e "${CYAN}$1${NC}" | tee -a "$REPORT_FILE"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}\n" | tee -a "$REPORT_FILE"
}

log "Iniciando análise da aplicação em produção..."
log "Relatório será salvo em: $REPORT_FILE"

# ============================================
# 1. INFORMAÇÕES DO SISTEMA
# ============================================
section "1. INFORMAÇÕES DO SISTEMA"

log "Verificando informações do sistema..."
echo "Data/Hora: $(date)" | tee -a "$REPORT_FILE"
echo "Hostname: $(hostname)" | tee -a "$REPORT_FILE"
echo "Uptime: $(uptime -p)" | tee -a "$REPORT_FILE"
echo "Carga do sistema: $(uptime | awk -F'load average:' '{print $2}')" | tee -a "$REPORT_FILE"
echo "Memória livre: $(free -h | grep Mem | awk '{print $7}')" | tee -a "$REPORT_FILE"
echo "Espaço em disco: $(df -h / | tail -1 | awk '{print $4 " livres de " $2}')" | tee -a "$REPORT_FILE"

# ============================================
# 2. STATUS DO BACKEND (PM2)
# ============================================
section "2. STATUS DO BACKEND (PM2)"

if command -v pm2 &> /dev/null; then
    log "Verificando status do PM2..."
    pm2 list | tee -a "$REPORT_FILE"
    
    if pm2 list | grep -q "sispat-backend"; then
        log "Obtendo informações detalhadas do backend..."
        pm2 describe sispat-backend | tee -a "$REPORT_FILE"
        
        log "Verificando logs recentes (últimas 20 linhas)..."
        echo "--- ÚLTIMAS 20 LINHAS DOS LOGS ---" | tee -a "$REPORT_FILE"
        pm2 logs sispat-backend --lines 20 --nostream | tee -a "$REPORT_FILE"
    else
        error "Backend 'sispat-backend' não encontrado no PM2"
    fi
else
    error "PM2 não encontrado no sistema"
fi

# ============================================
# 3. STATUS DO NGINX
# ============================================
section "3. STATUS DO NGINX"

if systemctl is-active --quiet nginx; then
    success "Nginx está rodando"
    systemctl status nginx --no-pager | head -20 | tee -a "$REPORT_FILE"
else
    error "Nginx não está rodando!"
fi

log "Verificando configuração do Nginx..."
if [ -f /etc/nginx/sites-available/sispat ]; then
    log "Arquivo de configuração encontrado: /etc/nginx/sites-available/sispat"
    nginx -t 2>&1 | tee -a "$REPORT_FILE"
else
    warning "Arquivo de configuração do Nginx não encontrado"
fi

log "Verificando erros recentes do Nginx..."
if [ -f /var/log/nginx/error.log ]; then
    echo "--- ÚLTIMOS 20 ERROS DO NGINX ---" | tee -a "$REPORT_FILE"
    tail -20 /var/log/nginx/error.log | tee -a "$REPORT_FILE"
else
    warning "Arquivo de log de erros do Nginx não encontrado"
fi

# ============================================
# 4. VERIFICAÇÃO DO REDIS
# ============================================
section "4. VERIFICAÇÃO DO REDIS"

if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        success "Redis está respondendo"
        
        log "Verificando rate limits no Redis..."
        echo "--- CHAVES DE RATE LIMIT ---" | tee -a "$REPORT_FILE"
        redis-cli --scan --pattern "rl:*" | head -20 | while read key; do
            value=$(redis-cli get "$key" 2>/dev/null)
            ttl=$(redis-cli ttl "$key" 2>/dev/null)
            echo "Chave: $key | Valor: $value | TTL: ${ttl}s" | tee -a "$REPORT_FILE"
        done
        
        log "Contando chaves de rate limit..."
        auth_count=$(redis-cli --scan --pattern "rl:auth:*" | wc -l)
        global_count=$(redis-cli --scan --pattern "rl:global:*" | wc -l)
        echo "Chaves rl:auth:*: $auth_count" | tee -a "$REPORT_FILE"
        echo "Chaves rl:global:*: $global_count" | tee -a "$REPORT_FILE"
    else
        warning "Redis não está respondendo (pode estar desabilitado ou não configurado)"
    fi
else
    warning "Redis CLI não encontrado (pode não estar instalado)"
fi

# ============================================
# 5. VERIFICAÇÃO DO BANCO DE DADOS
# ============================================
section "5. VERIFICAÇÃO DO BANCO DE DADOS"

cd /var/www/sispat || exit 1

if [ -f backend/.env ]; then
    log "Verificando variáveis de ambiente do backend..."
    DB_HOST=$(grep "^DATABASE_URL=" backend/.env | cut -d'@' -f2 | cut -d'/' -f1 | cut -d':' -f1)
    DB_NAME=$(grep "^DATABASE_URL=" backend/.env | cut -d'/' -f4 | cut -d'?' -f1)
    
    if [ -n "$DB_HOST" ] && [ -n "$DB_NAME" ]; then
        log "Host do banco: $DB_HOST"
        log "Nome do banco: $DB_NAME"
        
        # Tentar conectar ao banco
        if command -v psql &> /dev/null; then
            if PGPASSWORD=$(grep "^DATABASE_URL=" backend/.env | sed -n 's/.*:\([^@]*\)@.*/\1/p') psql -h "$DB_HOST" -U "$(grep "^DATABASE_URL=" backend/.env | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')" -d "$DB_NAME" -c "SELECT version();" &> /dev/null; then
                success "Conexão com o banco de dados OK"
            else
                warning "Não foi possível verificar a conexão com o banco (normal se não houver acesso direto)"
            fi
        fi
    fi
fi

# ============================================
# 6. VERIFICAÇÃO DE ENDPOINTS
# ============================================
section "6. VERIFICAÇÃO DE ENDPOINTS"

log "Testando endpoints da API..."

# Health check
log "Testando /api/health..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    success "Health check OK (HTTP $HEALTH_RESPONSE)"
    curl -s http://localhost:3000/api/health | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
else
    error "Health check falhou (HTTP $HEALTH_RESPONSE)"
fi

# Verificar se o backend está escutando na porta 3000
log "Verificando se o backend está escutando na porta 3000..."
if netstat -tuln 2>/dev/null | grep -q ":3000" || ss -tuln 2>/dev/null | grep -q ":3000"; then
    success "Backend está escutando na porta 3000"
else
    error "Backend NÃO está escutando na porta 3000"
fi

# ============================================
# 7. VARIÁVEIS DE AMBIENTE
# ============================================
section "7. VARIÁVEIS DE AMBIENTE (Verificando configurações críticas)"

if [ -f backend/.env ]; then
    log "Verificando variáveis críticas do backend..."
    
    # Verificar variáveis importantes (sem expor valores sensíveis)
    echo "PORT: $(grep '^PORT=' backend/.env | cut -d'=' -f2)" | tee -a "$REPORT_FILE"
    echo "NODE_ENV: $(grep '^NODE_ENV=' backend/.env | cut -d'=' -f2)" | tee -a "$REPORT_FILE"
    echo "HOST: $(grep '^HOST=' backend/.env | cut -d'=' -f2)" | tee -a "$REPORT_FILE"
    echo "FRONTEND_URL: $(grep '^FRONTEND_URL=' backend/.env | cut -d'=' -f2)" | tee -a "$REPORT_FILE"
    echo "CORS_ORIGIN: $(grep '^CORS_ORIGIN=' backend/.env | cut -d'=' -f2)" | tee -a "$REPORT_FILE"
    echo "ENABLE_REDIS: $(grep '^ENABLE_REDIS=' backend/.env | cut -d'=' -f2)" | tee -a "$REPORT_FILE"
    echo "ENABLE_RATE_LIMIT: $(grep '^ENABLE_RATE_LIMIT=' backend/.env | cut -d'=' -f2)" | tee -a "$REPORT_FILE"
    echo "RATE_LIMIT_MAX: $(grep '^RATE_LIMIT_MAX=' backend/.env | cut -d'=' -f2)" | tee -a "$REPORT_FILE"
    
    # Verificar se JWT_SECRET está definido (sem mostrar valor)
    if grep -q "^JWT_SECRET=" backend/.env; then
        success "JWT_SECRET está configurado"
    else
        error "JWT_SECRET NÃO está configurado!"
    fi
else
    error "Arquivo backend/.env não encontrado!"
fi

# ============================================
# 8. VERIFICAÇÃO DE PROCESSOS
# ============================================
section "8. PROCESSOS EM EXECUÇÃO"

log "Verificando processos Node.js..."
ps aux | grep -E "node|npm|pm2" | grep -v grep | tee -a "$REPORT_FILE"

log "Verificando processos Nginx..."
ps aux | grep nginx | grep -v grep | tee -a "$REPORT_FILE"

# ============================================
# 9. VERIFICAÇÃO DE ARQUIVOS
# ============================================
section "9. VERIFICAÇÃO DE ARQUIVOS"

cd /var/www/sispat || exit 1

log "Verificando estrutura de diretórios..."
[ -d backend ] && success "Diretório backend existe" || error "Diretório backend não existe"
[ -d dist ] && success "Diretório dist (frontend) existe" || error "Diretório dist não existe"
[ -f backend/dist/index.js ] && success "Backend compilado existe" || error "Backend compilado não existe"

log "Verificando permissões..."
ls -la /var/www/sispat | head -10 | tee -a "$REPORT_FILE"

# ============================================
# 10. ERROS RECENTES NOS LOGS
# ============================================
section "10. ERROS RECENTES NOS LOGS"

log "Buscando erros recentes nos logs do PM2..."
if pm2 list | grep -q "sispat-backend"; then
    echo "--- ERROS RECENTES (últimas 50 linhas) ---" | tee -a "$REPORT_FILE"
    pm2 logs sispat-backend --lines 50 --nostream | grep -i "error\|erro\|fail\|exception" | tail -20 | tee -a "$REPORT_FILE" || warning "Nenhum erro encontrado nos logs recentes"
fi

# ============================================
# 11. ANÁLISE DE RATE LIMITING
# ============================================
section "11. ANÁLISE DE RATE LIMITING"

log "Verificando se há bloqueios de rate limit ativos..."

if command -v redis-cli &> /dev/null && redis-cli ping &> /dev/null; then
    # Verificar chaves de rate limit que podem estar bloqueando
    log "Chaves de rate limit com TTL > 0 (possivelmente bloqueando):"
    redis-cli --scan --pattern "rl:auth:*" | while read key; do
        ttl=$(redis-cli ttl "$key" 2>/dev/null)
        value=$(redis-cli get "$key" 2>/dev/null)
        if [ "$ttl" -gt 0 ]; then
            echo "  - $key: Valor=$value, TTL=${ttl}s ($(($ttl/60)) minutos restantes)" | tee -a "$REPORT_FILE"
        fi
    done
fi

# ============================================
# 12. RESUMO E RECOMENDAÇÕES
# ============================================
section "12. RESUMO E RECOMENDAÇÕES"

log "Gerando resumo..."

echo "" | tee -a "$REPORT_FILE"
echo "════════════════════════════════════════════════════" | tee -a "$REPORT_FILE"
echo "ANÁLISE CONCLUÍDA" | tee -a "$REPORT_FILE"
echo "════════════════════════════════════════════════════" | tee -a "$REPORT_FILE"
echo "Relatório completo salvo em: $REPORT_FILE" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# Verificar problemas críticos
ISSUES=0

if ! pm2 list | grep -q "sispat-backend.*online"; then
    error "PROBLEMA CRÍTICO: Backend não está online no PM2"
    ISSUES=$((ISSUES + 1))
fi

if ! systemctl is-active --quiet nginx; then
    error "PROBLEMA CRÍTICO: Nginx não está rodando"
    ISSUES=$((ISSUES + 1))
fi

if ! netstat -tuln 2>/dev/null | grep -q ":3000" && ! ss -tuln 2>/dev/null | grep -q ":3000"; then
    error "PROBLEMA CRÍTICO: Backend não está escutando na porta 3000"
    ISSUES=$((ISSUES + 1))
fi

if [ ! -f backend/dist/index.js ]; then
    error "PROBLEMA CRÍTICO: Backend não está compilado"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    success "Nenhum problema crítico encontrado!"
else
    warning "Encontrados $ISSUES problema(s) crítico(s). Verifique o relatório acima."
fi

echo "" | tee -a "$REPORT_FILE"
log "Para ver o relatório completo, execute: cat $REPORT_FILE"
log "Ou baixe o arquivo para análise local"
