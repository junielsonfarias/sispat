# SISPAT 2.1.0 - Agendar Backup Automático no Task Scheduler

# Requer privilégios de administrador
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Red
    Write-Host "   ERRO: Requer Administrador" -ForegroundColor Red
    Write-Host "================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Execute este script como Administrador:" -ForegroundColor Yellow
    Write-Host "  Clique direito no PowerShell > Executar como Administrador" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   AGENDAR BACKUP AUTOMÁTICO" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Configurações
$TaskName = "SISPAT - Backup Diário"
$ScriptPath = "D:\novo ambiente\sispat - Copia\backend\scripts\backup-sispat.ps1"
$BackupTime = "02:00"  # 2:00 AM

Write-Host "Configurações:" -ForegroundColor Yellow
Write-Host "  Nome da tarefa: $TaskName" -ForegroundColor Gray
Write-Host "  Script: $ScriptPath" -ForegroundColor Gray
Write-Host "  Horário: $BackupTime (todos os dias)" -ForegroundColor Gray
Write-Host ""

# Verificar se script existe
if (!(Test-Path $ScriptPath)) {
    Write-Host "ERRO: Script não encontrado: $ScriptPath" -ForegroundColor Red
    exit 1
}

# Remover tarefa existente se houver
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Tarefa já existe. Removendo..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Criar ação
$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -NoProfile -File `"$ScriptPath`""

# Criar trigger (diário às 2:00 AM)
$Trigger = New-ScheduledTaskTrigger -Daily -At $BackupTime

# Configurações da tarefa
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false

# Criar principal (usuário atual)
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -RunLevel Highest

# Registrar tarefa
Write-Host "Criando tarefa agendada..." -ForegroundColor Yellow

try {
    Register-ScheduledTask -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Settings $Settings `
        -Principal $Principal `
        -Description "Backup automático diário do banco de dados SISPAT" `
        -ErrorAction Stop | Out-Null
    
    Write-Host "   OK: Tarefa criada com sucesso!" -ForegroundColor Green
    Write-Host ""
    
    # Verificar
    $task = Get-ScheduledTask -TaskName $TaskName
    
    Write-Host "====================================" -ForegroundColor Green
    Write-Host "   BACKUP AGENDADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Detalhes:" -ForegroundColor Cyan
    Write-Host "  Nome: $($task.TaskName)" -ForegroundColor White
    Write-Host "  Estado: $($task.State)" -ForegroundColor White
    Write-Host "  Próxima execução: $BackupTime (diariamente)" -ForegroundColor White
    Write-Host ""
    Write-Host "Comandos úteis:" -ForegroundColor Yellow
    Write-Host "  • Ver tarefa:" -ForegroundColor Gray
    Write-Host "    Get-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host ""
    Write-Host "  • Executar agora (teste):" -ForegroundColor Gray
    Write-Host "    Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host ""
    Write-Host "  • Ver histórico:" -ForegroundColor Gray
    Write-Host "    Get-ScheduledTaskInfo -TaskName '$TaskName'" -ForegroundColor White
    Write-Host ""
    Write-Host "  • Desabilitar:" -ForegroundColor Gray
    Write-Host "    Disable-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host ""
    Write-Host "  • Remover:" -ForegroundColor Gray
    Write-Host "    Unregister-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host ""
    
    # Log
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] Tarefa agendada criada: $TaskName" | Out-File $LogFile -Append
    
    Write-Host "Backup configurado! Será executado automaticamente todos os dias às $BackupTime" -ForegroundColor Green
    Write-Host ""
    
    exit 0
    
} catch {
    Write-Host "   ERRO ao criar tarefa: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

