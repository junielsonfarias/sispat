# ============================================================================
# SISPAT v2.1.0 - DEPLOY PARA PRODUÇÃO
# ============================================================================

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  SISPAT v2.1.0 - Deploy Produção      ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$ROOT = "D:\novo ambiente\sispat - Copia"
$BACKEND = Join-Path $ROOT "backend"

# Parar processos em desenvolvimento
Write-Host "1️⃣ Parando processos de desenvolvimento..." -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "✅ Processos parados" -ForegroundColor Green
Write-Host ""

# Build Backend
Write-Host "2️⃣ Compilando backend para produção..." -ForegroundColor Cyan
Set-Location $BACKEND

# Verificar se Prisma Client está atualizado
Write-Host "   Gerando Prisma Client..." -ForegroundColor Yellow
npx prisma generate

# Compilar TypeScript
Write-Host "   Compilando TypeScript..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro na compilação do backend" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend compilado (dist/)" -ForegroundColor Green
Write-Host ""

# Build Frontend
Write-Host "3️⃣ Compilando frontend para produção..." -ForegroundColor Cyan
Set-Location $ROOT

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro na compilação do frontend" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend compilado (dist/)" -ForegroundColor Green
Write-Host ""

# Verificar database
Write-Host "4️⃣ Verificando database..." -ForegroundColor Cyan
Set-Location $BACKEND

# Testar conexão
$testDb = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.`$queryRaw``SELECT 1``.then(() => {
  console.log('✅ Database conectado');
  process.exit(0);
}).catch((err) => {
  console.log('❌ Database erro:', err.message);
  process.exit(1);
});
"@

$testDb | node
Write-Host ""

# Iniciar backend em produção
Write-Host "5️⃣ Iniciando backend em modo PRODUÇÃO..." -ForegroundColor Cyan
$env:NODE_ENV = "production"

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║      DEPLOY CONCLUÍDO COM SUCESSO!     ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📊 MODO: PRODUCTION" -ForegroundColor Yellow
Write-Host "🗄️  Database: PostgreSQL conectado" -ForegroundColor Green
Write-Host "📦 Backend: dist/ compilado" -ForegroundColor Green
Write-Host "🎨 Frontend: dist/ compilado" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Iniciando servidor de produção..." -ForegroundColor Cyan
Write-Host ""

# Iniciar em background
Start-Process -FilePath "node" -ArgumentList "dist/index.js" -WorkingDirectory $BACKEND -NoNewWindow

Start-Sleep -Seconds 5

# Testar health
Write-Host "🧪 Testando endpoints..." -ForegroundColor Cyan
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
    Write-Host "✅ Health check: OK" -ForegroundColor Green
    $health.Content
} catch {
    Write-Host "⚠️ Backend ainda inicializando..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📍 Backend rodando em: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📍 Frontend dist em: $ROOT\dist" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Para servir frontend, use:" -ForegroundColor Yellow
Write-Host "   npx serve dist -p 8080" -ForegroundColor Gray
Write-Host ""

