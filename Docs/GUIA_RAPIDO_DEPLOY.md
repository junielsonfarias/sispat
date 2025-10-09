# ⚡ GUIA RÁPIDO DE DEPLOY - SISPAT 2.0

**Tempo estimado:** 30 minutos  
**Dificuldade:** Intermediária  
**Versão:** 2.0.0

---

## 🎯 **DEPLOY RÁPIDO EM 5 PASSOS**

### **PASSO 1: Preparar Servidor Debian 12** (10 min)

```bash
# 1.1 - Atualizar sistema
sudo apt update && sudo apt upgrade -y

# 1.2 - Instalar dependências
sudo apt install -y curl git

# 1.3 - Executar setup automático
sudo bash <(curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/setup-server.sh)
```

---

### **PASSO 2: Clonar e Configurar** (5 min)

```bash
# 2.1 - Clonar repositório
cd /var/www
sudo git clone https://github.com/junielsonfarias/sispat.git
cd sispat

# 2.2 - Configurar permissões
sudo chown -R www-data:www-data /var/www/sispat

# 2.3 - Configurar frontend
cp env.production .env
sudo nano .env
# Alterar: VITE_API_URL=https://api.SEUDOMINIO.com

# 2.4 - Configurar backend
cp backend/env.production backend/.env
sudo nano backend/.env
# Alterar:
# - DATABASE_URL com senha do banco
# - FRONTEND_URL=https://SEUDOMINIO.com
# - JWT_SECRET (usar valor gerado)
```

---

### **PASSO 3: Build e Deploy** (10 min)

```bash
# 3.1 - Instalar dependências do frontend
pnpm install --frozen-lockfile

# 3.2 - Build do frontend
pnpm run build:prod

# 3.3 - Instalar dependências do backend
cd backend
npm install --production

# 3.4 - Build do backend
npm run build

# 3.5 - Executar migrações
npm run prisma:migrate:prod

# 3.6 - Popular banco (criar usuários e dados iniciais)
npm run prisma:seed
```

---

### **PASSO 4: Configurar Nginx e SSL** (3 min)

```bash
# 4.1 - Copiar configuração Nginx
sudo cp nginx/conf.d/sispat.conf /etc/nginx/sites-available/sispat
sudo ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 4.2 - Editar configuração (substituir SEUDOMINIO)
sudo nano /etc/nginx/sites-available/sispat
# Substituir: sispat.seudominio.com → sispat.SEUDOMINIO.com

# 4.3 - Testar configuração
sudo nginx -t

# 4.4 - Obter certificado SSL
sudo certbot --nginx -d sispat.SEUDOMINIO.com -d api.sispat.SEUDOMINIO.com
```

---

### **PASSO 5: Iniciar Sistema** (2 min)

```bash
# 5.1 - Iniciar backend com PM2
cd /var/www/sispat/backend
pm2 start dist/index.js --name sispat-backend
pm2 save
pm2 startup

# 5.2 - Reiniciar Nginx
sudo systemctl restart nginx

# 5.3 - Verificar status
pm2 status
sudo systemctl status nginx

# 5.4 - Testar health check
curl https://api.sispat.SEUDOMINIO.com/health
```

---

## ✅ **VERIFICAÇÃO FINAL**

### **Checklist Pós-Deploy:**

```bash
# 1. Backend rodando?
curl https://api.sispat.SEUDOMINIO.com/health
# Deve retornar: {"status":"healthy",...}

# 2. Frontend acessível?
curl -I https://sispat.SEUDOMINIO.com
# Deve retornar: HTTP/2 200

# 3. Banco de dados populado?
cd /var/www/sispat/backend
npm run prisma:studio
# Verificar se há usuários na tabela 'users'

# 4. Login funciona?
# Acessar: https://sispat.SEUDOMINIO.com/login
# Email: admin@ssbv.com
# Senha: password123
```

---

## 🔐 **CREDENCIAIS DE ACESSO**

### **Após Deploy Bem-Sucedido:**

