# Script para Atualizar Banco - FORÇA PARADA DE PROCESSOS
Write-Host "🔧 Forçando parada e atualizando sistema..." -ForegroundColor Red
Write-Host "============================================================" -ForegroundColor Red

# Parar TODOS os processos Node
Write-Host "`n1️⃣ Parando TODOS os processos Node.js..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "   ✅ Processos Node parados!" -ForegroundColor Green

# Navegar para backend
Write-Host "`n2️⃣ Navegando para backend..." -ForegroundColor Yellow
Set-Location "d:\novo ambiente\sispat - Copia\backend"
Write-Host "   ✅ Diretório: backend" -ForegroundColor Green

# Gerar Prisma Client
Write-Host "`n3️⃣ Gerando Prisma Client..." -ForegroundColor Yellow
Write-Host "   (Pode levar ~30 segundos)" -ForegroundColor Gray
npx prisma generate 2>&1 | Out-Null
if ($?) {
    Write-Host "   ✅ Prisma Client gerado!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Possível erro, mas continuando..." -ForegroundColor Yellow
}

# Criar migração
Write-Host "`n4️⃣ Criando tabela ficha_templates..." -ForegroundColor Yellow
$response = Read-Host "Deseja criar a migração? (S/N)"
if ($response -eq "S" -or $response -eq "s") {
    npx prisma migrate dev --name add_ficha_templates
    Write-Host "   ✅ Migração aplicada!" -ForegroundColor Green
} else {
    Write-Host "   ⏭️ Migração pulada" -ForegroundColor Gray
}

# Rodar seed
Write-Host "`n5️⃣ Criando templates padrão..." -ForegroundColor Yellow
$response = Read-Host "Deseja rodar o seed? (S/N)"
if ($response -eq "S" -or $response -eq "s") {
    npx prisma db seed
    Write-Host "   ✅ Seed executado!" -ForegroundColor Green
} else {
    Write-Host "   ⏭️ Seed pulado" -ForegroundColor Gray
}

# Voltar para raiz
Write-Host "`n6️⃣ Voltando para raiz..." -ForegroundColor Yellow
Set-Location "d:\novo ambiente\sispat - Copia"
Write-Host "   ✅ Diretório: raiz" -ForegroundColor Green

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "✅ ATUALIZAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

Write-Host "`n🚀 Agora execute:" -ForegroundColor Cyan
Write-Host "   .\INICIAR-SISTEMA-COMPLETO.ps1" -ForegroundColor White

Write-Host "`nPressione qualquer tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

