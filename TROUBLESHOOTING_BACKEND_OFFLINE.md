# 🔧 Troubleshooting: Backend Offline (ERR_CONNECTION_REFUSED)

## 📋 Problema

Após a instalação, o frontend mostra erros `ERR_CONNECTION_REFUSED` ao tentar acessar:
- `POST /api/auth/login`
- `GET /api/customization/public`

Isso indica que o **backend não está rodando** ou **não está acessível**.

---

## 🔍 DIAGNÓSTICO PASSO A PASSO

### **1. Verificar Status do PM2**

```bash
pm2 status
```

**Resultado esperado:**
```
┌─────┬──────────────────┬─────────┬─────────┬──────────┬─────────┐
│ id  │ name             │ mode    │ ↺       │ status   │ cpu     │
├─────┼──────────────────┼─────────┼─────────┼──────────┼─────────┤
│ 0   │ sispat-backend   │ cluster │ 0       │ online   │ 0%      │
└─────┴──────────────────┴─────────┴─────────┴──────────┴─────────┘
```

**Se aparecer `errored` ou `stopped`:**
```bash
# Ver logs para identificar o erro
pm2 logs sispat-backend --lines 50
```

---

### **2. Verificar Logs do Backend**

```bash
cd /var/www/sispat/backend
pm2 logs sispat-backend --lines 100
```

**Procure por:**
- ✅ `Server running on port 3000` → Backend iniciou corretamente
- ❌ `Error: Cannot find module` → Dependências faltando
- ❌ `Error: connect ECONNREFUSED` → Banco de dados não acessível
- ❌ `EADDRINUSE` → Porta 3000 já em uso

---

### **3. Verificar se Backend Está Escutando na Porta 3000**

```bash
# Verificar se porta 3000 está em uso
netstat -tlnp | grep :3000
# ou
ss -tlnp | grep :3000
```

**Resultado esperado:**
```
tcp  0  0  127.0.0.1:3000  0.0.0.0:*  LISTEN  12345/node
```

**Se não aparecer nada:** O backend não está rodando.

---

### **4. Testar Backend Localmente**

```bash
# Testar se backend responde localmente
curl http://localhost:3000/api/health
```

**Resultado esperado:**
```json
{"status":"ok","timestamp":"2025-11-03T..."}
```

**Se retornar erro de conexão:** Backend não está rodando.

---

### **5. Verificar Configuração do Nginx**

```bash
# Verificar configuração
cat /etc/nginx/sites-available/sispat | grep -A 10 "location /api"
```

**Deve conter:**
```nginx
location /api {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    ...
}
```

---

### **6. Verificar Status do Nginx**

```bash
systemctl status nginx
```

**Deve mostrar:** `active (running)`

---

## 🛠️ SOLUÇÕES

### **Solução 1: Reiniciar Backend com PM2**

```bash
cd /var/www/sispat/backend

# Parar processo atual
pm2 delete sispat-backend

# Verificar se dist/index.js existe
ls -la dist/index.js

# Iniciar novamente
pm2 start ecosystem.config.js --env production

# Verificar status
pm2 status

# Ver logs
pm2 logs sispat-backend --lines 50
```

---

### **Solução 2: Verificar e Corrigir Variáveis de Ambiente**

```bash
cd /var/www/sispat/backend

# Verificar arquivo .env
cat .env | grep -E "DATABASE_URL|JWT_SECRET|PORT|NODE_ENV"

# Verificar se DATABASE_URL está correto
# Deve ser algo como: postgresql://sispat_user:senha@localhost:5432/sispat_prod
```

**Se DATABASE_URL estiver incorreto:**
```bash
# Editar .env
nano .env

# Corrigir DATABASE_URL com as credenciais corretas
```

---

### **Solução 3: Verificar Conexão com Banco de Dados**

```bash
# Testar conexão PostgreSQL
sudo -u postgres psql -c "\l" | grep sispat

# Se banco não existir, criar:
sudo -u postgres psql <<EOF
CREATE USER sispat_user WITH PASSWORD 'sua_senha_aqui';
CREATE DATABASE sispat_prod OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_prod TO sispat_user;
EOF
```

---

### **Solução 4: Reinstalar Dependências do Backend**

