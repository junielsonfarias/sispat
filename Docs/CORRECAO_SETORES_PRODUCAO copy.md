# 🔧 CORREÇÃO: Setores não carregam em PRODUÇÃO

**Data:** 09/10/2025  
**Problema:** Em produção, setores não aparecem nos formulários de usuário
**Status:** ✅ Desenvolvimento funciona, ❌ Produção não funciona

---

## 🔍 DIAGNÓSTICO ESPECÍFICO DE PRODUÇÃO

### **Problema identificado:**
- ✅ **Desenvolvimento:** Setores carregam normalmente
- ❌ **Produção:** 3 setores no banco, mas não aparecem no frontend
- ❌ **Campos afetados:** "Setores de Acesso" e "Setor Principal"

---

## 🎯 POSSÍVEIS CAUSAS

### **1. Problema de CORS/API**
- Frontend não consegue acessar `/api/sectors`
- Erro de autenticação em produção

### **2. Problema de Build**
- Frontend compilado sem as dependências corretas
- Cache do navegador

### **3. Problema de Database**
- Conexão com banco diferente entre dev/prod
- Dados não sincronizados

### **4. Problema de Environment**
- Variáveis de ambiente diferentes
- URLs incorretas

---

## 🔧 SOLUÇÕES PARA TESTAR

### **SOLUÇÃO 1: Verificar API em Produção**

```bash
# No servidor de produção
cd /var/www/sispat

# 1. Testar API diretamente
curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/api/sectors

# 2. Verificar logs do backend
pm2 logs sispat-backend --lines 50

# 3. Verificar se backend está rodando
pm2 status
```

### **SOLUÇÃO 2: Verificar Console do Navegador**

1. **Abrir navegador em produção**
2. **F12 → Console**
3. **Ir em Administração → Usuários → Adicionar**
4. **Verificar erros:**

```javascript
// ❌ Erros possíveis:
Failed to fetch /api/sectors
401 Unauthorized
CORS error
Network error

// ✅ Deve aparecer:
🔍 SectorContext: Iniciando busca de setores...
🔍 SectorContext: Resposta da API: [array]
🔍 SectorContext: Setores carregados: 3
```

### **SOLUÇÃO 3: Verificar Network Tab**

1. **F12 → Network**
2. **Filtrar por:** `sectors`
3. **Verificar requisição `GET /api/sectors`:**
   - ✅ Status: 200
   - ❌ Status: 401, 403, 500, etc.

---

## 🚀 CORREÇÕES RÁPIDAS

### **CORREÇÃO 1: Reiniciar Backend**

```bash
# No servidor de produção
cd /var/www/sispat/backend
pm2 restart sispat-backend
sleep 5
curl http://localhost:3000/api/health
```

### **CORREÇÃO 2: Limpar Cache do Navegador**

1. **Ctrl+Shift+R** (hard refresh)
2. **F12 → Application → Storage → Clear All**
3. **Recarregar página**

### **CORREÇÃO 3: Verificar Environment**

```bash
# Verificar variáveis de ambiente
cd /var/www/sispat/backend
cat .env | grep -E "DATABASE_URL|NODE_ENV|PORT"
```

### **CORREÇÃO 4: Rebuild Frontend**

```bash
# No servidor de produção
cd /var/www/sispat
npm run build
sudo systemctl reload nginx
```

---

## 🔍 DIAGNÓSTICO DETALHADO

### **Script de Diagnóstico Completo**

```bash
#!/bin/bash
echo "🔍 DIAGNÓSTICO SISPAT PRODUÇÃO"
echo "================================"

# 1. Verificar backend
echo "1. Backend Status:"
pm2 status sispat-backend

# 2. Verificar API
echo -e "\n2. Testando API:"
curl -s http://localhost:3000/api/health | head -1

# 3. Verificar banco
echo -e "\n3. Setores no banco:"
cd /var/www/sispat/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.sector.findMany().then(sectors => {
  console.log('Total setores:', sectors.length);
  sectors.forEach(s => console.log('- ' + s.name));
  prisma.\$disconnect();
});
"

# 4. Verificar logs
echo -e "\n4. Últimos logs do backend:"
pm2 logs sispat-backend --lines 10 --nostream

# 5. Verificar nginx
echo -e "\n5. Nginx status:"
sudo systemctl status nginx --no-pager -l

# 6. Verificar frontend
echo -e "\n6. Frontend build:"
ls -la /var/www/sispat/dist/ | head -3

echo -e "\n✅ Diagnóstico completo!"
```

---

## 🎯 TESTES ESPECÍFICOS

### **Teste 1: API Direta**

```bash
# Testar API sem autenticação (deve falhar)
curl http://localhost:3000/api/sectors

# Testar com token (se tiver)
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/sectors
```

### **Teste 2: Frontend Build**

```bash
# Verificar se frontend foi compilado corretamente
cd /var/www/sispat
ls -la dist/
cat dist/index.html | grep -i "script"
```

### **Teste 3: Database Connection**

```bash
# Verificar conexão com banco
cd /var/www/sispat/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect().then(() => {
  console.log('✅ Database conectado');
  return prisma.sector.count();
}).then(count => {
  console.log('Setores no banco:', count);
  prisma.\$disconnect();
}).catch(err => {
  console.error('❌ Erro:', err.message);
});
"
```

---

## 🚨 CORREÇÕES URGENTES

### **Se API retorna 401/403:**

```bash
# Verificar autenticação
cd /var/www/sispat/backend
grep -r "JWT_SECRET" .env
grep -r "NODE_ENV" .env
```

### **Se API retorna 500:**

```bash
# Ver logs detalhados
pm2 logs sispat-backend --err --lines 100
```

### **Se Frontend não carrega:**

```bash
# Rebuild completo
cd /var/www/sispat
npm run build
sudo systemctl restart nginx
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

- [ ] Backend rodando (pm2 status)
- [ ] API health check OK (curl localhost:3000/api/health)
- [ ] Banco conectado (setores no banco)
- [ ] Frontend compilado (dist/ existe)
- [ ] Nginx funcionando (systemctl status)
- [ ] Console navegador sem erros
- [ ] Network tab mostra requisições 200
- [ ] Token de autenticação válido

---

## 🎯 PRÓXIMOS PASSOS

1. **Execute o diagnóstico completo acima**
2. **Me envie o resultado do console do navegador (F12)**
3. **Me envie o resultado do Network tab**
4. **Me envie os logs do backend:** `pm2 logs sispat-backend --lines 50`

---

**Com essas informações, posso identificar exatamente o problema! 🔍**
