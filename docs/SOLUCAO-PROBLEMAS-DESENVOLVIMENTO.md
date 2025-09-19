# 🔧 Solução de Problemas - Desenvolvimento SISPAT

## 🚨 **Problemas Comuns e Soluções**

### ❌ **Erro 500 - Internal Server Error**

**Sintomas:**

- Frontend carrega mas não consegue fazer login
- Erro: `POST http://localhost:3001/api/auth/ensure-superuser 500`
- Erro: `GET http://localhost:8080/api/municipalities/public 500`

**Causa:** Backend não consegue conectar com banco de dados PostgreSQL

**Solução Rápida:**

```bash
# 1. Parar todos os processos Node.js
taskkill /F /IM node.exe

# 2. Corrigir configuração de desenvolvimento
node scripts/fix-development-setup.js

# 3. Iniciar desenvolvimento
npm run dev
```

**Solução Completa (com PostgreSQL):**

```bash
# 1. Iniciar PostgreSQL (como administrador)
net start postgresql-x64-17

# 2. Criar banco de dados
createdb -U postgres sispat_development

# 3. Configurar .env
# Alterar DISABLE_DATABASE=true para DISABLE_DATABASE=false

# 4. Iniciar desenvolvimento
npm run dev
```

---

### ❌ **"The server does not support SSL connections"**

**Sintomas:**

- Erro no log: `Error: The server does not support SSL connections`
- Backend não consegue conectar com PostgreSQL

**Solução:**

```bash
# Opção 1: Desabilitar banco (recomendado para desenvolvimento)
node scripts/fix-development-setup.js

# Opção 2: Configurar PostgreSQL sem SSL
# Editar .env e adicionar:
DB_SSL_REJECT_UNAUTHORIZED=false
```

---

### ❌ **"Comando não encontrado" ou "Command not found"**

**Sintomas:**

- Erro ao executar scripts
- Comandos npm/pnpm não funcionam

**Solução:**

```bash
# 1. Verificar se Node.js está instalado
node --version
npm --version

# 2. Se não estiver instalado, baixar de: https://nodejs.org

# 3. Reinstalar dependências
npm install
# ou
pnpm install
```

---

### ❌ **"Port 3001 already in use"**

**Sintomas:**

- Backend não consegue iniciar
- Erro: `EADDRINUSE: address already in use :::3001`

**Solução:**

```bash
# 1. Encontrar processo usando a porta
netstat -ano | findstr :3001

# 2. Parar processo (substitua PID pelo número encontrado)
taskkill /PID <PID> /F

# 3. Ou parar todos os processos Node.js
taskkill /F /IM node.exe

# 4. Tentar novamente
npm run dev
```

---

### ❌ **"Port 8080 already in use"**

**Sintomas:**

- Frontend não consegue iniciar
- Erro: `EADDRINUSE: address already in use :::8080`

**Solução:**

```bash
# 1. Encontrar processo usando a porta
netstat -ano | findstr :8080

# 2. Parar processo
taskkill /PID <PID> /F

# 3. Ou usar porta diferente
# Editar .env e alterar VITE_PORT=8081
```

---

### ❌ **Frontend carrega mas mostra erros no console**

**Sintomas:**

- Página carrega mas com erros JavaScript
- Console mostra erros de API

**Solução:**

```bash
# 1. Verificar se backend está rodando
curl http://localhost:3001/api/health

# 2. Se não estiver, iniciar backend
npm run dev:backend

# 3. Em outro terminal, iniciar frontend
npm run dev:frontend
```

---

### ❌ **"Cannot find module" ou "Module not found"**

**Sintomas:**

- Erro ao iniciar aplicação
- Módulos não encontrados

**Solução:**

```bash
# 1. Limpar cache
npm cache clean --force

# 2. Remover node_modules
rmdir /s node_modules

# 3. Reinstalar dependências
npm install

# 4. Tentar novamente
npm run dev
```

---

## 🛠️ **Comandos Úteis para Diagnóstico**

### **Verificar Status dos Serviços:**

```bash
# Verificar se backend está rodando
netstat -an | findstr :3001

# Verificar se frontend está rodando
netstat -an | findstr :8080

# Verificar processos Node.js
Get-Process | Where-Object {$_.ProcessName -like "*node*"}
```

### **Verificar Logs:**

```bash
# Logs de erro do backend
Get-Content logs/error.log -Tail 20

# Logs gerais
Get-Content logs/combined.log -Tail 20

# Logs em tempo real
Get-Content logs/error.log -Wait
```

### **Testar Endpoints:**

```bash
# Testar saúde do backend
curl http://localhost:3001/api/health

# Testar endpoint público
curl http://localhost:3001/api/municipalities/public

# Testar criação de superuser
curl -X POST http://localhost:3001/api/auth/ensure-superuser
```

---

## 🚀 **Scripts de Automação**

### **Script de Correção Rápida:**

```bash
# Corrige configuração de desenvolvimento automaticamente
node scripts/fix-development-setup.js
```

### **Script de Início Inteligente:**

```bash
# Inicia desenvolvimento com verificação automática
npm run dev
```

### **Script de Validação:**

```bash
# Valida configuração e corrige problemas
npm run validate
```

---

## 📋 **Checklist de Solução de Problemas**

### **Antes de Pedir Ajuda:**

- [ ] ✅ Verificou se Node.js está instalado?
- [ ] ✅ Executou `npm install`?
- [ ] ✅ Tentou `node scripts/fix-development-setup.js`?
- [ ] ✅ Parou todos os processos Node.js com `taskkill /F /IM node.exe`?
- [ ] ✅ Verificou se as portas 3001 e 8080 estão livres?
- [ ] ✅ Testou os endpoints com curl?
- [ ] ✅ Verificou os logs de erro?

### **Se ainda não funcionar:**

1. **Copie o erro completo** do console
2. **Execute** `node scripts/fix-development-setup.js`
3. **Teste** `curl http://localhost:3001/api/health`
4. **Envie** o resultado dos comandos acima

---

## 🎯 **Modo de Desenvolvimento vs Produção**

### **Desenvolvimento (Recomendado):**

- ✅ Banco de dados desabilitado (`DISABLE_DATABASE=true`)
- ✅ Dados mockados para testes
- ✅ Configuração simplificada
- ✅ Início rápido

### **Produção:**

- ✅ PostgreSQL configurado
- ✅ SSL habilitado
- ✅ Configurações de segurança
- ✅ Backup automático

---

## 💡 **Dicas Importantes**

1. **Sempre use** `npm run dev` para desenvolvimento
2. **Se der erro 500**, execute `node scripts/fix-development-setup.js`
3. **Para produção**, configure PostgreSQL primeiro
4. **Mantenha** o arquivo `.env` atualizado
5. **Verifique** os logs quando houver problemas

---

## 🆘 **Ainda Precisa de Ajuda?**

Se nenhuma das soluções acima funcionou:

1. **Execute** o script de diagnóstico:

   ```bash
   node scripts/validate-and-fix.js
   ```

2. **Cole** o resultado completo no seu pedido de ajuda

3. **Inclua**:
   - Sistema operacional
   - Versão do Node.js (`node --version`)
   - Erro completo do console
   - Resultado de `curl http://localhost:3001/api/health`

---

**🎉 Com essas soluções, o SISPAT deve funcionar perfeitamente em desenvolvimento!**
