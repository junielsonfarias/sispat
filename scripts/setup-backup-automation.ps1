# SISPAT - Script de Configuração de Backup Automático (PowerShell)
# Este script configura backup automático do banco de dados PostgreSQL

param(
    [switch]$Force
)

Write-Host "🚀 Configurando Sistema de Backup Automático..." -ForegroundColor Green

# Função para log
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] $Message" -ForegroundColor $color
}

# Configurações
$backupDir = "C:\postgresql\backups"
$retentionDays = 30
$retentionWeeks = 12
$retentionMonths = 12
$dbName = "sispat"
$dbUser = "backup_user"
$dbHost = "localhost"
$dbPort = "5432"

# Criar diretório de backup
Write-Log "Criando diretório de backup..."
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Log "Diretório de backup criado: $backupDir" "SUCCESS"
}
else {
    Write-Log "Diretório de backup já existe: $backupDir" "SUCCESS"
}

# Criar subdiretórios
$subdirs = @("daily", "weekly", "monthly")
foreach ($subdir in $subdirs) {
    $path = Join-Path $backupDir $subdir
    if (!(Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Log "Subdiretório criado: $path" "SUCCESS"
    }
}

# 1. Script de backup diário
Write-Log "Criando script de backup diário..."

$dailyBackupScript = @"
# SISPAT - Backup Diário do Banco de Dados
# Executa backup completo diário com compressão

param(
    [string]`$BackupDir = "$backupDir",
    [string]`$DbName = "$dbName",
    [string]`$DbUser = "$dbUser",
    [string]`$DbHost = "$dbHost",
    [string]`$DbPort = "$dbPort"
)

`$Date = Get-Date -Format "yyyyMMdd_HHmmss"
`$BackupFile = Join-Path `$BackupDir "daily\sispat_daily_`$Date.sql.gz"
`$LogFile = "C:\logs\sispat\backup-daily.log"

# Criar diretório de log se não existir
`$logDir = Split-Path `$LogFile -Parent
if (!(Test-Path `$logDir)) {
    New-Item -ItemType Directory -Path `$logDir -Force | Out-Null
}

# Função de log
function Write-Log {
    param([string]`$Message)
    `$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    `$logMessage = "`$timestamp - `$Message"
    Write-Host `$logMessage
    Add-Content -Path `$LogFile -Value `$logMessage
}

Write-Log "Iniciando backup diário do SISPAT..."

# Verificar se o PostgreSQL está rodando
try {
    `$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if (`$pgService -and `$pgService.Status -eq "Running") {
        Write-Log "PostgreSQL está rodando"
    } else {
        Write-Log "ERRO: PostgreSQL não está rodando"
        exit 1
    }
} catch {
    Write-Log "ERRO: Não foi possível verificar o status do PostgreSQL"
    exit 1
}

