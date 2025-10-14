# 🔧 CORREÇÕES: SETORES E INVENTÁRIO

## 📅 Data: 14/10/2025

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. **Setores não filtrados por permissão**
- **Sintoma:** Usuários comuns viam TODOS os setores do sistema
- **Impacto:** 
  - Gerar Relatório mostrava todos os setores
  - Gerar Inventário mostrava todos os setores
  - Violação de segurança e controle de acesso

### 2. **Erro 400 ao criar inventário**
- **Sintoma:** `POST http://sispat.vps-kinghost.net/api/inventarios 400 (Bad Request)`
- **Causa:** Desalinhamento entre frontend e backend
  - Frontend enviava: `name`, `sectorName`, `createdAt`
  - Backend esperava: `title`, `setor`, `dataInicio`

### 3. **Supervisor via setores de todos em relatórios**
- **Sintoma:** Ao clicar em gerar relatório, não conseguia selecionar setor específico
- **Causa:** Filtro de setores não implementado corretamente

---

## ✅ CORREÇÕES APLICADAS

### 📄 Arquivo 1: `src/pages/inventarios/InventarioCreate.tsx`

**O que foi corrigido:**
- Adicionado hook `useAuth()` para obter dados do usuário
- Criado `allowedSectors` que filtra setores baseado em:
  - **Admin/Supervisor:** Vê TODOS os setores
  - **Usuário normal:** Vê apenas setores em `responsibleSectors`

**Código adicionado:**
```typescript
const { user } = useAuth()

const allowedSectors = useMemo(() => {
  if (!user) return []
  // Admin e Supervisor veem TODOS os setores
  if (user.role === 'admin' || user.role === 'supervisor') {
    return sectors.map((s) => ({ value: s.name, label: s.name }))
  }
  // Usuário normal vê apenas seus setores responsáveis
  const userSectors = user.responsibleSectors || []
  return sectors
    .filter((s) => userSectors.includes(s.name))
    .map((s) => ({ value: s.name, label: s.name }))
}, [sectors, user])

const sectorOptions: SearchableSelectOption[] = allowedSectors
```

---

### 📄 Arquivo 2: `src/pages/analise/RelatoriosDepreciacao.tsx`

**O que foi corrigido:**
- Adicionado `useAuth()` import
- Implementado mesmo filtro de setores do arquivo anterior

**Código adicionado:**
```typescript
import { useAuth } from '@/hooks/useAuth'

const { user } = useAuth()

const allowedSectors = useMemo(() => {
  // ... mesmo código de filtro
}, [sectors, user])

const sectorOptions: SearchableSelectOption[] = allowedSectors
```

---

### 📄 Arquivo 3: `src/components/ferramentas/ReportFilterDialog.tsx`

**O que foi corrigido:**
- Adicionado `useAuth()` e `useMemo` imports
- Implementado filtro de setores no dialog de filtros

**Código adicionado:**
```typescript
import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'

const { user } = useAuth()

const allowedSectors = useMemo(() => {
  // ... mesmo código de filtro
}, [sectors, user])

const sectorOptions = allowedSectors
```

---

### 📄 Arquivo 4: `src/contexts/InventoryContext.tsx`

**O que foi corrigido:**
- Mapeamento correto de campos para o backend
- Conversão da resposta do backend para o formato do frontend

**Código alterado:**
```typescript
// ✅ Mapear campos para o formato que o backend espera
const inventoryPayload = {
  title: name, // Backend espera 'title' ao invés de 'name'
  description: `Inventário do setor ${sectorName}`,
  setor: sectorName, // Backend espera 'setor' ao invés de 'sectorName'
  local: specificLocationId || locationType || '',
  dataInicio: new Date().toISOString(), // Backend espera 'dataInicio'
  scope,
  municipalityId: '1',
}

const newInventory = await api.post<Inventory>('/inventarios', inventoryPayload)

// ✅ Mapear resposta do backend para o formato do frontend
const inventoryData: Inventory = {
  ...newInventory,
  name: newInventory.title || name,
  sectorName: newInventory.setor || sectorName,
  status: 'in_progress' as const,
  createdAt: newInventory.dataInicio || new Date(),
  items,
  scope,
  locationType,
  specificLocationId,
}

return inventoryData
```

---

### 📄 Arquivo 5: `backend/src/controllers/inventarioController.ts`

**O que foi corrigido:**
- Validações melhoradas e mais específicas
- Aceita campo `scope` do frontend
- Mensagens de erro mais claras
- Logs de debug adicionados

