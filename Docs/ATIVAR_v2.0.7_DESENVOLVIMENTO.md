# ⚡ ATIVAR v2.0.7 EM DESENVOLVIMENTO - GUIA COMPLETO

**Data:** 11 de Outubro de 2025  
**Versão:** 2.0.7  
**Tempo Estimado:** 15-20 minutos

---

## 🎯 O QUE SERÁ ATIVADO

```
✅ Validação CPF/CNPJ/CEP
✅ IP Tracking em ActivityLog
✅ Retenção de logs (1 ano)
✅ Cache Redis
✅ Lazy Loading de imagens
✅ 9 Hooks React Query
✅ Migrations preparadas
```

---

## 📋 PRÉ-REQUISITOS

### **1. Redis (Opcional - para cache):**

```powershell
# Windows: Instalar via WSL ou Docker
docker run --name redis -p 6379:6379 -d redis

# Ou usar Redis Cloud (gratuito)
# https://redis.com/try-free/

# Ou pular por enquanto (cache será ignorado)
```

### **2. Fechar Aplicações:**

```
❌ Fechar VS Code
❌ Fechar pm2 (se rodando)
❌ Fechar npm run dev (se rodando)
```

Isso libera os arquivos do Prisma para regeneração.

---

## 🚀 PASSO A PASSO

### **PASSO 1: Atualizar Código**

```powershell
# Você já está com o código atualizado!
✅ 13 arquivos novos criados
✅ 5 arquivos modificados
```

---

### **PASSO 2: Instalar Dependências**

```powershell
# Backend
cd "D:\novo ambiente\sispat - Copia\backend"
npm install ioredis
npm install --save-dev @types/ioredis

# Voltar para raiz
cd ..
```

**Status:** ✅ JÁ FEITO

---

### **PASSO 3: Gerar Prisma Client**

**⚠️ IMPORTANTE:** Feche VS Code antes!

```powershell
cd "D:\novo ambiente\sispat - Copia\backend"
npx prisma generate
```

**Output Esperado:**
```
✔ Generated Prisma Client
✓ model Document adicionado
✓ Relação com User, Patrimonio, Imovel criada
```

---

### **PASSO 4: Criar Tabela Documents**

```powershell
# Conectar ao PostgreSQL
psql -U postgres -d sispat

# Executar SQL
CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "patrimonioId" VARCHAR(36),
  "imovelId" VARCHAR(36),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  "fileSize" INTEGER,
  description TEXT,
  "uploadedBy" VARCHAR(36) NOT NULL,
  "uploadedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_patrimonio ON documents("patrimonioId");
CREATE INDEX idx_documents_imovel ON documents("imovelId");
CREATE INDEX idx_documents_uploader ON documents("uploadedBy");

-- Foreign keys
ALTER TABLE documents 
  ADD CONSTRAINT fk_documents_patrimonio 
  FOREIGN KEY ("patrimonioId") REFERENCES patrimonios(id) ON DELETE CASCADE;

ALTER TABLE documents 
  ADD CONSTRAINT fk_documents_imovel 
  FOREIGN KEY ("imovelId") REFERENCES imoveis(id) ON DELETE CASCADE;

ALTER TABLE documents 
  ADD CONSTRAINT fk_documents_uploader 
  FOREIGN KEY ("uploadedBy") REFERENCES users(id);

\q
```

---

### **PASSO 5: Compilar Backend**

```powershell
npm run build
```

**Verificar:**
```
✓ Compilação bem-sucedida
✓ 0 erros de TypeScript
✓ dist/ criado
```

---

### **PASSO 6: Testar Backend**

```powershell
npm run dev
```

**Verificar logs:**
```
✅ ✔ Prisma Client initialized
✅ ✔ Redis conectado (se configurado)
✅ ✔ Server running on port 3000
✅ ✔ IP Tracking middleware ativo
```

**Testar endpoints:**
```powershell
# Em outro terminal
curl http://localhost:3000/api/health

# Transferências
curl http://localhost:3000/api/transferencias `
  -H "Authorization: Bearer SEU_TOKEN"

# Documentos
curl http://localhost:3000/api/documentos `
  -H "Authorization: Bearer SEU_TOKEN"

# Gerar número
curl http://localhost:3000/api/patrimonios/gerar-numero `
  -H "Authorization: Bearer SEU_TOKEN"
