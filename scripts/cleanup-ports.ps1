# SISPAT - Script de Limpeza de Portas (PowerShell)
# Este script limpa processos que estão ocupando as portas do SISPAT

param(
    [switch]$Force,
    [switch]$Verbose
)

Write-Host "🧹 Limpando portas do SISPAT..." -ForegroundColor Green

# Portas do SISPAT
$PORTS = @(3001, 5173, 3002, 3003)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    switch ($Level) {
        "ERROR" { Write-Host "[$timestamp] $Message" -ForegroundColor Red }
        "WARNING" { Write-Host "[$timestamp] WARNING: $Message" -ForegroundColor Yellow }
        "SUCCESS" { Write-Host "[$timestamp] $Message" -ForegroundColor Green }
        default { Write-Host "[$timestamp] $Message" -ForegroundColor Green }
    }
}

function Cleanup-Port {
    param([int]$Port)
    
    Write-Log "Verificando porta $Port..."
    
    try {
        # Encontrar processo usando a porta
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        
        if ($connection) {
            $pid = $connection.OwningProcess
            Write-Log "Processo $pid está usando a porta $Port"
            
            # Obter informações do processo
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            
            if ($process) {
                $processName = $process.ProcessName
                Write-Log "Nome do processo: $processName"
                
                if ($processName -eq "node") {
                    Write-Log "Finalizando processo Node.js $pid na porta $Port..."
                    
                    if ($Force) {
                        Stop-Process -Id $pid -Force
                    } else {
                        Stop-Process -Id $pid
                    }
                    
                    Write-Log "✅ Processo $pid finalizado" -Level "SUCCESS"
                } else {
                    Write-Log "Processo $processName ($pid) está usando a porta $Port" -Level "WARNING"
                }
            } else {
                Write-Log "Processo $pid não encontrado" -Level "WARNING"
            }
        } else {
            Write-Log "✅ Porta $Port está livre" -Level "SUCCESS"
        }
    }
    catch {
        Write-Log "Erro ao verificar porta $Port : $($_.Exception.Message)" -Level "ERROR"
    }
}

# Limpar todas as portas
foreach ($port in $PORTS) {
    Cleanup-Port -Port $port
}

# Verificar processos Node.js restantes
Write-Log "Verificando processos Node.js restantes..."
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    $nodeCount = $nodeProcesses.Count
    Write-Log "Ainda há $nodeCount processos Node.js rodando" -Level "WARNING"
    
    if ($Force) {
        Write-Log "Finalizando todos os processos Node.js (modo forçado)..."
        Stop-Process -Name "node" -Force
        Write-Log "✅ Todos os processos Node.js finalizados" -Level "SUCCESS"
    } else {
        $response = Read-Host "Deseja finalizar todos os processos Node.js? (y/N)"
        if ($response -match "^[Yy]$") {
            Stop-Process -Name "node" -Force
            Write-Log "✅ Todos os processos Node.js finalizados" -Level "SUCCESS"
        }
    }
} else {
    Write-Log "✅ Nenhum processo Node.js encontrado" -Level "SUCCESS"
}

# Verificar se as portas estão livres
Write-Log "Verificando se as portas estão livres..."

foreach ($port in $PORTS) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    
    if ($connection) {
        Write-Log "⚠️ Porta $port ainda está em uso" -Level "WARNING"
    } else {
        Write-Log "✅ Porta $port está livre" -Level "SUCCESS"
    }
}

# Verificar PM2 se estiver instalado
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    Write-Log "Verificando processos PM2..."
    
    try {
        $pm2List = pm2 list --no-color 2>$null
        if ($pm2List -match "online") {
            Write-Log "Processos PM2 encontrados" -Level "WARNING"
            
            if ($Force) {
                pm2 stop all
                pm2 delete all
                Write-Log "✅ Todos os processos PM2 finalizados" -Level "SUCCESS"
            } else {
                $response = Read-Host "Deseja finalizar todos os processos PM2? (y/N)"
                if ($response -match "^[Yy]$") {
                    pm2 stop all
                    pm2 delete all
                    Write-Log "✅ Todos os processos PM2 finalizados" -Level "SUCCESS"
                }
            }
        } else {
            Write-Log "✅ Nenhum processo PM2 ativo" -Level "SUCCESS"
        }
    }
    catch {
        Write-Log "Erro ao verificar PM2: $($_.Exception.Message)" -Level "ERROR"
    }
}

Write-Log "🎉 Limpeza de portas concluída!" -Level "SUCCESS"
Write-Host ""
Write-Host "📋 Resumo:" -ForegroundColor Cyan
Write-Host "   • Portas verificadas: $($PORTS -join ', ')" -ForegroundColor White
Write-Host "   • Processos Node.js: Finalizados" -ForegroundColor White
Write-Host "   • Status: Pronto para iniciar o SISPAT" -ForegroundColor White
Write-Host ""
Write-Host "Para iniciar o SISPAT:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host "  ou" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Write-Host "Para usar o script em modo forçado:" -ForegroundColor Cyan
Write-Host "  .\scripts\cleanup-ports.ps1 -Force" -ForegroundColor White
