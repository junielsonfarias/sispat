# 🚀 GUIA DE DEPLOY PARA VPS - SISPAT 2.0

## ⚡ DEPLOY RÁPIDO EM 5 PASSOS

### **Pré-requisitos:**
- VPS com Debian 11/12 ou Ubuntu 20.04+
- Mínimo 2GB RAM, 2 CPUs
- Acesso SSH com sudo
- Domínio apontando para IP da VPS

---

## 📋 PASSO 1: Preparar Servidor (5 min)

```bash
# Conectar ao servidor
ssh root@seu-servidor-vps

# Atualizar sistema
apt update && apt upgrade -y

# Instalar dependências
apt install -y curl git build-essential nginx postgresql
```

---

## 📋 PASSO 2: Clonar Repositório (2 min)

```bash
# Criar diretório
mkdir -p /var/www
cd /var/www

# Clonar repositório
git clone https://github.com/junielsonfarias/sispat.git
cd sispat

# Dar permissões
chown -R www-data:www-data /var/www/sispat
```

---

## 📋 PASSO 3: Configurar Ambiente (3 min)

```bash
# Backend - Copiar e editar .env
cp backend/env.production backend/.env
nano backend/.env
```

**Editar as seguintes variáveis:**
```env
DATABASE_URL="postgresql://sispat_user:SUA_SENHA_FORTE@localhost:5432/sispat_prod"
JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
FRONTEND_URL="https://sispat.seudominio.com"
```

```bash
# Frontend - Copiar e editar .env
cp env.production .env
nano .env
```

**Editar:**
```env
VITE_API_URL=https://sispat.seudominio.com/api
```

---

## 📋 PASSO 4: Build e Configurar Banco (10 min)

```bash
# Instalar Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar pnpm
npm install -g pnpm

# Instalar PM2
npm install -g pm2

# Build do Backend
cd /var/www/sispat/backend
npm install --production
npm run build

# Configurar PostgreSQL
sudo -u postgres createuser sispat_user
sudo -u postgres createdb sispat_prod
sudo -u postgres psql -c "ALTER USER sispat_user WITH ENCRYPTED PASSWORD 'SUA_SENHA_FORTE';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sispat_prod TO sispat_user;"

# Executar migrations
npx prisma migrate deploy

# Popular dados iniciais
npm run prisma:seed

# Build do Frontend
cd /var/www/sispat
pnpm install --frozen-lockfile
pnpm run build:prod
```

---

## 📋 PASSO 5: Configurar Nginx e Iniciar (5 min)

```bash
# Configurar Nginx
nano /etc/nginx/sites-available/sispat
```

**Adicionar configuração:**
```nginx
server {
    listen 80;
    server_name sispat.seudominio.com;

    # Frontend
    location / {
        root /var/www/sispat/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
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

    # Uploads
    location /uploads {
        alias /var/www/sispat/backend/uploads;
    }
}
```

```bash
# Ativar site
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Obter SSL
certbot --nginx -d sispat.seudominio.com

# Iniciar Backend com PM2
cd /var/www/sispat/backend
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Reiniciar Nginx
systemctl restart nginx
```

---

## ✅ VERIFICAÇÃO

```bash
# Health check
curl https://sispat.seudominio.com/api/health

# Ver logs
pm2 logs sispat-backend

# Ver status
pm2 status
systemctl status nginx
```

---

## 🎯 ACESSO

**URL:** `https://sispat.seudominio.com/login`  
**Email:** `admin@ssbv.com`  
**Senha:** `password123`

---

## 🔄 ATUALIZAR APLICAÇÃO (Deploy contínuo)

```bash
cd /var/www/sispat

# Baixar atualizações
git pull origin main

# Rebuild
cd backend && npm run build && cd ..
pnpm run build:prod

# Reiniciar
pm2 restart sispat-backend
systemctl reload nginx
```

---

**✅ Deploy concluído! Sistema rodando em produção.**