```

---

### **PASSO 7: Testar Frontend**

```powershell
# Na raiz do projeto
cd "D:\novo ambiente\sispat - Copia"
npm run dev
```

**Abrir navegador:**
```
http://localhost:8080
```

**Testar:**
```
✅ Login funciona
✅ Dashboard carrega
✅ Console sem erros críticos
✅ LazyImage funciona (se implementado)
✅ Validações funcionam (CPF/CNPJ/CEP)
```

---

## ✅ CHECKLIST COMPLETO

```
PRÉ-REQUISITOS:
✅ Redis instalado (opcional)
✅ PostgreSQL rodando
✅ VS Code fechado (para Prisma generate)

INSTALAÇÃO:
✅ npm install ioredis (backend)
✅ npm install @types/ioredis --save-dev (backend)

DATABASE:
□ CREATE TABLE documents (executar SQL acima)
□ npx prisma generate (reabrir VS Code depois)

BACKEND:
□ npm run build
□ npm run dev
□ Verificar logs (sem erros)

FRONTEND:
□ npm run dev
□ Login funciona
□ Dashboard carrega
□ Console sem erros

TESTES:
□ POST /api/transferencias
□ POST /api/documentos
□ GET /api/patrimonios/gerar-numero
□ Validar CPF: 123.456.789-09
□ Validar CEP: 01234-567
```

---

## 🔍 VERIFICAÇÕES

### **1. Redis está conectado?**

```
Logs do backend:
✅ Redis conectado { host: 'localhost', port: 6379 }

OU

⚠️ Redis error: connect ECONNREFUSED
   → Normal se Redis não instalado. Cache será ignorado.
```

### **2. IP está sendo rastreado?**

```sql
-- Verificar ActivityLog
SELECT 
  action, 
  "ipAddress", 
  "userAgent",
  "createdAt"
FROM activity_logs 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

**Esperado:**
```
action          | ipAddress  | userAgent
----------------+------------+---------------------------
LOGIN           | 127.0.0.1  | Mozilla/5.0 ...
PATRIMONIO_...  | 127.0.0.1  | Mozilla/5.0 ...
```

### **3. Endpoints funcionando?**

```powershell
# Transferências
curl http://localhost:3000/api/transferencias

# Resposta: HTTP 200 (mesmo vazio)
{
  "transferencias": [],
  "pagination": { ... }
}

# Documentos
curl http://localhost:3000/api/documentos

# Resposta: HTTP 200
{
  "documentos": []
}
```

---

## 🆘 TROUBLESHOOTING

### **Erro: "Cannot find module 'ioredis'"**

```powershell
cd backend
npm install ioredis
npm install --save-dev @types/ioredis
```

---

### **Erro: "Property 'document' does not exist on type 'PrismaClient'"**

```powershell
# Fechar VS Code
# Executar:
cd backend
npx prisma generate
# Reabrir VS Code
```

---

### **Erro: "Cannot find module './utils/activityLogger'"**

```powershell
# Verificar se arquivo existe
ls backend/src/utils/activityLogger.ts

# Se não existe, criar conforme documentação
```

---

### **Redis não conecta:**

```
⚠️ NORMAL se Redis não instalado!

O sistema funciona sem Redis, apenas sem cache.

Para instalar:
docker run --name redis -p 6379:6379 -d redis
```

---

## 📊 MÉTRICAS ESPERADAS

### **Sem Redis (desenvolvimento):**
```
Response Time: ~500ms
Requests/s: ~100
Cache Hit: 0% (sem cache)
```

### **Com Redis (produção):**
```
Response Time: ~150ms (-70%)
Requests/s: ~500 (+400%)
Cache Hit: 85%+
```

---

## 🎉 SUCESSO

Se você vir:
```
✅ Backend compilado sem erros
✅ npm run dev funcionando
✅ Endpoints /api/transferencias respondem
✅ Endpoints /api/documentos respondem
✅ Login funciona no frontend
✅ Dashboard carrega
✅ Console sem erros críticos
```

**🎉 v2.0.7 ATIVADA COM SUCESSO EM DESENVOLVIMENTO!**

---

## 📝 PRÓXIMOS PASSOS

```
1. Testar validações (CPF/CNPJ/CEP)
2. Testar criação de transferência
3. Testar upload de documento
4. Testar geração de número patrimonial
5. Verificar IP em activity_logs
6. Implementar lazy loading nos componentes
7. Aplicar migrations em staging (futuro)
```

---

## 📞 SUPORTE

**Se algo der errado:**
1. Consultar seção Troubleshooting acima
2. Verificar logs: `npm run dev` (backend)
3. Verificar console do navegador (frontend)
4. Consultar [MELHORIAS_v2.0.7_IMPLEMENTADAS.md](./MELHORIAS_v2.0.7_IMPLEMENTADAS.md)

---

**🚀 Boa sorte com a ativação!**

**Equipe SISPAT**  
Versão 2.0.7

