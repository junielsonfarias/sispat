# 🚀 Guia de Deploy para Produção - SISPAT 2.0

**Versão:** 2.0.0  
**Última atualização:** 2025-11-05

> 📥 **Para atualizações via Git, consulte:** [`COMANDOS_ATUALIZACAO_PRODUCAO.md`](./COMANDOS_ATUALIZACAO_PRODUCAO.md)

---

## 📋 Pré-requisitos

### Infraestrutura
- ✅ Servidor Linux (Ubuntu 20.04+ recomendado)
- ✅ Node.js 20+ instalado
- ✅ PostgreSQL 15+ instalado e configurado
- ✅ Nginx instalado e configurado
- ✅ PM2 instalado globalmente (`npm install -g pm2`)
- ✅ Certificado SSL (Let's Encrypt recomendado)

### Variáveis de Ambiente
- ✅ Todas as variáveis obrigatórias configuradas
- ✅ JWT_SECRET forte (64+ caracteres)
- ✅ Senhas fortes configuradas
- ✅ SSL habilitado no banco de dados

---

## 🔧 Passo 1: Preparação do Servidor

### 1.1 Atualizar Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Instalar Dependências
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# PM2
sudo npm install -g pm2

# Certbot (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
```

### 1.3 Criar Usuário do Sistema
```bash
sudo adduser sispat --disabled-password
sudo usermod -aG sudo sispat
```

---

## 🗄️ Passo 2: Configuração do Banco de Dados

### 2.1 Criar Banco de Dados
```bash
sudo -u postgres psql

CREATE DATABASE sispat_prod;
CREATE USER sispat_user WITH ENCRYPTED PASSWORD 'SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON DATABASE sispat_prod TO sispat_user;
\q
```

### 2.2 Configurar SSL
Editar `/etc/postgresql/15/main/postgresql.conf`:
```conf
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'
```

### 2.3 Reiniciar PostgreSQL
```bash
sudo systemctl restart postgresql
```

---

## 📦 Passo 3: Deploy da Aplicação

### 3.1 Clonar Repositório
```bash
cd /var/www
sudo git clone https://github.com/seu-usuario/sispat.git
sudo chown -R sispat:sispat sispat
cd sispat
```

### 3.2 Configurar Variáveis de Ambiente - Backend
```bash
cd backend
cp env.production.example .env
nano .env
```

**Variáveis obrigatórias:**
```env
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://sispat_user:SENHA_FORTE@localhost:5432/sispat_prod?sslmode=require

# JWT (GERAR SECRET FORTE!)
JWT_SECRET=GERE_UM_SECRET_FORTE_DE_64_CARACTERES_MINIMO
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=https://sispat.seudominio.com
CORS_ORIGIN=https://sispat.seudominio.com

# Security
BCRYPT_ROUNDS=12

# Redis (opcional)
REDIS_URL=redis://localhost:6379
```

### 3.3 Instalar Dependências - Backend
```bash
cd backend
npm ci --production
npx prisma generate
npx prisma migrate deploy
```

### 3.4 Build do Backend
```bash
npm run build
```

### 3.5 Configurar Variáveis de Ambiente - Frontend
```bash
cd ../frontend
cp .env.production.example .env.production
nano .env.production
```

```env
VITE_API_URL=https://api.seudominio.com
VITE_APP_NAME=SISPAT 2.0
VITE_APP_ENV=production
```

### 3.6 Build do Frontend
```bash
pnpm install --frozen-lockfile
pnpm run build
```

---

## ⚙️ Passo 4: Configuração do PM2

### 4.1 Criar Arquivo de Configuração
```bash
cd /var/www/sispat/backend
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'sispat-backend',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

### 4.2 Iniciar Aplicação
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🌐 Passo 5: Configuração do Nginx

### 5.1 Criar Configuração
```bash
sudo nano /etc/nginx/sites-available/sispat
```

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name sispat.seudominio.com;
    
    location /.well-known/acme-challenge {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sispat.seudominio.com;

    # SSL
    ssl_certificate /etc/letsencrypt/live/sispat.seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sispat.seudominio.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    root /var/www/sispat/dist;
    index index.html;

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
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
```

### 5.2 Ativar Site
```bash
sudo ln -s /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5.3 Configurar SSL
```bash
sudo certbot --nginx -d sispat.seudominio.com
```

---

## 🔄 Passo 6: Processo de Atualização

### 6.1 Atualizar Código
```bash
cd /var/www/sispat
git pull origin main
```

### 6.2 Atualizar Backend
```bash
cd backend
npm ci --production
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart sispat-backend
```

### 6.3 Atualizar Frontend
```bash
cd frontend
pnpm install --frozen-lockfile
pnpm run build
sudo systemctl reload nginx
```

---

## ✅ Passo 7: Verificação

### 7.1 Verificar Backend
```bash
curl http://localhost:3000/api/health
```

### 7.2 Verificar Frontend
```bash
curl https://sispat.seudominio.com
```

### 7.3 Verificar Logs
```bash
# PM2
pm2 logs sispat-backend

# Nginx
sudo tail -f /var/log/nginx/error.log

# Backend
tail -f /var/www/sispat/backend/logs/app.log
```

---

## 🛡️ Passo 8: Segurança

### 8.1 Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 8.2 Backups Automáticos
```bash
# Criar script de backup
sudo nano /usr/local/bin/backup-sispat.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backup/sispat"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup do banco
pg_dump -U sispat_user sispat_prod | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup dos uploads
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" /var/www/sispat/backend/uploads

# Manter apenas últimos 30 dias
find $BACKUP_DIR -type f -mtime +30 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-sispat.sh

# Adicionar ao crontab (diário às 2h)
sudo crontab -e
# Adicionar: 0 2 * * * /usr/local/bin/backup-sispat.sh
```

---

## 📊 Monitoramento

### Verificar Status
```bash
# PM2
pm2 status
pm2 monit

# Sistema
htop
df -h
free -h
```

### Métricas
Acesse: `https://sispat.seudominio.com/admin/metrics`

---

## 🚨 Troubleshooting

### Backend não inicia
```bash
pm2 logs sispat-backend
cd /var/www/sispat/backend
npm run build
pm2 restart sispat-backend
```

### Banco de dados não conecta
```bash
sudo -u postgres psql -c "SELECT version();"
sudo systemctl status postgresql
```

### Nginx retorna 502
```bash
sudo nginx -t
sudo systemctl status nginx
pm2 status
```

---

## 📝 Checklist Final

- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados criado e migrado
- [ ] Backend buildado e rodando (PM2)
- [ ] Frontend buildado e servido
- [ ] Nginx configurado e SSL ativo
- [ ] Firewall configurado
- [ ] Backups automáticos configurados
- [ ] Monitoramento ativo
- [ ] Logs configurados
- [ ] Testes de produção realizados

---

**✅ Deploy concluído!**

Para suporte, consulte a documentação ou abra uma issue no repositório.

