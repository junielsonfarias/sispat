# 🔧 CORREÇÃO: Erro "b is not a function" no SearchableSelect

## 📅 Data: 14/10/2025
## 🔗 Commit: 6d69cf2

---

## ⚠️ PROBLEMA

**Erro no console ao selecionar setor em Relatórios:**

```
Uncaught TypeError: b is not a function
    at Object.onSelect (searchable-select-Bf3Ih5qV.js:1:1151)
```

### Causa Raiz:
O componente `SearchableSelect` esperava a prop `onChange`, mas em alguns lugares estava sendo usado `onValueChange`, causando o erro quando tentava chamar o callback.

---

## ✅ CORREÇÕES APLICADAS

### 1. **`src/components/ferramentas/ReportFilterDialog.tsx`**

**Problema:**
```typescript
// ❌ ERRADO
<SearchableSelect
  value={field.value}
  onValueChange={field.onChange}  // Prop incorreta
/>
```

**Correção:**
```typescript
// ✅ CORRETO
<SearchableSelect
  value={field.value}
  onChange={field.onChange}  // Prop correta
/>
```

**Arquivos corrigidos:**
- Campo "Setor Responsável" (linha 173)
- Campo "Tipo de Bem" (linha 196)

---

### 2. **`src/pages/analise/RelatoriosDepreciacao.tsx`**

**Problema 1:** Estado usando `null` ao invés de string vazia
```typescript
// ❌ ERRADO
const [selectedSector, setSelectedSector] = useState<string | null>(null)
```

**Correção:**
```typescript
// ✅ CORRETO
const [selectedSector, setSelectedSector] = useState<string>('')
```

**Problema 2:** Prop `isClearable` não suportada
```typescript
// ❌ ERRADO
<SearchableSelect
  isClearable  // Prop não existia
/>
```

**Correção:**
```typescript
// ✅ CORRETO
<SearchableSelect
  // Prop removida (agora já é suportada, mas não necessária aqui)
/>
```

---

### 3. **`src/components/ui/searchable-select.tsx`**

**Problema:** Prop `isClearable` estava sendo usada em vários lugares mas não estava definida

**Correção:** Adicionada prop `isClearable` à interface
```typescript
interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  isLoading?: boolean
  disabled?: boolean
  isClearable?: boolean  // ✅ Nova prop adicionada
}
```

**Nota:** A prop foi adicionada para evitar erros TypeScript, mas a funcionalidade de "limpar" já existia (clicar 2x no mesmo item limpa a seleção).

---

## 🔍 LOCAIS QUE USAVAM `isClearable`:

Agora todos funcionam corretamente:
- ✅ `src/pages/admin/ActivityLog.tsx`
- ✅ `src/components/admin/UserEditForm.tsx`
- ✅ `src/components/admin/UserCreateForm.tsx`
- ✅ `src/pages/inventarios/InventariosList.tsx`
- ✅ `src/pages/ferramentas/Exportacao.tsx`
- ✅ `src/components/admin/SectorForm.tsx`
- ✅ `src/components/admin/SectorLocalForm.tsx`
- ✅ `src/components/bens/ExportConfigDialog.tsx`
- ✅ `src/pages/superuser/AssetsByUser.tsx`

---

## 🧪 TESTES

### Teste 1: Selecionar Setor em Relatório
1. Faça login como **SUPERVISOR**
2. Vá em **"Gerar Relatório"**
3. Clique no campo **"Filtrar por setor..."**
4. Selecione um setor
5. ✅ **NÃO deve dar erro** no console
6. ✅ Setor deve ser selecionado corretamente

### Teste 2: Filtro de Relatório com Dialog
1. Vá em **Ferramentas > Relatórios**
2. Clique em **"Gerar"** em qualquer template
3. No dialog de filtros, selecione um **Setor**
4. Selecione um **Tipo de Bem**
5. ✅ **NÃO deve dar erro** no console
6. ✅ Filtros devem ser aplicados corretamente

### Teste 3: Limpar Seleção (isClearable)
1. Em qualquer `SearchableSelect` com `isClearable`
2. Selecione uma opção
3. Clique **novamente** na mesma opção
4. ✅ Seleção deve ser limpa

---

## 📊 RESUMO DAS MUDANÇAS

| Arquivo | Linhas Alteradas | Mudança |
|---------|-----------------|---------|
| `ReportFilterDialog.tsx` | 173, 196 | `onValueChange` → `onChange` |
| `RelatoriosDepreciacao.tsx` | 49, 168 | Tipo `null` → `''`, removido `isClearable` |
| `searchable-select.tsx` | 34, 46 | Adicionado prop `isClearable?: boolean` |

---

## 🚀 COMO APLICAR

### NO SERVIDOR DE PRODUÇÃO:

```bash
cd /var/www/sispat

# Atualizar código
git pull origin main

# Recompilar frontend
npm run build

# Recompilar backend (se necessário)
cd backend && npm run build && cd ..

# Reiniciar serviços
pm2 restart sispat-backend
sudo systemctl reload nginx
```

---

## 🔧 ROLLBACK (SE NECESSÁRIO)

Se houver problemas:

```bash
cd /var/www/sispat
git checkout 9fa211c  # Commit anterior
npm run build
pm2 restart sispat-backend
sudo systemctl reload nginx
```

---

## ✅ VALIDAÇÃO

Após o deploy, verifique:

1. ✅ Console do navegador **SEM ERROS** `TypeError: b is not a function`
2. ✅ Seleção de setores **FUNCIONANDO** em relatórios
3. ✅ Filtros de relatórios **FUNCIONANDO** corretamente
4. ✅ Todos os `SearchableSelect` no sistema **FUNCIONANDO**

---

## 📝 OBSERVAÇÕES

1. **Compatibilidade:** A correção é **100% retrocompatível**
2. **Performance:** Nenhum impacto na performance
3. **Segurança:** Nenhum impacto na segurança
4. **Testes:** Todos os lints passaram ✅

---

## 🆘 SUPORTE

Se encontrar problemas:

1. Verifique o console do navegador (F12)
2. Verifique os logs do backend: `pm2 logs sispat-backend`
3. Limpe o cache do navegador (Ctrl+Shift+Delete)
4. Tente em uma aba anônima

---

**Status:** ✅ CORRIGIDO E PRONTO PARA DEPLOY

