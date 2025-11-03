# ============================================================================
# SISPAT 2.0 - CORREÇÃO DE ERROS DO CONSOLE
# ============================================================================

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  SISPAT 2.0 - Correção Console Errors  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ROOT = Get-Location
$FRONTEND = $ROOT
$BACKEND = Join-Path $ROOT "backend"

# 1. Verificar e criar arquivo .env no frontend
Write-Host "1️⃣ Verificando arquivo .env do frontend..." -ForegroundColor Yellow

$envFile = Join-Path $FRONTEND ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "   Criando arquivo .env..." -ForegroundColor Yellow
    
    $envContent = @"
# ============================================
# CONFIGURAÇÃO DA API
# ============================================

# URL da API Backend
VITE_API_URL=http://localhost:3000/api

# ============================================
# MODO DE OPERAÇÃO
# ============================================

# Usar dados reais do backend (true) ou mock (false)
VITE_USE_BACKEND=true

# ============================================
# CONFIGURAÇÕES OPCIONAIS
# ============================================

# Timeout para requisições (em ms)
VITE_API_TIMEOUT=30000

# Ambiente
VITE_ENV=development

# ============================================
# ERROR TRACKING (SENTRY) - OPCIONAL
# ============================================

# Sentry DSN para error tracking
VITE_SENTRY_DSN=

# Versão da aplicação
VITE_APP_VERSION=2.0.0
"@
    
    $envContent | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "   Arquivo .env criado" -ForegroundColor Green
} else {
    Write-Host "   ✅ Arquivo .env já existe" -ForegroundColor Green
}

# 2. Verificar arquivo .env do backend
Write-Host "2️⃣ Verificando arquivo .env do backend..." -ForegroundColor Yellow

$backendEnvFile = Join-Path $BACKEND ".env"
if (Test-Path $backendEnvFile) {
    Write-Host "   ✅ Arquivo .env do backend existe" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Arquivo .env do backend não encontrado" -ForegroundColor Yellow
    Write-Host "   Execute: cd backend; copy .env.example .env" -ForegroundColor Gray
}

# 3. Verificar dependências
Write-Host "3️⃣ Verificando dependências..." -ForegroundColor Yellow

# Frontend
Set-Location $FRONTEND
if (Test-Path "node_modules") {
    Write-Host "   ✅ Frontend: node_modules existe" -ForegroundColor Green
} else {
    Write-Host "   📦 Instalando dependências do frontend..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
}

# Backend
Set-Location $BACKEND
if (Test-Path "node_modules") {
    Write-Host "   ✅ Backend: node_modules existe" -ForegroundColor Green
} else {
    Write-Host "   📦 Instalando dependências do backend..." -ForegroundColor Yellow
    npm install
}

# 4. Verificar scripts
Write-Host "4️⃣ Verificando scripts disponíveis..." -ForegroundColor Yellow

Set-Location $FRONTEND
Write-Host "   Frontend scripts:" -ForegroundColor Cyan
npm run --silent 2>$null | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }

Set-Location $BACKEND
Write-Host "   Backend scripts:" -ForegroundColor Cyan
npm run --silent 2>$null | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }

# 5. Testar conectividade
Write-Host "5️⃣ Testando configurações..." -ForegroundColor Yellow

Set-Location $FRONTEND

# Verificar se o backend está rodando
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Backend está rodando" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Backend não está rodando em http://localhost:3000" -ForegroundColor Yellow
    Write-Host "   Para iniciar: cd backend; npm run dev" -ForegroundColor Gray
}

# 6. Criar script de inicialização rápida
Write-Host "6️⃣ Criando script de inicialização..." -ForegroundColor Yellow

$startScript = @"
@echo off
echo Iniciando SISPAT 2.0...

echo Iniciando Backend...
start "SISPAT Backend" cmd /k "cd /d "$BACKEND" & npm run dev"

timeout /t 3 /nobreak >nul

echo Iniciando Frontend...
start "SISPAT Frontend" cmd /k "cd /d "$FRONTEND" & npm run dev"

echo Sistema iniciado!
echo Backend: http://localhost:3000
echo Frontend: http://localhost:8080
pause
"@

$startScript | Out-File -FilePath "iniciar-sispat.bat" -Encoding ASCII
Write-Host "   ✅ Script iniciar-sispat.bat criado" -ForegroundColor Green

# 7. Resumo
Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║        CORREÇÕES APLICADAS!            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Arquivo .env configurado" -ForegroundColor Green
Write-Host "✅ Dependências verificadas" -ForegroundColor Green
Write-Host "✅ Scripts verificados" -ForegroundColor Green
Write-Host "✅ Script de inicialização criado" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Para iniciar o sistema:" -ForegroundColor Cyan
Write-Host "   .\iniciar-sispat.bat" -ForegroundColor Gray
Write-Host ""
Write-Host "   Ou manualmente:" -ForegroundColor Cyan
Write-Host "   Frontend: npm run dev" -ForegroundColor Gray
Write-Host "   Backend: cd backend; npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "📍 URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:8080" -ForegroundColor Gray
Write-Host "   Backend: http://localhost:3000" -ForegroundColor Gray
Write-Host ""

Set-Location $ROOT