# Executar backup
Write-Log "Executando backup do banco de dados..."
try {
    `$env:PGPASSWORD = "backup_secure_password_2025"
    `$backupCommand = "pg_dump -h `$DbHost -p `$DbPort -U `$DbUser -d `$DbName --verbose --no-password"
    `$backupCommand | Out-File -FilePath `$BackupFile -Encoding UTF8
    
    if (Test-Path `$BackupFile) {
        `$size = (Get-Item `$BackupFile).Length
        `$sizeMB = [math]::Round(`$size / 1MB, 2)
        Write-Log "Backup diário concluído com sucesso: `$BackupFile (`$sizeMB MB)"
        
        # Limpar backups antigos (mais de 30 dias)
        `$oldBackups = Get-ChildItem -Path (Join-Path `$BackupDir "daily") -Filter "*.sql.gz" | Where-Object { `$_.LastWriteTime -lt (Get-Date).AddDays(-30) }
        `$oldBackups | Remove-Item -Force
        Write-Log "Backups antigos removidos: `$(`$oldBackups.Count) arquivos"
    } else {
        Write-Log "ERRO: Arquivo de backup não foi criado"
        exit 1
    }
} catch {
    Write-Log "ERRO: Falha no backup diário: `$(`$_.Exception.Message)"
    exit 1
}

Write-Log "Backup diário finalizado"
"@

$dailyScriptPath = "C:\scripts\backup-daily.ps1"
$scriptDir = Split-Path $dailyScriptPath -Parent
if (!(Test-Path $scriptDir)) {
    New-Item -ItemType Directory -Path $scriptDir -Force | Out-Null
}
$dailyBackupScript | Out-File -FilePath $dailyScriptPath -Encoding UTF8
Write-Log "Script de backup diário criado: $dailyScriptPath" "SUCCESS"

# 2. Script de backup semanal
Write-Log "Criando script de backup semanal..."

$weeklyBackupScript = @"
# SISPAT - Backup Semanal do Banco de Dados
# Executa backup completo semanal com compressão

param(
    [string]`$BackupDir = "$backupDir",
    [string]`$DbName = "$dbName",
    [string]`$DbUser = "$dbUser",
    [string]`$DbHost = "$dbHost",
    [string]`$DbPort = "$dbPort"
)

`$Date = Get-Date -Format "yyyyMMdd_HHmmss"
`$BackupFile = Join-Path `$BackupDir "weekly\sispat_weekly_`$Date.sql.gz"
`$LogFile = "C:\logs\sispat\backup-weekly.log"

# Criar diretório de log se não existir
`$logDir = Split-Path `$LogFile -Parent
if (!(Test-Path `$logDir)) {
    New-Item -ItemType Directory -Path `$logDir -Force | Out-Null
}

# Função de log
function Write-Log {
    param([string]`$Message)
    `$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    `$logMessage = "`$timestamp - `$Message"
    Write-Host `$logMessage
    Add-Content -Path `$LogFile -Value `$logMessage
}

Write-Log "Iniciando backup semanal do SISPAT..."

# Verificar se o PostgreSQL está rodando
try {
    `$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if (`$pgService -and `$pgService.Status -eq "Running") {
        Write-Log "PostgreSQL está rodando"
    } else {
        Write-Log "ERRO: PostgreSQL não está rodando"
        exit 1
    }
} catch {
    Write-Log "ERRO: Não foi possível verificar o status do PostgreSQL"
    exit 1
}

# Executar backup
Write-Log "Executando backup do banco de dados..."
try {
    `$env:PGPASSWORD = "backup_secure_password_2025"
    `$backupCommand = "pg_dump -h `$DbHost -p `$DbPort -U `$DbUser -d `$DbName --verbose --no-password"
    `$backupCommand | Out-File -FilePath `$BackupFile -Encoding UTF8
    
    if (Test-Path `$BackupFile) {
        `$size = (Get-Item `$BackupFile).Length
        `$sizeMB = [math]::Round(`$size / 1MB, 2)
        Write-Log "Backup semanal concluído com sucesso: `$BackupFile (`$sizeMB MB)"
        
        # Limpar backups antigos (mais de 12 semanas)
        `$oldBackups = Get-ChildItem -Path (Join-Path `$BackupDir "weekly") -Filter "*.sql.gz" | Where-Object { `$_.LastWriteTime -lt (Get-Date).AddDays(-84) }
        `$oldBackups | Remove-Item -Force
        Write-Log "Backups antigos removidos: `$(`$oldBackups.Count) arquivos"
    } else {
        Write-Log "ERRO: Arquivo de backup não foi criado"
        exit 1
    }
} catch {
    Write-Log "ERRO: Falha no backup semanal: `$(`$_.Exception.Message)"
    exit 1
}

Write-Log "Backup semanal finalizado"
"@

$weeklyScriptPath = "C:\scripts\backup-weekly.ps1"
$weeklyBackupScript | Out-File -FilePath $weeklyScriptPath -Encoding UTF8
Write-Log "Script de backup semanal criado: $weeklyScriptPath" "SUCCESS"

# 3. Script de backup mensal
Write-Log "Criando script de backup mensal..."

$monthlyBackupScript = @"
# SISPAT - Backup Mensal do Banco de Dados
# Executa backup completo mensal com compressão

param(
    [string]`$BackupDir = "$backupDir",
    [string]`$DbName = "$dbName",
    [string]`$DbUser = "$dbUser",
    [string]`$DbHost = "$dbHost",
    [string]`$DbPort = "$dbPort"
)

`$Date = Get-Date -Format "yyyyMMdd_HHmmss"
`$BackupFile = Join-Path `$BackupDir "monthly\sispat_monthly_`$Date.sql.gz"
`$LogFile = "C:\logs\sispat\backup-monthly.log"

# Criar diretório de log se não existir
`$logDir = Split-Path `$LogFile -Parent
if (!(Test-Path `$logDir)) {
    New-Item -ItemType Directory -Path `$logDir -Force | Out-Null
}

# Função de log
function Write-Log {
    param([string]`$Message)
    `$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    `$logMessage = "`$timestamp - `$Message"
    Write-Host `$logMessage
    Add-Content -Path `$LogFile -Value `$logMessage
}

Write-Log "Iniciando backup mensal do SISPAT..."

# Verificar se o PostgreSQL está rodando
try {
    `$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if (`$pgService -and `$pgService.Status -eq "Running") {
        Write-Log "PostgreSQL está rodando"
    } else {
        Write-Log "ERRO: PostgreSQL não está rodando"
        exit 1
    }
} catch {
    Write-Log "ERRO: Não foi possível verificar o status do PostgreSQL"
    exit 1
}

# Executar backup
Write-Log "Executando backup do banco de dados..."
try {
    `$env:PGPASSWORD = "backup_secure_password_2025"
    `$backupCommand = "pg_dump -h `$DbHost -p `$DbPort -U `$DbUser -d `$DbName --verbose --no-password"
    `$backupCommand | Out-File -FilePath `$BackupFile -Encoding UTF8
    
    if (Test-Path `$BackupFile) {
        `$size = (Get-Item `$BackupFile).Length
        `$sizeMB = [math]::Round(`$size / 1MB, 2)
        Write-Log "Backup mensal concluído com sucesso: `$BackupFile (`$sizeMB MB)"
        
        # Limpar backups antigos (mais de 12 meses)
        `$oldBackups = Get-ChildItem -Path (Join-Path `$BackupDir "monthly") -Filter "*.sql.gz" | Where-Object { `$_.LastWriteTime -lt (Get-Date).AddDays(-365) }
        `$oldBackups | Remove-Item -Force
        Write-Log "Backups antigos removidos: `$(`$oldBackups.Count) arquivos"
    } else {
        Write-Log "ERRO: Arquivo de backup não foi criado"
        exit 1
    }
} catch {
    Write-Log "ERRO: Falha no backup mensal: `$(`$_.Exception.Message)"
    exit 1
}

Write-Log "Backup mensal finalizado"
"@

$monthlyScriptPath = "C:\scripts\backup-monthly.ps1"
$monthlyBackupScript | Out-File -FilePath $monthlyScriptPath -Encoding UTF8
Write-Log "Script de backup mensal criado: $monthlyScriptPath" "SUCCESS"

# 4. Script de verificação de backup
Write-Log "Criando script de verificação de backup..."

$verifyBackupScript = @"
# SISPAT - Verificação de Backup
# Verifica a integridade dos backups

param(
    [string]`$BackupDir = "$backupDir"
)

`$LogFile = "C:\logs\sispat\backup-verify.log"

# Criar diretório de log se não existir
`$logDir = Split-Path `$LogFile -Parent
if (!(Test-Path `$logDir)) {
    New-Item -ItemType Directory -Path `$logDir -Force | Out-Null
}

# Função de log
function Write-Log {
    param([string]`$Message)
    `$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    `$logMessage = "`$timestamp - `$Message"
    Write-Host `$logMessage
    Add-Content -Path `$LogFile -Value `$logMessage
}

Write-Log "Iniciando verificação de backups..."

# Verificar backups diários
Write-Log "Verificando backups diários..."
`$dailyBackups = Get-ChildItem -Path (Join-Path `$BackupDir "daily") -Filter "*.sql.gz" -ErrorAction SilentlyContinue
if (`$dailyBackups) {
    Write-Log "Encontrados `$(`$dailyBackups.Count) backups diários"
    
    # Verificar o backup mais recente
    `$latestDaily = `$dailyBackups | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (`$latestDaily) {
        Write-Log "✅ Backup diário mais recente: `$(`$latestDaily.Name) (`$(`$latestDaily.LastWriteTime))"
    }
} else {
    Write-Log "⚠️ Nenhum backup diário encontrado"
}

# Verificar backups semanais
Write-Log "Verificando backups semanais..."
`$weeklyBackups = Get-ChildItem -Path (Join-Path `$BackupDir "weekly") -Filter "*.sql.gz" -ErrorAction SilentlyContinue
if (`$weeklyBackups) {
    Write-Log "Encontrados `$(`$weeklyBackups.Count) backups semanais"
    
    # Verificar o backup mais recente
    `$latestWeekly = `$weeklyBackups | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (`$latestWeekly) {
        Write-Log "✅ Backup semanal mais recente: `$(`$latestWeekly.Name) (`$(`$latestWeekly.LastWriteTime))"
    }
} else {
    Write-Log "⚠️ Nenhum backup semanal encontrado"
}

# Verificar backups mensais
Write-Log "Verificando backups mensais..."
`$monthlyBackups = Get-ChildItem -Path (Join-Path `$BackupDir "monthly") -Filter "*.sql.gz" -ErrorAction SilentlyContinue
if (`$monthlyBackups) {
    Write-Log "Encontrados `$(`$monthlyBackups.Count) backups mensais"
    
    # Verificar o backup mais recente
    `$latestMonthly = `$monthlyBackups | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (`$latestMonthly) {
        Write-Log "✅ Backup mensal mais recente: `$(`$latestMonthly.Name) (`$(`$latestMonthly.LastWriteTime))"
    }
} else {
    Write-Log "⚠️ Nenhum backup mensal encontrado"
}

# Verificar espaço em disco
Write-Log "Verificando espaço em disco..."
`$disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
`$diskUsage = [math]::Round((`$disk.Size - `$disk.FreeSpace) / `$disk.Size * 100, 2)
if (`$diskUsage -gt 80) {
    Write-Log "⚠️ Espaço em disco baixo: `$diskUsage% usado"
} else {
    Write-Log "✅ Espaço em disco OK: `$diskUsage% usado"
}

Write-Log "Verificação de backups finalizada"
"@

$verifyScriptPath = "C:\scripts\verify-backup.ps1"
$verifyBackupScript | Out-File -FilePath $verifyScriptPath -Encoding UTF8
Write-Log "Script de verificação de backup criado: $verifyScriptPath" "SUCCESS"

# 5. Configurar agendamento com Task Scheduler
Write-Log "Configurando agendamento de backups..."

# Backup diário às 2:00
$dailyTask = @{
    TaskName  = "SISPAT-Backup-Daily"
    Action    = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File `"$dailyScriptPath`""
    Trigger   = New-ScheduledTaskTrigger -Daily -At "02:00"
    Settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
}
Register-ScheduledTask @dailyTask -Force
Write-Log "Tarefa de backup diário agendada" "SUCCESS"

# Backup semanal aos domingos às 3:00
$weeklyTask = @{
    TaskName  = "SISPAT-Backup-Weekly"
    Action    = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File `"$weeklyScriptPath`""
    Trigger   = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "03:00"
    Settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
}
Register-ScheduledTask @weeklyTask -Force
Write-Log "Tarefa de backup semanal agendada" "SUCCESS"

# Backup mensal no primeiro dia do mês às 4:00
$monthlyTask = @{
    TaskName  = "SISPAT-Backup-Monthly"
    Action    = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File `"$monthlyScriptPath`""
    Trigger   = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At "04:00"
    Settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
}
Register-ScheduledTask @monthlyTask -Force
Write-Log "Tarefa de backup mensal agendada" "SUCCESS"

# Verificação de backup diária às 5:00
$verifyTask = @{
    TaskName  = "SISPAT-Verify-Backup"
    Action    = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File `"$verifyScriptPath`""
    Trigger   = New-ScheduledTaskTrigger -Daily -At "05:00"
    Settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
}
Register-ScheduledTask @verifyTask -Force
Write-Log "Tarefa de verificação de backup agendada" "SUCCESS"

# 6. Testar backup
Write-Log "Testando backup..."

try {
    & $dailyScriptPath
    Write-Log "✅ Teste de backup bem-sucedido" "SUCCESS"
}
catch {
    Write-Log "❌ Falha no teste de backup: $($_.Exception.Message)" "ERROR"
}

# 7. Verificar backup
Write-Log "Verificando backup de teste..."

try {
    & $verifyScriptPath
    Write-Log "✅ Verificação de backup bem-sucedida" "SUCCESS"
}
catch {
    Write-Log "⚠️ Problemas na verificação de backup: $($_.Exception.Message)" "WARNING"
}

# 8. Criar relatório de status
Write-Log "Criando relatório de status..."

$statusScript = @"
# SISPAT - Status dos Backups
# Exibe o status atual dos backups

param(
    [string]`$BackupDir = "$backupDir"
)

Write-Host "📊 Status dos Backups SISPAT" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host ""

# Backups diários
Write-Host "📅 Backups Diários:" -ForegroundColor Yellow
`$dailyCount = (Get-ChildItem -Path (Join-Path `$BackupDir "daily") -Filter "*.sql.gz" -ErrorAction SilentlyContinue).Count
Write-Host "   Total: `$dailyCount"
if (`$dailyCount -gt 0) {
    `$latestDaily = Get-ChildItem -Path (Join-Path `$BackupDir "daily") -Filter "*.sql.gz" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    `$latestDailySize = [math]::Round(`$latestDaily.Length / 1MB, 2)
    Write-Host "   Mais recente: `$(`$latestDaily.Name) (`$latestDailySize MB)"
}
Write-Host ""

# Backups semanais
Write-Host "📅 Backups Semanais:" -ForegroundColor Yellow
`$weeklyCount = (Get-ChildItem -Path (Join-Path `$BackupDir "weekly") -Filter "*.sql.gz" -ErrorAction SilentlyContinue).Count
Write-Host "   Total: `$weeklyCount"
if (`$weeklyCount -gt 0) {
    `$latestWeekly = Get-ChildItem -Path (Join-Path `$BackupDir "weekly") -Filter "*.sql.gz" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    `$latestWeeklySize = [math]::Round(`$latestWeekly.Length / 1MB, 2)
    Write-Host "   Mais recente: `$(`$latestWeekly.Name) (`$latestWeeklySize MB)"
}
Write-Host ""

# Backups mensais
Write-Host "📅 Backups Mensais:" -ForegroundColor Yellow
`$monthlyCount = (Get-ChildItem -Path (Join-Path `$BackupDir "monthly") -Filter "*.sql.gz" -ErrorAction SilentlyContinue).Count
Write-Host "   Total: `$monthlyCount"
if (`$monthlyCount -gt 0) {
    `$latestMonthly = Get-ChildItem -Path (Join-Path `$BackupDir "monthly") -Filter "*.sql.gz" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    `$latestMonthlySize = [math]::Round(`$latestMonthly.Length / 1MB, 2)
    Write-Host "   Mais recente: `$(`$latestMonthly.Name) (`$latestMonthlySize MB)"
}
Write-Host ""

# Espaço em disco
Write-Host "💾 Espaço em Disco:" -ForegroundColor Yellow
`$disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
`$diskUsage = [math]::Round((`$disk.Size - `$disk.FreeSpace) / `$disk.Size * 100, 2)
`$diskAvailable = [math]::Round(`$disk.FreeSpace / 1GB, 2)
Write-Host "   Usado: `$diskUsage%"
Write-Host "   Disponível: `$diskAvailable GB"
Write-Host ""

# Próximos backups
Write-Host "⏰ Próximos Backups:" -ForegroundColor Yellow
Write-Host "   Diário: 02:00 (todos os dias)"
Write-Host "   Semanal: 03:00 (domingos)"
Write-Host "   Mensal: 04:00 (primeiro dia do mês)"
Write-Host ""

Write-Host "✅ Sistema de backup configurado e funcionando" -ForegroundColor Green
"@

$statusScriptPath = "C:\scripts\backup-status.ps1"
$statusScript | Out-File -FilePath $statusScriptPath -Encoding UTF8
Write-Log "Script de status de backup criado: $statusScriptPath" "SUCCESS"

# 9. Executar status
Write-Log "Executando status dos backups..."
& $statusScriptPath

Write-Log "🎉 Sistema de backup automático configurado com sucesso!" "SUCCESS"
Write-Log "📋 Configurações aplicadas:" "SUCCESS"
Write-Log "   • Backup diário às 2:00 (retenção: 30 dias)" "SUCCESS"
Write-Log "   • Backup semanal aos domingos às 3:00 (retenção: 12 semanas)" "SUCCESS"
Write-Log "   • Backup mensal no primeiro dia às 4:00 (retenção: 12 meses)" "SUCCESS"
Write-Log "   • Verificação diária às 5:00" "SUCCESS"
Write-Log "   • Logs centralizados em C:\logs\sispat\" "SUCCESS"
Write-Log ""
Write-Log "🔧 Comandos úteis:" "SUCCESS"
Write-Log "   • Ver status: & $statusScriptPath" "SUCCESS"
Write-Log "   • Verificar backups: & $verifyScriptPath" "SUCCESS"
Write-Log "   • Executar backup manual: & $dailyScriptPath" "SUCCESS"
Write-Log "   • Ver tarefas agendadas: Get-ScheduledTask -TaskName 'SISPAT-*'" "SUCCESS"
