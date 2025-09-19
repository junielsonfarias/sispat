# Script de correção de conexão com banco de dados para Windows
Write-Host "🔧 Iniciando correção de conexão com banco de dados..." -ForegroundColor Blue

# Verificar se estamos no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Execute este script no diretório raiz do projeto SISPAT" -ForegroundColor Red
    exit 1
}

# 1. Verificar se PostgreSQL está instalado
Write-Host "🔍 Verificando PostgreSQL..." -ForegroundColor Yellow
try {
    $psqlVersion = & psql --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL já está instalado: $psqlVersion" -ForegroundColor Green
    }
    else {
        throw "PostgreSQL não encontrado"
    }
}
catch {
    Write-Host "⚠️ PostgreSQL não encontrado. Instalando..." -ForegroundColor Yellow
    Write-Host "💡 Por favor, instale o PostgreSQL manualmente:" -ForegroundColor Cyan
    Write-Host "   1. Baixe de: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    Write-Host "   2. Execute o instalador" -ForegroundColor Cyan
    Write-Host "   3. Configure a senha do usuário postgres" -ForegroundColor Cyan
    Write-Host "   4. Execute este script novamente" -ForegroundColor Cyan
    exit 1
}

# 2. Verificar se PostgreSQL está rodando
Write-Host "🔍 Verificando se PostgreSQL está rodando..." -ForegroundColor Yellow
try {
    $pgIsReady = & pg_isready -h localhost -p 5432 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL está rodando" -ForegroundColor Green
    }
    else {
        throw "PostgreSQL não está rodando"
    }
}
catch {
    Write-Host "⚠️ PostgreSQL não está rodando. Iniciando..." -ForegroundColor Yellow
    try {
        # Tentar iniciar o serviço PostgreSQL
        Start-Service postgresql-x64-14 -ErrorAction Stop
        Start-Sleep -Seconds 5
        
        # Verificar novamente
        $pgIsReady = & pg_isready -h localhost -p 5432 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ PostgreSQL iniciado com sucesso" -ForegroundColor Green
        }
        else {
            throw "Falha ao iniciar PostgreSQL"
        }
    }
    catch {
        Write-Host "❌ Falha ao iniciar PostgreSQL" -ForegroundColor Red
        Write-Host "💡 Tente iniciar manualmente o serviço PostgreSQL" -ForegroundColor Cyan
        exit 1
    }
}

# 3. Criar arquivo .env se não existir
if (-not (Test-Path ".env")) {
    Write-Host "📝 Criando arquivo .env..." -ForegroundColor Yellow
    $envContent = @"
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Banco de Dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_development
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sispat_development
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000
DB_SSL_REJECT_UNAUTHORIZED=false

# JWT e Segurança
JWT_SECRET=dev_jwt_secret_key_2025_min_32_chars_long_development
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080

# Frontend
VITE_PORT=8080
VITE_API_TARGET=http://localhost:3001
VITE_API_URL=http://localhost:3001/api
VITE_BACKEND_URL=http://localhost:3001
VITE_DOMAIN=http://localhost:8080
"@
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Arquivo .env criado" -ForegroundColor Green
}
else {
    Write-Host "✅ Arquivo .env já existe" -ForegroundColor Green
}

# 4. Criar banco de dados se não existir
Write-Host "🗄️ Verificando banco de dados..." -ForegroundColor Yellow

# Verificar se o banco existe
$dbExists = & psql -h localhost -U postgres -lqt 2>$null | Select-String "sispat_development"
if ($dbExists) {
    Write-Host "✅ Banco de dados já existe" -ForegroundColor Green
}
else {
    Write-Host "📝 Criando banco de dados sispat_development..." -ForegroundColor Yellow
    try {
        & createdb -h localhost -U postgres sispat_development 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Banco de dados criado" -ForegroundColor Green
        }
        else {
            throw "Falha ao criar banco de dados"
        }
    }
    catch {
        Write-Host "❌ Falha ao criar banco de dados" -ForegroundColor Red
        Write-Host "💡 Verifique se o usuário postgres tem permissões adequadas" -ForegroundColor Cyan
        exit 1
    }
}

# 5. Instalar dependências se necessário
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependências instaladas" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Falha ao instalar dependências" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "✅ Dependências já instaladas" -ForegroundColor Green
}

# 6. Executar migrações
Write-Host "🔄 Executando migrações do banco de dados..." -ForegroundColor Yellow
if (Test-Path "server/database/migrate.js") {
    node server/database/migrate.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migrações executadas" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️ Falha ao executar migrações" -ForegroundColor Yellow
    }
}
else {
    Write-Host "⚠️ Arquivo de migração não encontrado" -ForegroundColor Yellow
}

# 7. Testar conexão
Write-Host "🧪 Testando conexão com banco de dados..." -ForegroundColor Yellow
$testScript = @'
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'sispat_development',
  user: 'postgres',
  password: 'postgres'
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erro na conexão:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Conexão com banco de dados funcionando!');
    console.log('📅 Data/hora do servidor:', res.rows[0].now);
    pool.end();
  }
});
'@

$testScript | Out-File -FilePath "test-db-connection.js" -Encoding UTF8
node test-db-connection.js
$testResult = $LASTEXITCODE
Remove-Item "test-db-connection.js" -Force

if ($testResult -eq 0) {
    Write-Host "✅ Conexão com banco de dados testada com sucesso" -ForegroundColor Green
}
else {
    Write-Host "❌ Falha ao testar conexão com banco de dados" -ForegroundColor Red
    exit 1
}

# 8. Criar diretório de logs se não existir
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    Write-Host "✅ Diretório de logs criado" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Correção de conexão com banco de dados concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Execute: npm run dev (para iniciar o servidor de desenvolvimento)" -ForegroundColor White
Write-Host "2. Acesse: http://localhost:8080 (frontend)" -ForegroundColor White
Write-Host "3. Acesse: http://localhost:3001/api/health (backend)" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Credenciais padrão:" -ForegroundColor Cyan
Write-Host "   Email: junielsonfarias@gmail.com" -ForegroundColor White
Write-Host "   Senha: Tiko6273@" -ForegroundColor White
Write-Host ""
