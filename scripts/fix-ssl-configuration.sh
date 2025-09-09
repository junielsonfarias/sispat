#!/bin/bash

# =================================
# CORREÇÃO CONFIGURAÇÃO SSL - SISPAT
# Corrige problemas de SSL no Nginx
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
echo "🔧    CORREÇÃO CONFIGURAÇÃO SSL - SISPAT"
echo "🔧    Corrige problemas de SSL no Nginx"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

# Solicitar domínio
read -p "🌐 Digite seu domínio (ex: meusite.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    error "Domínio é obrigatório"
fi

# Solicitar email
read -p "📧 Digite seu email para certificado SSL: " EMAIL
if [ -z "$EMAIL" ]; then
    error "Email é obrigatório"
fi

# Verificar se Nginx está rodando
log "🔍 Verificando status do Nginx..."
if ! systemctl is-active --quiet nginx; then
    log "🚀 Iniciando Nginx..."
    systemctl start nginx
    systemctl enable nginx
fi

# Configurar Nginx apenas com HTTP primeiro
log "🌐 Configurando Nginx (HTTP)..."
cat > /etc/nginx/sites-available/sispat << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Frontend
    location / {
        root /var/www/sispat/dist;
        try_files \$uri \$uri/ /index.html;

        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
log "🧪 Testando configuração Nginx..."
if nginx -t; then
    success "✅ Configuração Nginx válida"
else
    error "❌ Configuração Nginx inválida"
fi

# Recarregar Nginx
systemctl reload nginx
success "✅ Nginx recarregado"

# Instalar Certbot se não estiver instalado
log "🔒 Verificando Certbot..."
if ! command -v certbot &> /dev/null; then
    log "📦 Instalando Certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
    success "✅ Certbot instalado"
else
    success "✅ Certbot já está instalado"
fi

# Obter certificado SSL
log "🔒 Obtendo certificado SSL..."
if certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive; then
    success "✅ Certificado SSL obtido com sucesso"
else
    warning "⚠️ Falha ao obter certificado SSL. Verifique se o domínio está apontando para este servidor."
    log "📋 Verificando DNS..."
    nslookup $DOMAIN || true
    log "📋 Verificando conectividade..."
    curl -I http://$DOMAIN || true
fi

# Verificar se o certificado foi criado
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    success "✅ Certificado SSL encontrado"
    
    # Testar configuração final
    log "🧪 Testando configuração final..."
    if nginx -t; then
        success "✅ Configuração final válida"
        systemctl reload nginx
        success "✅ Nginx recarregado com SSL"
    else
        error "❌ Configuração final inválida"
    fi
else
    warning "⚠️ Certificado SSL não encontrado. Aplicação funcionará apenas em HTTP."
fi

# Instruções finais
log "📝 CORREÇÃO CONCLUÍDA!"
echo ""
echo "🎉 CONFIGURAÇÃO SSL CORRIGIDA!"
echo "==============================="
echo ""
echo "📋 O que foi feito:"
echo "✅ Nginx configurado com HTTP"
echo "✅ Certbot instalado"
echo "✅ Certificado SSL obtido (se possível)"
echo "✅ Configuração testada e validada"
echo ""
echo "🔧 Status:"
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ SSL configurado - Aplicação disponível em https://$DOMAIN"
else
    echo "⚠️ SSL não configurado - Aplicação disponível em http://$DOMAIN"
fi
echo ""
echo "📞 Próximos passos:"
echo "   1. Verifique se o domínio está apontando para este servidor"
echo "   2. Execute: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "   3. Configure renovação automática: crontab -e"
echo ""

success "🎉 Correção de configuração SSL concluída!"
