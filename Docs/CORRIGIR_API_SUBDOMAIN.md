# 🔧 CORRIGIR ERRO DE API SUBDOMAIN

**Erro:** `net::ERR_CONNECTION_REFUSED` ao tentar fazer login

**Causa:** Frontend tenta acessar `api.sispat.vps-kinghost.net` mas Nginx não está configurado

---

## ✅ **SOLUÇÃO RÁPIDA**

Execute estes comandos no seu servidor VPS:

```bash
# 1. Editar configuração do Nginx
sudo nano /etc/nginx/sites-available/sispat
```

### **Encontre esta linha:**
```nginx
server_name sispat.vps-kinghost.net;
```

### **Altere para:**
```nginx
server_name sispat.vps-kinghost.net api.sispat.vps-kinghost.net;
```

**Ou adicione um server block separado para a API:**

```nginx
# Adicione ANTES do server block existente:

server {
    listen 80;
    listen [::]:80;
    server_name api.sispat.vps-kinghost.net;

    # API Backend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **Depois:**

```bash
# 2. Testar configuração
sudo nginx -t

# 3. Recarregar Nginx
sudo systemctl reload nginx

# 4. Testar API
curl http://api.sispat.vps-kinghost.net/health
```

---

## 🌐 **CONFIGURAR DNS**

No painel da Kinghost (ou seu provedor de DNS):

```
Tipo: A
Nome: api
Valor: [IP do seu servidor]
TTL: 3600
```

**Ou use um CNAME:**
```
Tipo: CNAME
Nome: api
Valor: sispat.vps-kinghost.net
TTL: 3600
```

---

## 🎯 **ALTERNATIVA: USAR MESMO DOMÍNIO**

Se não quiser configurar DNS, você pode fazer o frontend usar o mesmo domínio:

### **No servidor:**

```bash
# 1. Verificar qual URL o frontend está usando
grep -r "api\." /var/www/sispat/dist/assets/*.js | head -1

# 2. Se mostrar "api.sispat.vps-kinghost.net", precisamos recompilar
# com a URL correta
```

### **Recompilar Frontend com URL Correta:**

```bash
cd /var/www/sispat

# 1. Editar .env
nano .env

# Altere:
VITE_API_URL=https://sispat.vps-kinghost.net/api

# 2. Recompilar
pnpm run build:prod

# 3. Verificar
ls -lh dist/

# 4. Reiniciar Nginx
sudo systemctl reload nginx
```

---

## 🔧 **SOLUÇÃO DEFINITIVA NO NGINX**

Edite `/etc/nginx/sites-available/sispat` e garanta que tenha:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name sispat.vps-kinghost.net api.sispat.vps-kinghost.net;

    # Frontend
    location / {
        root /var/www/sispat/dist;
        try_files $uri $uri/ /index.html;
        
        # Headers de segurança
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # API Backend (rotas /api/*)
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS
        add_header Access-Control-Allow-Origin "https://sispat.vps-kinghost.net" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
        add_header Access-Control-Allow-Credentials "true" always;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    # Uploads
    location /uploads/ {
        alias /var/www/sispat/backend/uploads/;
        add_header Cache-Control "public";
    }
}

# Se tiver subdomain api. separado:
server {
    listen 80;
    listen [::]:80;
    server_name api.sispat.vps-kinghost.net;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## ✅ **TESTAR TUDO**

```bash
# 1. Verificar PM2
pm2 status

# 2. Testar API diretamente
curl http://localhost:3000/health

# 3. Testar via Nginx (mesmo domínio)
curl http://sispat.vps-kinghost.net/api/health

# 4. Testar via Nginx (subdomain)
curl http://api.sispat.vps-kinghost.net/health

# 5. Ver logs do Nginx
sudo tail -50 /var/log/nginx/error.log
```

---

## 📊 **VERIFICAR CONFIGURAÇÃO DO FRONTEND**

```bash
# Ver qual URL o frontend está usando
cd /var/www/sispat
grep -o "https\?://[^\"']*/api" dist/assets/*.js | head -5

# Deve mostrar uma destas:
# https://sispat.vps-kinghost.net/api  ← CORRETO
# https://api.sispat.vps-kinghost.net  ← Precisa DNS ou Nginx
```

---

## 🎯 **RECOMENDAÇÃO**

Use **a mesma URL** para frontend e API com o path `/api/`:

✅ **Recomendado:**
- Frontend: `https://sispat.vps-kinghost.net`
- API: `https://sispat.vps-kinghost.net/api`

❌ **Evite (precisa configurar DNS):**
- Frontend: `https://sispat.vps-kinghost.net`
- API: `https://api.sispat.vps-kinghost.net`

---

**🚀 Execute os comandos acima e teste novamente!**
