# 🚀 Como Iniciar o Backend - SISPAT 2.0

## ⚠️ Problema Atual

O backend está com erro: `'ts-node' não é reconhecido como um comando interno`

---

## ✅ Solução Rápida

### **Opção 1: Script Automático**

1. Abra um **novo terminal** (PowerShell ou CMD)
2. Navegue até a pasta backend:
   ```bash
   cd backend
   ```
3. Execute o script de correção:
   ```bash
   .\fix-backend.bat
   ```

---

### **Opção 2: Comandos Manuais**

1. **Pare o processo atual** (Ctrl+C no terminal do backend)

2. **Navegue até a pasta backend**:
   ```bash
   cd backend
   ```

3. **Reinstale as dependências do TypeScript**:
   ```bash
   npm install -D ts-node typescript @types/node
   ```

4. **Regenere o Prisma Client**:
   ```bash
   npx prisma generate
   ```

5. **Inicie o backend**:
   ```bash
   npm run dev
   ```

---

### **Opção 3: Usar npx (Mais Confiável)**

1. **Pare o processo atual** (Ctrl+C)

2. **Navegue até backend**:
   ```bash
   cd backend
   ```

3. **Inicie com npx**:
   ```bash
   npx nodemon --exec npx ts-node src/index.ts
   ```

---

## 🎯 Verificar se Funcionou

Após iniciar, você deve ver:

```
🚀 Servidor rodando na porta 3000
✅ Conectado ao banco de dados PostgreSQL
```

---

## 🔧 Correção de Permissões Aplicada

Já corrigi as permissões no backend:

### Antes:
- ❌ Criar/Editar: `admin`, `gestor`
- ❌ Excluir: `admin`

### Depois:
- ✅ Criar/Editar: `admin`, `supervisor`, `superuser`
- ✅ Excluir: `admin`, `superuser`

---

## 📋 Checklist

- [ ] Backend iniciado sem erros
- [ ] Mensagem "Servidor rodando na porta 3000" apareceu
- [ ] Recarreguei o navegador (F5)
- [ ] Tentei criar um tipo de bem novamente

---

## 🆘 Se Ainda Não Funcionar

1. **Feche TODOS os terminais**
2. **Abra um novo terminal**
3. **Execute**:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npm run dev
   ```

---

**Última Atualização**: 08/10/2025
**Status**: Permissões corrigidas ✅
