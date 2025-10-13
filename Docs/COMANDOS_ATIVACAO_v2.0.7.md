# ⚡ COMANDOS RÁPIDOS - ATIVAR v2.0.7

**Versão:** 2.0.7  
**Status:** ✅ Código pronto, aguardando ativação

---

## 🚀 ATIVAÇÃO RÁPIDA (3 COMANDOS)

### **⚠️ IMPORTANTE: Feche o VS Code antes de executar!**

```powershell
# 1. Executar script de ativação
cd "D:\novo ambiente\sispat - Copia"
.\ativar-v2.0.7.ps1

# 2. Gerar Prisma (após fechar VS Code)
cd backend
npx prisma generate

# 3. Iniciar aplicação
npm run dev
```

---

## 📋 PASSO A PASSO DETALHADO

### **1. Fechar VS Code**
```
❌ Fechar todas as janelas do VS Code
❌ Fechar terminals com npm run dev
```

### **2. Executar Script**
```powershell
cd "D:\novo ambiente\sispat - Copia"
.\ativar-v2.0.7.ps1
```

**Output esperado:**
```
╔════════════════════════════════════════╗
║  SISPAT v2.0.7 - Ativação Dev         ║
╚════════════════════════════════════════╝

📦 1. Instalando ioredis...
✅ ioredis instalado

🔧 2. Gerando Prisma Client...
✅ Prisma Client gerado

🔨 3. Compilando backend...
✅ Backend compilado com sucesso

📁 4. Verificando arquivos...
  ✅ src\middlewares\ipTracking.ts
  ✅ src\utils\activityLogger.ts
  ✅ src\jobs\logRetention.ts
  ✅ src\config\redis.enhanced.ts
  ✅ src\controllers\transferenciaController.ts
  ✅ src\controllers\documentController.ts

╔════════════════════════════════════════╗
║         ATIVAÇÃO CONCLUÍDA!            ║
╚════════════════════════════════════════╝
```

### **3. Gerar Prisma (se erro no script)**
```powershell
cd backend
npx prisma generate
```

### **4. Iniciar Backend**
```powershell
npm run dev
```

**Verificar logs:**
```
✅ ✔ Prisma Client initialized
✅ ✔ IP Tracking middleware ativo
✅ ✔ Server running on port 3000
```

### **5. Iniciar Frontend (em outro terminal)**
```powershell
cd "D:\novo ambiente\sispat - Copia"
npm run dev
```

---

## ✅ VERIFICAÇÕES

### **1. Tabela documents existe?**
```sql
-- Conectar ao PostgreSQL
psql -U postgres -d sispat

-- Verificar
SELECT COUNT(*) FROM documents;

-- Resposta esperada: 0 (tabela vazia)
```

### **2. Endpoints funcionam?**
```powershell
# Transferências
curl http://localhost:3000/api/transferencias

# Documentos
curl http://localhost:3000/api/documentos

# Gerar número
curl http://localhost:3000/api/patrimonios/gerar-numero
```

### **3. Frontend funciona?**
```
http://localhost:8080

✅ Login carrega
✅ Dashboard abre
✅ Console sem erros críticos
```

---

## 🆘 SE DER ERRO

### **Erro: "EPERM: operation not permitted" (Prisma)**

**Solução:**
```powershell
# 1. Fechar VS Code
# 2. Fechar terminals
# 3. Executar novamente
cd backend
npx prisma generate
```

---

### **Erro: "Cannot find module 'ioredis'"**

**Solução:**
```powershell
cd backend
npm install ioredis
npm install --save-dev @types/ioredis
```

---

### **Erro: "Table documents does not exist"**

**Solução:**
```powershell
cd backend
node create-documents-table.js
npx prisma generate
```

---

## 📊 TESTES RÁPIDOS

### **1. Testar IP Tracking:**
```powershell
# Fazer login
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@sispat.com","password":"senha"}'

# Verificar no banco
psql -U postgres -d sispat -c "SELECT action, \"ipAddress\", \"createdAt\" FROM activity_logs ORDER BY \"createdAt\" DESC LIMIT 5"
```

**Esperado:**
```
action  | ipAddress | createdAt
--------|-----------|------------------
LOGIN   | 127.0.0.1 | 2025-10-11 ...
```

---

### **2. Testar Validações:**
```typescript
// No frontend, testar formulário de imóvel
CPF: 123.456.789-09  // ✅ Válido
CPF: 111.111.111-11  // ❌ Inválido
CEP: 01234-567       // ✅ Válido
CEP: 12345678        // ✅ Válido (formatado automaticamente)
```

---

### **3. Testar Endpoints Novos:**
```powershell
# Criar transferência (precisa de token válido)
curl -X POST http://localhost:3000/api/transferencias `
  -H "Authorization: Bearer TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "patrimonioId": "uuid",
    "setorOrigem": "TI",
    "setorDestino": "RH",
    "motivo": "Teste"
  }'
```

---

## ✅ SUCESSO

Se você vir:
```
✅ Backend rodando (npm run dev)
✅ Frontend rodando (npm run dev)
✅ Login funciona
✅ Dashboard carrega
✅ Endpoints /api/transferencias, /api/documentos funcionam
✅ Console sem erros críticos
```

**🎉 v2.0.7 ATIVADA EM DESENVOLVIMENTO!**

---

## 📚 CONSULTE

- [ATIVAR_v2.0.7_DESENVOLVIMENTO.md](./ATIVAR_v2.0.7_DESENVOLVIMENTO.md) - Guia completo
- [MELHORIAS_v2.0.7_IMPLEMENTADAS.md](./MELHORIAS_v2.0.7_IMPLEMENTADAS.md) - Detalhes técnicos
- [GUIA_CACHE_REDIS.md](./GUIA_CACHE_REDIS.md) - Como usar cache
- [GUIA_LAZY_LOADING.md](./GUIA_LAZY_LOADING.md) - Como usar lazy loading

---

**🚀 SISPAT v2.0.7 - 98/100 ⭐⭐⭐⭐⭐**

**Equipe SISPAT**  
11 de Outubro de 2025

