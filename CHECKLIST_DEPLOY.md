# ✅ Checklist de Deploy - SISPAT 2.0

**Data:** 2025-11-05  
**Versão:** 2.0.0

---

## 📋 Pré-Deploy

### Configuração do Servidor
- [ ] Servidor Linux configurado (Ubuntu 20.04+)
- [ ] Node.js 20+ instalado
- [ ] PostgreSQL 15+ instalado
- [ ] Nginx instalado
- [ ] PM2 instalado
- [ ] Certificado SSL configurado

### Variáveis de Ambiente - Backend
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` configurado com SSL
- [ ] `JWT_SECRET` forte (64+ caracteres)
- [ ] `FRONTEND_URL` configurado
- [ ] `CORS_ORIGIN` configurado
- [ ] `BCRYPT_ROUNDS=12`
- [ ] Redis configurado (opcional)

### Variáveis de Ambiente - Frontend
- [ ] `VITE_API_URL` configurado
- [ ] `VITE_APP_NAME` configurado
- [ ] `VITE_APP_ENV=production`

### Segurança
- [ ] Senha do banco alterada
- [ ] JWT_SECRET gerado e seguro
- [ ] SSL habilitado no banco
- [ ] Firewall configurado
- [ ] Backups automatizados

---

## 🚀 Deploy

### 1. Preparação
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y nodejs postgresql nginx
sudo npm install -g pm2
```

### 2. Banco de Dados
```bash
# Criar banco
sudo -u postgres psql
CREATE DATABASE sispat_prod;
CREATE USER sispat_user WITH ENCRYPTED PASSWORD 'SENHA_FORTE';
GRANT ALL PRIVILEGES ON DATABASE sispat_prod TO sispat_user;
```

### 3. Aplicação
```bash
# Clonar repositório
cd /var/www
sudo git clone https://github.com/seu-usuario/sispat.git
sudo chown -R sispat:sispat sispat

# Backend
cd sispat/backend
npm ci --production
npx prisma generate
npx prisma migrate deploy
npm run build

# Frontend
cd ../frontend
pnpm install --frozen-lockfile
pnpm run build
```

### 4. PM2
```bash
cd /var/www/sispat/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Nginx
```bash
# Copiar configuração
sudo cp nginx/sispat.conf /etc/nginx/sites-available/sispat
sudo ln -s /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL
```bash
sudo certbot --nginx -d sispat.seudominio.com
```

---

## ✅ Verificação Pós-Deploy

### Backend
```bash
# Health check
curl http://localhost:3000/api/health

# Métricas
curl http://localhost:3000/api/performance/metrics \
  -H "Authorization: Bearer TOKEN"
```

### Frontend
```bash
curl https://sispat.seudominio.com
```

### Logs
```bash
# PM2
pm2 logs sispat-backend

# Nginx
sudo tail -f /var/log/nginx/error.log

# Backend
tail -f /var/www/sispat/backend/logs/app.log
```

---

## 🔧 Comandos Úteis

### Otimizar Banco
```bash
cd backend
npm run optimize:queries  # Analisar
npm run optimize:db       # Otimizar
```

### Reiniciar Serviços
```bash
pm2 restart sispat-backend
sudo systemctl reload nginx
```

### Verificar Status
```bash
pm2 status
pm2 monit
```

---

## 📊 Monitoramento

### Métricas Disponíveis
- `/api/performance/metrics` - Métricas completas
- `/api/performance/slow-queries` - Queries lentas
- `/api/performance/health` - Health check
- `/api/metrics/summary` - Resumo de métricas

### Logs
- `backend/logs/app.log` - Logs da aplicação
- `pm2 logs` - Logs do PM2
- `/var/log/nginx/` - Logs do Nginx

---

## 🚨 Troubleshooting

### Backend não inicia
```bash
pm2 logs sispat-backend
cd backend && npm run build
pm2 restart sispat-backend
```

### Banco não conecta
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
```

### Nginx 502
```bash
sudo nginx -t
pm2 status
curl http://localhost:3000/api/health
```

---

## ✅ Status Final

- [ ] Deploy concluído
- [ ] Testes realizados
- [ ] Métricas funcionando
- [ ] Logs configurados
- [ ] Backup configurado
- [ ] Monitoramento ativo

**Status:** 🟢 **Pronto para Produção**