**Código alterado:**
```typescript
export const createInventario = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { title, description, setor, local, dataInicio, scope } = req.body;

    console.log('📝 [DEV] Criando inventário:', { title, description, setor, local, dataInicio, scope });

    // ✅ Validações melhoradas
    if (!title) {
      res.status(400).json({ error: 'O título do inventário é obrigatório' });
      return;
    }

    if (!setor) {
      res.status(400).json({ error: 'O setor é obrigatório' });
      return;
    }

    const inventario = await prisma.inventory.create({
      data: {
        title,
        description: description || '',
        responsavel: userId!,
        setor,
        local: local || '',
        dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
        status: 'em_andamento',
        scope: scope || 'sector', // ✅ Usar scope enviado pelo frontend
      },
      include: {
        items: true,
      },
    });

    console.log('✅ [DEV] Inventário criado:', inventario);

    // ... resto do código
  } catch (error) {
    console.error('❌ [DEV] Erro ao criar inventário:', error);
    res.status(500).json({ error: 'Erro ao criar inventário' });
  }
};
```

---

## 🚀 DEPLOY NO SERVIDOR

### Comandos para executar NO SERVIDOR:

```bash
cd /var/www/sispat

# Se estiver usando git
git pull

# 1. Compilar Frontend
npm run build

# 2. Compilar Backend
cd backend
npm run build

# 3. Reiniciar Backend
pm2 restart sispat-backend

# 4. Recarregar Nginx
sudo systemctl reload nginx

# 5. Verificar logs
pm2 logs sispat-backend --lines 50
```

---

## ✅ TESTES

### Teste 1: Filtro de Setores para Usuário

1. Faça login como **USUÁRIO** (não admin/supervisor)
2. Vá em **"Gerar Inventário"**
3. ✅ Você deve ver **APENAS** os setores atribuídos a você
4. Vá em **"Gerar Relatório"**
5. ✅ Você deve ver **APENAS** os setores atribuídos a você

### Teste 2: Filtro de Setores para Supervisor

1. Faça login como **SUPERVISOR**
2. Vá em **"Gerar Inventário"**
3. ✅ Você deve ver **TODOS** os setores
4. ✅ Deve conseguir selecionar setor específico
5. Vá em **"Gerar Relatório"**
6. ✅ Você deve ver **TODOS** os setores

### Teste 3: Criar Inventário

1. Faça login como **USUÁRIO** ou **SUPERVISOR**
2. Vá em **"Gerar Inventário"**
3. Preencha o formulário e clique em **"Criar"**
4. ✅ **NÃO deve dar erro 400**
5. ✅ Inventário deve ser criado com sucesso
6. Verifique no console do backend os logs:
   - `📝 [DEV] Criando inventário:`
   - `✅ [DEV] Inventário criado:`

---

## 📊 LÓGICA DE PERMISSÕES

### Matriz de Permissões de Setores:

| Role       | Visualiza Setores | Pode Criar Inventário | Pode Gerar Relatório |
|------------|-------------------|----------------------|----------------------|
| **Admin**      | TODOS             | ✅ TODOS             | ✅ TODOS             |
| **Supervisor** | TODOS             | ✅ TODOS             | ✅ TODOS             |
| **Usuário**    | Apenas atribuídos | ✅ Apenas atribuídos | ✅ Apenas atribuídos |
| **Visualizador** | Apenas atribuídos | ❌ Não pode criar   | ✅ Apenas atribuídos |

### Onde está atribuído?

O campo `responsibleSectors` no objeto `user` contém um array de nomes de setores:

```typescript
user.responsibleSectors = ["Secretaria de Educação", "Secretaria de Saúde"]
```

---

## 🔍 DEBUG

### Verificar setores do usuário logado:

No console do navegador:
```javascript
// Ver dados do usuário
console.log('User:', JSON.parse(localStorage.getItem('user')))

// Ver setores responsáveis
const user = JSON.parse(localStorage.getItem('user'))
console.log('Setores responsáveis:', user.responsibleSectors)
```

### Verificar logs do backend:

```bash
pm2 logs sispat-backend --lines 100
```

Procure por:
- `📝 [DEV] Criando inventário:`
- `✅ [DEV] Inventário criado:`
- `❌ [DEV] Erro ao criar inventário:`

---

## 📝 OBSERVAÇÕES

1. **Sincronização de dados:** As correções de sincronização entre navegadores (polling 5s) já foram aplicadas anteriormente
2. **Cache do navegador:** Se não ver as mudanças, limpe o cache: `Ctrl+Shift+Delete`
3. **Credenciais padrão:**
   - Supervisor: `supervisor@ssbv.com` / `Master6273@`
   - Admin: `admin@sistema.com` / `Tiko6273@`

---

## ✅ STATUS: TODAS AS CORREÇÕES APLICADAS

- ✅ Filtro de setores em Inventário
- ✅ Filtro de setores em Relatórios  
- ✅ Filtro de setores em Dialog de Filtros
- ✅ Alinhamento frontend-backend para inventário
- ✅ Validações melhoradas no backend
- ✅ Logs de debug adicionados

**Pronto para deploy! 🚀**

