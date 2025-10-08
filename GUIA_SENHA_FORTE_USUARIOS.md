# 🔐 GUIA DE SENHAS FORTES PARA USUÁRIOS

**Após as correções de segurança, senhas agora precisam:**

✅ Mínimo 12 caracteres  
✅ Pelo menos 1 letra maiúscula  
✅ Pelo menos 1 letra minúscula  
✅ Pelo menos 1 número  
✅ Pelo menos 1 símbolo (@$!%*?&)

---

## ❌ **SENHAS QUE NÃO FUNCIONAM MAIS**

```
password123      ❌ Sem maiúscula, sem símbolo
Password123      ❌ Sem símbolo
Pass@123         ❌ Menos de 12 caracteres
supervisor       ❌ Sem número, sem símbolo, sem maiúscula
Admin123!        ❌ Menos de 12 caracteres
```

---

## ✅ **EXEMPLOS DE SENHAS VÁLIDAS**

### **Para Supervisor:**
```
Supervisor@2025!
Supervisor#123$Admin
Gestao&Setor@2025
Supervisor!123System
```

### **Para Usuário:**
```
Usuario@2025!Sistema
Operador#123$Sispat
Cadastro&2025!User
Usuario!123Strong
```

### **Para Admin:**
```
Admin@2025!Sistema
Administrador#123$
Gestao&Admin@2025
Admin!123$Strong
```

### **Para Visualizador:**
```
Visualizador@2025!
Consulta#123$View
Leitor&2025!Sistema
Viewer!123$Strong
```

---

## 🎯 **COMO CRIAR USUÁRIOS AGORA**

### **No Painel do Superusuário:**

1. Vá em **Administração** → **Gerenciar Usuários**
2. Clique em **Novo Usuário**
3. Preencha os dados:
   - Nome: `Supervisor da Educação`
   - Email: `supervisor@ssbv.com`
   - **Senha: `Supervisor@2025!`** ← Use uma dessas senhas fortes
   - Role: `Supervisor`
   - Setores: Selecione os setores
4. Clique em **Salvar**

---

## 🔍 **SE DER ERRO 400**

A mensagem de erro vai dizer exatamente o que está faltando:

```json
{
  "error": "Senha deve ter pelo menos 12 caracteres com maiúsculas, minúsculas, números e símbolos"
}
```

ou

```json
{
  "error": "Senha deve incluir: letras maiúsculas, minúsculas, números e símbolos especiais (@$!%*?&)"
}
```

---

## 💡 **GERADOR DE SENHAS FORTES**

Execute no servidor para gerar senhas aleatórias:

```bash
# Gerar senha forte aleatória
openssl rand -base64 16 | sed 's/[^a-zA-Z0-9@$!%*&]//g' | cut -c1-12 | sed 's/^/Admin@2025!/'

# Ou use este gerador simples:
echo "Admin@$(date +%Y)!$(openssl rand -hex 4 | cut -c1-4 | tr '[:lower:]' '[:upper:]')"
```

**Exemplos gerados:**
- `Admin@2025!A7F9`
- `Admin@2025!B2E4`
- `Admin@2025!C8D1`

---

## 📝 **CHECKLIST DE SENHA**

Antes de salvar, verifique se sua senha tem:

- [ ] Pelo menos 12 caracteres
- [ ] Letras MAIÚSCULAS (A-Z)
- [ ] Letras minúsculas (a-z)
- [ ] Números (0-9)
- [ ] Símbolos especiais (@$!%*?&)

**Exemplo visual:**
```
Supervisor@2025!
│││││││││││││
├─ Supervisor  → letras maiúsculas e minúsculas ✅
│          │
│          └─ @  → símbolo ✅
│
├─ 2025  → números ✅
│
└─ !  → símbolo ✅

Total: 16 caracteres ✅
```

---

## 🎯 **SOLUÇÃO PARA SEU CASO**

No painel, ao criar o supervisor, use uma destas senhas:

```
Supervisor@2025!Sistema
Supervisor#Admin123$
Gestao&Supervisor2025!
Supervisor!Strong123
```

**Copie uma dessas senhas** e cole no campo de senha ao criar o usuário.

---

## 🔧 **SE PRECISAR CRIAR VIA TERMINAL**

```bash
cd /var/www/sispat/backend

# Criar script para adicionar usuário
cat > /tmp/create-supervisor.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createSupervisor() {
  const email = 'supervisor@ssbv.com';
  const password = 'Supervisor@2025!';  // ← Senha forte
  const name = 'Supervisor da Educação';
  
  const passwordHash = await bcrypt.hash(password, 12);
  const municipality = await prisma.municipality.findFirst();
  const sector = await prisma.sector.findFirst({ where: { name: 'Secretaria de Educação' } });
  
  const user = await prisma.user.create({
    data: {
      email: email,
      name: name,
      password: passwordHash,
      role: 'supervisor',
      responsibleSectors: [sector.name],
      municipalityId: municipality.id,
      isActive: true,
    },
  });
  
  console.log('✅ Supervisor criado:');
  console.log('   Email:', email);
  console.log('   Senha:', password);
  console.log('   Setor:', sector.name);
}

createSupervisor().catch(console.error).finally(() => prisma.$disconnect());
EOF

node /tmp/create-supervisor.js
rm /tmp/create-supervisor.js
```

---

## 📋 **TABELA DE REFERÊNCIA RÁPIDA**

| Role | Email Exemplo | Senha Forte Exemplo |
|------|---------------|---------------------|
| Supervisor | supervisor@ssbv.com | `Supervisor@2025!` |
| Usuário | usuario@ssbv.com | `Usuario@2025!Sistema` |
| Admin | admin@ssbv.com | `Admin@2025!Strong` |
| Visualizador | viewer@ssbv.com | `Visualizador@2025!` |

---

**🎯 Agora você sabe como criar senhas que atendem aos requisitos de segurança!**
