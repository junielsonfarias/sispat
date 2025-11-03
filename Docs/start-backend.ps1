# Script para iniciar o backend do SISPAT
Write-Host "Iniciando Backend do SISPAT..." -ForegroundColor Green

# Verificar se estamos no diretório correto
if (-not (Test-Path "backend")) {
    Write-Host "Diretório 'backend' não encontrado. Execute este script na raiz do projeto." -ForegroundColor Red
    exit 1
}

# Navegar para o diretório backend
Set-Location backend

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependências..." -ForegroundColor Yellow
    npm install
}

# Verificar se o banco de dados está rodando
Write-Host "Verificando conexão com o banco de dados..." -ForegroundColor Blue
try {
    npx prisma db pull --schema=prisma/schema.prisma
    Write-Host "Banco de dados conectado!" -ForegroundColor Green
} catch {
    Write-Host "Aviso: Não foi possível conectar ao banco de dados" -ForegroundColor Yellow
}

# Gerar o Prisma Client
Write-Host "Gerando Prisma Client..." -ForegroundColor Blue
try {
    npx prisma generate
    Write-Host "Prisma Client gerado!" -ForegroundColor Green
} catch {
    Write-Host "Erro ao gerar Prisma Client" -ForegroundColor Red
    exit 1
}

# Iniciar o backend
Write-Host "Iniciando servidor backend..." -ForegroundColor Green
Write-Host "URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:3000/api-docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para parar o servidor, pressione Ctrl+C" -ForegroundColor Yellow
Write-Host ""

try {
    npm run dev
} catch {
    Write-Host "Erro ao iniciar o backend. Verifique se todas as dependências estão instaladas." -ForegroundColor Red
    exit 1
}