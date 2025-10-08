# 🚀 INÍCIO RÁPIDO - SISPAT 2.0

## ✅ O QUE JÁ ESTÁ FUNCIONANDO

Baseado nos logs do sistema, **O BACKEND JÁ ESTÁ RODANDO!** 🎉

### **Status Atual:**
- ✅ Backend rodando na porta 3000
- ✅ PostgreSQL rodando no Docker (sispat_postgres)
- ✅ Banco de dados: sispat_db
- ✅ Prisma conectado
- ✅ 5 usuários já cadastrados
- ✅ Login funcionando

---

## 🎯 TESTES IMEDIATOS (1 minuto)

### **TESTE 1: Login via API**

Abra um **NOVO** terminal PowerShell (deixe o backend rodando) e execute:

```powershell
# Fazer login
$body = @{
    email = "admin@ssbv.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $body -ContentType "application/json"

# Mostrar resposta
Write-Host "✅ LOGIN BEM-SUCEDIDO!" -ForegroundColor Green
Write-Host "Token: $($response.token.Substring(0,50))..." -ForegroundColor Cyan
Write-Host "Usuário: $($response.user.name)" -ForegroundColor Cyan
Write-Host "Role: $($response.user.role)" -ForegroundColor Cyan

# Salvar token
$token = $response.token
```

**✅ Resultado esperado:** JSON com token e dados do usuário

---

### **TESTE 2: Listar Patrimônios**

```powershell
# Usar o token do teste anterior
$headers = @{
    "Authorization" = "Bearer $token"
}

$patrimonios = Invoke-RestMethod -Uri "http://localhost:3000/api/patrimonios" -Headers $headers

Write-Host "✅ PATRIMÔNIOS CARREGADOS!" -ForegroundColor Green
Write-Host "Total: $($patrimonios.total)" -ForegroundColor Cyan
Write-Host "Página: $($patrimonios.pagination.page)" -ForegroundColor Cyan
```

---

### **TESTE 3: Health Check**

```powershell
$health = Invoke-RestMethod -Uri "http://localhost:3000/health"

Write-Host "✅ BACKEND SAUDÁVEL!" -ForegroundColor Green
Write-Host "Status: $($health.status)" -ForegroundColor Cyan
Write-Host "Uptime: $([math]::Round($health.uptime, 2)) segundos" -ForegroundColor Cyan
```

---

## 🌐 INICIAR FRONTEND

### **Passo 1: Verificar Axios**

```powershell
# Na raiz do projeto
Get-Content package.json | Select-String "axios"
```

**Se não aparecer nada, instalar:**

```powershell
pnpm add axios
```

---

### **Passo 2: Iniciar Frontend**

```powershell
# Novo terminal na raiz do projeto
pnpm dev
```

**Aguarde aparecer:**
```
  ➜  Local:   http://localhost:8080/
```

---

### **Passo 3: Acessar Sistema**

1. Abrir navegador: `http://localhost:8080`
2. Fazer login:
   - **Email:** `admin@ssbv.com`
   - **Senha:** `password123`

---

## 📊 VERIFICAÇÃO COMPLETA

### **Checklist Rápido:**

```powershell
# Execute este bloco de uma vez:
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  VERIFICAÇÃO COMPLETA DO SISTEMA" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Docker
Write-Host "1. Docker PostgreSQL:" -ForegroundColor Yellow
try {
    $docker = docker ps --filter "name=sispat_postgres" --format "{{.Status}}"
    Write-Host "   ✅ $docker" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Não está rodando" -ForegroundColor Red
}

# 2. Backend
Write-Host "2. Backend API:" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 3
    Write-Host "   ✅ Respondendo (Status: $($health.status))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Não está respondendo" -ForegroundColor Red
}

# 3. Login
Write-Host "3. Sistema de Login:" -ForegroundColor Yellow
try {
    $loginBody = @{ email = "admin@ssbv.com"; password = "password123" } | ConvertTo-Json
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -TimeoutSec 3
    Write-Host "   ✅ Funcionando (Usuário: $($loginResponse.user.name))" -ForegroundColor Green
    $global:testToken = $loginResponse.token
} catch {
    Write-Host "   ❌ Erro no login" -ForegroundColor Red
}

# 4. API Patrimônios
Write-Host "4. API Patrimônios:" -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $global:testToken" }
    $patrimonios = Invoke-RestMethod -Uri "http://localhost:3000/api/patrimonios" -Headers $headers -TimeoutSec 3
    Write-Host "   ✅ Funcionando (Total: $($patrimonios.total))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erro ao listar" -ForegroundColor Red
}

# 5. Frontend
Write-Host "5. Frontend:" -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 3 -UseBasicParsing
    Write-Host "   ✅ Rodando" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Não está rodando (Execute: pnpm dev)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  VERIFICAÇÃO CONCLUÍDA" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
```

---

## 🔧 SE ALGO NÃO FUNCIONAR

### **Backend não responde:**

```powershell
# Parar processos Node.js
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Reiniciar backend
cd backend
npm run dev
```

---

### **Docker não está rodando:**

```powershell
# Subir container
cd backend
docker-compose up -d

# Aguardar 15 segundos
Start-Sleep -Seconds 15

# Verificar
docker ps | Select-String "sispat_postgres"
```

---

### **Frontend não carrega:**

```powershell
# Limpar cache e reinstalar
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
pnpm install
pnpm dev
```

---

## 🎊 CREDENCIAIS PARA TESTES

| Perfil | Email | Senha |
|--------|-------|-------|
| **Admin** | admin@ssbv.com | password123 |
| **Superuser** | junielsonfarias@gmail.com | Tiko6273@ |
| Supervisor | supervisor@ssbv.com | password123 |
| Usuário | usuario@ssbv.com | password123 |
| Visualizador | visualizador@ssbv.com | password123 |

---

## 📚 DOCUMENTAÇÃO COMPLETA

Para setup detalhado ou troubleshooting avançado, consulte:

- 📖 **Setup Completo:** `BACKEND_SETUP_COMPLETE.md`
- 🧪 **Testes Detalhados:** `TESTES_RAPIDOS.md`
- 📊 **Visão Geral:** `RESUMO_IMPLEMENTACAO_BACKEND.md`
- 🤖 **Script Automatizado:** `setup-backend.ps1`

---

## ✅ PRÓXIMOS PASSOS

1. ✅ **TESTE 1:** Login via API (1 min)
2. ✅ **TESTE 2:** Listar patrimônios (30 seg)
3. ✅ **TESTE 3:** Health check (15 seg)
4. 🌐 **INICIAR:** Frontend com `pnpm dev`
5. 🎨 **ACESSAR:** http://localhost:8080
6. 🔐 **LOGIN:** admin@ssbv.com / password123

---

**🎉 SISTEMA PRONTO! COMECE A TESTAR AGORA!**

**⏱️ Tempo total:** 2-3 minutos  
**📅 Criado:** 07/10/2025  
**✅ Status:** Backend funcionando, Frontend pronto para iniciar

