# 🚀 GUIA COMPLETO DE DEPLOY - SISPAT 2.0

## 📋 ÍNDICE

1. [Deploy para VPS](#deploy-para-vps)
2. [Deploy Local](#deploy-local)
3. [Deploy com Docker](#deploy-com-docker)
4. [Verificação Pós-Deploy](#verificação)

---

## 🌐 DEPLOY PARA VPS

### **Opção 1: Instalação Automática (Recomendado)**

```bash
# 1. Conectar ao servidor
ssh root@seu-ip-vps

# 2. Executar instalação automática
bash <(curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh)

# O script irá perguntar:
# - Domínio (ex: sispat.prefeitura.com.br)
# - Email do superusuário
# - Senha do superusuário
# - Nome completo do superusuário
# - Email do supervisor
# - Senha do supervisor
# - Nome completo do supervisor
# - Senha do PostgreSQL
```

**Tempo:** ~30-40 minutos  
**Dificuldade:** Fácil (automatizado)

### **Opção 2: Instalação Manual**

Consulte: `INSTALACAO_PRODUCAO.md` ou `DEPLOY_VPS.md`

---

## 💻 DEPLOY LOCAL (Windows)

### **Pré-requisitos:**
- Node.js 20+ 
- PostgreSQL instalado
- pnpm instalado

### **Passos:**

```bash
# 1. Clonar repositório
git clone https://github.com/junielsonfarias/sispat.git
cd sispat

# 2. Configurar Backend
cd backend
copy env.production .env
# Editar .env: DATABASE_URL, JWT_SECRET, etc.
npm install
npm run build
npx prisma migrate dev
npm run prisma:seed

# 3. Iniciar Backend
npm run dev

# 4. Configurar Frontend (novo terminal)
cd ..
copy env.production .env
# Editar .env: VITE_API_URL=http://localhost:3000/api
pnpm install
pnpm run dev
```

**Acesse:** http://localhost:5173

---

## 🐳 DEPLOY COM DOCKER

### **Configuração:**

```bash
# 1. Copiar e editar docker-compose.prod.yml
nano docker-compose.prod.yml

# 2. Build das imagens
docker-compose -f docker-compose.prod.yml build

# 3. Iniciar serviços
docker-compose -f docker-compose.prod.yml up -d

# 4. Ver logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## ✅ VERIFICAÇÃO PÓS-DEPLOY

### **Checklist:**

```bash
# 1. Backend respondendo?
curl https://seu-dominio.com/api/health

# 2. Frontend carregando?
curl -I https://seu-dominio.com

# 3. Login funcionando?
# Acesse: https://seu-dominio.com/login
# Email: admin@ssbv.com
# Senha: password123

# 4. PM2 rodando?
pm2 status

# 5. Nginx rodando?
systemctl status nginx

# 6. Banco de dados?
psql -U sispat_user -d sispat_prod -c "SELECT COUNT(*) FROM users;"

# 7. Logs sem erros?
pm2 logs sispat-backend --lines 50
```

---

## 🔐 CREDENCIAIS PADRÃO

### **Após Instalação:**

**Superuser:**
- Email: Email configurado durante instalação
- Senha: Senha configurada durante instalação

**Supervisor:**
- Email: Email configurado durante instalação
- Senha: Senha configurada durante instalação

**⚠️ IMPORTANTE:** Alterar senhas após primeiro login!

---

## 📚 DOCUMENTAÇÃO COMPLETA

- **Guia Detalhado:** `Docs/GUIA_DEPLOY_PRODUCAO.md`
- **Deploy Rápido:** `Docs/GUIA_RAPIDO_DEPLOY.md`
- **Instalação VPS:** `DEPLOY_VPS.md` ou `INSTALACAO_PRODUCAO.md`
- **Troubleshooting:** `Docs/TROUBLESHOOTING_INSTALACAO.md`
- **Análise Completa:** `Docs/RELATORIO_PREPARACAO_PRODUCAO.md`

---

## 🆘 TROUBLESHOOTING

### **Problema: Backend não inicia**
```bash
pm2 logs sispat-backend --lines 100
npm run build
pm2 restart sispat-backend
```

### **Problema: 502 Bad Gateway**
```bash
pm2 status
systemctl restart nginx
curl http://localhost:3000/api/health
```

### **Problema: Login não funciona**
```bash
npm run prisma:seed
psql -U sispat_user -d sispat_prod -c "SELECT email, role FROM users;"
```

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Fazer backup automático
2. ✅ Configurar monitoramento (PM2, UptimeRobot)
3. ✅ Configurar alertas (email, Slack)
4. ✅ Treinar equipe
5. ✅ Documentar procedimentos

---

**✅ Sistema pronto para produção!**

