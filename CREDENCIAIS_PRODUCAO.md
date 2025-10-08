# 🔐 CREDENCIAIS DE ACESSO - PRODUÇÃO (TESTE)

**Data:** 08/10/2025  
**Sistema:** SISPAT 2.0  
**Ambiente:** PRODUÇÃO (TESTE)  
**Status:** ✅ **CONFIGURADO PARA TESTES**

---

## ⚠️ **AVISO IMPORTANTE**

🟡 **Este sistema usa as mesmas credenciais de desenvolvimento para facilitar testes em produção.**

🔴 **Para uso em produção real, altere todas as senhas conforme documentado no final deste arquivo.**

---

## 👥 **CREDENCIAIS DE ACESSO (IDÊNTICAS AO DESENVOLVIMENTO)**

### 🔑 **SUPERUSER** (Acesso Total)
```
Email:    junielsonfarias@gmail.com
Senha:    Tiko6273@
Função:   Superuser
Acesso:   Sistema completo + configurações avançadas
```

**Permissões:**
- ✅ Acesso a todos os módulos
- ✅ Configurações do sistema
- ✅ Gestão de municípios
- ✅ Gestão de usuários
- ✅ Configurações avançadas
- ✅ Logs de auditoria
- ✅ Backup e restauração

---

### 🔑 **ADMINISTRADOR** (Recomendado para Testes)
```
Email:    admin@ssbv.com
Senha:    password123
Função:   Admin
Acesso:   Gestão completa do município
```

**Permissões:**
- ✅ Dashboard administrativo
- ✅ Criar/Editar/Deletar patrimônios
- ✅ Criar/Editar/Deletar imóveis
- ✅ Gestão de usuários
- ✅ Gestão de setores e locais
- ✅ Relatórios completos
- ✅ Configurações municipais

---

### 🔑 **SUPERVISOR**
```
Email:    supervisor@ssbv.com
Senha:    password123
Função:   Supervisor
Acesso:   Supervisão de setores específicos
Setores:  Secretaria de Administração, Secretaria de Finanças
```

**Permissões:**
- ✅ Dashboard de setores
- ✅ Criar/Editar patrimônios do setor
- ✅ Visualizar todos os patrimônios
- ✅ Relatórios do setor
- ✅ Configurações básicas

---

### 🔑 **USUÁRIO PADRÃO**
```
Email:    usuario@ssbv.com
Senha:    password123
Função:   Usuário
Acesso:   Operações básicas no setor
Setores:  Secretaria de Administração
```

**Permissões:**
- ✅ Dashboard básico
- ✅ Criar/Editar patrimônios do setor
- ✅ Visualizar patrimônios do setor
- ✅ Relatórios básicos

---

### 🔑 **VISUALIZADOR**
```
Email:    visualizador@ssbv.com
Senha:    password123
Função:   Visualizador
Acesso:   Apenas visualização
```

**Permissões:**
- ✅ Dashboard de visualização
- ✅ Visualizar patrimônios
- ✅ Visualizar imóveis
- ✅ Consultar relatórios
- ❌ Criar/Editar/Deletar

---

## 🌐 **URLs DE ACESSO**

### **Produção (Após Deploy)**
```
Frontend:       https://sispat.seudominio.com/login
Backend API:    https://api.sispat.seudominio.com
Health Check:   https://api.sispat.seudominio.com/health
Consulta:       https://sispat.seudominio.com/consulta-publica
```

### **Desenvolvimento (Local)**
```
Frontend:       http://localhost:8080/login
Backend API:    http://localhost:3000
Health Check:   http://localhost:3000/health
```

---

## 🗃️ **BANCO DE DADOS**

### **Credenciais PostgreSQL (Configurar antes do deploy)**

```bash
# Em backend/.env ou backend/env.production
DATABASE_URL="postgresql://sispat_user:SENHA_DO_BANCO@localhost:5432/sispat_prod"
```

