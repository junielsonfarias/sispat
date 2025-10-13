# ============================================================================
# SISPAT v2.1.0 - DEPLOY PRODUÇÃO SIMPLIFICADO
# ============================================================================

Write-Host "🚀 SISPAT v2.1.0 - Deploy Produção" -ForegroundColor Green
Write-Host ""

# Parar processos
Write-Host "1. Parando processos..." -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "✅ Processos parados" -ForegroundColor Green
Write-Host ""

# Build Backend
Write-Host "2. Build Backend..." -ForegroundColor Cyan
Set-Location "D:\novo ambiente\sispat - Copia\backend"
npx prisma generate
npm run build
Write-Host "✅ Backend compilado" -ForegroundColor Green
Write-Host ""

# Build Frontend
Write-Host "3. Build Frontend..." -ForegroundColor Cyan
Set-Location "D:\novo ambiente\sispat - Copia"
npm run build
Write-Host "✅ Frontend compilado" -ForegroundColor Green
Write-Host ""

# Iniciar Backend Produção
Write-Host "4. Iniciando backend PRODUÇÃO..." -ForegroundColor Cyan
Set-Location "D:\novo ambiente\sispat - Copia\backend"
$env:NODE_ENV = "production"

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host "DEPLOY CONCLUÍDO!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Backend: node dist/index.js" -ForegroundColor Yellow
Write-Host "Frontend: Servir dist/ com servidor HTTP" -ForegroundColor Yellow
Write-Host ""

# Iniciar backend
node dist/index.js

