# Script para configurar banco de dados local - SISPAT
# Executa como Administrador

Write-Host "🔧 Configurando banco de dados local para SISPAT..." -ForegroundColor Green

# Verificar se está executando como administrador
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ Este script precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host "💡 Clique com botão direito no PowerShell e selecione 'Executar como administrador'" -ForegroundColor Yellow
    exit 1
}

# 1. Tentar iniciar o serviço PostgreSQL
Write-Host "🔄 Iniciando serviço PostgreSQL..." -ForegroundColor Yellow
try {
    Start-Service postgresql-x64-17 -ErrorAction Stop
    Write-Host "✅ Serviço PostgreSQL iniciado com sucesso!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Erro ao iniciar PostgreSQL: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Verifique se o PostgreSQL está instalado corretamente" -ForegroundColor Yellow
    exit 1
}

# 2. Aguardar o serviço estar pronto
Write-Host "⏳ Aguardando PostgreSQL estar pronto..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 3. Testar conexão
Write-Host "🔍 Testando conexão com PostgreSQL..." -ForegroundColor Yellow
try {
    $env:PGPASSWORD = "postgres"
    $result = psql -h localhost -U postgres -d postgres -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Conexão com PostgreSQL bem-sucedida!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Erro na conexão: $result" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ Erro ao testar conexão: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Verifique se psql está no PATH" -ForegroundColor Yellow
}

# 4. Criar banco de dados se não existir
Write-Host "🗄️ Verificando banco de dados sispat_development..." -ForegroundColor Yellow
try {
    $checkDb = psql -h localhost -U postgres -d postgres -c "SELECT 1 FROM pg_database WHERE datname = 'sispat_development';" 2>&1
    if ($checkDb -match "1 row") {
        Write-Host "✅ Banco de dados sispat_development já existe!" -ForegroundColor Green
    }
    else {
        Write-Host "🔄 Criando banco de dados sispat_development..." -ForegroundColor Yellow
        $createDb = psql -h localhost -U postgres -d postgres -c "CREATE DATABASE sispat_development;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Banco de dados criado com sucesso!" -ForegroundColor Green
        }
        else {
            Write-Host "❌ Erro ao criar banco: $createDb" -ForegroundColor Red
        }
    }
}
catch {
    Write-Host "❌ Erro ao verificar/criar banco: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Executar migrações
Write-Host "🔄 Executando migrações do banco de dados..." -ForegroundColor Yellow
try {
    Set-Location "D:\teste sispat produção"
    node server/database/migrate.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migrações executadas com sucesso!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Erro ao executar migrações" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Erro ao executar migrações: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Executar seed (criar superuser)
Write-Host "🌱 Executando seed do banco de dados..." -ForegroundColor Yellow
try {
    node server/database/seed.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Seed executado com sucesso!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Erro ao executar seed" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Erro ao executar seed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🎉 Configuração do banco de dados concluída!" -ForegroundColor Green
Write-Host "💡 Agora você pode reiniciar o servidor e fazer login com:" -ForegroundColor Yellow
Write-Host "   Email: junielsonfarias@gmail.com" -ForegroundColor Cyan
Write-Host "   Senha: Tiko6273@" -ForegroundColor Cyan
