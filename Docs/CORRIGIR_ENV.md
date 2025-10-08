# ⚠️ CORREÇÃO NECESSÁRIA NO .env

## 🚨 PROBLEMA IDENTIFICADO:

A variável `VITE_API_URL` no arquivo `.env` está configurada **incorretamente**.

**Valor atual:**
```
VITE_API_URL=http://localhost:3000
```

**Valor correto:**
```
VITE_API_URL=http://localhost:3000/api
```

---

## 🔧 COMO CORRIGIR:

### **Opção 1: Editar manualmente**

1. Abra o arquivo `.env` na raiz do projeto
2. Encontre a linha: `VITE_API_URL=http://localhost:3000`
3. Altere para: `VITE_API_URL=http://localhost:3000/api`
4. Salve o arquivo
5. Reinicie o servidor frontend (`Ctrl+C` e depois `pnpm run dev`)

### **Opção 2: Criar .env do zero**

Se o `.env` não existir, copie do exemplo:

```powershell
Copy-Item env.example .env
```

Depois edite e adicione:
```
VITE_API_URL=http://localhost:3000/api
VITE_USE_BACKEND=true
```

---

## ✅ APÓS A CORREÇÃO:

O frontend irá funcionar corretamente com o backend:

- ✅ Login funcionará
- ✅ Todas as rotas estarão corretas
- ✅ Autenticação JWT funcionará
- ✅ CRUD de patrimônios funcionará

---

## 🧪 COMO TESTAR:

Após corrigir, teste o login:

1. Acesse: http://localhost:8080
2. Use as credenciais:
   - **Admin:** admin@ssbv.com / password123
   - **Superuser:** junielsonfarias@gmail.com / Tiko6273@
3. Se logar com sucesso, está tudo OK!

---

## 📝 ARQUIVO .env COMPLETO CORRETO:

```env
# URL da API Backend (INCLUIR /api NO FINAL!)
VITE_API_URL=http://localhost:3000/api

# Usar backend real
VITE_USE_BACKEND=true

# Timeout (opcional)
VITE_API_TIMEOUT=30000

# Ambiente
VITE_ENV=development
```

---

**Data:** 07/10/2025  
**Prioridade:** 🔴 ALTA  
**Tempo estimado:** 2 minutos

