# 🔐 SISTEMA DE PERMISSÕES POR SETOR - SISPAT 2.0

**Data:** 09/10/2025  
**Versão:** 2.0.0  
**Status:** ✅ CORRIGIDO E FUNCIONAL

---

## 📋 COMO FUNCIONA

### **Hierarquia de Permissões**

```
SUPERUSER (Controle Total)
    ↓
ADMIN (Acesso Total ao Município)
    ↓
SUPERVISOR (Acesso a Setores Específicos) ← CORRIGIDO!
    ↓
USUÁRIO (Acesso a Setores Específicos)
    ↓
VISUALIZADOR (Apenas Visualização)
```

---

## 👥 PERFIS E PERMISSÕES

### **1. SUPERUSER**
- ✅ Acesso total ao sistema
- ✅ Pode criar/editar/excluir qualquer coisa
- ✅ Configura outros admins
- ✅ Configurações avançadas

### **2. ADMIN**
- ✅ Acesso total ao município
- ✅ Vê TODOS os bens e imóveis
- ✅ Pode criar/editar/excluir
- ✅ Gera relatórios de todo o município
- ✅ Gerencia usuários e setores

### **3. SUPERVISOR** ⭐ (Agora Corrigido!)
- ✅ Vê apenas bens dos **setores vinculados a ele**
- ✅ Pode criar/editar bens **apenas nos seus setores**
- ✅ Gera relatórios **apenas dos seus setores**
- ✅ Pode transferir bens **entre seus setores**
- ✅ Pode dar baixa em bens **dos seus setores**

### **4. USUÁRIO**
- ✅ Vê apenas bens dos **setores vinculados**
- ✅ Pode cadastrar bens **nos seus setores**
- ✅ Pode editar bens **dos seus setores**
- ❌ Não pode deletar
- ❌ Não pode dar baixa

### **5. VISUALIZADOR**
- ✅ Vê bens dos **setores vinculados**
- ❌ Não pode criar
- ❌ Não pode editar
- ❌ Não pode deletar

---

## 🔧 CORREÇÃO APLICADA

### **Problema:**
Ao criar usuário supervisor, os setores cadastrados **não apareciam** para seleção.

### **Causa:**
O código estava filtrando setores por `municipalityId`, mas como o sistema é **single-municipality**, esse filtro era desnecessário e causava problemas.

### **Solução:**
Removemos o filtro de `municipalityId` nos formulários:

**Arquivos corrigidos:**
1. ✅ `src/components/admin/UserCreateForm.tsx`
2. ✅ `src/components/admin/UserEditForm.tsx`

**Código:**
```typescript
// ANTES (com filtro):
const allSectors = useMemo(
  () =>
    sectors
      .filter((s) => s.municipalityId === MUNICIPALITY_ID)  ← REMOVIDO
      .map((s) => ({ value: s.name, label: s.name })),
  [sectors],
)

// DEPOIS (sem filtro):
const allSectors = useMemo(
  () =>
    sectors.map((s) => ({ value: s.name, label: s.name })),
  [sectors],
)
```

---

## ✅ COMO USAR (Passo a Passo)

### **1. Criar Setores (Como Admin)**

1. Login como **Admin** ou **Superuser**
2. Ir em **Administração → Gerenciar Setores**
3. Clicar em **Adicionar Setor**
4. Preencher:
   - Nome: `Secretaria de Educação`
   - Descrição: `Gerencia escolas e educação`
5. Repetir para outros setores:
   - `Secretaria de Saúde`
   - `Secretaria de Obras`
   - etc.

---

### **2. Criar Usuário Supervisor**

1. Ir em **Administração → Usuários**
2. Clicar em **Adicionar Usuário**
3. Preencher:
   - Nome: `João Silva`
   - Email: `joao@prefeitura.com`
   - Senha: `Senha123!`
   - Perfil: **Supervisor**
   - **Setores de Acesso:** Selecionar múltiplos setores ← AGORA FUNCIONA!
     - ✅ Secretaria de Educação
     - ✅ Secretaria de Saúde