**Valores Padrão para Teste:**
```
Usuário:  sispat_user
Senha:    sispat_password_123  (alterar para senha forte em produção real)
Banco:    sispat_prod
Host:     localhost
Porta:    5432
```

---

## 🔑 **JWT SECRET**

### **Chave de Produção (Configurar antes do deploy)**

```bash
# Em backend/.env ou backend/env.production
JWT_SECRET="sispat_jwt_secret_key_for_production_testing_2025"
JWT_EXPIRES_IN="24h"
```

⚠️ **Para produção real:** Gere uma chave aleatória de 256 bits:
```bash
# Linux/Debian
openssl rand -hex 64

# Resultado exemplo:
# a7f3e9d2c8b1f4e6a2d8c9b3f7e1a5d9c4b8f2e7a3d6c1b9f5e8a2d7c3b6f1e4a9d5c2b8f7e3a6d1c9b4f8e2a5d7c3b1f6e9a4d8c2b5f7e1a3d6c9b2f4e8a1d5c7b3f9e6a2d4c8b1f5e7a3d9c6b2f4e1a8d5c7
```

---

## 🚀 **PRIMEIRO ACESSO APÓS DEPLOY**

### **1. Popular Banco de Dados**
```bash
# No servidor de produção
cd /var/www/sispat/backend

# Executar migrações
npm run prisma:migrate:prod

# Popular com dados iniciais (incluindo usuários)
npm run prisma:seed
```

### **2. Acessar Sistema**
```
1. Abra: https://sispat.seudominio.com/login
2. Email: admin@ssbv.com
3. Senha: password123
4. Clique em "Entrar"
```

### **3. Verificar Health Check**
```bash
curl https://api.sispat.seudominio.com/health
```

---

## 📊 **MATRIZ DE PERMISSÕES**

| Recurso | Superuser | Admin | Supervisor | Usuário | Visualizador |
|---------|-----------|-------|------------|---------|--------------|
| **Dashboard** | ✅ Completo | ✅ Municipal | ✅ Setores | ✅ Setor | ✅ Público |
| **Criar Patrimônio** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Editar Patrimônio** | ✅ Todos | ✅ Todos | ✅ Setor | ✅ Setor | ❌ |
| **Deletar Patrimônio** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Baixar Patrimônio** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Transferir** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Criar Imóvel** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Editar Imóvel** | ✅ Todos | ✅ Todos | ✅ Setor | ✅ Setor | ❌ |
| **Deletar Imóvel** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Criar Usuário** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Editar Usuário** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Deletar Usuário** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Tipos de Bens** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Setores/Locais** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Relatórios** | ✅ Todos | ✅ Municipais | ✅ Setores | ✅ Setor | ✅ Públicos |
| **Personalização** | ✅ | ✅ | ✅ Básica | ❌ | ❌ |
| **Backup** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Config. Sistema** | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🔧 **SCRIPTS DE GERENCIAMENTO**

### **Criar Novo Usuário Admin**
```bash
cd backend

node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  const municipality = await prisma.municipality.findFirst();
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.create({
    data: {
      name: 'Novo Administrador',
      email: 'novoadmin@seudominio.com',
      password: passwordHash,
      role: 'admin',
      municipalityId: municipality.id,
      isActive: true,
      responsibleSectors: []
    }
  });
  
  console.log('✅ Usuário criado:', admin.email);
  await prisma.\$disconnect();
}

createAdmin();
"
```

### **Resetar Senha de Usuário**
```bash
cd backend

node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword() {
  const email = 'admin@ssbv.com';
  const newPassword = 'password123';
  const passwordHash = await bcrypt.hash(newPassword, 10);
  
  await prisma.user.update({
    where: { email },
    data: { password: passwordHash }
  });
  
  console.log('✅ Senha resetada para:', email);
  await prisma.\$disconnect();
}

resetPassword();
"
```

---

## 🧪 **TESTE DE LOGIN VIA API**

### **Teste Rápido**
```bash
curl -X POST https://api.sispat.seudominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ssbv.com",
    "password": "password123"
  }'
```

