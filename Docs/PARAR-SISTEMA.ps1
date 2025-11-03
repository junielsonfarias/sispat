# Script para parar todos os serviços do SISPAT
Write-Host "🛑 Parando SISPAT 2.0 - Todos os Serviços" -ForegroundColor Red
Write-Host "=" * 60 -ForegroundColor Gray

# Parar Backend (porta 3000)
Write-Host "`n1️⃣ Parando Backend (porta 3000)..." -ForegroundColor Yellow
$backendProcesses = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | 
    Select-Object -ExpandProperty OwningProcess -Unique

if ($backendProcesses) {
    foreach ($pid in $backendProcesses) {
        try {
            $process = Get-Process -Id $pid -ErrorAction Stop
            Write-Host "   Parando processo: $($process.ProcessName) (PID: $pid)" -ForegroundColor Gray
            Stop-Process -Id $pid -Force
            Write-Host "   ✅ Backend parado!" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  Não foi possível parar o processo $pid" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "   ℹ️  Backend não está rodando" -ForegroundColor Gray
}

# Parar Frontend (porta 8080)
Write-Host "`n2️⃣ Parando Frontend (porta 8080)..." -ForegroundColor Yellow
$frontendProcesses = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | 
    Select-Object -ExpandProperty OwningProcess -Unique

if ($frontendProcesses) {
    foreach ($pid in $frontendProcesses) {
        try {
            $process = Get-Process -Id $pid -ErrorAction Stop
            Write-Host "   Parando processo: $($process.ProcessName) (PID: $pid)" -ForegroundColor Gray
            Stop-Process -Id $pid -Force
            Write-Host "   ✅ Frontend parado!" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  Não foi possível parar o processo $pid" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "   ℹ️  Frontend não está rodando" -ForegroundColor Gray
}

# Parar outros processos Node relacionados
Write-Host "`n3️⃣ Verificando outros processos Node..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue | 
    Where-Object { $_.MainWindowTitle -like "*sispat*" -or $_.Path -like "*sispat*" }

if ($nodeProcesses) {
    foreach ($process in $nodeProcesses) {
        Write-Host "   Parando processo Node: PID $($process.Id)" -ForegroundColor Gray
        Stop-Process -Id $process.Id -Force
    }
    Write-Host "   ✅ Processos Node parados!" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Nenhum processo Node adicional encontrado" -ForegroundColor Gray
}

Write-Host "`n" + "=" * 60 -ForegroundColor Gray
Write-Host "✅ TODOS OS SERVIÇOS FORAM PARADOS!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "`n💡 Para iniciar novamente, execute:" -ForegroundColor White
Write-Host "   .\INICIAR-SISTEMA-COMPLETO.ps1" -ForegroundColor Cyan
Write-Host ""

