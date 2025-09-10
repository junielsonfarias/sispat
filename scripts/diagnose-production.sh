#!/bin/bash

# =================================
# DIAGNÓSTICO PRODUÇÃO - SISPAT
# Script para diagnosticar problemas em produção
# =================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Função para erro
error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

# Função para sucesso
success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

# Função para aviso
warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Banner
echo ""
echo "🔍 ================================================"
echo "🔍    DIAGNÓSTICO PRODUÇÃO - SISPAT"
echo "🔍    Script para diagnosticar problemas"
echo "🔍 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
    exit 1
fi

# Função para verificar serviços do sistema
check_system_services() {
    log "🔍 Verificando serviços do sistema..."
    
    echo ""
    echo "📊 STATUS DOS SERVIÇOS:"
    echo "======================="
    
    # PostgreSQL
    if systemctl is-active --quiet postgresql; then
        success "PostgreSQL: ATIVO"
    else
        error "PostgreSQL: INATIVO"
    fi
    
    # Redis
    if systemctl is-active --quiet redis-server; then
        success "Redis: ATIVO"
    else
        error "Redis: INATIVO"
    fi
    
    # Nginx
    if systemctl is-active --quiet nginx; then
        success "Nginx: ATIVO"
    else
        error "Nginx: INATIVO"
    fi
    
    echo ""
}

# Função para verificar PM2
check_pm2() {
    log "🔍 Verificando PM2..."
    
    echo ""
    echo "📊 STATUS DO PM2:"
    echo "=================="
    
    if command -v pm2 >/dev/null 2>&1; then
        pm2 list
        echo ""
        
        # Verificar se há processos online
        if pm2 list | grep -q "online"; then
            success "PM2 tem processos online"
        else
            error "PM2 não tem processos online"
        fi
    else
        error "PM2 não está instalado"
    fi
    
    echo ""
}

# Função para verificar conectividade
check_connectivity() {
    log "🔍 Verificando conectividade..."
    
    echo ""
    echo "📊 TESTES DE CONECTIVIDADE:"
    echo "============================"
    
    # Testar API local
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
        success "API local (localhost:3001): OK"
    else
        error "API local (localhost:3001): FALHOU"
    fi
    
    # Testar Nginx local
    if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
        success "Nginx local (localhost:80): OK"
    else
        error "Nginx local (localhost:80): FALHOU"
    fi
    
    # Testar PostgreSQL
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        success "PostgreSQL (localhost:5432): OK"
    else
        error "PostgreSQL (localhost:5432): FALHOU"
    fi
    
    # Testar Redis
    if redis-cli ping >/dev/null 2>&1; then
        success "Redis (localhost:6379): OK"
    else
        error "Redis (localhost:6379): FALHOU"
    fi
    
    echo ""
}

