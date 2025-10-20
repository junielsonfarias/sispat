Write-Host "Corrigindo erros do console..." -ForegroundColor Cyan

# 1. Criar arquivo .env no frontend
$envContent = @"
VITE_API_URL=http://localhost:3000/api
VITE_USE_BACKEND=true
VITE_API_TIMEOUT=30000
VITE_ENV=development
VITE_SENTRY_DSN=
VITE_APP_VERSION=2.0.0
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "Arquivo .env criado" -ForegroundColor Green

# 2. Verificar se backend tem .env
if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env" -ErrorAction SilentlyContinue
    Write-Host "Arquivo .env do backend criado" -ForegroundColor Green
}

Write-Host "Correções aplicadas!" -ForegroundColor Green
Write-Host "Para iniciar:" -ForegroundColor Yellow
Write-Host "Frontend: npm run dev" -ForegroundColor Gray
Write-Host "Backend: cd backend; npm run dev" -ForegroundColor Gray
