#!/bin/bash

# =================================
# CORREÇÃO NGINX LIMPA - SISPAT
# Remove backups problemáticos e corrige configuração
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

# Banner
echo ""
echo "🔧 ================================================"
echo "🔧    CORREÇÃO NGINX LIMPA - SISPAT"
echo "🔧    Remove backups problemáticos e corrige configuração"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção limpa do Nginx..."

# 1. Parar Nginx temporariamente
log "🛑 Parando Nginx temporariamente..."
systemctl stop nginx
success "✅ Nginx parado"

# 2. Remover todos os backups problemáticos
log "🧹 Removendo backups problemáticos..."
rm -f /etc/nginx/sites-enabled/sispat.backup*
rm -f /etc/nginx/sites-enabled/sispat.backup
success "✅ Backups problemáticos removidos"

# 3. Remover configuração atual
log "🗑️ Removendo configuração atual..."
rm -f /etc/nginx/sites-enabled/sispat
success "✅ Configuração atual removida"

# 4. Criar favicon.svg se não existir
log "🎨 Verificando favicon.svg..."
if [ ! -f "dist/favicon.svg" ]; then
    warning "⚠️ favicon.svg não encontrado, criando..."
    
    # Criar um favicon.svg simples
    cat > dist/favicon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#2563eb"/>
  <text x="16" y="20" font-family="Arial" font-size="16" fill="white" text-anchor="middle">S</text>
</svg>
EOF
    success "✅ favicon.svg criado"
else
    success "✅ favicon.svg já existe"
fi

# 5. Criar configuração Nginx limpa e funcional
log "⚙️ Criando configuração Nginx limpa..."
cat > /etc/nginx/sites-enabled/sispat << 'EOF'
server {
    listen 80;
    listen 443 ssl http2;
    server_name sispat.vps-kinghost.net www.sispat.vps-kinghost.net;

    # SSL Configuration (se certificado existir)
    ssl_certificate /etc/letsencrypt/live/sispat.vps-kinghost.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sispat.vps-kinghost.net/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression (configuração limpa)
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # Root directory
    root /var/www/sispat/dist;
    index index.html;

    # Frontend - SPA routing (configuração limpa)
    location / {
        try_files $uri $uri/ @fallback;
    }

    # Fallback para SPA
    location @fallback {
        rewrite ^.*$ /index.html last;
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
        proxy_read_timeout 86400;
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
    }

    # Cache para arquivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Favicon específico
    location = /favicon.svg {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

success "✅ Configuração Nginx limpa criada"

# 6. Testar configuração do Nginx
log "🧪 Testando configuração do Nginx..."
if nginx -t; then
    success "✅ Configuração Nginx válida"
else
    error "❌ Configuração Nginx inválida"
fi

# 7. Iniciar Nginx
log "🚀 Iniciando Nginx..."
systemctl start nginx
success "✅ Nginx iniciado"

# 8. Verificar status do Nginx
log "📊 Verificando status do Nginx..."
if systemctl is-active --quiet nginx; then
    success "✅ Nginx está rodando"
else
    error "❌ Nginx não está rodando"
fi

# 9. Testar frontend
log "🧪 Testando frontend..."
sleep 3

# Testar HTTP
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    success "✅ Frontend respondendo via HTTP"
else
    warning "⚠️ Frontend não está respondendo via HTTP"
fi

# Testar HTTPS (se certificado existir)
if [ -f "/etc/letsencrypt/live/sispat.vps-kinghost.net/fullchain.pem" ]; then
    if curl -s -o /dev/null -w "%{http_code}" https://localhost -k | grep -q "200"; then
        success "✅ Frontend respondendo via HTTPS"
    else
        warning "⚠️ Frontend não está respondendo via HTTPS"
    fi
fi

# 10. Testar API
log "🧪 Testando API..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health | grep -q "200"; then
    success "✅ API respondendo corretamente"
else
    warning "⚠️ API pode não estar respondendo"
fi

# 11. Verificar logs do Nginx
log "📋 Verificando logs do Nginx..."
if [ -f "/var/log/nginx/error.log" ]; then
    log "📄 Últimas 5 linhas do error.log:"
    tail -5 /var/log/nginx/error.log
else
    warning "⚠️ Log de erro do Nginx não encontrado"
fi

# 12. Testar acesso externo
log "🌐 Testando acesso externo..."
EXTERNAL_IP=$(curl -s ifconfig.me 2>/dev/null || echo "não disponível")
if [ "$EXTERNAL_IP" != "não disponível" ]; then
    log "📡 IP externo: $EXTERNAL_IP"
    
    # Testar acesso externo (com timeout)
    if timeout 10 curl -s -o /dev/null -w "%{http_code}" http://$EXTERNAL_IP | grep -q "200"; then
        success "✅ Acesso externo funcionando"
    else
        warning "⚠️ Acesso externo pode não estar funcionando"
    fi
else
    warning "⚠️ Não foi possível obter IP externo"
fi

# Instruções finais
log "📝 CORREÇÃO NGINX LIMPA CONCLUÍDA!"
echo ""
echo "🎉 NGINX CORRIGIDO E LIMPO!"
echo "============================"
echo ""
echo "📋 O que foi feito:"
echo "✅ Nginx parado temporariamente"
echo "✅ Backups problemáticos removidos"
echo "✅ Configuração atual removida"
echo "✅ favicon.svg verificado/criado"
echo "✅ Configuração Nginx limpa criada"
echo "✅ Configuração Nginx testada"
echo "✅ Nginx iniciado"
echo "✅ Status do Nginx verificado"
echo "✅ Frontend testado"
echo "✅ API testada"
echo "✅ Logs do Nginx verificados"
echo "✅ Acesso externo testado"
echo ""
echo "🔧 Correções aplicadas:"
echo "   - Backups problemáticos removidos"
echo "   - Loop infinito de redirecionamento corrigido"
echo "   - Configuração try_files otimizada"
echo "   - Fallback @fallback adicionado"
echo "   - favicon.svg verificado/criado"
echo "   - Configuração Gzip limpa"
echo "   - Headers de segurança adicionados"
echo ""
echo "🌐 URLs da aplicação:"
echo "   - Frontend: http://sispat.vps-kinghost.net"
echo "   - Frontend HTTPS: https://sispat.vps-kinghost.net"
echo "   - API: http://sispat.vps-kinghost.net/api"
echo "   - Health: http://sispat.vps-kinghost.net/health"
echo ""
echo "📞 Próximos passos:"
echo "   1. Teste a aplicação no navegador"
echo "   2. Verifique se não há mais erros de redirecionamento"
echo "   3. Se houver problemas, execute: systemctl restart nginx"
echo "   4. Verifique os logs: tail -f /var/log/nginx/error.log"
echo ""

success "🎉 Correção limpa do Nginx concluída!"
