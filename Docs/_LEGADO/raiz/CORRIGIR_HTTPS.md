# 🔧 Corrigir Erro ERR_CONNECTION_REFUSED em HTTPS

## 📋 Problema

O navegador está tentando acessar `https://sispat.vps-kinghost.net`, mas ocorre `ERR_CONNECTION_REFUSED`. Isso significa que:

1. **SSL não está configurado** OU
2. **Nginx não está escutando na porta 443** OU
3. **Certificado SSL não existe**

---

## ✅ DIAGNÓSTICO RÁPIDO

Execute no servidor:

```bash
cd /var/www/sispat
bash DIAGNOSTICAR_HTTPS.sh
```

---

## 🔍 VERIFICAÇÃO MANUAL

### 1. Verificar se Nginx está escutando na porta 443

```bash
ss -tlnp | grep :443
# Ou
netstat -tlnp | grep :443
```

**Se não aparecer nada**: HTTPS não está configurado.

### 2. Verificar configuração do Nginx

```bash
cat /etc/nginx/sites-available/sispat | grep -A 5 "listen 443"
```

**Se não aparecer `listen 443`**: Configuração HTTPS não existe.

### 3. Verificar certificados SSL

```bash
ls -la /etc/letsencrypt/live/
```

**Se o diretório não existir**: Certbot não foi executado.

---

## 🚀 SOLUÇÕES

### **Opção 1: Configurar SSL Agora (Recomendado)**

Se você escolheu **"N"** para SSL durante a instalação:

```bash
# 1. Instalar Certbot (se não estiver instalado)
apt update
apt install -y certbot python3-certbot-nginx

# 2. Obter certificado SSL
certbot --nginx -d sispat.vps-kinghost.net

# 3. Verificar configuração
nginx -t

# 4. Recarregar Nginx
systemctl reload nginx

# 5. Testar
curl https://sispat.vps-kinghost.net/api/health
```

**Durante a execução do Certbot:**
- Escolha: **Redirect HTTP to HTTPS** (Yes)
- Deixe o Certbot modificar a configuração do Nginx automaticamente

### **Opção 2: Usar HTTP Temporariamente (Não Recomendado)**

Se você não quer configurar SSL agora, pode acessar via HTTP:

```
http://sispat.vps-kinghost.net
```

**⚠️ AVISO**: HTTP não é seguro! Configure SSL em produção.

### **Opção 3: Verificar Configuração Existente**

Se você escolheu **"S"** para SSL durante a instalação, mas ainda não funciona:

```bash
# 1. Verificar se Certbot foi executado
certbot certificates

# 2. Verificar logs do Certbot
tail -50 /var/log/letsencrypt/letsencrypt.log

# 3. Renovar certificado (se necessário)
certbot renew --dry-run

# 4. Testar configuração do Nginx
nginx -t

# 5. Recarregar Nginx
systemctl reload nginx
```

---

## 🔧 CORRIGIR CONFIGURAÇÃO DO NGINX MANUALMENTE

Se o Certbot não funcionou, você pode configurar manualmente:

### 1. Criar configuração HTTPS básica

```bash
cat > /tmp/sispat-https.conf << 'EOF'
# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sispat.vps-kinghost.net;

    # SSL (será configurado pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/sispat.vps-kinghost.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sispat.vps-kinghost.net/privkey.pem;

    # Frontend
    root /var/www/sispat/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Uploads
    location /uploads {
        alias /var/www/sispat/backend/uploads;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    client_max_body_size 10M;
}
EOF

# 2. Verificar se certificado existe antes de aplicar
if [ -f /etc/letsencrypt/live/sispat.vps-kinghost.net/fullchain.pem ]; then
    # Adicionar ao arquivo de configuração existente
    cat /tmp/sispat-https.conf >> /etc/nginx/sites-available/sispat
    
    # Testar configuração
    nginx -t
    
    # Recarregar
    systemctl reload nginx
else
    echo "❌ Certificado não existe. Execute Certbot primeiro!"
fi
```

---

## ✅ VERIFICAÇÃO FINAL

Após configurar SSL:

```bash
# 1. Verificar se porta 443 está aberta
ss -tlnp | grep :443

# 2. Testar HTTPS localmente
curl -k https://localhost/api/health

# 3. Testar HTTPS externamente
curl https://sispat.vps-kinghost.net/api/health

# 4. Verificar certificado
openssl s_client -connect sispat.vps-kinghost.net:443 -servername sispat.vps-kinghost.net < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

---

## 🐛 TROUBLESHOOTING

### Erro: "No valid IP addresses found"

**Causa**: DNS não está apontando para o servidor.

**Solução**:
```bash
# Verificar DNS
host sispat.vps-kinghost.net

# Deve retornar o IP do servidor
# Se não retornar, configure o DNS primeiro
```

### Erro: "Failed to obtain certificate"

**Causa**: Certbot não consegue validar o domínio.

**Solução**:
1. Verifique se o DNS está correto
2. Verifique se a porta 80 está aberta (necessária para validação)
3. Tente novamente: `certbot --nginx -d sispat.vps-kinghost.net`

### Erro: "SSL certificate problem"

**Causa**: Certificado expirado ou inválido.

**Solução**:
```bash
# Renovar certificado
certbot renew

# Recarregar Nginx
systemctl reload nginx
```

---

**Data**: 2025-11-03  
**Status**: ✅ Script de diagnóstico criado

