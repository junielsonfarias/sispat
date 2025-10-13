# Script de teste de backup simplificado para SISPAT

# Configurações
$BackupDir = "D:\novo ambiente\sispat - Copia\backend\backups"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "sispat_backup_test_$Date.sql"
$LogFile = Join-Path $BackupDir "backup_test.log"

# Criar diretório se não existir
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "TESTE DE BACKUP - SISPAT" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Log
"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Iniciando teste de backup" | Out-File $LogFile -Append

# Verificar PostgreSQL
Write-Host "1. Verificando PostgreSQL..." -ForegroundColor Yellow
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue

if (!$pgDump) {
    Write-Host "   ❌ pg_dump não encontrado no PATH" -ForegroundColor Red
    Write-Host "   Verificando instalações comuns do PostgreSQL..." -ForegroundColor Yellow
    
    # Locais comuns de instalação
    $commonPaths = @(
        "C:\Program Files\PostgreSQL\*\bin",
        "C:\Program Files (x86)\PostgreSQL\*\bin",
        "C:\PostgreSQL\*\bin"
    )
    
    foreach ($path in $commonPaths) {
        $found = Get-ChildItem $path -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq "pg_dump.exe" }
        if ($found) {
            Write-Host "   ✅ PostgreSQL encontrado em: $($found.Directory.FullName)" -ForegroundColor Green
            $env:PATH = "$($found.Directory.FullName);$env:PATH"
            $pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
            break
        }
    }
    
    if (!$pgDump) {
        Write-Host "   ❌ PostgreSQL não encontrado." -ForegroundColor Red
        Write-Host "   Por favor, instale PostgreSQL ou adicione pg_dump ao PATH" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "   ✅ pg_dump encontrado: $($pgDump.Source)" -ForegroundColor Green
}

# Verificar conexão com banco
Write-Host "`n2. Verificando conexão com banco de dados..." -ForegroundColor Yellow

# Tentar ler configuração do .env
$dbHost = "localhost"
$dbPort = "5432"
$dbName = "sispat_dev"
$dbUser = "postgres"

if (Test-Path "backend\.env") {
    $envContent = Get-Content "backend\.env"
    $dbUrlLine = $envContent | Where-Object { $_ -match "DATABASE_URL" }
    
    if ($dbUrlLine) {
        # Extrair dados da DATABASE_URL
        # Formato: postgresql://user:password@host:port/database
        if ($dbUrlLine -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)") {
            $dbUser = $matches[1]
            $dbPassword = $matches[2]
            $dbHost = $matches[3]
            $dbPort = $matches[4]
            $dbName = $matches[5]
            
            Write-Host "   ✅ Configuração do banco:" -ForegroundColor Green
            Write-Host "      Host: $dbHost" -ForegroundColor Gray
            Write-Host "      Port: $dbPort" -ForegroundColor Gray
            Write-Host "      Database: $dbName" -ForegroundColor Gray
            Write-Host "      User: $dbUser" -ForegroundColor Gray
        }
    }
}

# Testar conexão
Write-Host "`n3. Testando conexão..." -ForegroundColor Yellow
$env:PGPASSWORD = $dbPassword

try {
    $testQuery = "SELECT 1"
    $result = & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c $testQuery 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Conexão com banco OK" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Não foi possível conectar. Continuando mesmo assim..." -ForegroundColor Yellow
        Write-Host "   Erro: $result" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  psql não disponível. Tentando backup direto..." -ForegroundColor Yellow
}

# Fazer backup
Write-Host "`n4. Executando backup..." -ForegroundColor Yellow
Write-Host "   Arquivo: $BackupFile" -ForegroundColor Gray

try {
    & pg_dump -h $dbHost -p $dbPort -U $dbUser -d $dbName -F p -f $BackupFile 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0 -and (Test-Path $BackupFile)) {
        $fileSize = (Get-Item $BackupFile).Length / 1KB
        Write-Host "   ✅ Backup criado com sucesso!" -ForegroundColor Green
        Write-Host "   Tamanho: $([math]::Round($fileSize, 2)) KB" -ForegroundColor Gray
        
        # Log sucesso
        "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Backup teste concluído: $BackupFile ($([math]::Round($fileSize, 2)) KB)" | Out-File $LogFile -Append
        
        # Comprimir
        Write-Host "`n5. Comprimindo backup..." -ForegroundColor Yellow
        Compress-Archive -Path $BackupFile -DestinationPath "$BackupFile.zip" -Force
        
        if (Test-Path "$BackupFile.zip") {
            $zipSize = (Get-Item "$BackupFile.zip").Length / 1KB
            Write-Host "   ✅ Backup comprimido!" -ForegroundColor Green
            Write-Host "   Tamanho comprimido: $([math]::Round($zipSize, 2)) KB" -ForegroundColor Gray
            
            # Remover arquivo SQL não comprimido
            Remove-Item $BackupFile -Force
        }
        
        Write-Host "`n==================================" -ForegroundColor Green
        Write-Host "✅ TESTE DE BACKUP CONCLUÍDO!" -ForegroundColor Green
        Write-Host "==================================" -ForegroundColor Green
        Write-Host "`nArquivo salvo em:" -ForegroundColor Cyan
        Write-Host "   $BackupDir" -ForegroundColor White
        Write-Host ""
        
    } else {
        Write-Host "   ❌ Erro ao criar backup" -ForegroundColor Red
        Write-Host "   Código de saída: $LASTEXITCODE" -ForegroundColor Gray
        "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Erro no backup teste" | Out-File $LogFile -Append
        exit 1
    }
} catch {
    Write-Host "   ❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Erro: $($_.Exception.Message)" | Out-File $LogFile -Append
    exit 1
} finally {
    # Limpar variável de senha
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