```bash
cd /var/www/sispat/backend

# Limpar node_modules
rm -rf node_modules package-lock.json

# Reinstalar dependências
npm install

# Recompilar
npm run build:prod

# Reiniciar PM2
pm2 delete sispat-backend
pm2 start ecosystem.config.js --env production
```

---

### **Solução 5: Verificar Permissões**

```bash
# Verificar permissões dos arquivos
ls -la /var/www/sispat/backend/dist/index.js

# Deve ser executável
chmod +x /var/www/sispat/backend/dist/index.js

# Verificar permissões do diretório
ls -ld /var/www/sispat/backend
```

---

### **Solução 6: Iniciar Backend Manualmente para Debug**

```bash
cd /var/www/sispat/backend

# Parar PM2
pm2 delete sispat-backend

# Iniciar manualmente para ver erros
NODE_ENV=production node dist/index.js
```

**Observe os erros que aparecem** e corrija conforme necessário.

---

### **Solução 7: Verificar Firewall**

```bash
# Verificar se firewall está bloqueando porta 3000
sudo ufw status

# Se necessário, permitir porta 3000 (apenas localhost)
# A porta 3000 não precisa estar aberta externamente,
# apenas o Nginx precisa acessar localhost:3000
```

---

## 🔄 COMANDOS RÁPIDOS DE RECUPERAÇÃO

### **Reiniciar Tudo:**

```bash
# 1. Parar PM2
pm2 delete sispat-backend

# 2. Verificar build
cd /var/www/sispat/backend
ls -la dist/index.js

# 3. Iniciar PM2
pm2 start ecosystem.config.js --env production
pm2 save

# 4. Verificar status
pm2 status
pm2 logs sispat-backend --lines 20

# 5. Testar localmente
curl http://localhost:3000/api/health

# 6. Verificar Nginx
systemctl reload nginx
nginx -t
```

---

## 📊 CHECKLIST DE VERIFICAÇÃO

Marque cada item conforme verificar:

- [ ] PM2 está rodando (`pm2 status` mostra `online`)
- [ ] Backend responde localmente (`curl http://localhost:3000/api/health`)
- [ ] Porta 3000 está em uso (`netstat -tlnp | grep :3000`)
- [ ] Nginx está rodando (`systemctl status nginx`)
- [ ] Nginx está proxyando para `localhost:3000`
- [ ] Arquivo `.env` existe e tem `DATABASE_URL` correto
- [ ] Banco de dados PostgreSQL está acessível
- [ ] Arquivo `dist/index.js` existe e é executável
- [ ] Logs do PM2 não mostram erros críticos

---

## 🆘 SE NADA FUNCIONAR

Execute este script de diagnóstico completo:

```bash
cat > /tmp/diagnostico-backend.sh <<'EOF'
#!/bin/bash
echo "=== DIAGNÓSTICO BACKEND SISPAT ==="
echo ""
echo "1. Status PM2:"
pm2 status
echo ""
echo "2. Logs PM2 (últimas 20 linhas):"
pm2 logs sispat-backend --lines 20 --nostream
echo ""
echo "3. Porta 3000:"
netstat -tlnp | grep :3000 || echo "Porta 3000 não está em uso"
echo ""
echo "4. Teste local:"
curl -s http://localhost:3000/api/health || echo "Backend não responde"
echo ""
echo "5. Arquivo dist/index.js:"
ls -la /var/www/sispat/backend/dist/index.js
echo ""
echo "6. Variáveis de ambiente:"
cd /var/www/sispat/backend
grep -E "DATABASE_URL|PORT|NODE_ENV" .env | head -3
echo ""
echo "7. Status Nginx:"
systemctl status nginx --no-pager | head -5
EOF

chmod +x /tmp/diagnostico-backend.sh
/tmp/diagnostico-backend.sh
```

**Envie a saída deste script** para análise.

---

## 📝 LOGS IMPORTANTES

**Localização dos logs:**
- PM2: `pm2 logs sispat-backend`
- Nginx: `/var/log/nginx/error.log`
- Backend: `/var/www/sispat/backend/logs/pm2/`

---

**Data**: 2025-11-03  
**Versão**: 2.0.0