# Função para verificar arquivos de build
check_build_files() {
    log "🔍 Verificando arquivos de build..."
    
    echo ""
    echo "📊 ARQUIVOS DE BUILD:"
    echo "====================="
    
    if [ -d "dist" ]; then
        success "Diretório dist existe"
        
        if [ -f "dist/index.html" ]; then
            success "index.html existe"
        else
            error "index.html não existe"
        fi
        
        # Verificar chunks
        if ls dist/assets/*.js 1> /dev/null 2>&1; then
            success "Arquivos JS encontrados"
            
            # Verificar vendor-misc
            if ls dist/assets/vendor-misc-*.js 1> /dev/null 2>&1; then
                success "vendor-misc encontrado"
            else
                error "vendor-misc não encontrado"
            fi
            
            # Verificar pages-admin
            if ls dist/assets/pages-admin-*.js 1> /dev/null 2>&1; then
                success "pages-admin encontrado"
            else
                warning "pages-admin não encontrado"
            fi
            
            # Verificar se vendor-react foi eliminado
            if ls dist/assets/vendor-react-*.js 1> /dev/null 2>&1; then
                warning "vendor-react ainda existe (deveria estar no vendor-misc)"
            else
                success "vendor-react eliminado (correto)"
            fi
        else
            error "Nenhum arquivo JS encontrado"
        fi
    else
        error "Diretório dist não existe"
    fi
    
    echo ""
}

# Função para verificar configuração
check_configuration() {
    log "🔍 Verificando configuração..."
    
    echo ""
    echo "📊 CONFIGURAÇÃO:"
    echo "================"
    
    # Verificar .env
    if [ -f ".env" ]; then
        success "Arquivo .env existe"
        
        # Verificar variáveis importantes
        if grep -q "NODE_ENV=production" .env; then
            success "NODE_ENV=production configurado"
        else
            error "NODE_ENV não está configurado como production"
        fi
        
        if grep -q "VITE_BACKEND_URL" .env; then
            success "VITE_BACKEND_URL configurado"
        else
            error "VITE_BACKEND_URL não configurado"
        fi
        
        if grep -q "VITE_API_URL" .env; then
            success "VITE_API_URL configurado"
        else
            error "VITE_API_URL não configurado"
        fi
    else
        error "Arquivo .env não existe"
    fi
    
    # Verificar vite.config.ts
    if [ -f "vite.config.ts" ]; then
        success "vite.config.ts existe"
        
        # Verificar se tem configuração correta
        if grep -q "vendor-misc" vite.config.ts; then
            success "vite.config.ts tem configuração vendor-misc"
        else
            error "vite.config.ts não tem configuração vendor-misc"
        fi
    else
        error "vite.config.ts não existe"
    fi
    
    # Verificar ecosystem.config.cjs
    if [ -f "ecosystem.config.cjs" ]; then
        success "ecosystem.config.cjs existe"
    else
        error "ecosystem.config.cjs não existe"
    fi
    
    echo ""
}

# Função para verificar logs
check_logs() {
    log "🔍 Verificando logs..."
    
    echo ""
    echo "📊 LOGS RECENTES:"
    echo "=================="
    
    # Logs do PM2
    echo "🔍 Logs do PM2 (últimas 10 linhas):"
    pm2 logs sispat --lines 10 --nostream 2>/dev/null || warning "Não foi possível obter logs do PM2"
    echo ""
    
    # Logs do Nginx
    echo "🔍 Logs do Nginx (últimas 5 linhas):"
    tail -5 /var/log/nginx/error.log 2>/dev/null || warning "Não foi possível obter logs do Nginx"
    echo ""
    
    # Logs do PostgreSQL
    echo "🔍 Logs do PostgreSQL (últimas 5 linhas):"
    tail -5 /var/log/postgresql/postgresql-*.log 2>/dev/null || warning "Não foi possível obter logs do PostgreSQL"
    echo ""
}

# Função para verificar recursos do sistema
check_system_resources() {
    log "🔍 Verificando recursos do sistema..."
    
    echo ""
    echo "📊 RECURSOS DO SISTEMA:"
    echo "======================="
    
    # Uso de memória
    echo "💾 Memória:"
    free -h
    echo ""
    
    # Uso de disco
    echo "💿 Disco:"
    df -h
    echo ""
    
    # Uso de CPU
    echo "🖥️ CPU:"
    top -bn1 | grep "Cpu(s)" || warning "Não foi possível obter informações de CPU"
    echo ""
    
    # Portas em uso
    echo "🔌 Portas em uso:"
    netstat -tlnp | grep -E "(3001|80|443|5432|6379)" || warning "Não foi possível obter informações de portas"
    echo ""
}

# Função para verificar banco de dados
check_database() {
    log "🔍 Verificando banco de dados..."
    
    echo ""
    echo "📊 BANCO DE DADOS:"
    echo "=================="
    
    # Verificar conexão
    if psql -h localhost -U sispat_user -d sispat_production -c "SELECT 1;" >/dev/null 2>&1; then
        success "Conexão com banco de dados OK"
        
        # Verificar tabelas
        echo "🔍 Tabelas no banco:"
        psql -h localhost -U sispat_user -d sispat_production -c "\dt" 2>/dev/null || warning "Não foi possível listar tabelas"
        echo ""
        
        # Verificar extensões
        echo "🔍 Extensões habilitadas:"
        psql -h localhost -U sispat_user -d sispat_production -c "SELECT * FROM pg_extension;" 2>/dev/null || warning "Não foi possível listar extensões"
        echo ""
    else
        error "Não foi possível conectar ao banco de dados"
    fi
}

# Função para gerar relatório
generate_report() {
    log "📋 Gerando relatório de diagnóstico..."
    
    REPORT_FILE="diagnostic-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "================================================"
        echo "RELATÓRIO DE DIAGNÓSTICO - SISPAT"
        echo "Data: $(date)"
        echo "================================================"
        echo ""
        
        echo "SERVIÇOS DO SISTEMA:"
        echo "===================="
        systemctl is-active postgresql && echo "PostgreSQL: ATIVO" || echo "PostgreSQL: INATIVO"
        systemctl is-active redis-server && echo "Redis: ATIVO" || echo "Redis: INATIVO"
        systemctl is-active nginx && echo "Nginx: ATIVO" || echo "Nginx: INATIVO"
        echo ""
        
        echo "PM2:"
        echo "===="
        pm2 list
        echo ""
        
        echo "CONECTIVIDADE:"
        echo "=============="
        curl -s -o /dev/null -w "API local: %{http_code}\n" http://localhost:3001/api/health
        curl -s -o /dev/null -w "Nginx local: %{http_code}\n" http://localhost
        pg_isready -h localhost -p 5432 && echo "PostgreSQL: OK" || echo "PostgreSQL: FALHOU"
        redis-cli ping && echo "Redis: OK" || echo "Redis: FALHOU"
        echo ""
        
        echo "ARQUIVOS DE BUILD:"
        echo "=================="
        [ -d "dist" ] && echo "Diretório dist: EXISTE" || echo "Diretório dist: NÃO EXISTE"
        [ -f "dist/index.html" ] && echo "index.html: EXISTE" || echo "index.html: NÃO EXISTE"
        ls dist/assets/vendor-misc-*.js >/dev/null 2>&1 && echo "vendor-misc: EXISTE" || echo "vendor-misc: NÃO EXISTE"
        ls dist/assets/pages-admin-*.js >/dev/null 2>&1 && echo "pages-admin: EXISTE" || echo "pages-admin: NÃO EXISTE"
        ls dist/assets/vendor-react-*.js >/dev/null 2>&1 && echo "vendor-react: EXISTE (PROBLEMA)" || echo "vendor-react: ELIMINADO (OK)"
        echo ""
        
        echo "CONFIGURAÇÃO:"
        echo "============="
        [ -f ".env" ] && echo ".env: EXISTE" || echo ".env: NÃO EXISTE"
        [ -f "vite.config.ts" ] && echo "vite.config.ts: EXISTE" || echo "vite.config.ts: NÃO EXISTE"
        [ -f "ecosystem.config.cjs" ] && echo "ecosystem.config.cjs: EXISTE" || echo "ecosystem.config.cjs: NÃO EXISTE"
        echo ""
        
        echo "RECURSOS DO SISTEMA:"
        echo "==================="
        free -h
        echo ""
        df -h
        echo ""
        
        echo "PORTAS EM USO:"
        echo "=============="
        netstat -tlnp | grep -E "(3001|80|443|5432|6379)"
        echo ""
        
        echo "LOGS RECENTES:"
        echo "=============="
        echo "PM2:"
        pm2 logs sispat --lines 5 --nostream 2>/dev/null || echo "Não foi possível obter logs do PM2"
        echo ""
        echo "Nginx:"
        tail -5 /var/log/nginx/error.log 2>/dev/null || echo "Não foi possível obter logs do Nginx"
        echo ""
        
    } > "$REPORT_FILE"
    
    success "Relatório gerado: $REPORT_FILE"
}

# Função principal
main() {
    check_system_services
    check_pm2
    check_connectivity
    check_build_files
    check_configuration
    check_logs
    check_system_resources
    check_database
    generate_report
    
    echo ""
    echo "🎯 DIAGNÓSTICO CONCLUÍDO!"
    echo "========================="
    echo ""
    echo "📋 Resumo:"
    echo "   - Verificação de serviços do sistema"
    echo "   - Verificação do PM2"
    echo "   - Testes de conectividade"
    echo "   - Verificação de arquivos de build"
    echo "   - Verificação de configuração"
    echo "   - Análise de logs"
    echo "   - Verificação de recursos do sistema"
    echo "   - Verificação do banco de dados"
    echo "   - Relatório gerado"
    echo ""
    echo "📞 Próximos passos:"
    echo "   1. Analise o relatório gerado"
    echo "   2. Identifique problemas específicos"
    echo "   3. Execute correções necessárias"
    echo "   4. Reinicie serviços se necessário"
    echo ""
    
    success "🎉 Diagnóstico concluído!"
}

# Executar função principal
main
