# 🔧 Corrigir Backend Offline (ERR_CONNECTION_REFUSED)

## 📋 Problema

Após corrigir o erro de regclass, o frontend ainda mostra `ERR_CONNECTION_REFUSED` ao tentar acessar:
- `POST /api/auth/login`
- `GET /api/customization/public`

---

## 🔍 DIAGNÓSTICO RÁPIDO

Execute no servidor:

```bash
# 1. Verificar se backend está rodando
pm2 status

# 2. Verificar se porta 3000 está em uso
netstat -tlnp | grep :3000
# ou
ss -tlnp | grep :3000

# 3. Testar backend localmente
curl http://localhost:3000/api/health

# 4. Verificar logs do PM2
pm2 logs sispat-backend --lines 30 --nostream | tail -30

# 5. Verificar se Nginx está rodando
systemctl status nginx --no-pager | head -5

# 6. Testar proxy do Nginx
curl http://localhost/api/health
```

---

## 🛠️ SOLUÇÕES

### **Solução 1: Verificar se Backend Está Escutando Corretamente**

O backend precisa escutar em `0.0.0.0` (todas as interfaces) ou `127.0.0.1` para o Nginx conseguir fazer proxy.

**Execute:**

```bash
cd /var/www/sispat/backend

# Verificar se código compilado escuta em 0.0.0.0
grep -n "listen\|httpServer.listen" dist/index.js | head -5

# Se não estiver escutando em 0.0.0.0, atualizar código e recompilar
# (Correção já aplicada no repositório)
```

---

### **Solução 2: Atualizar Código e Recompilar**

```bash
cd /var/www/sispat/backend

# Atualizar código
git pull origin main || {
    # Se git pull falhar, aplicar correção manualmente
    sed -i 's/httpServer.listen(PORT,/httpServer.listen(PORT, "0.0.0.0",/g' src/index.ts
}

# Recompilar
rm -rf dist
npm run build:prod

# Reiniciar
pm2 restart sispat-backend
```

---

### **Solução 3: Verificar e Corrigir Variável HOST**

```bash
cd /var/www/sispat/backend

# Verificar .env
grep -E "HOST|PORT" .env || echo "HOST e PORT não definidos"

# Adicionar HOST ao .env se necessário
if ! grep -q "^HOST=" .env; then
    echo "HOST=0.0.0.0" >> .env
fi

# Reiniciar
pm2 restart sispat-backend
```

---

### **Solução 4: Verificar Configuração do Nginx**

```bash
# Verificar configuração
cat /etc/nginx/sites-available/sispat | grep -A 10 "location /api"

# Deve mostrar:
# location /api {
#     proxy_pass http://localhost:3000;
#     ...
# }

# Testar configuração
nginx -t

# Recarregar se necessário
systemctl reload nginx
```

---

### **Solução 5: Verificar Firewall**

```bash
# Verificar se firewall está bloqueando
ufw status

# Porta 3000 não precisa estar aberta externamente
# Apenas o Nginx precisa acessar localhost:3000
```

---

## 🔄 SOLUÇÃO COMPLETA (Copiar e Colar)

```bash
cd /var/www/sispat/backend

# 1. Verificar status atual
echo "Status atual:"
pm2 status | grep sispat-backend
netstat -tlnp | grep :3000 || echo "Porta 3000 não está em uso!"

# 2. Testar backend localmente
echo ""
echo "Testando backend localmente:"
curl -s http://localhost:3000/api/health || echo "Backend não responde!"

# 3. Verificar logs
echo ""
echo "Últimos logs:"
pm2 logs sispat-backend --lines 20 --nostream | tail -20

# 4. Aplicar correção se necessário
echo ""
echo "Aplicando correção..."
if ! grep -q 'listen(PORT, "0.0.0.0"' src/index.ts 2>/dev/null; then
    echo "Corrigindo código fonte..."
    sed -i 's/httpServer.listen(PORT,/httpServer.listen(PORT, "0.0.0.0",/g' src/index.ts
fi

# 5. Garantir HOST no .env
if ! grep -q "^HOST=" .env 2>/dev/null; then
    echo "HOST=0.0.0.0" >> .env
fi

# 6. Recompilar
echo ""
echo "Recompilando..."
rm -rf dist
npm run build:prod

# 7. Reiniciar
echo ""
echo "Reiniciando..."
pm2 restart sispat-backend
sleep 5

# 8. Verificar novamente
echo ""
echo "Verificando após reinício:"
pm2 status | grep sispat-backend
netstat -tlnp | grep :3000
curl -s http://localhost:3000/api/health && echo "✅ Backend respondendo!" || echo "❌ Backend ainda não responde"
```

---

## 📊 CHECKLIST

- [ ] PM2 mostra `status: online`
- [ ] Porta 3000 está em uso (`netstat -tlnp | grep :3000`)
- [ ] Backend responde localmente (`curl http://localhost:3000/api/health`)
- [ ] Backend está escutando em `0.0.0.0` ou `127.0.0.1`
- [ ] Nginx está rodando (`systemctl status nginx`)
- [ ] Nginx consegue fazer proxy (`curl http://localhost/api/health`)
- [ ] Configuração do Nginx está correta (`nginx -t`)

---

## 🆘 SE NADA FUNCIONAR

Execute o script de diagnóstico completo:

```bash
bash DIAGNOSTICO_BACKEND_OFFLINE.sh
```

E compartilhe a saída completa.

---

**Data**: 2025-11-03

