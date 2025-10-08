# 🔍 DEBUG - ERRO 500 AO BUSCAR PATRIMÔNIOS

**Erro:** `GET /api/patrimonios 500 (Internal Server Error)`

**Status:** ✅ Login funcionou! Apenas precisa ver o erro no backend.

---

## 📋 **COMANDOS PARA DIAGNOSTICAR**

Execute no servidor VPS:

```bash
# 1. Ver logs do PM2 em tempo real
pm2 logs sispat-backend --lines 50

# Procure por erro próximo ao horário do erro 500
# Deve mostrar algo como:
# "Error: ..."
# "Cannot read property..."
# "Prisma error..."
```

---

## 🔍 **POSSÍVEIS CAUSAS**

### **Causa 1: JWT_SECRET não configurado no .env**

Se você viu erro como:
```
🔴 ERRO CRÍTICO: JWT_SECRET não configurado!
```

**Solução:**
```bash
cd /var/www/sispat/backend

# Verificar se .env existe e tem JWT_SECRET
cat .env | grep JWT_SECRET

# Se não tiver ou estiver vazio, adicionar:
echo 'JWT_SECRET="89ab11b9ffc8d1e5416de675cd8f2997811d0a3c7989c8bb863b64f48f8d67b8608f8fb137a27ed860c229384e0ca724bbf8e2ade2f75ca17c8dec12cb6bf7ea"' >> .env

# Reiniciar
pm2 restart sispat-backend
pm2 logs sispat-backend
```

---

### **Causa 2: Prisma Client não gerado**

Se você viu erro como:
```
Error: Cannot find module '@prisma/client'
```

**Solução:**
```bash
cd /var/www/sispat/backend

# Gerar Prisma Client
npx prisma generate

# Reiniciar
pm2 restart sispat-backend
```

---

### **Causa 3: Erro de permissão no banco**

Se você viu erro como:
```
Error: permission denied for table patrimonios
```

**Solução:**
```bash
# Dar permissões ao usuário do banco
sudo -u postgres psql -d sispat_prod << EOF
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sispat_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sispat_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO sispat_user;
EOF

# Reiniciar
pm2 restart sispat-backend
```

---

### **Causa 4: Variável de ambiente do backend**

**Solução:**
```bash
cd /var/www/sispat/backend

# Ver o .env completo
cat .env

# Deve ter todas essas variáveis:
# NODE_ENV=production
# PORT=3000
# DATABASE_URL=postgresql://...
# JWT_SECRET=...
# FRONTEND_URL=http://sispat.vps-kinghost.net
# BCRYPT_ROUNDS=12
```

Se faltar alguma, o script de instalação deve ter criado. Verifique se o arquivo existe.

---

## 🔧 **SOLUÇÃO RÁPIDA (PROVAVELMENTE É O JWT_SECRET)**

Execute:

```bash
cd /var/www/sispat/backend

# Adicionar JWT_SECRET ao .env
cat >> .env << 'EOF'

# JWT Secret (gerado)
JWT_SECRET="89ab11b9ffc8d1e5416de675cd8f2997811d0a3c7989c8bb863b64f48f8d67b8608f8fb137a27ed860c229384e0ca724bbf8e2ade2f75ca17c8dec12cb6bf7ea"
EOF

# Reiniciar
pm2 restart sispat-backend

# Ver logs
pm2 logs sispat-backend --lines 20

# Aguardar 5 segundos
sleep 5

# Testar API
curl http://sispat.vps-kinghost.net/api/health

# Testar patrimônios
curl -H "Authorization: Bearer SEU_TOKEN_AQUI" http://sispat.vps-kinghost.net/api/patrimonios
```

---

## 📝 **COPIE E COLE O LOG DO PM2**

Execute e me envie o resultado:

```bash
pm2 logs sispat-backend --lines 100 --nostream
```

---

**🚀 Execute os comandos acima e me envie o log para eu ajudar!**
