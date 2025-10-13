# 🔧 CORREÇÃO RÁPIDA - DEPLOY VPS

**Data:** 09/10/2025  
**Erro:** Git ownership + Backend não conecta

---

## 🚨 PROBLEMAS ENCONTRADOS

### **1. Git Ownership Error**
```
fatal: detected dubious ownership in repository at '/var/www/sispat'
```

**Causa:** Git detectou que o proprietário do repositório mudou.

---

### **2. Backend Não Conecta**
```
curl: (7) Failed to connect to localhost port 3000
```

**Causa:** Backend pode estar crashando ao iniciar.

---

## ✅ SOLUÇÃO COMPLETA

Execute os comandos abaixo **em ordem**:

```bash
# 1. ✅ CORRIGIR OWNERSHIP DO GIT
cd /var/www/sispat
git config --global --add safe.directory /var/www/sispat

# 2. ✅ PUXAR ÚLTIMAS ATUALIZAÇÕES
git pull origin main

# 3. ✅ REBUILD BACKEND
cd backend
npm run build

# 4. ✅ VER LOGS DO PM2 (DIAGNOSTICAR ERRO)
pm2 logs sispat-backend --lines 50

# 5. ✅ SE HOUVER ERRO, REINICIAR
pm2 restart sispat-backend

# 6. ✅ AGUARDAR 3 SEGUNDOS
sleep 3

# 7. ✅ TESTAR HEALTH CHECK
curl http://localhost:3000/api/health

# 8. ✅ SE AINDA NÃO FUNCIONAR, VER LOGS DETALHADOS
pm2 logs sispat-backend --err --lines 100
```

---

## 🔍 DIAGNÓSTICO DE ERROS COMUNS

### **Erro 1: Porta já em uso**
```bash
# Matar processos na porta 3000
sudo lsof -ti:3000 | xargs kill -9
pm2 restart sispat-backend
```

### **Erro 2: Variáveis de ambiente**
```bash
# Verificar .env
cd /var/www/sispat/backend
cat .env | grep -E "DATABASE_URL|PORT|JWT_SECRET"

# Se faltar alguma, adicione
nano .env
```

### **Erro 3: Prisma Client desatualizado**
```bash
cd /var/www/sispat/backend
npx prisma generate
npm run build
pm2 restart sispat-backend
```

### **Erro 4: Database não conecta**
```bash
# Testar PostgreSQL
sudo systemctl status postgresql
psql -U sispat -d sispat -c "SELECT 1;"

# Se falhar, reiniciar
sudo systemctl restart postgresql
pm2 restart sispat-backend
```

---

## 📋 COMANDO COMPLETO (COPIAR E COLAR)

```bash
cd /var/www/sispat && \
git config --global --add safe.directory /var/www/sispat && \
git pull origin main && \
cd backend && \
npm run build && \
pm2 restart sispat-backend && \
sleep 3 && \
curl http://localhost:3000/api/health && \
echo "✅ Backend funcionando!" || (echo "❌ Erro! Vendo logs..." && pm2 logs sispat-backend --lines 30)
```

---

## 🎯 RESULTADO ESPERADO

### **✅ Sucesso:**
```json
{
  "status": "ok",
  "uptime": 10,
  "environment": "production",
  "database": "connected",
  "timestamp": "2025-10-09T20:00:00.000Z"
}
```

### **❌ Se falhar:**

Envie para mim:
1. Output do comando `pm2 logs sispat-backend --lines 50`
2. Output do comando `cat /var/www/sispat/backend/.env | grep -v SECRET`

---

## 🔄 ALTERNATIVA: REINSTALAR PM2

Se nada funcionar:

```bash
# 1. Parar e deletar processo
pm2 delete sispat-backend

# 2. Limpar PM2
pm2 flush
pm2 kill

# 3. Recriar processo
cd /var/www/sispat/backend
pm2 start dist/index.js --name sispat-backend --node-args="--max-old-space-size=512"
pm2 save
pm2 startup

# 4. Testar
sleep 3
curl http://localhost:3000/api/health
```

---

## ✅ CHECKLIST

- [ ] Git ownership corrigido
- [ ] Git pull executado
- [ ] Backend compilado
- [ ] PM2 reiniciado
- [ ] Health check retorna OK
- [ ] Frontend acessível no navegador
- [ ] Login funciona
- [ ] Supervisor vê todos os setores
- [ ] Usuário vê apenas seus setores

---

**Execute o comando completo acima e me envie o resultado! 🚀**

