# ⚡ INSTRUÇÕES URGENTES - Resolver Erro 500

## 🚨 IMPORTANTE: O BACKEND ESTÁ RODANDO

O erro `EPERM: operation not permitted` ocorre porque o **backend ainda está em execução** e está usando os arquivos do Prisma.

---

## ✅ SOLUÇÃO EM 4 PASSOS SIMPLES

### **PASSO 1: Parar o Backend Manualmente** 🔴

**Encontre a janela do PowerShell com o backend rodando e:**

1. Clique na janela do PowerShell que mostra:
   ```
   Iniciando servidor na porta 3000...
   ```

2. Pressione: **`Ctrl + C`**

3. Aguarde aparecer:
   ```
   Servidor parado
   ```

4. **Feche a janela** do PowerShell

**OU use o Gerenciador de Tarefas:**
1. Pressione `Ctrl + Shift + Esc`
2. Procure por processos **Node.js**
3. Clique com botão direito → **Finalizar Tarefa**

---

### **PASSO 2: Parar o Frontend (se estiver rodando)**

Faça o mesmo para a janela que mostra:
```
Vite dev server rodando na porta 8080...
```

1. Pressione **`Ctrl + C`**
2. Feche a janela

---

### **PASSO 3: Executar Script de Atualização** ⚡

**Abra um NOVO PowerShell como Administrador:**

1. Pressione `Windows + X`
2. Escolha "Windows PowerShell (Admin)" ou "Terminal (Admin)"
3. Navegue para o projeto:
   ```powershell
   cd "d:\novo ambiente\sispat - Copia"
   ```

4. Execute o script:
   ```powershell
   .\ATUALIZAR-BANCO-FICHAS.ps1
   ```

---

### **PASSO 4: Aguardar e Testar** ✅

O script fará:
- ✅ Gerar Prisma Client (~30 segundos)
- ✅ Criar tabela no banco (~10 segundos)
- ✅ Criar templates padrão (~10 segundos)
- ✅ Iniciar sistema automaticamente

**Depois:**
- ✅ Navegue: `Menu → Ferramentas → Gerenciador de Fichas`
- ✅ Teste criar um template
- ✅ **DEVE FUNCIONAR!**

---

## 🔧 ALTERNATIVA: Comandos Manuais

Se o script não funcionar, execute manualmente:

```powershell
# 1. Navegar para backend
cd "d:\novo ambiente\sispat - Copia\backend"

# 2. Gerar Prisma Client
npx prisma generate

# 3. Criar migração
npx prisma migrate dev --name add_ficha_templates

# 4. Rodar seed
npx prisma db seed

# 5. Voltar para raiz
cd ..

# 6. Iniciar sistema
.\INICIAR-SISTEMA-COMPLETO.ps1
```

---

## ⚠️ SE DER ERRO "EPERM"

**Significa que o backend AINDA está rodando!**

### **Solução Forçada:**

1. **Gerenciador de Tarefas** (`Ctrl + Shift + Esc`)
2. Aba **Detalhes**
3. Procure por **node.exe**
4. Selecione TODOS os processos node.exe
5. Clique **Finalizar Tarefa**
6. Confirme
7. Tente novamente: `npx prisma generate`

---

## ✅ CHECKLIST

Antes de executar o script:

- [ ] ✅ Backend parado (Ctrl + C na janela)
- [ ] ✅ Frontend parado (Ctrl + C na janela)
- [ ] ✅ Todas as janelas do PowerShell fechadas
- [ ] ✅ Processos node.exe finalizados
- [ ] ✅ PowerShell como Administrador aberto
- [ ] ✅ Navegado para o diretório do projeto

Agora execute:
```powershell
.\ATUALIZAR-BANCO-FICHAS.ps1
```

---

## 🎯 RESULTADO ESPERADO

### **Durante a execução você verá:**

```
🔧 Atualizando Sistema com Gerenciador de Fichas
============================================================

1️⃣ Parando sistema em execução...
   ✅ Processos parados!

2️⃣ Navegando para o backend...
   ✅ Diretório correto!

3️⃣ Gerando Prisma Client...
   ✔ Generated Prisma Client
   ✅ Prisma Client gerado com sucesso!

4️⃣ Criando tabela ficha_templates...
   ✔ Migration applied
   ✅ Tabela criada com sucesso!

5️⃣ Criando templates padrão...
   📄 Criando templates de ficha padrão...
   ✅ Templates de ficha padrão criados

6️⃣ Voltando para a raiz...
   ✅ Pronto!

============================================================
✅ ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!
============================================================

🚀 Iniciando sistema...
```

---

## 🎉 DEPOIS DA EXECUÇÃO

1. ✅ Sistema inicia automaticamente
2. ✅ Aguarde ~30 segundos
3. ✅ Faça login
4. ✅ Menu → Ferramentas → Gerenciador de Fichas
5. ✅ **FUNCIONA PERFEITAMENTE!**

---

## 📞 PRECISA DE AJUDA?

**Se algo der errado:**
1. Tire um print do erro
2. Verifique se TODOS os processos node.exe foram parados
3. Execute como Administrador
4. Tente novamente

**Certeza que funcionará após parar o backend!** 🚀

---

## 📅 Informações

**Problema:** Erro 500 ao criar template  
**Causa:** Prisma Client não atualizado  
**Solução:** Parar backend + Gerar client + Migração  
**Tempo:** ~2-3 minutos  
**Complexidade:** ⭐ Simples

**Siga os passos e o sistema funcionará!** ✅
