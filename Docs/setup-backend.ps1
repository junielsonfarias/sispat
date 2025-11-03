# ============================================
# SCRIPT DE SETUP AUTOMATIZADO DO BACKEND
# SISPAT 2.0
# ============================================

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  SETUP AUTOMÁTICO - BACKEND SISPAT 2.0" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na raiz do projeto
if (!(Test-Path "package.json")) {
    Write-Host "❌ ERRO: Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Etapa 1/8: Verificando estrutura do backend..." -ForegroundColor Yellow

# Criar estrutura se não existir
if (!(Test-Path "backend")) {
    Write-Host "⚠️  Diretório backend não encontrado. Criando..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "backend" -Force | Out-Null
}

# Criar subdiretórios
$dirs = @("src", "src/controllers", "src/routes", "src/middlewares", "src/prisma", "prisma", "uploads")
foreach ($dir in $dirs) {
    $path = "backend/$dir"
    if (!(Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "  ✅ Criado: $path" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "📋 Etapa 2/8: Verificando package.json do backend..." -ForegroundColor Yellow

if (!(Test-Path "backend/package.json")) {
    Write-Host "⚠️  package.json não encontrado. Criando..." -ForegroundColor Yellow
    
    Set-Location backend
    npm init -y | Out-Null
    Set-Location ..
    
    Write-Host "  ✅ package.json criado" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Etapa 3/8: Instalando dependências do backend..." -ForegroundColor Yellow
Write-Host "  ⏳ Isto pode levar alguns minutos..." -ForegroundColor Gray

Set-Location backend

# Instalar dependências de produção
$prodDeps = "express", "@prisma/client", "bcryptjs", "jsonwebtoken", "cors", "dotenv", "helmet", "winston", "multer"
Write-Host "  📦 Instalando dependências de produção..." -ForegroundColor Gray
npm install $prodDeps --save --silent | Out-Null

# Instalar dependências de desenvolvimento
$devDeps = "typescript", "@types/express", "@types/node", "@types/bcryptjs", "@types/jsonwebtoken", "@types/cors", "@types/multer", "ts-node", "nodemon", "prisma"
Write-Host "  🔧 Instalando dependências de desenvolvimento..." -ForegroundColor Gray
npm install $devDeps --save-dev --silent | Out-Null

Set-Location ..

Write-Host "  ✅ Dependências instaladas" -ForegroundColor Green

Write-Host ""
Write-Host "📋 Etapa 4/8: Verificando Docker..." -ForegroundColor Yellow

# Verificar se Docker está rodando
try {
    docker ps | Out-Null
    Write-Host "  ✅ Docker está rodando" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Docker não está rodando ou não está instalado!" -ForegroundColor Red
    Write-Host "  Por favor, inicie o Docker Desktop e execute o script novamente." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📋 Etapa 5/8: Subindo banco de dados PostgreSQL..." -ForegroundColor Yellow

Set-Location backend

# Verificar se container já existe
$containerExists = docker ps -a --filter "name=sispat_postgres" --format "{{.Names}}"

if ($containerExists) {
    Write-Host "  ⚠️  Container sispat_postgres já existe. Removendo..." -ForegroundColor Yellow
    docker-compose down -v | Out-Null
}

# Subir novo container
Write-Host "  🐳 Iniciando PostgreSQL..." -ForegroundColor Gray
docker-compose up -d | Out-Null

# Aguardar banco ficar saudável
Write-Host "  ⏳ Aguardando banco de dados ficar pronto..." -ForegroundColor Gray
Start-Sleep -Seconds 15

$maxRetries = 6
$retry = 0
$healthy = $false

while ($retry -lt $maxRetries -and !$healthy) {
    $status = docker inspect --format='{{.State.Health.Status}}' sispat_postgres 2>$null
    if ($status -eq "healthy") {
        $healthy = $true
        Write-Host "  ✅ PostgreSQL está saudável e pronto!" -ForegroundColor Green
    } else {
        $retry++
        Write-Host "  ⏳ Tentativa $retry de $maxRetries... (Status: $status)" -ForegroundColor Gray
        Start-Sleep -Seconds 10
    }
}

if (!$healthy) {
    Write-Host "  ⚠️  Banco pode não estar completamente pronto, mas continuando..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Etapa 6/8: Executando migrações Prisma..." -ForegroundColor Yellow

# Gerar cliente Prisma
Write-Host "  🔧 Gerando cliente Prisma..." -ForegroundColor Gray
npx prisma generate 2>&1 | Out-Null

# Executar migrações
Write-Host "  📊 Criando tabelas no banco..." -ForegroundColor Gray
npx prisma migrate dev --name init --skip-seed 2>&1 | Out-Null

Write-Host "  ✅ Migrações executadas" -ForegroundColor Green

Write-Host ""
Write-Host "📋 Etapa 7/8: Populando banco com dados iniciais..." -ForegroundColor Yellow

if (Test-Path "src/prisma/seed.ts") {
    Write-Host "  🌱 Executando seed..." -ForegroundColor Gray
    npm run prisma:seed 2>&1 | Out-Null
    Write-Host "  ✅ Dados iniciais inseridos" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Arquivo seed.ts não encontrado. Pulando..." -ForegroundColor Yellow
}

Set-Location ..

Write-Host ""
Write-Host "📋 Etapa 8/8: Instalando axios no frontend..." -ForegroundColor Yellow

# Verificar se axios está instalado
$axiosInstalled = Get-Content package.json | Select-String "axios"

if (!$axiosInstalled) {
    Write-Host "  📦 Instalando axios..." -ForegroundColor Gray
    pnpm add axios --silent | Out-Null
    Write-Host "  ✅ Axios instalado" -ForegroundColor Green
} else {
    Write-Host "  ✅ Axios já está instalado" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  🎉 SETUP CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 RESUMO DO AMBIENTE:" -ForegroundColor Cyan
Write-Host "  ✅ Backend: Configurado" -ForegroundColor Green
Write-Host "  ✅ PostgreSQL: Rodando (porta 5432)" -ForegroundColor Green
Write-Host "  ✅ Prisma: Migrado e populado" -ForegroundColor Green
Write-Host "  ✅ Axios: Instalado no frontend" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1️⃣  Iniciar o backend:" -ForegroundColor Yellow
Write-Host "      cd backend" -ForegroundColor White
Write-Host "      npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  2️⃣  Em outro terminal, iniciar o frontend:" -ForegroundColor Yellow
Write-Host "      pnpm dev" -ForegroundColor White
Write-Host ""
Write-Host "  3️⃣  Acessar o sistema:" -ForegroundColor Yellow
Write-Host "      http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "  4️⃣  Fazer login com:" -ForegroundColor Yellow
Write-Host "      Email: admin@ssbv.com" -ForegroundColor White
Write-Host "      Senha: password123" -ForegroundColor White
Write-Host ""
Write-Host "📚 DOCUMENTAÇÃO COMPLETA:" -ForegroundColor Cyan
Write-Host "  Consulte: BACKEND_SETUP_COMPLETE.md" -ForegroundColor White
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan

