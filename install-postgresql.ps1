# Script para instalar PostgreSQL no Windows
# Execute este script como administrador

Write-Host "🚀 Instalando PostgreSQL..." -ForegroundColor Green

# Verificar se o Chocolatey está instalado
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Instalando Chocolatey..." -ForegroundColor Yellow
    
    # Instalar Chocolatey
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    # Recarregar variáveis de ambiente
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Instalar PostgreSQL
Write-Host "🗄️ Instalando PostgreSQL..." -ForegroundColor Yellow
choco install postgresql --yes

# Aguardar um pouco para a instalação terminar
Start-Sleep -Seconds 10

# Verificar se o PostgreSQL foi instalado
if (Get-Command psql -ErrorAction SilentlyContinue) {
    Write-Host "✅ PostgreSQL instalado com sucesso!" -ForegroundColor Green
    
    # Iniciar o serviço PostgreSQL
    Write-Host "🔄 Iniciando serviço PostgreSQL..." -ForegroundColor Yellow
    Start-Service postgresql*
    
    # Aguardar o serviço iniciar
    Start-Sleep -Seconds 5
    
    # Verificar se o serviço está rodando
    $service = Get-Service postgresql*
    if ($service.Status -eq "Running") {
        Write-Host "✅ Serviço PostgreSQL está rodando!" -ForegroundColor Green
        
        # Criar banco de dados
        Write-Host "🗄️ Criando banco de dados sispat_db..." -ForegroundColor Yellow
        try {
            psql -U postgres -h localhost -c "CREATE DATABASE sispat_db;" 2>$null
            Write-Host "✅ Banco de dados criado com sucesso!" -ForegroundColor Green
        } catch {
            Write-Host "ℹ️ Banco de dados já existe ou erro na criação" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "🎉 PostgreSQL configurado com sucesso!" -ForegroundColor Green
        Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
        Write-Host "1. Execute: pnpm run db:migrate" -ForegroundColor White
        Write-Host "2. Execute: pnpm run db:seed" -ForegroundColor White
        Write-Host "3. Execute: pnpm run dev" -ForegroundColor White
        Write-Host ""
        
    } else {
        Write-Host "❌ Erro: Serviço PostgreSQL não está rodando" -ForegroundColor Red
        Write-Host "Tente iniciar manualmente: Start-Service postgresql*" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Erro: PostgreSQL não foi instalado corretamente" -ForegroundColor Red
    Write-Host "Tente instalar manualmente: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
