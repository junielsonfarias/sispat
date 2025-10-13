# Script para iniciar o sistema completo (Backend + Frontend)
Write-Host "Iniciando SISPAT 2.0 - Sistema Completo" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Gray

# Verificar se ja existe backend rodando
Write-Host "`nVerificando se backend ja esta rodando..." -ForegroundColor Yellow
$backendRunning = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue

if ($backendRunning) {
    Write-Host "Backend ja esta rodando na porta 3000!" -ForegroundColor Green
} else {
    Write-Host "Backend nao esta rodando. Iniciando..." -ForegroundColor Yellow
    
    # Iniciar Backend em nova janela
    Write-Host "`nIniciando Backend..." -ForegroundColor Cyan
    $backendPath = Join-Path $PWD "backend"
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "Write-Host 'BACKEND - SISPAT 2.0' -ForegroundColor Green; Set-Location '$backendPath'; Write-Host 'Iniciando servidor na porta 3000...' -ForegroundColor Yellow; npm run dev"
    
    Write-Host "Aguardando backend inicializar..." -ForegroundColor Gray
    $count = 0
    $maxWait = 30
    
    do {
        Start-Sleep -Seconds 1
        $count++
        Write-Host "Aguardando... $count de $maxWait segundos" -ForegroundColor Gray
        $backendReady = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    } while (-not $backendReady -and $count -lt $maxWait)
    
    if ($backendReady) {
        Write-Host "Backend iniciado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "Backend demorou para iniciar. Verifique a janela do backend." -ForegroundColor Yellow
    }
}

# Verificar se frontend ja esta rodando
Write-Host "`nVerificando se frontend ja esta rodando..." -ForegroundColor Yellow
$frontendRunning = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue

if ($frontendRunning) {
    Write-Host "Frontend ja esta rodando na porta 8080!" -ForegroundColor Green
} else {
    Write-Host "Frontend nao esta rodando. Iniciando..." -ForegroundColor Yellow
    
    # Iniciar Frontend em nova janela
    Write-Host "`nIniciando Frontend..." -ForegroundColor Cyan
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "Write-Host 'FRONTEND - SISPAT 2.0' -ForegroundColor Blue; Set-Location '$PWD'; Write-Host 'Iniciando interface na porta 8080...' -ForegroundColor Yellow; npm run dev"
    
    Write-Host "Aguardando frontend inicializar..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    Write-Host "Frontend iniciado!" -ForegroundColor Green
}

# Abrir navegador
Write-Host "`nAbrindo navegador..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
Start-Process "http://localhost:8080"

Write-Host "`n============================================================" -ForegroundColor Gray
Write-Host "SISTEMA SISPAT 2.0 INICIADO COM SUCESSO!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Gray
Write-Host "`nServicos rodando:" -ForegroundColor White
Write-Host "Backend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:8080" -ForegroundColor Blue
Write-Host "`nCredenciais padrao:" -ForegroundColor White
Write-Host "Email: admin@admin.com" -ForegroundColor Yellow
Write-Host "Senha: admin123" -ForegroundColor Yellow
Write-Host "`nDicas:" -ForegroundColor White
Write-Host "- Use Ctrl+C nas janelas para parar os servicos" -ForegroundColor Gray
Write-Host "- Em caso de erro, feche tudo e execute novamente este script" -ForegroundColor Gray
Write-Host "`n============================================================" -ForegroundColor Gray
