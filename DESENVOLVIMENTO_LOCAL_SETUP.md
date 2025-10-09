# 🛠️ SETUP COMPLETO - AMBIENTE DE DESENVOLVIMENTO

**Foco:** Resolver todos os problemas em `localhost` para desenvolvimento

---

## 🎯 **PROBLEMAS A RESOLVER**

1. ✅ Personalização salvar no banco (não no localStorage)
2. ✅ Fotos salvar no servidor (não blob URLs)
3. ✅ Seed minimalista (sem dados de teste)
4. ✅ Logs de debug funcionando em dev
5. ✅ Hot reload funcionando

---

## 📋 **PASSO 1: LIMPAR E PREPARAR BANCO**

```bash
# No diretório do projeto
cd backend

# Resetar banco completamente
npm run prisma:reset

# Ou manualmente:
npx prisma migrate reset --force

# Aplicar migrations
npx prisma migrate dev

# Gerar Prisma Client
npx prisma generate
```

---

## 📋 **PASSO 2: POPULAR BANCO (SEED MINIMALISTA)**

```bash
cd backend

# Criar .env para desenvolvimento
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sispat_dev"

JWT_SECRET="dev-secret-key-for-testing-only-not-for-production-use"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

FRONTEND_URL="http://localhost:8080"
CORS_ORIGIN="http://localhost:8080"
CORS_CREDENTIALS=true

BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
MAX_REQUEST_SIZE=50mb

LOG_LEVEL=debug
EOF

# Executar seed com usuários de desenvolvimento
export SUPERUSER_EMAIL="admin@dev.com"
export SUPERUSER_PASSWORD="Admin@123!Dev"
export SUPERUSER_NAME="Admin Desenvolvimento"
export SUPERVISOR_EMAIL="supervisor@dev.com"
export SUPERVISOR_PASSWORD="Supervisor@123!"
export SUPERVISOR_NAME="Supervisor Dev"
export MUNICIPALITY_NAME="Município de Teste"
export STATE="PA"
export BCRYPT_ROUNDS="10"

npm run prisma:seed

# Ver usuários criados
npx prisma studio
# Ou via SQL:
# psql -U postgres -d sispat_dev -c "SELECT email, role FROM users;"
```

---

## 📋 **PASSO 3: CONFIGURAR FRONTEND**

```bash
# No diretório raiz do projeto
cat > .env << 'EOF'
VITE_API_URL=http://localhost:3000/api
VITE_USE_BACKEND=true
VITE_APP_NAME=SISPAT 2.0 DEV
VITE_APP_VERSION=2.0.0-dev
VITE_APP_ENV=development
VITE_BUILD_OPTIMIZE=false
VITE_BUILD_COMPRESS=false
VITE_ENABLE_DEVTOOLS=true
VITE_ENABLE_LOGGING=true
EOF
```

---

## 📋 **PASSO 4: INICIAR BACKEND**

```bash
cd backend

# Opção 1: Com nodemon (reinicia automaticamente)
npm run dev

# Deve mostrar:
# 🔍 Validando variáveis de ambiente...
# ✅ Todas as variáveis configuradas
# ✅ Conectado ao banco de dados PostgreSQL
# 🚀 Servidor rodando em: http://localhost:3000
```

---

## 📋 **PASSO 5: INICIAR FRONTEND**

```bash
# Em outro terminal, no diretório raiz
npm run dev

# Deve mostrar:
# VITE ready in XXX ms
# Local: http://localhost:8080
```

---

## 📋 **PASSO 6: TESTAR TUDO**

### **1. Acessar:** `http://localhost:8080`

### **2. Fazer login:**
```
Email: admin@dev.com
Senha: Admin@123!Dev
```

### **3. Testar Personalização:**
- Ir em **Personalização**
- Alterar cor primária
- Clicar **Salvar**
- Recarregar página (F5)
- Cor deve permanecer ✅

### **4. Testar Upload de Fotos:**
- Ir em **Bens** → **Novo Bem**
- Preencher dados
- Adicionar foto
- Salvar
- Ver bem cadastrado
- Foto deve aparecer ✅

---

## 🔧 **PROBLEMAS COMUNS E SOLUÇÕES**

### **Problema 1: Tabela customizations não existe**

```bash
cd backend

# Criar tabela manualmente
npx prisma db push

# Ou via SQL:
psql -U postgres -d sispat_dev << 'EOF'
CREATE TABLE IF NOT EXISTS "customizations" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT,
    "activeLogoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "backgroundColor" TEXT NOT NULL DEFAULT '#f1f5f9',
    "welcomeTitle" TEXT NOT NULL DEFAULT 'Bem-vindo ao SISPAT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customizations_pkey" PRIMARY KEY ("id")
);

INSERT INTO customizations ("id", "municipalityId", "updatedAt") 
SELECT 'default', id, CURRENT_TIMESTAMP 
FROM municipalities 
LIMIT 1
ON CONFLICT (id) DO NOTHING;
EOF
```

### **Problema 2: Erro ao salvar personalização**

```bash
# Ver logs do backend
# No terminal onde rodou npm run dev, vai aparecer o erro

# Erro comum: "municipalityId is null"
# Solução: Executar SQL acima para adicionar municipalityId
```

### **Problema 3: Fotos não aparecem**

```bash
# Verificar se pasta uploads existe
ls -lh backend/uploads/

# Se não existir:
mkdir -p backend/uploads
chmod 755 backend/uploads

# Testar upload
curl -F "file=@test.jpg" \
  -H "Authorization: Bearer SEU_TOKEN" \
  http://localhost:3000/api/upload/single
```

---

## 📁 **ESTRUTURA DE PASTAS NECESSÁRIA**

```
sispat/
├── backend/
│   ├── .env              ← NODE_ENV=development
│   ├── uploads/          ← Criar esta pasta!
│   ├── src/
│   └── package.json
├── .env                  ← VITE_API_URL=http://localhost:3000/api
├── src/
└── package.json
```

---

## 🔍 **VERIFICAÇÃO RÁPIDA**

Execute para verificar se está tudo ok:

```bash
# 1. Backend rodando?
curl http://localhost:3000/health

# Deve retornar: {"status":"ok",...}

# 2. Frontend rodando?
curl http://localhost:8080

# Deve retornar HTML

# 3. Banco conectado?
cd backend
npx prisma studio
# Abre interface web para ver dados

# 4. Uploads funcionando?
ls -lh backend/uploads/

# 5. Customization API?
curl http://localhost:3000/api/customization
# Se der 500, criar tabela (comando acima)
```

---

## 📝 **CREDENCIAIS DE DESENVOLVIMENTO**

### **Superusuário:**
```
Email: admin@dev.com
Senha: Admin@123!Dev
Role: superuser
```

### **Supervisor:**
```
Email: supervisor@dev.com
Senha: Supervisor@123!
Role: supervisor
```

---

## 🎯 **PRÓXIMOS PASSOS**

1. **Execute** os comandos do PASSO 1 ao PASSO 6
2. **Teste** login e personalização
3. **Reporte** qualquer erro que aparecer
4. **Vou corrigir** imediatamente

---

**🚀 Comece pelos comandos acima e me avise se der algum erro!**
