# =============================================================================
# SCRIPT DE CORREÇÃO - PROBLEMAS DE CONEXÃO BACKEND (PowerShell)
# Corrige problemas de 502 Bad Gateway e ERR_CONNECTION_REFUSED
# =============================================================================

# Funções de log
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Header {
    param([string]$Message)
    Write-Host "`n🚀 $Message" -ForegroundColor Magenta
}

# Função para verificar se está rodando como administrador
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Função para diagnosticar problemas
function Diagnose-Issues {
    Write-Header "Diagnosticando problemas de conexão..."
    
    # Verificar se o Node.js está instalado
    Write-Info "Verificando Node.js..."
    try {
        $nodeVersion = node --version
        Write-Success "Node.js $nodeVersion instalado"
    } catch {
        Write-Error "Node.js não está instalado ou não está no PATH"
        return $false
    }
    
    # Verificar se o PM2 está instalado
    Write-Info "Verificando PM2..."
    try {
        $pm2Version = pm2 --version
        Write-Success "PM2 $pm2Version instalado"
    } catch {
        Write-Error "PM2 não está instalado"
        return $false
    }
    
    # Verificar status do PM2
    Write-Info "Verificando status do PM2..."
    try {
        pm2 status
    } catch {
        Write-Warning "Erro ao verificar status do PM2"
    }
    
    # Verificar se o backend está rodando na porta 3001
    Write-Info "Verificando se o backend está rodando na porta 3001..."
    $port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    if ($port3001) {
        Write-Success "Backend está rodando na porta 3001"
        $port3001 | Format-Table
    } else {
        Write-Error "Backend NÃO está rodando na porta 3001"
    }
    
    # Verificar logs do PM2
    Write-Info "Verificando logs do PM2..."
    try {
        pm2 logs --lines 20
    } catch {
        Write-Warning "Erro ao verificar logs do PM2"
    }
    
    return $true
}

# Função para corrigir problemas do PM2
function Fix-PM2Issues {
    Write-Header "Corrigindo problemas do PM2..."
    
    $appDir = "D:\teste sispat produção"
    Set-Location $appDir
    
    # Parar todos os processos
    Write-Info "Parando todos os processos PM2..."
    try {
        pm2 stop all 2>$null
        pm2 delete all 2>$null
    } catch {
        Write-Warning "Erro ao parar processos PM2"
    }
    
    # Verificar se o arquivo de configuração existe
    if (-not (Test-Path "ecosystem.production.config.cjs")) {
        Write-Error "Arquivo ecosystem.production.config.cjs não encontrado!"
        Write-Info "Criando configuração básica do PM2..."
        
        $config = @"
module.exports = {
  apps: [{
    name: 'sispat-backend',
    script: 'server/index.js',
    cwd: 'D:\\teste sispat produção',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3001,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
  }]
};
"@
        
        $config | Out-File -FilePath "ecosystem.production.config.cjs" -Encoding UTF8
    }
    
    # Criar diretório de logs se não existir
    if (-not (Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" -Force
    }
    
    # Iniciar aplicação
    Write-Info "Iniciando aplicação com PM2..."
    try {
        pm2 start ecosystem.production.config.cjs --env production
    } catch {
        Write-Error "Erro ao iniciar aplicação com PM2"
        return $false
    }
    
    # Aguardar inicialização
    Write-Info "Aguardando inicialização do backend..."
    Start-Sleep -Seconds 10
    
    # Verificar se está rodando
    try {
        $pm2Status = pm2 list
        if ($pm2Status -match "sispat-backend.*online") {
            Write-Success "Backend iniciado com sucesso!"
        } else {
            Write-Error "Falha ao iniciar backend!"
            Write-Info "Logs do PM2:"
            pm2 logs --lines 20
            return $false
        }
    } catch {
        Write-Error "Erro ao verificar status do PM2"
        return $false
    }
    
    # Salvar configuração
    try {
        pm2 save
    } catch {
        Write-Warning "Erro ao salvar configuração do PM2"
    }
    
    Write-Success "PM2 configurado e funcionando!"
    return $true
}

# Função para testar API
function Test-API {
    Write-Header "Testando API..."
    
    # Aguardar backend inicializar
    Write-Info "Aguardando backend inicializar..."
    Start-Sleep -Seconds 5
    
    # Testar health check
    Write-Info "Testando health check..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Success "Health check OK!"
        } else {
            Write-Error "Health check falhou com status: $($response.StatusCode)"
        }
    } catch {
        Write-Error "Health check falhou: $($_.Exception.Message)"
    }
    
    # Testar endpoint público
    Write-Info "Testando endpoint público..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/municipalities/public" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Success "Endpoint público OK!"
        } else {
            Write-Warning "Endpoint público retornou status: $($response.StatusCode)"
        }
    } catch {
        Write-Warning "Endpoint público pode ter problemas: $($_.Exception.Message)"
    }
}

# Função para mostrar status final
function Show-FinalStatus {
    Write-Header "Status Final"
    
    Write-Host "`n📊 STATUS DOS SERVIÇOS:" -ForegroundColor Green
    
    # PM2
    try {
        $pm2Status = pm2 list
        if ($pm2Status -match "sispat-backend.*online") {
            Write-Host "✅ PM2: Backend rodando" -ForegroundColor Green
        } else {
            Write-Host "❌ PM2: Backend não está rodando" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ PM2: Erro ao verificar status" -ForegroundColor Red
    }
    
    # Teste de conectividade
    Write-Host "`n🌐 TESTES DE CONECTIVIDADE:" -ForegroundColor Green
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend local: OK" -ForegroundColor Green
        } else {
            Write-Host "❌ Backend local: Falhou (Status: $($response.StatusCode))" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Backend local: Falhou ($($_.Exception.Message))" -ForegroundColor Red
    }
    
    Write-Host "`n📋 COMANDOS ÚTEIS:" -ForegroundColor Blue
    Write-Host "📊 Status PM2: pm2 status" -ForegroundColor Yellow
    Write-Host "📝 Logs PM2: pm2 logs" -ForegroundColor Yellow
    Write-Host "🔄 Reiniciar: pm2 restart all" -ForegroundColor Yellow
    Write-Host "🌐 Teste API: Invoke-WebRequest http://localhost:3001/api/health" -ForegroundColor Yellow
}

# Função principal
function Main {
    Clear-Host
    Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           🔧 CORREÇÃO DE PROBLEMAS DE CONEXÃO                ║
║                                                              ║
║              Backend 502 Bad Gateway / Connection Refused    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Magenta
    
    # Verificar se está rodando como administrador
    if (-not (Test-Administrator)) {
        Write-Error "Este script deve ser executado como administrador!"
        Write-Info "Execute: Start-Process PowerShell -Verb RunAs"
        exit 1
    }
    
    # Executar diagnóstico
    if (-not (Diagnose-Issues)) {
        Write-Error "Diagnóstico falhou!"
        exit 1
    }
    
    Write-Host "`n⚠️  Pressione Enter para continuar com as correções..." -ForegroundColor Yellow
    Read-Host
    
    # Aplicar correções
    if (-not (Fix-PM2Issues)) {
        Write-Error "Correção do PM2 falhou!"
        exit 1
    }
    
    Test-API
    
    # Mostrar status final
    Show-FinalStatus
    
    Write-Host "`n🎉 Correções aplicadas!" -ForegroundColor Green
    Write-Host "Teste a aplicação no navegador agora." -ForegroundColor Yellow
}

# Executar função principal
Main
