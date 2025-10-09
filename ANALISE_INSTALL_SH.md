# 🔍 ANÁLISE COMPLETA DO install.sh

**Data:** 09/10/2025  
**Versão Analisada:** Atual (1937 linhas)  
**Status:** ⚠️ **PROBLEMAS IDENTIFICADOS**

---

## ❌ PROBLEMAS ENCONTRADOS

### **1. Frontend: pnpm install --frozen-lockfile (Linha 924)**

**Problema:**
```bash
pnpm install --frozen-lockfile
```

**Por quê está travando:**
- `--frozen-lockfile` requer que o `pnpm-lock.yaml` seja idêntico
- Em produção, pode causar conflitos silenciosos
- Processo trava sem mensagem de erro

**Solução:**
```bash
pnpm install --no-frozen-lockfile
# OU
npm install --legacy-peer-deps
```

---

### **2. Backend: Usa npm install (Linha 969)**

**Problema:**
```bash
npm install  # ← Correto, mas inconsistente com frontend
```

**Frontend usa pnpm, Backend usa npm** → Inconsistência!

**Solução:** Padronizar para usar `npm` em ambos ou `pnpm` em ambos.

---

### **3. Script preinstall bloqueia npm (package.json linha 19)**

**Problema:**
```json
"preinstall": "npx only-allow pnpm"
```

Se o install.sh usar `npm`, o preinstall vai BLOQUEAR!

**Solução:** Remover `preinstall` do package.json OU usar pnpm em tudo.

---

### **4. Falta timeout para processos travados**

**Problema:**
```bash
pnpm install > /tmp/build-frontend-deps.log 2>&1 &
show_spinner $deps_pid "Instalando..."
wait $deps_pid  # ← Pode travar para sempre
```

**Solução:** Adicionar timeout:
```bash
timeout 600 pnpm install  # 10 minutos máximo
```

---

### **5. Browser-image-compression pode não estar no lock**

**Problema:**
Adicionamos `browser-image-compression` recentemente, mas o `pnpm-lock.yaml` no GitHub pode estar desatualizado.

**Solução:** Remover `--frozen-lockfile` ou fazer `pnpm install` localmente e commitar o lock atualizado.

---

## ✅ O QUE ESTÁ CORRETO

1. ✅ Instala Node.js 18
2. ✅ Instala PostgreSQL
3. ✅ Instala Nginx
4. ✅ Configura .env corretamente
5. ✅ Instala dependências do backend com npm
6. ✅ Compila backend com tsc
7. ✅ Gera Prisma Client
8. ✅ Aplica migrations
9. ✅ Executa seed
10. ✅ Configura PM2
11. ✅ Configura Nginx
12. ✅ Oferece SSL

---

## 🔧 CORREÇÕES NECESSÁRIAS

### **Correção 1: Linha 924 - Remover --frozen-lockfile**

```bash
# ANTES:
pnpm install --frozen-lockfile > /tmp/build-frontend-deps.log 2>&1 &

# DEPOIS:
pnpm install --no-frozen-lockfile > /tmp/build-frontend-deps.log 2>&1 &
```

---

### **Correção 2: Adicionar timeout**

```bash
# ANTES:
pnpm install --frozen-lockfile > /tmp/build-frontend-deps.log 2>&1 &

# DEPOIS:
timeout 600 pnpm install --no-frozen-lockfile > /tmp/build-frontend-deps.log 2>&1 &
```

---

### **Correção 3: Remover preinstall do package.json**

```json
// REMOVER esta linha:
"preinstall": "npx only-allow pnpm",
```

---

### **Correção 4: Usar npm em tudo (mais confiável)**

```bash
# Linha 924:
npm install --legacy-peer-deps > /tmp/build-frontend-deps.log 2>&1 &

# Linha 944:
npm run build > /tmp/build-frontend.log 2>&1 &

# Linha 969: (já usa npm, manter)
npm install > /tmp/build-backend-deps.log 2>&1 &
```

---

## 📊 RESUMO

| Item | Status | Crítico? |
|------|--------|----------|
| Frontend deps install | ❌ Trava | SIM |
| Backend deps install | ✅ OK | NÃO |
| Frontend build | ⚠️ Depende | SIM |
| Backend build | ✅ OK | NÃO |
| Preinstall script | ❌ Bloqueia npm | SIM |
| Timeout protection | ❌ Não tem | SIM |
| browser-image-compression | ✅ Adicionado | NÃO |

---

## 🎯 AÇÃO RECOMENDADA

### **Aplicar 3 correções no install.sh:**

1. ✅ Linha 924: Trocar `pnpm` por `npm --legacy-peer-deps`
2. ✅ Linha 944: Trocar `pnpm run` por `npm run`
3. ✅ Adicionar `timeout 600` antes dos comandos

### **Aplicar 1 correção no package.json:**

1. ✅ Remover linha do `preinstall`

---

**Quer que eu aplique essas correções agora? 🚀**

