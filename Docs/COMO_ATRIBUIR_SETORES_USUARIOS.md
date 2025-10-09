# 📋 COMO ATRIBUIR SETORES AOS USUÁRIOS

**Data:** 09/10/2024  
**Contexto:** Após cadastrar setores, eles não aparecem automaticamente para os usuários

---

## 🎯 **PROBLEMA IDENTIFICADO**

Quando você cadastra novos setores no sistema:
- ✅ Os setores são criados no banco
- ❌ **MAS** eles NÃO são atribuídos automaticamente aos usuários existentes
- ❌ Os usuários não conseguem acessar bens desses setores

---

## ✅ **SOLUÇÃO IMPLEMENTADA**

### **1. Campo `responsibleSectors` Agora Aparece para Supervisores**

**Antes:**
- ❌ Apenas usuários com role 'usuario' e 'visualizador' podiam ter setores
- ❌ Supervisores não tinham campo de setores

**Depois:**
- ✅ Supervisores, usuários e visualizadores têm campo de setores
- ✅ Descrição diferenciada para cada tipo

---

## 📝 **COMO ATRIBUIR SETORES AOS USUÁRIOS**

### **Passo 1: Cadastrar Setores (se ainda não fez)**

1. Faça login como **superusuário**
2. Vá em **Administração** → **Gerenciar Setores**
3. Clique em **"Novo Setor"**
4. Preencha:
   - **Nome:** ex: "Secretaria de Educação"
   - **Código:** ex: "SEC-EDU"
   - **Descrição:** (opcional)
5. Clique em **"Criar Setor"**
6. Repita para todos os setores necessários

---

### **Passo 2: Atribuir Setores aos Usuários Existentes**

#### **Para Supervisores:**

1. Vá em **Administração** → **Gerenciar Usuários**
2. Encontre o usuário supervisor
3. Clique no botão **"Editar"** (ícone de lápis)
4. No formulário que abrir:
   - Veja o campo **"Setores de Acesso"**
   - Clique no campo e selecione os setores
   - Pode selecionar múltiplos setores
5. Clique em **"Salvar Alterações"**

#### **Para Usuários Comuns ou Visualizadores:**

1. Mesmos passos acima
2. Os usuários terão acesso **apenas para visualizar** bens dos setores atribuídos

---

### **Passo 3: Criar Novos Usuários com Setores**

1. Vá em **Administração** → **Gerenciar Usuários**
2. Clique em **"Novo Usuário"**
3. Preencha:
   - **Nome Completo**
   - **E-mail**
   - **Senha** (mínimo 12 caracteres com maiúsculas, minúsculas, números e símbolos)
   - **Confirmar Senha**
   - **Função/Role:** Escolha (Supervisor, Usuário ou Visualizador)
4. **IMPORTANTE:** Após selecionar a função, aparecerá o campo **"Setores de Acesso"**
5. Selecione os setores que o usuário terá acesso
6. Clique em **"Criar Usuário"**

---

## 🔐 **DIFERENÇAS ENTRE ROLES**

### **Superusuário (Admin)**
- ✅ Acesso total ao sistema
- ✅ Não precisa de setores atribuídos
- ✅ Vê e gerencia tudo

### **Supervisor**
- ✅ Gerencia bens dos setores atribuídos
- ✅ Pode criar, editar, deletar bens
- ✅ Pode fazer transferências e doações
- ❌ Não vê bens de setores não atribuídos

### **Usuário**
- ✅ Vê bens dos setores atribuídos
- ✅ Pode visualizar detalhes
- ⚠️  Permissões limitadas de edição
- ❌ Não vê bens de setores não atribuídos

### **Visualizador**
- ✅ Apenas visualiza bens dos setores atribuídos
- ❌ Não pode editar nem criar
- ❌ Não vê bens de setores não atribuídos

---

## 🎯 **FLUXO COMPLETO DE CONFIGURAÇÃO INICIAL**

