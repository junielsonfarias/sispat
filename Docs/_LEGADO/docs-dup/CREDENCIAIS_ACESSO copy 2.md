# 🔐 CREDENCIAIS DE ACESSO - SISPAT 2.0

**Data da Configuração:** 11/10/2025  
**Ambiente:** Desenvolvimento Local  
**Status:** ✅ Sistema Operacional

---

## 👥 **USUÁRIOS CRIADOS**

### 👑 **SUPERUSUÁRIO (Controle Total)**

```
📧 Email:    admin@sistema.com
🔑 Senha:    Admin@123
👤 Nome:     Administrador do Sistema
🎭 Role:     superuser
🆔 ID:       user-superuser
```

**Permissões:**
- ✅ Acesso total ao sistema
- ✅ Gerenciar todos os usuários
- ✅ Configurar sistema completo
- ✅ Acesso a todos os setores
- ✅ Gerenciar permissões e configurações

---

### 👨‍💼 **SUPERVISOR (Gestão Operacional)**

```
📧 Email:    supervisor@sistema.com
🔑 Senha:    Supervisor@123!
👤 Nome:     Supervisor do Sistema
🎭 Role:     supervisor
🆔 ID:       user-supervisor
```

**Permissões:**
- ✅ Gerenciar usuários
- ✅ Gerenciar patrimônios
- ✅ Aprovar transferências
- ✅ Configurar setores e locais
- ✅ Acessar relatórios e auditoria
- ✅ Gerenciar tipos de bens

---

## 🗄️ **CONFIGURAÇÃO DO BANCO DE DADOS**

```
Banco:       sispat_db
Host:        localhost
Porta:       5432
Usuário:     postgres
Senha:       postgres
Schema:      public
```

**Connection String:**
```
postgresql://postgres:postgres@localhost:5432/sispat_db?schema=public
```

---

## 🚀 **COMO ACESSAR O SISTEMA**

### **1. Verificar se os serviços estão rodando:**

```bash
# Verificar Docker (PostgreSQL e Redis)
docker ps

# Verificar Backend
netstat -ano | findstr :3000

# Verificar Frontend
netstat -ano | findstr :8080
```

### **2. Acessar o sistema:**

```
🌐 Frontend:  http://localhost:8080
🔧 Backend:   http://localhost:3000
💾 API Docs:  http://localhost:3000/api-docs (se disponível)
🏥 Health:    http://localhost:3000/api/health
📊 Prisma:    http://localhost:5555 (se rodando)
```

### **3. Fazer login:**

1. Acesse `http://localhost:8080`
2. Digite o email: `supervisor@sistema.com`
3. Digite a senha: `Supervisor@123!`
4. Clique em **Entrar**

---

## ✅ **VERIFICAÇÕES REALIZADAS**

- [x] ✅ Banco de dados configurado (`sispat_db`)
- [x] ✅ Migrations aplicadas com sucesso
- [x] ✅ Seed executado (usuários criados)
- [x] ✅ Login do Supervisor testado e funcionando
- [x] ✅ Login do Superusuário testado e funcionando
- [x] ✅ Tokens JWT gerados corretamente
- [x] ✅ Backend conectado ao banco de dados
- [x] ✅ Frontend conectado ao backend

---

## 🔧 **PROBLEMAS RESOLVIDOS**

### **Problema Original:**
```
❌ POST http://localhost:3000/api/auth/login 500 (Internal Server Error)
```

### **Causas Identificadas:**

1. ✅ **DATABASE_URL incorreto** - Estava apontando para `sispat` em vez de `sispat_db`
2. ✅ **Tabelas não criadas** - Migrations não haviam sido aplicadas
3. ✅ **Migration problemática** - `20251009_fix_customization_table` estava marcada como falhada
4. ✅ **Usuários não existiam** - Seed não havia sido executado

### **Soluções Aplicadas:**

1. ✅ Corrigido `DATABASE_URL` em `backend/.env`
2. ✅ Removida migration problemática
3. ✅ Marcada migration como revertida: `npx prisma migrate resolve --rolled-back`
4. ✅ Aplicadas migrations: `npx prisma migrate deploy`
5. ✅ Executado seed: `npm run prisma:seed`
6. ✅ Testados logins com sucesso

---

## 📝 **PRÓXIMOS PASSOS**

1. **Configure os setores:**
   - Faça login como superusuário
   - Vá em **Administração → Gerenciar Setores**
   - Crie os setores da prefeitura

2. **Configure os locais:**
   - Para cada setor, configure os locais físicos

3. **Configure os tipos de bens:**
   - Vá em **Administração → Tipos de Bens**
   - Cadastre os tipos necessários

4. **Atribua setores ao supervisor:**
   - Edite o usuário supervisor
   - Atribua os setores que ele será responsável

5. **Altere as senhas padrão:**
   - ⚠️ **IMPORTANTE:** Troque as senhas após o primeiro acesso
   - Vá em **Perfil → Alterar Senha**

---

## 🛡️ **SEGURANÇA**

### **Requisitos de Senha:**

- ✅ Mínimo 12 caracteres
- ✅ Letras maiúsculas
- ✅ Letras minúsculas
- ✅ Números
- ✅ Símbolos especiais (@$!%*?&)

### **Exemplos de Senhas Válidas:**

```
✅ Admin@2025!System
✅ Supervisor#2025!
✅ Password@123456!
✅ MyStr0ng!P@ssw0rd
```

### **⚠️ Alterar Senhas Padrão:**

As senhas fornecidas são **TEMPORÁRIAS** e devem ser alteradas após o primeiro acesso por questões de segurança!

---

## 📊 **INFORMAÇÕES DO MUNICÍPIO**

```
🏛️ Nome:           Prefeitura Municipal
📍 Estado:         PA
🎨 Cor Primária:   #3B82F6
🆔 ID:            municipality-1
```

---

## 🔧 **COMANDOS ÚTEIS**

### **Reiniciar Backend:**
```bash
cd backend
npm run dev
```

### **Resetar Senha de um Usuário (via Prisma Studio):**
```bash
cd backend
npx prisma studio
# Acesse http://localhost:5555
# Vá em "User" e edite o usuário
```

### **Ver Logs do Backend:**
```bash
cd backend
Get-Content .\logs\combined-2025-10-11.log -Tail 50
```

### **Verificar Banco de Dados:**
```bash
docker exec sispat_postgres psql -U postgres -d sispat_db
```

---

## 📞 **SUPORTE**

Em caso de problemas:
1. Verifique se os containers Docker estão rodando
2. Verifique se o backend está rodando na porta 3000
3. Verifique os logs em `backend/logs/`
4. Consulte a documentação do sistema

---

**✅ Sistema configurado e operacional!**  
**🎉 Bom uso do SISPAT 2.0!**

