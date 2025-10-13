# Script para testar o backend e capturar logs
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "TESTANDO BACKEND SISPAT v2.1.0" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Ir para o diretório do backend
Set-Location "D:\novo ambiente\sispat - Copia\backend"

Write-Host "1. Verificando dependências..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    Write-Host "   Instalando dependências..." -ForegroundColor Red
    npm install
}
Write-Host "   ✅ Dependências OK" -ForegroundColor Green
Write-Host ""

Write-Host "2. Iniciando backend..." -ForegroundColor Yellow
Write-Host "   (Pressione Ctrl+C para parar)" -ForegroundColor Gray
Write-Host ""

# Iniciar o backend
npm run dev