### **1. Como Superusuário:**

```
1. Login (admin@dev.com / Admin@123!Dev)
2. Ir em "Gerenciar Setores" → Criar todos os setores
3. Ir em "Gerenciar Usuários" → Editar usuário supervisor
4. Atribuir setores ao supervisor
5. Criar usuários comuns (se necessário)
6. Atribuir setores aos usuários comuns
```

### **2. Depois, como Supervisor:**

```
1. Login (supervisor@dev.com / Supervisor@123!)
2. Cadastrar locais para cada setor
3. Cadastrar tipos de bens
4. Cadastrar formas de aquisição
5. Começar a cadastrar bens patrimoniais
```

---

## 🧪 **TESTE SE ESTÁ FUNCIONANDO**

### **1. Atribuir Setores:**
- Edite o usuário supervisor
- Atribua o setor "Secretaria de Educação"
- Salve

### **2. Fazer Logout e Login:**
- Faça logout
- Faça login como supervisor
- Vá em "Bens Patrimoniais"

### **3. Verificar:**
- ✅ Supervisor deve ver **apenas** bens do setor atribuído
- ✅ Ao cadastrar novo bem, deve aparecer o setor na listagem
- ❌ Bens de outros setores **não** devem aparecer

---

## 📊 **ESTRUTURA DE DADOS**

### **Banco de Dados (Users)**

```sql
users {
  id: uuid
  email: string
  name: string
  role: 'superuser' | 'supervisor' | 'usuario' | 'visualizador'
  responsibleSectors: string[]  ← Array de NOMES dos setores
  municipalityId: uuid
  ...
}
```

### **Exemplo:**

```json
{
  "id": "user-supervisor",
  "email": "supervisor@dev.com",
  "name": "Supervisor Dev",
  "role": "supervisor",
  "responsibleSectors": [
    "Secretaria de Educação",
    "Secretaria de Saúde"
  ],
  "municipalityId": "municipality-1"
}
```

---

## ⚠️ **IMPORTANTE**

### **Setores são Armazenados por NOME, não por ID:**
- ✅ `responsibleSectors: ["Secretaria de Educação"]`
- ❌ `responsibleSectors: ["sector-uuid-123"]`

### **Por Que Isso Importa:**
- Se você **renomear** um setor, precisará atualizar os usuários manualmente
- Ou criar um script de migração para atualizar os nomes

---

## 🐛 **PROBLEMAS COMUNS**

### **1. "Usuário não vê bens depois de atribuir setores"**

**Solução:**
- Fazer **logout completo**
- Limpar cache do navegador (Ctrl+Shift+Delete)
- Fazer login novamente

### **2. "Campo 'Setores de Acesso' não aparece"**

**Solução:**
- Certifique-se que selecionou role: Supervisor, Usuário ou Visualizador
- Se selecionou Superusuário, o campo não aparece (não é necessário)

### **3. "Erro ao salvar: 'responsibleSectors is required'"**

**Solução:**
- Selecione pelo menos 1 setor
- Ou ajuste o formulário para permitir array vazio

---

## ✅ **CORREÇÕES IMPLEMENTADAS**

| Arquivo | Mudança |
|---------|---------|
| `src/components/admin/UserEditForm.tsx` | ✅ Adicionado 'supervisor' na condição do campo |
| `src/components/admin/UserCreateForm.tsx` | ✅ Adicionado 'supervisor' na condição do campo |
| Ambos | ✅ Descrição diferenciada por role |

---

## 🎉 **RESUMO**

✅ **Problema:** Setores não migravam automaticamente para usuários  
✅ **Causa:** É necessário atribuir manualmente via interface  
✅ **Solução:** Interface agora permite atribuir setores a supervisores também  
✅ **Como Fazer:** Editar usuário → Selecionar setores → Salvar  

---

**Pronto! Agora você pode atribuir setores aos seus usuários!** 🚀

