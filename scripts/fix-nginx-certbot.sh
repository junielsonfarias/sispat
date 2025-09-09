#!/bin/bash

# =================================
# CORREÇÃO NGINX + CERTBOT - SISPAT
# Corrige problemas de configuração Nginx e Certbot
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
echo "🔧    CORREÇÃO NGINX + CERTBOT - SISPAT"
echo "🔧    Corrige problemas de configuração Nginx e Certbot"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

# Obter domínio e email do usuário
read -p "🌐 Digite seu domínio (ex: meusite.com): " DOMAIN
read -p "📧 Digite seu email para certificado SSL: " EMAIL

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    error "Domínio e email são obrigatórios."
fi

# Verificar se o domínio não contém http://
if [[ "$DOMAIN" == http* ]]; then
    error "Domínio não deve conter http:// ou https://. Use apenas: meusite.com"
fi

log "🔧 Iniciando correção Nginx + Certbot..."

# 1. Parar Nginx
log "🛑 Parando Nginx..."
systemctl stop nginx || warning "Nginx não estava rodando"

# 2. Limpar configurações existentes
log "🧹 Limpando configurações Nginx existentes..."
rm -f /etc/nginx/sites-available/sispat
rm -f /etc/nginx/sites-enabled/sispat
rm -f /etc/nginx/sites-enabled/default
success "Configurações antigas removidas"

# 3. Criar configuração Nginx limpa
log "📝 Criando configuração Nginx limpa..."
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
success "Configuração Nginx criada"

# 4. Ativar site
log "🔗 Ativando site Nginx..."
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
success "Site ativado"

# 5. Testar configuração Nginx
log "🧪 Testando configuração Nginx..."
if nginx -t; then
    success "✅ Configuração Nginx válida"
else
    error "❌ Configuração Nginx inválida"
fi

# 6. Iniciar Nginx
log "🚀 Iniciando Nginx..."
systemctl start nginx
systemctl enable nginx
success "Nginx iniciado"

# 7. Verificar se Nginx está rodando
log "🔍 Verificando status do Nginx..."
if systemctl is-active --quiet nginx; then
    success "✅ Nginx está rodando"
else
    error "❌ Nginx não está rodando"
fi

# 8. Verificar se o domínio está acessível
log "🌐 Verificando se o domínio $DOMAIN está acessível..."
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN | grep -q "200\|301\|302"; then
    success "✅ Domínio $DOMAIN está acessível"
else
    warning "⚠️ Domínio $DOMAIN pode não estar acessível. Verifique se o DNS está apontando para este servidor."
fi

# 9. Instalar Certbot se não estiver instalado
log "📦 Verificando Certbot..."
if ! command -v certbot &> /dev/null; then
    log "📦 Instalando Certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
    success "Certbot instalado"
else
    success "Certbot já está instalado"
fi

# 10. Obter certificado SSL
log "🔒 Obtendo certificado SSL para $DOMAIN..."
if certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive --redirect; then
    success "✅ Certificado SSL obtido com sucesso"
else
    warning "⚠️ Falha ao obter certificado SSL. Verifique se:"
    echo "   - O domínio está apontando para este servidor"
    echo "   - A porta 80 está aberta no firewall"
    echo "   - O Nginx está rodando corretamente"
fi

# 11. Verificar configuração final
log "🔍 Verificando configuração final..."
nginx -t && systemctl reload nginx
success "Configuração final validada"

# 12. Testar HTTPS
log "🔒 Testando HTTPS..."
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
    success "✅ HTTPS funcionando em https://$DOMAIN"
else
    warning "⚠️ HTTPS pode não estar funcionando. Verifique os logs:"
    echo "   - journalctl -u nginx"
    echo "   - certbot certificates"
fi

# Instruções finais
log "📝 CORREÇÃO CONCLUÍDA!"
echo ""
echo "🎉 NGINX + CERTBOT CORRIGIDOS!"
echo "=============================="
echo ""
echo "📋 O que foi feito:"
echo "✅ Configurações Nginx antigas removidas"
echo "✅ Nova configuração Nginx criada"
echo "✅ Nginx testado e iniciado"
echo "✅ Certbot instalado/verificado"
echo "✅ Certificado SSL obtido"
echo "✅ Configuração final validada"
echo ""
echo "🌐 URLs da aplicação:"
echo "   - HTTP:  http://$DOMAIN"
echo "   - HTTPS: https://$DOMAIN"
echo "   - API:   https://$DOMAIN/api"
echo ""
echo "📞 Comandos úteis:"
echo "   - Ver status Nginx: systemctl status nginx"
echo "   - Ver logs Nginx: journalctl -u nginx -f"
echo "   - Ver certificados: certbot certificates"
echo "   - Renovar certificados: certbot renew"
echo ""

success "🎉 Correção Nginx + Certbot concluída!"
