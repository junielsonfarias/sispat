Write-Host "Reiniciando backend..." -ForegroundColor Cyan

Write-Host "Parando processos Node na porta 3000..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host "Gerando Prisma Client..." -ForegroundColor Yellow
Set-Location "d:\novo ambiente\sispat - Copia\backend"
npx prisma generate --schema=src/prisma/schema.prisma

Write-Host "Iniciando backend..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd 'd:\novo ambiente\sispat - Copia\backend' ; npm run dev"

Start-Sleep -Seconds 5

Write-Host "Backend reiniciado!" -ForegroundColor Green
Write-Host "Recarregue o navegador (F5)" -ForegroundColor White

Set-Location "d:\novo ambiente\sispat - Copia"

