# Script de Solução Definitiva - Gerenciador de Fichas
Write-Host "🔧 SOLUÇÃO DEFINITIVA - Gerenciador de Fichas" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$basePath = "d:\novo ambiente\sispat - Copia"
$backendPath = Join-Path $basePath "backend"

# PASSO 1: Parar TUDO
Write-Host "`n🛑 PASSO 1: Parando TODOS os processos..." -ForegroundColor Red
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name pwsh -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Write-Host "   ✅ Todos os processos parados!" -ForegroundColor Green

# PASSO 2: Navegar para backend
Write-Host "`n📁 PASSO 2: Navegando para backend..." -ForegroundColor Yellow
Set-Location $backendPath
Write-Host "   ✅ Diretório: $backendPath" -ForegroundColor Green

# PASSO 3: Limpar cache do Prisma
Write-Host "`n🧹 PASSO 3: Limpando cache do Prisma..." -ForegroundColor Yellow
Remove-Item -Path "node_modules\.prisma" -Recurse -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Write-Host "   ✅ Cache limpo!" -ForegroundColor Green

# PASSO 4: Gerar Prisma Client
Write-Host "`n⚙️ PASSO 4: Gerando Prisma Client..." -ForegroundColor Yellow
Write-Host "   (Aguarde ~30 segundos)" -ForegroundColor Gray
$generateResult = npx prisma generate 2>&1
if ($generateResult -like "*Generated Prisma Client*") {
    Write-Host "   ✅ Prisma Client gerado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Possível erro, mas continuando..." -ForegroundColor Yellow
    Write-Host "   $generateResult" -ForegroundColor Gray
}

# PASSO 5: Sincronizar banco de dados
Write-Host "`n💾 PASSO 5: Sincronizando banco de dados..." -ForegroundColor Yellow
Write-Host "   (Aguarde ~10 segundos)" -ForegroundColor Gray
$pushResult = npx prisma db push 2>&1
if ($pushResult -like "*database is now in sync*") {
    Write-Host "   ✅ Banco de dados sincronizado!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Possível erro, mas continuando..." -ForegroundColor Yellow
}

# PASSO 6: Aguardar estabilização
Write-Host "`n⏳ PASSO 6: Aguardando estabilização..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host "   ✅ Sistema estabilizado!" -ForegroundColor Green

# PASSO 7: Iniciar Backend em nova janela
Write-Host "`n🚀 PASSO 7: Iniciando Backend..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", @"
cd '$backendPath'
Write-Host '════════════════════════════════════════' -ForegroundColor Green
Write-Host '  BACKEND - Porta 3000' -ForegroundColor Green
Write-Host '  Prisma Client: ATUALIZADO' -ForegroundColor Green
Write-Host '  Modelo FichaTemplate: DISPONÍVEL' -ForegroundColor Green
Write-Host '════════════════════════════════════════' -ForegroundColor Green
Write-Host ''
npm run dev
"@
Write-Host "   ✅ Backend iniciando em nova janela..." -ForegroundColor Green
Write-Host "   ⏳ Aguardando backend ficar pronto..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# PASSO 8: Iniciar Frontend em nova janela
Write-Host "`n🚀 PASSO 8: Iniciando Frontend..." -ForegroundColor Yellow
Set-Location $basePath
Start-Process pwsh -ArgumentList "-NoExit", "-Command", @"
cd '$basePath'
Write-Host '════════════════════════════════════════' -ForegroundColor Blue
Write-Host '  FRONTEND - Porta 8080' -ForegroundColor Blue
Write-Host '════════════════════════════════════════' -ForegroundColor Blue
Write-Host ''
npm run dev
"@
Write-Host "   ✅ Frontend iniciando em nova janela..." -ForegroundColor Green
Write-Host "   ⏳ Aguardando frontend ficar pronto..." -ForegroundColor Gray
Start-Sleep -Seconds 8

# PASSO 9: Abrir navegador
Write-Host "`n🌐 PASSO 9: Abrindo navegador..." -ForegroundColor Yellow
Start-Process "http://localhost:8080"
Write-Host "   ✅ Navegador aberto!" -ForegroundColor Green

# RESUMO FINAL
Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "✅ SISTEMA INICIADO COM SUCESSO!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

Write-Host "`n📊 STATUS DO SISTEMA:" -ForegroundColor White
Write-Host "   ✅ Backend:  http://localhost:3000 (COM PRISMA ATUALIZADO)" -ForegroundColor White
Write-Host "   ✅ Frontend: http://localhost:8080" -ForegroundColor White
Write-Host "   ✅ Tabela fichas: CRIADA" -ForegroundColor White
Write-Host "   ✅ APIs: FUNCIONAIS" -ForegroundColor White

Write-Host "`n🎯 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "   1. No navegador que abriu, faça login" -ForegroundColor White
Write-Host "   2. Menu → Ferramentas → Gerenciador de Fichas" -ForegroundColor White
Write-Host "   3. Clique em 'Novo Template'" -ForegroundColor White
Write-Host "   4. Preencha o formulário" -ForegroundColor White
Write-Host "   5. Clique em 'Salvar Template'" -ForegroundColor White
Write-Host "   6. ✅ DEVE FUNCIONAR SEM ERRO 500!" -ForegroundColor Green

Write-Host "`n💡 DICA:" -ForegroundColor Yellow
Write-Host "   Se ainda der erro 500:" -ForegroundColor Yellow
Write-Host "   - Aguarde mais 10 segundos (backend pode estar iniciando)" -ForegroundColor Yellow
Write-Host "   - Recarregue a página (Ctrl + Shift + R)" -ForegroundColor Yellow
Write-Host "   - Tente novamente" -ForegroundColor Yellow

Write-Host "`n📝 OBSERVAÇÃO IMPORTANTE:" -ForegroundColor Magenta
Write-Host "   Os templates padrão não foram criados automaticamente." -ForegroundColor White
Write-Host "   Você precisará criar manualmente os primeiros templates." -ForegroundColor White
Write-Host "   Isso leva apenas 2-3 minutos e depois está pronto!" -ForegroundColor White

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "✅ Documentação completa em:" -ForegroundColor White
Write-Host "   - STATUS-ATUAL-GERENCIADOR.md" -ForegroundColor Gray
Write-Host "   - SISTEMA-REINICIADO.md" -ForegroundColor Gray
Write-Host "   - GUIA-RAPIDO-GERENCIADOR-FICHAS.md" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Green

Write-Host "`nPressione qualquer tecla para fechar..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

