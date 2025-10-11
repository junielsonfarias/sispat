# 🚀 COMANDOS PARA APLICAR EM PRODUÇÃO - TEMA CLARO

**Execute estes comandos NO SERVIDOR para aplicar a correção do tema padrão:**

---

## ⚡ COMANDO ÚNICO (MAIS RÁPIDO)

```bash
cd /var/www/sispat && cp src/contexts/ThemeContext.tsx src/contexts/ThemeContext.tsx.backup && sed -i "s/return (saved as Theme) || 'system'/return (saved as Theme) || 'light'/g" src/contexts/ThemeContext.tsx && npm run build && cd backend && pm2 restart sispat-backend
```

---

## 📋 COMANDOS PASSO A PASSO

### **1. Navegar para o projeto:**
```bash
cd /var/www/sispat
```

### **2. Fazer backup:**
```bash
cp src/contexts/ThemeContext.tsx src/contexts/ThemeContext.tsx.backup
```

### **3. Aplicar correção:**
```bash
sed -i "s/return (saved as Theme) || 'system'/return (saved as Theme) || 'light'/g" src/contexts/ThemeContext.tsx
```

### **4. Verificar alteração:**
```bash
grep -n "return (saved as Theme)" src/contexts/ThemeContext.tsx
```

### **5. Reconstruir frontend:**
```bash
npm run build
```

### **6. Reiniciar backend:**
```bash
cd backend
pm2 restart sispat-backend
```

---

## 🧪 TESTE APÓS APLICAÇÃO

### **1. Verificar se funcionou:**
```bash
cd /var/www/sispat
grep -A 2 -B 2 "return (saved as Theme)" src/contexts/ThemeContext.tsx
```

**Deve mostrar:**
```typescript
return (saved as Theme) || 'light'  // ← 'light' em vez de 'system'
```

### **2. Testar no navegador:**
1. Acesse o sistema
2. Abra DevTools (F12)
3. Application > Local Storage
4. Remova `sispat-theme` se existir
5. Recarregue a página
6. ✅ **Tema deve ser claro**

---

## 🔄 ROLLBACK (SE PRECISAR REVERTER)

```bash
cd /var/www/sispat
cp src/contexts/ThemeContext.tsx.backup src/contexts/ThemeContext.tsx
npm run build
cd backend
pm2 restart sispat-backend
```

---

## ✅ RESULTADO

- **Antes:** Tema padrão era `system` (seguia preferência do sistema)
- **Depois:** Tema padrão é `light` (sempre claro)
- **Impacto:** Novos usuários sempre veem tema claro por padrão

---

**EXECUTE O COMANDO ÚNICO ACIMA NO SERVIDOR! 🚀**
