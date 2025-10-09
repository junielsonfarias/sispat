# 🚀 COMO INICIAR O BACKEND - SISPAT 2.0

## 📋 **MÉTODOS PARA INICIAR O BACKEND**

---

## ✅ **MÉTODO 1: Script Automático (RECOMENDADO)**

### **Windows:**

```bash
# No diretório raiz do projeto
.\iniciar-backend.bat
```

O script fará automaticamente:
1. ✅ Verificar dependências
2. ✅ Gerar Prisma Client
3. ✅ Aplicar migrações
4. ✅ Iniciar servidor

---

## ✅ **MÉTODO 2: Manual (Passo a Passo)**

### **1. Abrir terminal no diretório backend:**

```bash
cd backend
```

### **2. Instalar dependências (se necessário):**

```bash
pnpm install
```

### **3. Gerar Prisma Client:**

```bash
pnpm exec prisma generate
```

### **4. Aplicar migrações:**

```bash
pnpm exec prisma migrate deploy
```

### **5. Iniciar servidor:**

```bash
pnpm dev
```

---

## ✅ **MÉTODO 3: Com PM2 (Produção)**

```bash
cd backend

# Iniciar com PM2
pm2 start ecosystem.config.js --env development

# Ver status
pm2 status

# Ver logs
pm2 logs sispat-backend

# Parar
pm2 stop sispat-backend

# Reiniciar
pm2 restart sispat-backend
```

---

## 🔧 **TROUBLESHOOTING**

### **Problema 1: "Cannot find module '@prisma/client'"**

**Solução:**
```bash
cd backend
pnpm exec prisma generate
```

### **Problema 2: "Prisma schema is not in sync"**

**Solução:**
```bash
cd backend
pnpm exec prisma migrate deploy
```

### **Problema 3: "Port 3000 already in use"**

**Solução:**
```bash
# Windows: Matar processos na porta 3000
taskkill /F /IM node.exe

# Ou mudar porta no .env
PORT=3001
```

### **Problema 4: "Database connection failed"**

**Verificar:**
```bash
# 1. PostgreSQL está rodando?
docker ps

# 2. Credenciais corretas no .env?
cat backend/.env

# 3. Testar conexão
pnpm exec prisma db pull
```

### **Problema 5: "EADDRINUSE: address already in use"**

**Solução:**
```bash
# Encontrar processo na porta
netstat -ano | findstr :3000

# Matar processo (substitua PID)
taskkill /PID <PID> /F
```

---

## ✅ **VERIFICAR SE ESTÁ FUNCIONANDO**

### **1. Health Check:**

```bash
curl http://localhost:3000/api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-09T...",
  "uptime": 123,
  "environment": "development"
}
```

### **2. Ver Logs:**

```bash
cd backend
tail -f logs/combined-$(date +%Y-%m-%d).log
```

### **3. Testar Endpoint:**

```bash
curl http://localhost:3000/api/patrimonios
# Deve pedir autenticação
```

---

## 🔄 **REINICIAR BACKEND**

### **Se estiver rodando normalmente:**

```bash
# Ctrl+C no terminal do backend
# Depois:
pnpm dev
```

### **Se estiver com PM2:**

```bash
pm2 restart sispat-backend
```

### **Se estiver travado:**

```bash
# Matar todos os processos Node
taskkill /F /IM node.exe

# Aguardar 2 segundos
timeout /t 2

# Iniciar novamente
cd backend
pnpm dev
```

---

## 📊 **COMANDOS ÚTEIS**

```bash
# Status do PostgreSQL
docker ps

# Logs do PostgreSQL
docker logs sispat-postgres

# Reiniciar PostgreSQL
docker restart sispat-postgres

# Ver processos Node
tasklist | findstr node

# Ver porta 3000
netstat -ano | findstr :3000

# Compilar TypeScript
cd backend
pnpm build

# Rodar produção
pnpm start
```

---

## 🎯 **SCRIPT RÁPIDO DE REINICIALIZAÇÃO**

Crie um arquivo `reiniciar-backend.bat`:

```batch
@echo off
echo Parando processos Node...
taskkill /F /IM node.exe 2>nul

echo Aguardando...
timeout /t 2 /nobreak >nul

echo Iniciando backend...
cd backend
pnpm dev
```

Uso:
```bash
.\reiniciar-backend.bat
```

---

## ✅ **LOGS PARA VERIFICAR**

O backend está funcionando quando você ver:

```
🚀 Servidor rodando na porta 3000
📊 Banco de dados conectado
✅ Migrações aplicadas
🔒 Middlewares carregados
📡 Rotas registradas
```

---

**Se precisar de ajuda adicional, me avise qual erro específico está vendo! 🚀**
