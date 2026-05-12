# 🔧 CORREÇÃO DO install.sh - Instalação Travando

**Problema:** `pnpm install --frozen-lockfile` travando sem erro  
**Causa:** Flag `--frozen-lockfile` pode causar problemas em alguns servidores

---

## ✅ SOLUÇÃO RÁPIDA (Execute no Servidor)

### **Opção 1: Usar npm em vez de pnpm**

```bash
# No servidor, editar install.sh
cd /var/www/sispat
nano install.sh

# Procurar linha 924 (Ctrl+W, digite "pnpm install")
# Substituir:
pnpm install --frozen-lockfile > /tmp/build-frontend-deps.log 2>&1 &

# Por:
npm install --legacy-peer-deps > /tmp/build-frontend-deps.log 2>&1 &

# Salvar: Ctrl+X, Y, Enter

# Executar novamente
./install.sh
```

---

### **Opção 2: Remover --frozen-lockfile**

```bash
# Editar install.sh
nano install.sh

# Linha 924, mudar:
pnpm install --frozen-lockfile

# Para:
pnpm install --no-frozen-lockfile

# Salvar e executar
./install.sh
```

---

### **Opção 3: Instalação Manual Definitiva**

Esqueça o install.sh e faça manual:

```bash
#!/bin/bash

# ============================================
# INSTALAÇÃO MANUAL DEFINITIVA - SISPAT 2.0
# ============================================

# 1. Limpar tudo
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
rm -rf /var/www/sispat

# 2. Clonar
cd /var/www
git clone https://github.com/junielsonfarias/sispat.git
cd sispat

# 3. Configurar .env do frontend
cat > .env <<EOF
VITE_API_URL=http://localhost:3000/api
VITE_USE_BACKEND=true
VITE_ENV=production
EOF

# 4. Instalar e compilar FRONTEND
echo "Instalando dependências do frontend (5 min)..."
npm install --legacy-peer-deps

echo "Compilando frontend (10 min)..."
npm run build

# 5. Configurar backend
cd backend

# Configurar .env do backend
cat > .env <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://sispat_user:SENHA_AQUI@localhost:5432/sispat_prod
JWT_SECRET=$(openssl rand -hex 64)
FRONTEND_URL=http://localhost:8080
BCRYPT_ROUNDS=12
SUPERUSER_EMAIL=admin@sistema.com
SUPERUSER_PASSWORD=Admin@123
SUPERUSER_NAME=Administrador
MUNICIPALITY_NAME=Prefeitura Municipal
STATE=PA
EOF

# 6. Instalar e compilar BACKEND
echo "Instalando dependências do backend (3 min)..."
npm install

echo "Compilando backend (2 min)..."
npm run build

# 7. PostgreSQL via Docker
cd ..
docker-compose up -d postgres
sleep 10

# 8. Configurar banco
cd backend
npm exec prisma generate
npm exec prisma migrate deploy
npm run prisma:seed

# 9. PM2
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo "✅ INSTALAÇÃO MANUAL CONCLUÍDA!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Configurar Nginx (ver GUIA_DEPLOY_PRODUCAO.md)"
echo "2. Configurar SSL: sudo certbot --nginx -d seu-dominio.com"
echo "3. Testar: curl http://localhost:3000/api/health"
```

---

## 💡 RECOMENDAÇÃO

### **Use a Opção 3 (Instalação Manual)**

Copie o script acima e salve como `install-manual.sh`:

```bash
# No servidor
cd /var/www/sispat
nano install-manual.sh
# Cole o script acima
# Salve: Ctrl+X, Y, Enter

# Dar permissão e executar
chmod +x install-manual.sh
./install-manual.sh
```

**OU execute linha por linha copiando do script acima.**

---

## 🎯 ALTERNATIVA: Build Local

Se continuar travando, faça o build no Windows:

### **No Windows:**

```powershell
cd "d:\novo ambiente\sispat - Copia"

# Instalar e compilar tudo
pnpm install
pnpm build
cd backend
pnpm install
pnpm build
cd ..

# Criar pacote
tar -czf sispat-completo.tar.gz dist backend/dist backend/node_modules node_modules
```

### **Transferir para servidor:**

Use WinSCP/FileZilla e envie `sispat-completo.tar.gz` para `/tmp/`

### **No servidor:**

```bash
cd /var/www/sispat
tar -xzf /tmp/sispat-completo.tar.gz

# Configurar e iniciar
cd backend
# Configurar .env (ver acima)
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm run prisma:seed
pm2 start ecosystem.config.js --env production
```

---

**Qual opção você prefere tentar?**

1. ⚡ Instalação Manual (script acima)
2. 💻 Build Local + Transfer
3. 🔧 Editar install.sh para usar npm

**Me avise e eu te guio! 🚀**

