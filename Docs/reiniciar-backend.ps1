# Script para reiniciar backend com Prisma atualizado
Write-Host "🔄 Reiniciando backend com Prisma atualizado..." -ForegroundColor Cyan

Write-Host "`n1️⃣ Parando processo npm run dev do backend..." -ForegroundColor Yellow
# Matar processo node que está rodando na porta 3000
$processes = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -like "*backend*" -or 
    (Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue | Where-Object LocalPort -eq 3000)
}

if ($processes) {
    $processes | ForEach-Object {
        Write-Host "   Parando processo Node (PID: $($_.Id))..." -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force
    }
    Write-Host "   ✅ Processos parados!" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "   ℹ️ Nenhum processo backend encontrado" -ForegroundColor Gray
}

Write-Host "`n2️⃣ Gerando Prisma Client atualizado..." -ForegroundColor Yellow
Set-Location "d:\novo ambiente\sispat - Copia\backend"
npx prisma generate --schema=src/prisma/schema.prisma

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Prisma Client gerado!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Erro ao gerar Prisma Client" -ForegroundColor Red
    exit 1
}

Write-Host "`n3️⃣ Iniciando backend novamente..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd 'd:\novo ambiente\sispat - Copia\backend' ; npm run dev"

Write-Host "`n⏳ Aguardando backend inicializar (5 segundos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`n✅ Backend reiniciado com sucesso!" -ForegroundColor Green
Write-Host "   📊 Tabela imovel_custom_fields agora disponível" -ForegroundColor White
Write-Host "   🔄 Recarregue o navegador (F5) para testar" -ForegroundColor White

Set-Location "d:\novo ambiente\sispat - Copia"

