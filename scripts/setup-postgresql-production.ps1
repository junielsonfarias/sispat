# SISPAT - Script de Configuração do PostgreSQL para Produção (PowerShell)
# Este script configura o PostgreSQL para ambiente de produção

param(
    [switch]$Force
)

Write-Host "🚀 Configurando PostgreSQL para Produção..." -ForegroundColor Green

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

# Verificar se o PostgreSQL está instalado
try {
    $pgVersion = & psql --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL não encontrado"
    }
    Write-Log "PostgreSQL encontrado: $pgVersion" "SUCCESS"
}
catch {
    Write-Log "PostgreSQL não está instalado. Instale primeiro o PostgreSQL." "ERROR"
    exit 1
}

# Verificar se o usuário tem permissões de superusuário
try {
    & psql -U postgres -c "SELECT 1;" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Sem permissões de superusuário"
    }
    Write-Log "Permissões de superusuário verificadas" "SUCCESS"
}
catch {
    Write-Log "Este script precisa ser executado com permissões de superusuário PostgreSQL" "ERROR"
    exit 1
}

Write-Log "Configurando PostgreSQL para produção..."

# 1. Configurar extensões necessárias
Write-Log "Criando extensões do PostgreSQL..."

$extensions = @(
    "pg_stat_statements",
    "pg_trgm", 
    "btree_gin",
    "btree_gist",
    "unaccent",
    "pgcrypto"
)

foreach ($extension in $extensions) {
    try {
        & psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS $extension;"
        Write-Log "Extensão $extension criada com sucesso" "SUCCESS"
    }
    catch {
        Write-Log "Erro ao criar extensão $extension" "WARNING"
    }
}

# 2. Configurar usuário de backup
Write-Log "Configurando usuário de backup..."

try {
    & psql -U postgres -c "CREATE USER backup_user WITH PASSWORD 'backup_secure_password_2025';"
    & psql -U postgres -c "GRANT CONNECT ON DATABASE sispat TO backup_user;"
    & psql -U postgres -c "GRANT USAGE ON SCHEMA public TO backup_user;"
    & psql -U postgres -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;"
    & psql -U postgres -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO backup_user;"
    Write-Log "Usuário de backup configurado com sucesso" "SUCCESS"
}
catch {
    Write-Log "Erro ao configurar usuário de backup" "WARNING"
}

# 3. Configurar monitoramento
Write-Log "Configurando monitoramento..."

$monitoringFunction = @"
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE (
    database_name text,
    size_bytes bigint,
    connections integer,
    active_queries integer
) AS `$`$
BEGIN
    RETURN QUERY
    SELECT 
        d.datname::text,
        pg_database_size(d.datname) as size_bytes,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = d.datname) as connections,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = d.datname AND state = 'active') as active_queries
    FROM pg_database d
    WHERE d.datname NOT IN ('template0', 'template1', 'postgres');
END;
`$`$ LANGUAGE plpgsql;
"@

try {
    & psql -U postgres -c $monitoringFunction
    Write-Log "Função de monitoramento criada com sucesso" "SUCCESS"
}
catch {
    Write-Log "Erro ao criar função de monitoramento" "WARNING"
}

# 4. Criar diretório de backup
Write-Log "Criando diretório de backup..."
$backupDir = "C:\postgresql\backups"
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Log "Diretório de backup criado: $backupDir" "SUCCESS"
}
else {
    Write-Log "Diretório de backup já existe: $backupDir" "SUCCESS"
}

# 5. Verificar configuração
Write-Log "Verificando configuração..."

# Verificar se as extensões estão carregadas
try {
    $extensions = & psql -U postgres -c "SELECT extname FROM pg_extension WHERE extname = 'pg_stat_statements';" -t
    if ($extensions -match "pg_stat_statements") {
        Write-Log "✅ Extensão pg_stat_statements carregada" "SUCCESS"
    }
    else {
        Write-Log "⚠️ Extensão pg_stat_statements não carregada" "WARNING"
    }
}
catch {
    Write-Log "⚠️ Erro ao verificar extensões" "WARNING"
}

# Verificar configurações de memória
try {
    $sharedBuffers = & psql -U postgres -c "SHOW shared_buffers;" -t
    Write-Log "✅ shared_buffers: $($sharedBuffers.Trim())" "SUCCESS"
}
catch {
    Write-Log "⚠️ Erro ao verificar shared_buffers" "WARNING"
}

# Verificar configurações de logging
try {
    $loggingCollector = & psql -U postgres -c "SHOW logging_collector;" -t
    Write-Log "✅ logging_collector: $($loggingCollector.Trim())" "SUCCESS"
}
catch {
    Write-Log "⚠️ Erro ao verificar logging_collector" "WARNING"
}

# Verificar configurações de autovacuum
try {
    $autovacuum = & psql -U postgres -c "SHOW autovacuum;" -t
    Write-Log "✅ autovacuum: $($autovacuum.Trim())" "SUCCESS"
}
catch {
    Write-Log "⚠️ Erro ao verificar autovacuum" "WARNING"
}

# Verificar configurações de SSL
try {
    $ssl = & psql -U postgres -c "SHOW ssl;" -t
    Write-Log "✅ ssl: $($ssl.Trim())" "SUCCESS"
}
catch {
    Write-Log "⚠️ Erro ao verificar ssl" "WARNING"
}

Write-Log "🎉 Configuração do PostgreSQL para produção concluída com sucesso!" "SUCCESS"
Write-Log "📋 Próximos passos:" "SUCCESS"
Write-Log "   1. Configure o backup automático com o script de backup" "SUCCESS"
Write-Log "   2. Configure o monitoramento com ferramentas externas" "SUCCESS"
Write-Log "   3. Teste a performance com cargas de trabalho reais" "SUCCESS"
Write-Log "   4. Configure alertas para métricas críticas" "SUCCESS"

Write-Host ""
Write-Log "🔧 Configurações aplicadas:" "SUCCESS"
Write-Log "   • Extensões de performance instaladas" "SUCCESS"
Write-Log "   • Usuário de backup criado" "SUCCESS"
Write-Log "   • Monitoramento configurado" "SUCCESS"
Write-Log "   • Diretório de backup criado" "SUCCESS"
