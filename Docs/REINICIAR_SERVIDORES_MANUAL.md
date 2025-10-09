# 🔄 REINICIAR SERVIDORES - MANUAL

**Situação:** Após as correções, os servidores precisam ser reiniciados

---

## ⚠️ **IMPORTANTE:**

Foi aplicada uma **atualização no schema do Prisma** que adicionou novos campos à tabela `sectors`:
- ✅ `sigla`
- ✅ `endereco`
- ✅ `cnpj`
- ✅ `responsavel`
- ✅ `parentId`

O **Prisma Client foi regenerado** e agora está sincronizado.

---

## 🚀 **EXECUTE PASSO A PASSO:**

### **PASSO 1: Fechar Tudo**

1. **Feche TODOS os terminais** que estão rodando
2. **Feche o navegador** (ou apenas a aba do localhost:8080)
3. **Aguarde 5 segundos**

---

### **PASSO 2: Abrir Terminal do Backend**

1. Abra um **novo PowerShell** ou **CMD**
2. Execute:
   ```bash
   cd "D:\novo ambiente\sispat - Copia\backend"
   npm run dev
   ```
3. **Aguarde aparecer:**
   ```
   🔍 Validando variáveis de ambiente...
   ✅ Todas as variáveis configuradas
   ✅ Conectado ao banco de dados PostgreSQL
   🚀 Servidor rodando em: http://localhost:3000
   ```

**Se der erro de compilação TypeScript:**
```bash
# Execute primeiro:
npx prisma generate
# Depois tente novamente:
npm run dev
```

---

### **PASSO 3: Abrir Terminal do Frontend**

1. Abra **outro PowerShell/CMD** (novo terminal)
2. Execute:
   ```bash
   cd "D:\novo ambiente\sispat - Copia"
   npm run dev
   ```
3. **Aguarde aparecer:**
   ```
   VITE ready in XXX ms
   ➜ Local:   http://localhost:8080
   ```

---

### **PASSO 4: Acessar o Sistema**

1. **Abra o navegador:** `http://localhost:8080`

2. **Faça login:**
   ```
   Email: supervisor@dev.com
   Senha: Supervisor@123!
   ```

3. **Teste as funcionalidades:**

---

## 🧪 **TESTES A FAZER:**

### **Teste 1: Criar Forma de Aquisição**

1. **Administração** → **Formas de Aquisição**
2. **"Nova Forma"**
3. Preencher:
   ```
   Nome: Compra
   Descrição: Aquisição através de compra direta
   ```
4. **Salvar**
5. ✅ Deve criar sem erro 403

### **Teste 2: Editar Setor (TODOS OS CAMPOS)**

1. **Administração** → **Gerenciar Setores**
2. **"Editar"** em qualquer setor
3. Preencher **TODOS** os campos:
   ```
   Nome: Secretaria de Administração
   Sigla: SEC-ADM
   Código: 01
   Endereço: Rua Principal, 123
   CNPJ: 12.345.678/0001-90
   Responsável: João Silva
   Setor Pai: (deixe vazio ou selecione outro)
   ```
4. **Salvar**
5. **Editar novamente** o mesmo setor
6. ✅ Todos os campos devem estar preenchidos!

### **Teste 3: Ver Logs no Backend**

No terminal do backend, você deve ver:
```
[DEV] 🔄 Atualizando setor: {
  id: '...',
  dadosRecebidos: {
    name: 'Secretaria de Administração',
    sigla: 'SEC-ADM',
    codigo: '01',
    endereco: 'Rua Principal, 123',
    cnpj: '12.345.678/0001-90',
    responsavel: 'João Silva',
    parentId: null
  }
}
[DEV] 📊 Setor atual: { ... }
[DEV] 📝 Dados a atualizar: { ... }
[DEV] ✅ Setor atualizado: { ... }
```

---

## 🐛 **SE DER ERRO:**

### **Erro: "Unable to compile TypeScript" com "sigla does not exist"**

**Solução:**
```bash
cd backend
npx prisma generate
npm run dev
```

### **Erro: "EPERM: operation not permitted"**

**Solução:**
```bash
# Fechar TODOS os terminais
# Aguardar 10 segundos
# Abrir PowerShell COMO ADMINISTRADOR
cd "D:\novo ambiente\sispat - Copia\backend"
rd /s /q "node_modules\.prisma"
npx prisma generate
npm run dev
```

### **Erro: Porta 3000 ou 8080 em uso**

**Solução:**
```bash
# Matar processos Node
taskkill /F /IM node.exe
# Aguardar 5 segundos
# Iniciar novamente
```

---

## ✅ **CHECKLIST:**

- [ ] Fechou todos os terminais antigos?
- [ ] Abriu novo terminal para backend?
- [ ] Executou `npm run dev` no backend?
- [ ] Backend mostra "Servidor rodando em: http://localhost:3000"?
- [ ] Abriu outro terminal para frontend?
- [ ] Executou `npm run dev` no frontend?
- [ ] Frontend mostra "Local: http://localhost:8080"?
- [ ] Acessou http://localhost:8080 no navegador?
- [ ] Fez login como supervisor?
- [ ] Testou editar setor?

---

## 🎯 **RESULTADO ESPERADO:**

✅ Backend rodando na porta 3000  
✅ Frontend rodando na porta 8080  
✅ Todos os campos do setor salvam corretamente  
✅ Sem erros 403 ao criar/editar configurações  
✅ Logs de debug mostrando todas as operações  

---

**Execute os passos acima e cole aqui qualquer erro que aparecer!** 🚀

