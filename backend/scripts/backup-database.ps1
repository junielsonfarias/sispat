# ===========================================
# SISPAT 2.0 - SCRIPT DE BACKUP AUTOMÁTICO (WINDOWS)
# ===========================================

param(
    [string]$BackupDir = "D:\Backups\SISPAT",
    [string]$DbName = "sispat_prod",
    [string]$DbUser = "sispat_user",
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [int]$RetentionDays = 30
)

# Data e hora
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$DayOfWeek = (Get-Date).DayOfWeek
$BackupFile = Join-Path $BackupDir "sispat_backup_$Date.sql"
$BackupFileGz = "$BackupFile.gz"
$DailyBackupDir = Join-Path $BackupDir "daily"
$DailyBackupFile = Join-Path $DailyBackupDir "sispat_backup_$DayOfWeek.sql.gz"

# Funções de log
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Início
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  SISPAT 2.0 - BACKUP AUTOMÁTICO" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se pg_dump existe
$pgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDumpPath) {
    Write-ErrorMsg "pg_dump não encontrado. Instale o PostgreSQL."
    Write-ErrorMsg "Download: https://www.postgresql.org/download/windows/"
    exit 1
}

# Criar diretórios
Write-Info "Criando diretórios de backup..."
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
New-Item -ItemType Directory -Force -Path $DailyBackupDir | Out-Null

# Fazer backup
Write-Info "Iniciando backup do banco de dados..."
Write-Info "Database: $DbName"
Write-Info "Host: ${DbHost}:${DbPort}"
Write-Info "Arquivo: $BackupFile"

try {
    # Variável de ambiente para senha (se necessário)
    if ($env:PGPASSWORD) {
        $env:PGPASSWORD = $env:DB_PASSWORD
    }
    
    # Executar pg_dump
    & pg_dump `
        -h $DbHost `
        -p $DbPort `
        -U $DbUser `
        -d $DbName `
        --format=custom `
        --compress=9 `
        --file=$BackupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Info "✅ Dump do banco concluído"
        
        # Comprimir com gzip (se disponível)
        if (Get-Command gzip -ErrorAction SilentlyContinue) {
            gzip -f $BackupFile
            $BackupFile = $BackupFileGz
        }
        
        # Verificar tamanho
        $size = (Get-Item $BackupFile).Length / 1MB
        Write-Info "📦 Tamanho do backup: $([math]::Round($size, 2)) MB"
        
        # Copiar para backup diário rotativo
        Copy-Item $BackupFile -Destination $DailyBackupFile -Force
        Write-Info "✅ Backup diário atualizado: $DailyBackupFile"
        
    } else {
        Write-ErrorMsg "❌ Erro ao executar pg_dump"
        exit 1
    }
    
} catch {
    Write-ErrorMsg "❌ Erro durante backup: $_"
    exit 1
}

# Limpar backups antigos
Write-Info "Limpando backups antigos (> $RetentionDays dias)..."
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)
$oldBackups = Get-ChildItem -Path $BackupDir -Filter "sispat_backup_*.sql*" | 
    Where-Object { $_.LastWriteTime -lt $cutoffDate }

if ($oldBackups.Count -gt 0) {
    $oldBackups | Remove-Item -Force
    Write-Info "🗑️  $($oldBackups.Count) backup(s) antigo(s) removido(s)"
} else {
    Write-Info "Nenhum backup antigo para remover"
}

# Sucesso
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  ✅ BACKUP CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Info "Arquivo: $BackupFile"
Write-Info "Para restaurar, use: .\restore-database.ps1 '$BackupFile'"
Write-Host ""

exit 0

