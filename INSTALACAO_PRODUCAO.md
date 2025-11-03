# 🚀 INSTALAÇÃO EM PRODUÇÃO - SISPAT 2.0

**Versão:** 2.0.0  
**Tempo:** ~30 minutos  
**Dificuldade:** Intermediária

---

## 📋 PASSO 1: Preparar Servidor VPS

### **1.1 Conectar ao Servidor**
```bash
ssh root@seu-ip-vps
```

### **1.2 Executar Setup Automático**
```bash
# Opção A: Setup completo (recomendado)
bash <(curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/setup-server.sh)

# OU execute manualmente:
apt update && apt upgrade -y
apt install -y curl git build-essential nginx postgresql certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pnpm pm2
```

---

## 📋 PASSO 2: Baixar Código

### **2.1 Clonar Repositório**
```bash
cd /var/www
git clone https://github.com/junielsonfarias/sispat.git
cd sispat
chown -R www-data:www-data /var/www/sispat
```

---

## 📋 PASSO 3: Configurar Ambiente

### **3.1 Executar Configuração Automática**
```bash
# Script interativo que pede domínio, senhas, etc
./scripts/configurar-producao-teste.sh
```

**OU configure manualmente:**

### **3.2 Backend**
```bash
cp backend/env.production backend/.env
nano backend/.env
```

**Editar:**
- `DATABASE_URL` - senha do PostgreSQL
- `JWT_SECRET` - gerar: `openssl rand -hex 64`
- `FRONTEND_URL` - seu domínio

### **3.3 Frontend**
```bash
cp env.production .env
nano .env
```

**Editar:**
- `VITE_API_URL` - https://seu-dominio.com/api

---

## 📋 PASSO 4: Configurar Banco de Dados

```bash
# Criar usuário e banco
sudo -u postgres createuser sispat_user
sudo -u postgres createdb sispat_prod
sudo -u postgres psql -c "ALTER USER sispat_user WITH PASSWORD 'sua_senha';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sispat_prod TO sispat_user;"
```

---

## 📋 PASSO 5: Build e Deploy

```bash
# Build do Backend
cd /var/www/sispat/backend
npm install --production
npm run build
npx prisma migrate deploy
npm run prisma:seed

# Build do Frontend
cd /var/www/sispat
pnpm install --frozen-lockfile
pnpm run build:prod

# Configurar Nginx
cp nginx/conf.d/sispat.conf /etc/nginx/sites-available/sispat
nano /etc/nginx/sites-available/sispat  # Editar domínio
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# SSL
certbot --nginx -d seu-dominio.com

# Iniciar Backend
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
curl https://seu-dominio.com/api/health

# Status
pm2 status
systemctl status nginx

# Logs
pm2 logs sispat-backend
```

---

## 🔐 ACESSO INICIAL

**URL:** `https://seu-dominio.com/login`  
**Email:** `admin@ssbv.com`  
**Senha:** `password123`

**⚠️ IMPORTANTE:** Altere as senhas após primeiro login!

---

## 🔄 ATUALIZAR SISTEMA

```bash
cd /var/www/sispat
git pull origin main

# Rebuild
cd backend && npm run build && cd ..
pnpm run build:prod

# Reiniciar
pm2 restart sispat-backend
systemctl reload nginx
```

---

## 📚 GUIAS ADICIONAIS

- **Deploy Completo:** `Docs/GUIA_DEPLOY_PRODUCAO.md`
- **Instalação Automática:** `install.sh`
- **Troubleshooting:** `Docs/GUIA_RAPIDO_DEPLOY.md`

---

**✅ Sistema instalado e pronto para uso!**