```
🌐 URL: https://sispat.SEUDOMINIO.com/login

👤 Email: admin@ssbv.com
🔑 Senha: password123
```

**Outros usuários disponíveis:**
- `junielsonfarias@gmail.com` (Superuser) - Senha: `Tiko6273@`
- `supervisor@ssbv.com` (Supervisor) - Senha: `password123`
- `usuario@ssbv.com` (Usuário) - Senha: `password123`
- `visualizador@ssbv.com` (Visualizador) - Senha: `password123`

---

## 🐛 **TROUBLESHOOTING RÁPIDO**

### **Problema 1: Backend não inicia**
```bash
# Ver logs
pm2 logs sispat-backend

# Reiniciar
pm2 restart sispat-backend

# Verificar banco
psql -U sispat_user -d sispat_prod -c "SELECT 1"
```

### **Problema 2: Nginx erro 502**
```bash
# Verificar se backend está rodando
pm2 status

# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Reiniciar Nginx
sudo systemctl restart nginx
```

### **Problema 3: SSL não funciona**
```bash
# Verificar certificado
sudo certbot certificates

# Renovar
sudo certbot renew --dry-run

# Reiniciar Nginx
sudo systemctl restart nginx
```

### **Problema 4: Login não funciona**
```bash
# Verificar usuários no banco
cd /var/www/sispat/backend
npm run prisma:studio

# Recriar usuários
npm run prisma:seed

# Testar API diretamente
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ssbv.com","password":"password123"}'
```

---

## 📊 **COMANDOS ÚTEIS**

### **Gerenciamento do Sistema**
```bash
# Status de tudo
pm2 status
sudo systemctl status nginx postgresql

# Logs em tempo real
pm2 logs sispat-backend --lines 50
sudo tail -f /var/log/nginx/access.log

# Reiniciar tudo
pm2 restart sispat-backend
sudo systemctl restart nginx postgresql

# Parar tudo
pm2 stop sispat-backend
sudo systemctl stop nginx
```

### **Backup**
```bash
# Backup manual
cd /var/www/sispat
./scripts/backup.sh

# Restaurar backup
./scripts/backup.sh restore db 20250108_120000
```

### **Monitoramento**
```bash
# Verificar saúde
cd /var/www/sispat
./scripts/monitor.sh

# Relatório completo
./scripts/monitor.sh --report
```

---

## 🚀 **DEPLOY ALTERNATIVO COM DOCKER**

### **Se preferir usar Docker:**

```bash
# 1. Clonar repositório
git clone https://github.com/junielsonfarias/sispat.git
cd sispat

# 2. Configurar variáveis
nano docker-compose.prod.yml
# Alterar: DB_PASSWORD, JWT_SECRET, FRONTEND_URL

# 3. Deploy completo
./scripts/deploy.sh

# 4. Verificar status
docker-compose -f docker-compose.prod.yml ps

# 5. Ver logs
docker-compose -f docker-compose.prod.yml logs -f sispat
```

---

## 📞 **SUPORTE**

### **Logs Importantes:**
- Backend: `pm2 logs sispat-backend`
- Nginx: `/var/log/nginx/error.log`
- PostgreSQL: `/var/log/postgresql/postgresql-15-main.log`
- Sistema: `sudo journalctl -xe`

### **Health Checks:**
- Backend: `https://api.SEUDOMINIO.com/health`
- Frontend: `https://SEUDOMINIO.com`
- Banco: `pg_isready -h localhost -U sispat_user`

---

## ✅ **CONCLUSÃO**

Após seguir estes passos, você terá:

- ✅ SISPAT 2.0 rodando em produção
- ✅ SSL/HTTPS configurado
- ✅ Banco de dados populado
- ✅ Usuários criados e funcionais
- ✅ Nginx como proxy reverso
- ✅ Sistema pronto para uso

**🎉 Sistema pronto para acesso em:** `https://sispat.SEUDOMINIO.com`

---

**⏱️ Tempo total:** ~30 minutos  
**📦 Versão:** SISPAT 2.0.0  
**🔗 Repositório:** https://github.com/junielsonfarias/sispat
