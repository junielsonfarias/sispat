# 🧪 GUIA DE TESTES RÁPIDOS - SISPAT 2.0

## 🎯 TESTES EM 5 MINUTOS

### **PRÉ-REQUISITOS:**
- Backend rodando (`cd backend && npm run dev`)
- Frontend rodando (`pnpm dev`)
- PostgreSQL rodando (Docker)

---

## 🚀 TESTE 1: Backend Funcionando (30 segundos)

Abra PowerShell e execute:

```powershell
# Health Check
Invoke-RestMethod -Uri "http://localhost:3000/health"
```

**✅ Resposta esperada:** `status: ok`

---

## 🔐 TESTE 2: Login API (1 minuto)

```powershell
# Login
$body = @{
    email = "admin@ssbv.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $body -ContentType "application/json"

# Mostrar resposta
$response | ConvertTo-Json -Depth 3

# Salvar token para próximos testes
$token = $response.token
Write-Host "Token salvo: $token" -ForegroundColor Green
```

**✅ Resposta esperada:** JSON com `token`, `refreshToken` e `user`

---

## 📦 TESTE 3: Listar Patrimônios (30 segundos)

```powershell
# Listar patrimônios (use o token do teste anterior)
$headers = @{
    "Authorization" = "Bearer $token"
}

$patrimonios = Invoke-RestMethod -Uri "http://localhost:3000/api/patrimonios" -Headers $headers
$patrimonios | ConvertTo-Json -Depth 2
```

**✅ Resposta esperada:** Objeto com `data`, `pagination`

---

## ➕ TESTE 4: Criar Patrimônio (1 minuto)

```powershell
# Dados do novo patrimônio
$newBem = @{
    descricao = "Notebook Lenovo ThinkPad X1 Carbon"
    valor_aquisicao = 7500.00
    data_aquisicao = "2025-10-07"
    status = "ativo"
    observacoes = "Equipamento para desenvolvimento"
    sectorId = "sector-1"
    localId = "local-1"
    tipoId = "tipo-2"
    acquisitionFormId = "forma-1"
    metodo_depreciacao = "Linear"
    vida_util_anos = 5
    valor_residual = 1000.00
    numero_serie = "X1C2025001"
    marca = "Lenovo"
    modelo = "ThinkPad X1 Carbon Gen 11"
} | ConvertTo-Json

# Criar
$headers = @{
    "Authorization" = "Bearer $token"
}

$novoBem = Invoke-RestMethod -Uri "http://localhost:3000/api/patrimonios" -Method Post -Body $newBem -ContentType "application/json" -Headers $headers

Write-Host "✅ Patrimônio criado com ID: $($novoBem.id)" -ForegroundColor Green
$novoBem | ConvertTo-Json -Depth 2
```

**✅ Resposta esperada:** JSON do patrimônio criado com `numero_patrimonio`

---

## 🏢 TESTE 5: Listar Imóveis (30 segundos)

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

$imoveis = Invoke-RestMethod -Uri "http://localhost:3000/api/imoveis" -Headers $headers
$imoveis | ConvertTo-Json -Depth 2
```

**✅ Resposta esperada:** Objeto com `imoveis`, `pagination`

---

## 🌐 TESTE 6: Frontend Integrado (2 minutos)

### **1. Abrir navegador:**
```
http://localhost:8080
```

### **2. Fazer login:**
- **Email:** `admin@ssbv.com`
- **Senha:** `password123`

### **3. Verificar Dashboard:**
- [ ] Dashboard carrega sem erros
- [ ] Estatísticas aparecem
- [ ] Gráficos renderizam

### **4. Listar Patrimônios:**
- [ ] Ir para "Bens Móveis" > "Cadastrados"
- [ ] Lista aparece com dados reais
- [ ] Busca funciona
- [ ] Filtros funcionam

### **5. Criar Novo Bem:**
- [ ] Clicar em "Novo Bem"
- [ ] Preencher formulário
- [ ] Salvar
- [ ] Bem aparece na lista

### **6. Visualizar Bem:**
- [ ] Clicar no número do patrimônio
- [ ] Detalhes completos aparecem
- [ ] Histórico mostra criação
- [ ] Dados de depreciação visíveis

---

## 🐛 TESTE 7: Verificar Console do Navegador

Abra o DevTools (F12) e verifique:

### **Console:**
- [ ] Nenhum erro vermelho
- [ ] Logs HTTP aparecem: `[HTTP] GET /api/patrimonios`
- [ ] Respostas 200 OK

### **Network:**
- [ ] Requisições para `http://localhost:3000/api`
- [ ] Header `Authorization: Bearer ...` presente
- [ ] Respostas JSON válidas

---

## ✅ CHECKLIST COMPLETO

### **Backend:**
- [ ] ✅ Health check responde
- [ ] ✅ Login retorna JWT
- [ ] ✅ GET /patrimonios funciona
- [ ] ✅ POST /patrimonios cria novo
- [ ] ✅ GET /imoveis funciona
- [ ] ✅ Logs aparecem no terminal backend

### **Frontend:**
- [ ] ✅ Login funciona
- [ ] ✅ Dashboard carrega dados reais
- [ ] ✅ Lista de bens carrega
- [ ] ✅ Criar bem funciona
- [ ] ✅ Visualizar bem funciona
- [ ] ✅ Console sem erros
- [ ] ✅ Network mostra chamadas HTTP

### **Banco de Dados:**
- [ ] ✅ Docker container rodando
- [ ] ✅ PostgreSQL conectado
- [ ] ✅ Tabelas criadas
- [ ] ✅ Dados iniciais populados

---

## 🆘 SE ALGO FALHAR

### **Backend não responde:**
```powershell
# Verificar se está rodando
Get-Process node

# Reiniciar
cd backend
npm run dev
```

### **Frontend não conecta:**
```powershell
# Verificar .env
Get-Content .env | Select-String "VITE_API_URL"

# Deve mostrar: VITE_API_URL=http://localhost:3000/api
```

### **Erro de CORS:**
- Verificar se backend está rodando
- Verificar logs do backend
- Tentar novamente

### **Token inválido:**
```powershell
# Fazer login novamente
$body = @{ email = "admin@ssbv.com"; password = "password123" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $body -ContentType "application/json"
$token = $response.token
```

---

## 🎉 TESTE COMPLETO APROVADO!

Se todos os testes passaram, seu sistema está **100% FUNCIONAL!**

**Credenciais para testes:**

| Perfil | Email | Senha |
|--------|-------|-------|
| Superuser | junielsonfarias@gmail.com | Tiko6273@ |
| Admin | admin@ssbv.com | password123 |
| Supervisor | supervisor@ssbv.com | password123 |
| Usuário | usuario@ssbv.com | password123 |
| Visualizador | visualizador@ssbv.com | password123 |

---

**⏱️ Tempo total de testes:** 5-10 minutos  
**📅 Criado:** 07/10/2025  
**✅ Status:** Validado

