# 🔧 CORREÇÃO: Setores não salvam no banco de dados

**Data:** 09/10/2025  
**Problema:** Usuário criou 3 setores via interface, mas banco só tem 1 setor
**Causa:** Setores não estão sendo salvos corretamente

---

## 🔍 DIAGNÓSTICO REALIZADO

### **✅ Backend funcionando:**
- API `/api/health` OK
- API `/api/sectors` protegida (401 sem token)
- Banco conectado
- Environment correto

### **❌ Problema identificado:**
- **Usuário criou 3 setores via interface**
- **Banco só tem 1 setor:** "Secretaria de Administração e Finanças"
- **2 setores "desapareceram"**

---

## 🎯 POSSÍVEIS CAUSAS

### **1. Erro na criação de setores**
- Frontend envia dados, mas backend falha ao salvar
- Erro silencioso não mostrado ao usuário

### **2. Problema de permissão**
- Usuário não tem permissão para criar setores
- API retorna erro, mas frontend não mostra

### **3. Problema de transação**
- Setores são criados mas não commitados
- Rollback automático

### **4. Problema de autenticação**
- Token expirado durante criação
- Requisições falhando

---

## 🔧 CORREÇÕES PARA TESTAR

### **CORREÇÃO 1: Verificar logs do backend**

```bash
# Ver logs detalhados do backend
cd /var/www/sispat
pm2 logs sispat-backend --lines 100

# Procurar por:
# - CREATE_SECTOR
# - Erro ao criar setor
# - 500 Internal Server Error
# - Validation errors
```

### **CORREÇÃO 2: Testar criação via curl**

```bash
# 1. Fazer login e obter token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sistema.com","password":"sua_senha"}'

# 2. Usar token para criar setor
curl -X POST http://localhost:3000/api/sectors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "name": "Secretaria de Educação",
    "codigo": "EDU",
    "description": "Responsável pela educação"
  }'
```

### **CORREÇÃO 3: Verificar permissões do usuário**

```bash
# Verificar se usuário tem permissão para criar setores
cd /var/www/sispat/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({
  select: { name: true, email: true, role: true }
}).then(users => {
  console.log('Usuários:');
  users.forEach(u => console.log('- ' + u.name + ' (' + u.role + ')'));
  prisma.\$disconnect();
});
"
```

---

## 🚀 TESTE COMPLETO DE CRIAÇÃO

### **Script para testar criação de setor:**

```bash
#!/bin/bash
echo "🧪 Testando criação de setor..."

# 1. Login
echo "1. Fazendo login..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sistema.com","password":"admin123"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Falha no login"
  exit 1
fi

echo "✅ Token obtido: ${TOKEN:0:20}..."

# 2. Criar setor
echo "2. Criando setor de teste..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/sectors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Secretaria de Teste",
    "codigo": "TEST",
    "description": "Setor de teste"
  }')

echo "Resposta: $RESPONSE"

# 3. Verificar se foi criado
echo "3. Verificando setores..."
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

echo "✅ Teste completo!"
```

---

## 🔍 VERIFICAÇÕES NO NAVEGADOR

### **1. Console do Navegador (F12):**

1. **Ir em Administração → Gerenciar Setores**
2. **Criar novo setor**
3. **F12 → Console → Procurar por:**

```javascript
// ❌ Erros possíveis:
POST /api/sectors 500 (Internal Server Error)
POST /api/sectors 403 (Forbidden)
POST /api/sectors 401 (Unauthorized)
Validation failed
Network error

// ✅ Deve aparecer:
POST /api/sectors 201 (Created)
Setor criado com sucesso
```

### **2. Network Tab (F12):**

1. **F12 → Network**
2. **Criar setor**
3. **Verificar requisição POST /api/sectors:**
   - ✅ Status: 201 Created
   - ❌ Status: 400, 401, 403, 500

---

## 🚨 CORREÇÕES URGENTES

### **Se erro 500 (Internal Server Error):**

```bash
# Ver logs detalhados
pm2 logs sispat-backend --err --lines 50

# Possíveis causas:
# - Erro de validação
# - Problema de banco
# - Campo obrigatório faltando
```

### **Se erro 403 (Forbidden):**

```bash
# Verificar se usuário tem permissão
# Apenas superuser e supervisor podem criar setores
```

### **Se erro 401 (Unauthorized):**

```bash
# Token expirado
# Fazer logout e login novamente
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

- [ ] Usuário logado tem perfil `superuser` ou `supervisor`
- [ ] Token de autenticação válido
- [ ] Campos obrigatórios preenchidos (nome, código)
- [ ] Console do navegador sem erros
- [ ] Network tab mostra 201 Created
- [ ] Logs do backend sem erros
- [ ] Setor aparece na listagem após criação

---

## 🎯 PRÓXIMOS PASSOS

1. **Verificar logs do backend:** `pm2 logs sispat-backend --lines 100`
2. **Testar criação via navegador** e verificar Console/Network
3. **Me enviar:**
   - Logs do backend
   - Screenshot do Console (F12)
   - Screenshot do Network tab (F12)

---

**Com essas informações, posso identificar exatamente por que os setores não estão sendo salvos! 🔍**
