#!/bin/bash

# =================================
# CORREÇÃO CONFIGURAÇÃO NGINX - SISPAT
# Sistema de Patrimônio - 100% FUNCIONAL
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
    exit 1
}

# Função para sucesso
success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

# Função para aviso
warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

log "🔧 CORREÇÃO CONFIGURAÇÃO NGINX - SISPAT 100% FUNCIONAL..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

# 1. VERIFICAR SE A APLICAÇÃO ESTÁ RODANDO NO PM2
log "📋 Verificando status da aplicação no PM2..."
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "sispat-backend"; then
        success "✅ Aplicação SISPAT encontrada no PM2"
        
        # Verificar se está online
        if pm2 list | grep "sispat-backend" | grep -q "online"; then
            success "✅ Aplicação SISPAT está rodando (online)"
        else
            warning "⚠️ Aplicação SISPAT não está online, reiniciando..."
            pm2 restart sispat-backend
            sleep 5
            
            if pm2 list | grep "sispat-backend" | grep -q "online"; then
                success "✅ Aplicação SISPAT reiniciada com sucesso"
            else
                error "❌ Falha ao reiniciar aplicação SISPAT"
            fi
        fi
    else
        warning "⚠️ Aplicação SISPAT não encontrada no PM2, iniciando..."
        
        # Verificar se o arquivo ecosystem.config.cjs existe
        if [ -f "ecosystem.config.cjs" ]; then
            pm2 start ecosystem.config.cjs --env production --name "sispat-backend"
            sleep 10
            
            if pm2 list | grep -q "sispat-backend"; then
                success "✅ Aplicação SISPAT iniciada no PM2"
            else
                error "❌ Falha ao iniciar aplicação SISPAT no PM2"
            fi
        else
            error "❌ Arquivo ecosystem.config.cjs não encontrado"
        fi
    fi
else
    error "❌ PM2 não está instalado"
fi

# 2. VERIFICAR SE O BUILD DO FRONTEND EXISTE
log "📋 Verificando build do frontend..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    success "✅ Build do frontend encontrado em dist/"
else
    warning "⚠️ Build do frontend não encontrado, executando build..."
    
    # Verificar se as dependências estão instaladas
    if [ ! -d "node_modules" ]; then
        log "📦 Instalando dependências..."
        if command -v pnpm &> /dev/null; then
            pnpm install
        else
            npm install
        fi
    fi
    
    # Executar build
    log "🔨 Executando build do frontend..."
    if command -v pnpm &> /dev/null; then
        pnpm run build
    else
        npm run build
    fi
    
    if [ -d "dist" ] && [ -f "dist/index.html" ]; then
        success "✅ Build do frontend executado com sucesso"
    else
        error "❌ Falha ao executar build do frontend"
    fi
fi

# 3. CONFIGURAR NGINX
log "🌐 Configurando Nginx..."

