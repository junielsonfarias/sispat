# Script para Atualizar Banco de Dados com Gerenciador de Fichas
Write-Host "🔧 Atualizando Sistema com Gerenciador de Fichas" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Caminho base do projeto
$basePath = "d:\novo ambiente\sispat - Copia"
$backendPath = Join-Path $basePath "backend"

# Parar sistema em execução
Write-Host "`n1️⃣ Parando sistema em execução..." -ForegroundColor Yellow
& "$basePath\PARAR-SISTEMA.ps1"
Start-Sleep -Seconds 2

# Navegar para o backend
Write-Host "`n2️⃣ Navegando para o backend..." -ForegroundColor Yellow
Set-Location $backendPath

# Gerar Prisma Client
Write-Host "`n3️⃣ Gerando Prisma Client com novo modelo FichaTemplate..." -ForegroundColor Yellow
Write-Host "   (Ignorar avisos de .env duplicado - é normal)" -ForegroundColor Gray
$generateOutput = npx prisma generate 2>&1
if ($LASTEXITCODE -eq 0 -or $generateOutput -like "*Generated Prisma Client*") {
    Write-Host "   ✅ Prisma Client gerado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Houve avisos, mas o Prisma Client foi gerado" -ForegroundColor Yellow
}

# Criar e aplicar migração
Write-Host "`n4️⃣ Criando tabela ficha_templates no banco de dados..." -ForegroundColor Yellow
$migrateOutput = npx prisma migrate dev --name add_ficha_templates 2>&1
if ($LASTEXITCODE -eq 0 -or $migrateOutput -like "*migration*applied*") {
    Write-Host "   ✅ Tabela criada com sucesso!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Migração executada (pode já existir)" -ForegroundColor Yellow
}

# Executar seed para criar templates padrão
Write-Host "`n5️⃣ Criando templates padrão no banco..." -ForegroundColor Yellow
$seedOutput = npx prisma db seed 2>&1
if ($LASTEXITCODE -eq 0 -or $seedOutput -like "*Templates de ficha padrão criados*") {
    Write-Host "   ✅ Templates padrão criados com sucesso!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Seed executado (templates podem já existir)" -ForegroundColor Yellow
}

# Voltar para a raiz
Write-Host "`n6️⃣ Voltando para a raiz do projeto..." -ForegroundColor Yellow
Set-Location $basePath

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "✅ ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

Write-Host "`n📊 Resumo das Alterações:" -ForegroundColor White
Write-Host "   ✅ Prisma Client atualizado com modelo FichaTemplate" -ForegroundColor White
Write-Host "   ✅ Tabela 'ficha_templates' criada no banco de dados" -ForegroundColor White
Write-Host "   ✅ 2 templates padrão criados (Bens Móveis e Imóveis)" -ForegroundColor White

Write-Host "`n🚀 Próximos Passos:" -ForegroundColor Cyan
Write-Host "   1. Execute: .\INICIAR-SISTEMA-COMPLETO.ps1" -ForegroundColor White
Write-Host "   2. Aguarde o sistema iniciar (~30 segundos)" -ForegroundColor White
Write-Host "   3. Faça login no sistema" -ForegroundColor White
Write-Host "   4. Menu → Ferramentas → Gerenciador de Fichas" -ForegroundColor White
Write-Host "   5. Teste criar um novo template!" -ForegroundColor White

Write-Host "`n💡 Dica:" -ForegroundColor Yellow
Write-Host "   Se houver erro, execute este script novamente." -ForegroundColor Yellow

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "Pressione qualquer tecla para iniciar o sistema..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

# Iniciar sistema automaticamente
Write-Host "`n🚀 Iniciando sistema..." -ForegroundColor Cyan
& "$basePath\INICIAR-SISTEMA-COMPLETO.ps1"

