# 🔧 CORREÇÃO: Setores Não Aparecem ao Criar Usuário

**Problema:** Ao criar usuário supervisor, os setores criados não aparecem para seleção  
**Causa:** Possível incompatibilidade de `municipalityId` entre setores e usuários

---

## 🔍 DIAGNÓSTICO (Execute no Servidor)

```bash
# 1. Conectar ao PostgreSQL
sudo -u postgres psql -d sispat_prod

# 2. Verificar município
SELECT id, name FROM municipalities;

# 3. Verificar setores
SELECT id, name, "municipalityId" FROM sectors;

# 4. Verificar se municipalityId está correto
SELECT 
  s.name as setor,
  s."municipalityId" as setor_municipality,
  m.name as municipality_name
FROM sectors s
LEFT JOIN municipalities m ON s."municipalityId" = m.id;

# 5. Sair
\q
```

---

## ✅ SOLUÇÃO 1: Corrigir municipalityId dos Setores

Se os setores não tiverem `municipalityId` correto:

```bash
# Conectar ao banco
sudo -u postgres psql -d sispat_prod

# Atualizar todos os setores para usar o município correto
UPDATE sectors 
SET "municipalityId" = (SELECT id FROM municipalities LIMIT 1)
WHERE "municipalityId" IS NULL OR "municipalityId" = '';

# Verificar
SELECT name, "municipalityId" FROM sectors;

# Sair
\q
```

---

## ✅ SOLUÇÃO 2: Verificar Constante MUNICIPALITY_ID

A aplicação usa uma constante `MUNICIPALITY_ID`. Vamos verificar se está correta:

```bash
# Ver qual ID está sendo usado no código
cd /var/www/sispat
grep -r "MUNICIPALITY_ID" src/config/

# Ver qual ID está no banco
sudo -u postgres psql -d sispat_prod -c "SELECT id FROM municipalities;"
```

Se forem diferentes, precisa atualizar o código.

---

## ✅ SOLUÇÃO 3: Remover Filtro de Municipality (Single-Municipality)

Como o sistema é para **um único município**, não precisa filtrar por `municipalityId`:

### **Arquivo que precisa ser modificado:**

`src/components/admin/UserCreateForm.tsx` (linha 71-76)

**ANTES:**
```typescript
const allSectors = useMemo(
  () =>
    sectors
      .filter((s) => s.municipalityId === MUNICIPALITY_ID)
      .map((s) => ({ value: s.name, label: s.name })),
  [sectors],
)
```

**DEPOIS:**
```typescript
const allSectors = useMemo(
  () =>
    sectors.map((s) => ({ value: s.name, label: s.name })),
  [sectors],
)
```

---

## 🧪 TESTE RÁPIDO (No Navegador)

1. Abra o sistema: http://sispat.vps-kinghost.net
2. Faça login como admin
3. Vá em **Administração → Usuários**
4. Clique em **Adicionar Usuário**
5. Abra o **Console do navegador** (F12)
6. Digite:

```javascript
// Ver setores disponíveis
console.log('Setores:', window.__SECTORS__)

// Ver dados do usuário logado
console.log('User:', JSON.parse(localStorage.getItem('user')))
```

---

## 🎯 QUAL SOLUÇÃO APLICAR?

### **Recomendação:**

**Use SOLUÇÃO 3** (remover filtro) porque:
- ✅ Sistema é single-municipality
- ✅ Não precisa filtrar por município
- ✅ Mais simples e direto
- ✅ Evita problemas de ID

---

## 💡 CORREÇÃO ADICIONAL

### **UserEditForm também precisa da mesma correção**

Verificar arquivo `src/components/admin/UserEditForm.tsx` e aplicar a mesma mudança.

---

**Quer que eu aplique essas correções agora? 🚀**