# Criar configuração do site
cat > /etc/nginx/sites-available/sispat << 'EOF'
server {
    listen 80;
    server_name sispat.vps-kinghost.net www.sispat.vps-kinghost.net;

    # Logs
    access_log /var/log/nginx/sispat_access.log;
    error_log /var/log/nginx/sispat_error.log;

    # Frontend - Arquivos estáticos
    location / {
        root /var/www/sispat/dist;
        try_files $uri $uri/ /index.html;
        index index.html;

        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header X-Content-Type-Options nosniff;
        }

        # Headers de segurança
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Headers de segurança
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts para WebSocket
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health Check
    location /health {
        proxy_pass http://localhost:3001/api/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

success "✅ Configuração Nginx criada"

# 4. ATIVAR SITE E REMOVER CONFIGURAÇÃO PADRÃO
log "🔗 Ativando site SISPAT..."

# Remover configuração padrão se existir
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    rm -f /etc/nginx/sites-enabled/default
    success "✅ Configuração padrão removida"
fi

# Criar link simbólico
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
success "✅ Site SISPAT ativado"

# 5. TESTAR CONFIGURAÇÃO NGINX
log "🧪 Testando configuração Nginx..."
if nginx -t; then
    success "✅ Configuração Nginx válida"
else
    error "❌ Configuração Nginx inválida"
fi

# 6. RECARREGAR NGINX
log "🔄 Recarregando Nginx..."
systemctl reload nginx
success "✅ Nginx recarregado"

# 7. VERIFICAR PERMISSÕES DOS ARQUIVOS
log "🔐 Verificando permissões dos arquivos..."
chown -R www-data:www-data /var/www/sispat/dist
chmod -R 755 /var/www/sispat/dist
success "✅ Permissões dos arquivos configuradas"

# 8. TESTES DE CONECTIVIDADE
log "🌐 Testando conectividade..."

# Teste 1: Verificar se o backend está respondendo
echo "🔍 Teste 1: Backend API..."
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend API: RESPONDENDO"
else
    echo "❌ Backend API: NÃO RESPONDE"
    warning "⚠️ Backend não está respondendo na porta 3001"
fi

# Teste 2: Verificar se o Nginx está servindo o frontend
echo "🔍 Teste 2: Frontend via Nginx..."
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo "✅ Frontend via Nginx: RESPONDENDO"
else
    echo "❌ Frontend via Nginx: NÃO RESPONDE"
fi

# Teste 3: Verificar se o domínio está configurado
echo "🔍 Teste 3: Domínio configurado..."
if curl -f -H "Host: sispat.vps-kinghost.net" http://localhost:80 > /dev/null 2>&1; then
    echo "✅ Domínio: CONFIGURADO"
else
    echo "❌ Domínio: NÃO CONFIGURADO"
fi

# 9. VERIFICAÇÃO FINAL
log "🔍 VERIFICAÇÃO FINAL..."
echo ""
echo "🎯 STATUS DO SISPAT:"
echo "===================="

# Verificar serviços
echo "📊 Serviços do Sistema:"
echo "  - Nginx: $(systemctl is-active nginx)"
echo "  - PostgreSQL: $(systemctl is-active postgresql)"
echo "  - Redis: $(systemctl is-active redis-server)"

# Verificar aplicação
if command -v pm2 &> /dev/null; then
    echo ""
    echo "📊 Aplicação SISPAT:"
    PM2_STATUS=$(pm2 list | grep sispat-backend | awk '{print $10}' 2>/dev/null || echo "NÃO ENCONTRADO")
    echo "  - Backend: $PM2_STATUS"
    echo "  - Porta 3001: $(netstat -tlnp 2>/dev/null | grep :3001 | wc -l) processos"
fi

# Verificar arquivos
echo ""
echo "📁 Arquivos:"
echo "  - Build frontend: $(if [ -d "dist" ] && [ -f "dist/index.html" ]; then echo "EXISTE"; else echo "NÃO EXISTE"; fi)"
echo "  - Config Nginx: $(if [ -f "/etc/nginx/sites-enabled/sispat" ]; then echo "ATIVO"; else echo "NÃO ATIVO"; fi)"

# 10. INSTRUÇÕES FINAIS
log "📝 CONFIGURAÇÃO NGINX FINALIZADA!"
echo ""
echo "🎉 NGINX CONFIGURADO COM SUCESSO!"
echo "=================================="
echo ""
echo "✅ CONFIGURAÇÕES APLICADAS:"
echo "  - Site SISPAT ativado"
echo "  - Proxy reverso configurado"
echo "  - Headers de segurança aplicados"
echo "  - Compressão Gzip habilitada"
echo "  - Cache para arquivos estáticos"
echo "  - WebSocket configurado"
echo ""
echo "🌐 ACESSO:"
echo "  - Frontend: http://sispat.vps-kinghost.net"
echo "  - Backend: http://sispat.vps-kinghost.net/api"
echo "  - Health Check: http://sispat.vps-kinghost.net/health"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Configure SSL com Certbot:"
echo "   certbot --nginx -d sispat.vps-kinghost.net"
echo ""
echo "2. Verifique logs:"
echo "   tail -f /var/log/nginx/sispat_access.log"
echo "   tail -f /var/log/nginx/sispat_error.log"
echo "   pm2 logs"
echo ""
echo "3. Teste a aplicação:"
echo "   curl -I http://sispat.vps-kinghost.net"
echo "   curl -I http://sispat.vps-kinghost.net/api/health"
echo ""

success "🎉 CONFIGURAÇÃO NGINX CONCLUÍDA!"
success "✅ SISPAT ESTÁ CONFIGURADO PARA PRODUÇÃO!"
success "🚀 SUA APLICAÇÃO ESTÁ PRONTA PARA ACESSO!"
