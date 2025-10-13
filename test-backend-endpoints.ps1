# Script para testar endpoints do backend SISPAT

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  TESTANDO BACKEND SISPAT" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 8

# Testar health check
Write-Host "1. Testando Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "   Status: $($health.StatusCode)" -ForegroundColor Green
    Write-Host "   Backend: ONLINE" -ForegroundColor Green
} catch {
    Write-Host "   Erro: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Testando Endpoints (espera-se 401 - autenticacao necessaria)..." -ForegroundColor Yellow

$endpoints = @(
    "/api/inventarios",
    "/api/tipos-bens",
    "/api/formas-aquisicao",
    "/api/locais",
    "/api/sectors",
    "/api/patrimonios",
    "/api/imoveis"
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000$endpoint" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        Write-Host "   $endpoint - Status: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401) {
            Write-Host "   $endpoint - Status: 401 (Autenticacao OK)" -ForegroundColor Yellow
        } else {
            Write-Host "   $endpoint - Status: $statusCode (ERRO)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  TESTES CONCLUIDOS" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""