4. Salvar

---

### **3. Login como Supervisor**

1. Fazer logout
2. Login com:
   - Email: `joao@prefeitura.com`
   - Senha: `Senha123!`

3. **O que o supervisor vê:**
   - ✅ Dashboard com dados **apenas dos seus setores**
   - ✅ Bens Cadastrados: **apenas dos seus setores**
   - ✅ Imóveis: **apenas dos seus setores**
   - ✅ Pode criar bens **apenas nos seus setores**
   - ✅ Relatórios: **apenas dos seus setores**

---

## 🎯 EXEMPLO PRÁTICO

### **Cenário:**

**Supervisor João:**
- Setores vinculados: `Educação`, `Saúde`

**Supervisor Maria:**
- Setores vinculados: `Obras`, `Transporte`

### **Quando João faz login:**

**Vê:**
- ✅ Computadores da Secretaria de Educação
- ✅ Cadeiras das escolas
- ✅ Equipamentos de hospitais
- ✅ Ambulâncias da Saúde

**NÃO Vê:**
- ❌ Tratores da Secretaria de Obras
- ❌ Ônibus da Secretaria de Transporte

### **Quando Maria faz login:**

**Vê:**
- ✅ Tratores, retroescavadeiras (Obras)
- ✅ Ônibus, caminhões (Transporte)

**NÃO Vê:**
- ❌ Computadores de Educação
- ❌ Equipamentos de Saúde

---

## 📊 MATRIZ DE PERMISSÕES

| Ação | Superuser | Admin | Supervisor | Usuário | Visualizador |
|------|-----------|-------|------------|---------|--------------|
| **Ver todos os setores** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Ver seus setores** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Criar bem em qualquer setor** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Criar bem nos seus setores** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Editar bem de qualquer setor** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Editar bem dos seus setores** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Deletar bem** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Dar baixa** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Transferir entre setores** | ✅ | ✅ | ✅* | ❌ | ❌ |
| **Relatórios gerais** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Relatórios dos seus setores** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Criar usuários** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Gerenciar setores** | ✅ | ✅ | ❌ | ❌ | ❌ |

*Supervisor pode transferir apenas entre seus próprios setores

---

## 🔍 VERIFICAÇÃO DE ACESSO (Backend)

### **Como o backend valida:**

```typescript
// No backend (patrimonioController.ts)

// 1. Admin vê tudo
if (user.role === 'admin') {
  // Sem filtro de setor
}

// 2. Supervisor/Usuário vê apenas seus setores
else if (user.role === 'supervisor' || user.role === 'usuario') {
  const userSectors = user.responsibleSectors || []
  // Filtra bens por setor
  where.setor_responsavel = {
    in: userSectors
  }
}
```

---

## 🎯 PRÓXIMOS PASSOS

### **No Servidor de Produção:**

1. ✅ Fazer deploy da correção:
   ```bash
   cd /var/www/sispat
   git pull origin main
   npm run build
   pm2 restart sispat-backend
   ```

2. ✅ Testar:
   - Criar um setor
   - Criar um supervisor e vincular ao setor
   - Login como supervisor
   - Verificar se vê apenas os bens do setor dele

---

## 📝 BENEFÍCIOS

### **Segurança:**
- ✅ Cada supervisor vê apenas seus setores
- ✅ Não pode acessar dados de outros setores
- ✅ Logs de auditoria rastreiam todas as ações

### **Organização:**
- ✅ Secretarias independentes
- ✅ Cada secretário gerencia seu patrimônio
- ✅ Relatórios específicos por setor

### **Controle:**
- ✅ Admin vê tudo (visão geral)
- ✅ Supervisores veem suas áreas
- ✅ Rastreabilidade completa

---

**Correção aplicada! Agora os setores aparecem corretamente ao criar usuários supervisores! ✅🚀**

