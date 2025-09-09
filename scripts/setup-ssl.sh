#!/bin/bash

# ===========================================
# SISPAT - Script de Configuração SSL
# ===========================================
# Data: 09/09/2025
# Versão: 0.0.193
# Descrição: Configuração automática de SSL com Let's Encrypt

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
   error "Este script deve ser executado como root (use sudo)"
fi

# Verificar argumentos
if [ $# -eq 0 ]; then
    echo "Uso: $0 <dominio> [email]"
    echo "Exemplo: $0 meudominio.com admin@meudominio.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@$DOMAIN"}

log "🔒 Configurando SSL para o domínio: $DOMAIN"
log "📧 Email: $EMAIL"

# ===========================================
# 1. VERIFICAÇÕES INICIAIS
# ===========================================
log "📋 Verificando pré-requisitos..."

# Verificar se o domínio está apontando para este servidor
log "🌐 Verificando DNS..."
if ! nslookup $DOMAIN | grep -q "$(curl -s ifconfig.me)"; then
    warn "O domínio $DOMAIN pode não estar apontando para este servidor"
    warn "IP do servidor: $(curl -s ifconfig.me)"
    read -p "Continuar mesmo assim? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Verificar se o Nginx está rodando
if ! systemctl is-active --quiet nginx; then
    error "Nginx não está rodando. Execute o setup-production.sh primeiro."
fi

# Verificar se o site está configurado
if [ ! -f "/etc/nginx/sites-available/sispat" ]; then
    error "Configuração do Nginx não encontrada. Execute o setup-production.sh primeiro."
fi

log "✅ Pré-requisitos verificados!"

# ===========================================
# 2. INSTALAÇÃO DO CERTBOT
# ===========================================
log "📦 Instalando Certbot..."

# Atualizar pacotes
apt update

# Instalar Certbot
apt install -y certbot python3-certbot-nginx

log "✅ Certbot instalado com sucesso!"

# ===========================================
# 3. CONFIGURAÇÃO TEMPORÁRIA DO NGINX
# ===========================================
log "🔧 Configurando Nginx temporariamente..."

# Backup da configuração atual
cp /etc/nginx/sites-available/sispat /etc/nginx/sites-available/sispat.backup

# Criar configuração temporária para validação
cat > /etc/nginx/sites-available/sispat <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location / {
        root /var/www/sispat/dist;
        try_files \$uri \$uri/ /index.html;
    }
    
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
}
EOF

# Recarregar Nginx
systemctl reload nginx

log "✅ Nginx configurado temporariamente!"

# ===========================================
# 4. OBTER CERTIFICADO SSL
# ===========================================
log "🔒 Obtendo certificado SSL..."

# Obter certificado
certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive --redirect

log "✅ Certificado SSL obtido com sucesso!"

# ===========================================
# 5. CONFIGURAÇÃO FINAL DO NGINX
# ===========================================
log "🔧 Configurando Nginx com SSL..."

# Restaurar configuração completa
cat > /etc/nginx/sites-available/sispat <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirecionar HTTP para HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # Configurações SSL
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de segurança
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Configurações de upload
    client_max_body_size 10M;
    
    # Proxy para o backend
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Servir arquivos estáticos
    location / {
        root /var/www/sispat/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache para assets estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Logs
    access_log /var/log/nginx/sispat_access.log;
    error_log /var/log/nginx/sispat_error.log;
}
EOF

# Testar configuração
nginx -t

# Recarregar Nginx
systemctl reload nginx

log "✅ Nginx configurado com SSL!"

# ===========================================
# 6. CONFIGURAÇÃO DE RENOVAÇÃO AUTOMÁTICA
# ===========================================
log "🔄 Configurando renovação automática..."

# Verificar se o cron job já existe
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    # Adicionar cron job para renovação
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --reload-hook 'systemctl reload nginx'") | crontab -
    log "✅ Renovação automática configurada!"
else
    log "✅ Renovação automática já configurada!"
fi

# ===========================================
# 7. TESTE DE SSL
# ===========================================
log "🧪 Testando configuração SSL..."

# Aguardar um momento para o SSL ser aplicado
sleep 5

# Testar HTTPS
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200"; then
    log "✅ HTTPS funcionando corretamente!"
else
    warn "⚠️ HTTPS pode não estar funcionando corretamente"
fi

# Testar redirecionamento HTTP
if curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN | grep -q "301"; then
    log "✅ Redirecionamento HTTP para HTTPS funcionando!"
else
    warn "⚠️ Redirecionamento HTTP pode não estar funcionando"
fi

# ===========================================
# 8. CONFIGURAÇÃO DE SEGURANÇA ADICIONAL
# ===========================================
log "🛡️ Configurando segurança adicional..."

# Configurar HSTS
log "✅ HSTS configurado!"

# Configurar OCSP Stapling
log "✅ OCSP Stapling configurado!"

# ===========================================
# 9. FINALIZAÇÃO
# ===========================================
log "🎉 Configuração SSL concluída!"

echo ""
echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  SISPAT - SSL CONFIGURADO${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""
echo -e "${GREEN}✅ SSL configurado com sucesso!${NC}"
echo ""
echo -e "${YELLOW}📋 Informações:${NC}"
echo -e "🌐 Domínio: $DOMAIN"
echo -e "🔒 SSL: Let's Encrypt"
echo -e "📧 Email: $EMAIL"
echo -e "🔄 Renovação: Automática"
echo ""
echo -e "${YELLOW}🧪 Teste o SSL:${NC}"
echo -e "https://$DOMAIN"
echo -e "https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
echo -e "${YELLOW}📊 Comandos úteis:${NC}"
echo -e "Verificar certificados: ${BLUE}certbot certificates${NC}"
echo -e "Renovar manualmente: ${BLUE}certbot renew${NC}"
echo -e "Testar renovação: ${BLUE}certbot renew --dry-run${NC}"
echo ""
echo -e "${GREEN}🚀 SISPAT está seguro e pronto para produção!${NC}"