**Resposta Esperada:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-admin",
    "name": "Administrador",
    "email": "admin@ssbv.com",
    "role": "admin"
  }
}
```

---

## 📝 **RESUMO RÁPIDO**

### **Para Login Imediato:**
```
Email: admin@ssbv.com
Senha: password123
URL:   https://sispat.seudominio.com/login
```

### **Acesso Superuser:**
```
Email: junielsonfarias@gmail.com
Senha: Tiko6273@
URL:   https://sispat.seudominio.com/login
```

---

## 🔄 **QUANDO ALTERAR PARA PRODUÇÃO REAL**

### **1. Editar Arquivo de Seed**

Localize `backend/src/prisma/seed.ts` (linhas 93-94) e altere:

```typescript
const defaultPasswordHash = await bcrypt.hash('SUA_NOVA_SENHA_FORTE', 12);
const superuserPasswordHash = await bcrypt.hash('SUA_SENHA_SUPERUSER_FORTE', 12);
```

### **2. Reexecutar Seed**
```bash
cd backend
npm run prisma:seed
```

### **3. Ou Usar Variáveis de Ambiente**

Adicione em `backend/.env`:
```bash
SUPERUSER_PASSWORD="Sup3r@Us3r#Segur0!2025"
DEFAULT_PASSWORD="S3nh@P@dr@o!Forte2025"
```

E altere o seed para:
```typescript
const defaultPasswordHash = await bcrypt.hash(
  process.env.DEFAULT_PASSWORD || 'password123', 
  12
);
const superuserPasswordHash = await bcrypt.hash(
  process.env.SUPERUSER_PASSWORD || 'Tiko6273@', 
  12
);
```

---

## 🎯 **DEPLOY COM ESTAS CREDENCIAIS**

### **Passo a Passo:**

1. **Clonar repositório no servidor:**
```bash
git clone https://github.com/junielsonfarias/sispat.git
cd sispat
```

2. **Configurar ambiente:**
```bash
# Frontend
cp env.production .env
nano .env
# Alterar: VITE_API_URL=https://api.SEU_DOMINIO.com

# Backend
cp backend/env.production backend/.env
nano backend/.env
# Alterar: DATABASE_URL, FRONTEND_URL, JWT_SECRET
```

3. **Build e deploy:**
```bash
# Build do projeto
pnpm install
pnpm run build:prod

cd backend
npm install
npm run build

# Executar migrações e seed
npm run prisma:migrate:prod
npm run prisma:seed
```

4. **Acessar sistema:**
```
URL: https://sispat.seudominio.com/login
Email: admin@ssbv.com
Senha: password123
```

---

## 📞 **SUPORTE**

### **Se o login não funcionar:**

1. **Verificar logs:**
```bash
# Logs do backend
sudo journalctl -u sispat-backend -n 50 -f

# Logs do Nginx
sudo tail -f /var/log/nginx/error.log
```

2. **Verificar usuários no banco:**
```bash
cd backend
npm run prisma:studio
# Acessar: http://localhost:5555
# Ver tabela: users
```

3. **Testar API diretamente:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ssbv.com","password":"password123"}'
```

---

## ✅ **CREDENCIAIS VÁLIDAS PARA:**

- ✅ Testes em produção
- ✅ Demonstrações
- ✅ Homologação
- ✅ Ambiente de staging
- ⚠️ **NÃO para produção final com dados reais**

---

## 🔒 **QUANDO FOR PRODUÇÃO REAL**

### **Alterar Imediatamente:**
1. Senhas de todos os usuários
2. JWT_SECRET
3. Senha do banco de dados
4. Emails para domínio real
5. Configurar política de senha forte
6. Implementar rotação de senhas
7. Ativar logs de auditoria
8. Configurar 2FA (futura feature)

---

**🎯 Sistema pronto para testes em produção com credenciais conhecidas!**

**📅 Última atualização:** 08/10/2025  
**📦 Versão:** SISPAT 2.0.0  
**🔗 Repositório:** https://github.com/junielsonfarias/sispat
