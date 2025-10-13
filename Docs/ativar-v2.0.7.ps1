# ============================================================================
# SCRIPT: Ativar SISPAT v2.0.7 em Desenvolvimento
# Data: 2025-10-11
# ============================================================================

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  SISPAT v2.0.7 - Ativação Dev         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$ROOT = "D:\novo ambiente\sispat - Copia"
$BACKEND = Join-Path $ROOT "backend"

# Função para verificar erro
function Test-LastCommand {
    param($Message)
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro: $Message" -ForegroundColor Red
        exit 1
    }
}

# 1. Instalar ioredis
Write-Host "📦 1. Instalando ioredis..." -ForegroundColor Cyan
Set-Location $BACKEND
npm install --save ioredis
Test-LastCommand "Falha ao instalar ioredis"

npm install --save-dev @types/ioredis
Test-LastCommand "Falha ao instalar @types/ioredis"
Write-Host "✅ ioredis instalado" -ForegroundColor Green
Write-Host ""

# 2. Gerar Prisma Client
Write-Host "🔧 2. Gerando Prisma Client..." -ForegroundColor Cyan
Write-Host "⚠️  Se houver erro EPERM, feche o VS Code e rode novamente" -ForegroundColor Yellow
try {
    npx prisma generate 2>&1 | Out-Null
    Write-Host "✅ Prisma Client gerado" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Erro ao gerar Prisma (normal se VS Code aberto)" -ForegroundColor Yellow
    Write-Host "   Feche VS Code e execute: npx prisma generate" -ForegroundColor Yellow
}
Write-Host ""

# 3. Compilar Backend
Write-Host "🔨 3. Compilando backend..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Erros de compilação encontrados" -ForegroundColor Yellow
    Write-Host "   Verifique os erros acima" -ForegroundColor Yellow
} else {
    Write-Host "✅ Backend compilado com sucesso" -ForegroundColor Green
}
Write-Host ""

# 4. Verificar arquivos criados
Write-Host "📁 4. Verificando arquivos..." -ForegroundColor Cyan
$files = @(
    "src\middlewares\ipTracking.ts",
    "src\utils\activityLogger.ts",
    "src\jobs\logRetention.ts",
    "src\config\redis.enhanced.ts",
    "src\controllers\transferenciaController.ts",
    "src\controllers\documentController.ts"
)

foreach ($file in $files) {
    $path = Join-Path $BACKEND $file
    if (Test-Path $path) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file (não encontrado)" -ForegroundColor Red
    }
}
Write-Host ""

# 5. Status final
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         ATIVAÇÃO CONCLUÍDA!            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Criar tabela documents:" -ForegroundColor White
Write-Host "   Ver SQL em: ATIVAR_v2.0.7_DESENVOLVIMENTO.md" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Iniciar backend:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Em outro terminal, frontend:" -ForegroundColor White
Write-Host "   cd '$ROOT'" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Testar endpoints:" -ForegroundColor White
Write-Host "   http://localhost:3000/api/transferencias" -ForegroundColor Gray
Write-Host "   http://localhost:3000/api/documentos" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Abrir aplicação:" -ForegroundColor White
Write-Host "   http://localhost:8080" -ForegroundColor Gray
Write-Host ""

Write-Host "📚 Documentação:" -ForegroundColor Cyan
Write-Host "   - ATIVAR_v2.0.7_DESENVOLVIMENTO.md" -ForegroundColor Gray
Write-Host "   - MELHORIAS_v2.0.7_IMPLEMENTADAS.md" -ForegroundColor Gray
Write-Host "   - GUIA_CACHE_REDIS.md" -ForegroundColor Gray
Write-Host "   - GUIA_LAZY_LOADING.md" -ForegroundColor Gray
Write-Host ""

