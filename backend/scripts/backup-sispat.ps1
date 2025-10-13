# SISPAT 2.1.0 - Script de Backup do Banco de Dados

param(
    [string]$BackupDir = "D:\novo ambiente\sispat - Copia\backend\backups",
    [int]$RetentionDays = 30
)

# Configurações do banco
$DbHost = "localhost"
$DbPort = "5432"
$DbName = "sispat_db"
$DbUser = "postgres"
$DbPassword = "postgres"

# Arquivos
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "sispat_backup_$Date.sql"
$BackupFileZip = "$BackupFile.zip"
$LogFile = Join-Path $BackupDir "backup.log"

# Criar diretório
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   SISPAT - BACKUP DO BANCO" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Log
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"[$timestamp] Iniciando backup de $DbName" | Out-File $LogFile -Append

# Verificar pg_dump
Write-Host "1. Verificando pg_dump..." -ForegroundColor Yellow

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (!$pgDump) {
    Write-Host "   Procurando PostgreSQL..." -ForegroundColor Gray
    $pgPath = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if ($pgPath) {
        $env:PATH = "$($pgPath.Directory.FullName);$env:PATH"
        Write-Host "   Encontrado em: $($pgPath.Directory.FullName)" -ForegroundColor Green
    } else {
        Write-Host "   ERRO: pg_dump nao encontrado!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "   OK: pg_dump disponivel" -ForegroundColor Green
Write-Host ""

# Executar backup
Write-Host "2. Criando backup..." -ForegroundColor Yellow
Write-Host "   Database: $DbName" -ForegroundColor Gray
Write-Host "   Arquivo: $BackupFile" -ForegroundColor Gray
Write-Host ""

$env:PGPASSWORD = $DbPassword
$startTime = Get-Date

try {
    & pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName -F p -f $BackupFile 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0 -and (Test-Path $BackupFile)) {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        $fileSize = (Get-Item $BackupFile).Length / 1KB
        
        Write-Host "   Backup criado com sucesso!" -ForegroundColor Green
        Write-Host "   Tamanho: $([math]::Round($fileSize, 2)) KB" -ForegroundColor Gray
        Write-Host "   Tempo: $([math]::Round($duration, 2))s" -ForegroundColor Gray
        Write-Host ""
        
        # Comprimir
        Write-Host "3. Comprimindo backup..." -ForegroundColor Yellow
        Compress-Archive -Path $BackupFile -DestinationPath $BackupFileZip -Force
        
        if (Test-Path $BackupFileZip) {
            $zipSize = (Get-Item $BackupFileZip).Length / 1KB
            $compression = [math]::Round((1 - ($zipSize / $fileSize)) * 100, 1)
            
            Write-Host "   Comprimido com sucesso!" -ForegroundColor Green
            Write-Host "   Tamanho final: $([math]::Round($zipSize, 2)) KB" -ForegroundColor Gray
            Write-Host "   Compressao: $compression%" -ForegroundColor Gray
            Write-Host ""
            
            # Remover SQL original
            Remove-Item $BackupFile -Force
        }
        
        # Limpar antigos
        Write-Host "4. Limpando backups antigos..." -ForegroundColor Yellow
        $oldBackups = Get-ChildItem -Path $BackupDir -Filter "sispat_backup_*.zip" | 
                      Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-$RetentionDays) }
        
        if ($oldBackups) {
            $oldBackups | Remove-Item -Force
            Write-Host "   Removidos: $($oldBackups.Count) backup(s) antigo(s)" -ForegroundColor Green
        } else {
            Write-Host "   Nenhum backup antigo para remover" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "====================================" -ForegroundColor Green
        Write-Host "   BACKUP CONCLUIDO!" -ForegroundColor Green
        Write-Host "====================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Arquivo: $BackupFileZip" -ForegroundColor Cyan
        Write-Host "Tamanho: $([math]::Round($zipSize, 2)) KB" -ForegroundColor Cyan
        Write-Host ""
        
        # Log sucesso
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "[$timestamp] Backup concluido: $BackupFileZip ($([math]::Round($zipSize, 2)) KB)" | Out-File $LogFile -Append
        
        # Listar backups
        Write-Host "Backups disponiveis:" -ForegroundColor Yellow
        Get-ChildItem -Path $BackupDir -Filter "sispat_backup_*.zip" | 
            Sort-Object CreationTime -Descending | 
            Select-Object -First 5 | 
            ForEach-Object {
                $size = [math]::Round($_.Length / 1KB, 2)
                $date = $_.CreationTime.ToString("dd/MM/yyyy HH:mm")
                Write-Host "  $($_.Name) - $size KB - $date" -ForegroundColor Gray
            }
        
        Write-Host ""
        exit 0
        
    } else {
        Write-Host "   ERRO ao criar backup (codigo: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "   ERRO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
