# Script para configurar SQLite para desenvolvimento local - SISPAT
# Alternativa ao PostgreSQL quando não está disponível

Write-Host "🔧 Configurando SQLite para desenvolvimento local..." -ForegroundColor Green

# 1. Instalar sqlite3 se não estiver instalado
Write-Host "📦 Verificando SQLite..." -ForegroundColor Yellow
try {
    $sqliteVersion = sqlite3 --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SQLite já está instalado: $sqliteVersion" -ForegroundColor Green
    }
    else {
        Write-Host "❌ SQLite não encontrado. Instalando via npm..." -ForegroundColor Yellow
        npm install -g sqlite3
    }
}
catch {
    Write-Host "❌ Erro ao verificar SQLite: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Criar arquivo de banco SQLite
Write-Host "🗄️ Criando banco de dados SQLite..." -ForegroundColor Yellow
$dbPath = "D:\teste sispat produção\sispat_dev.db"
if (Test-Path $dbPath) {
    Write-Host "✅ Banco SQLite já existe: $dbPath" -ForegroundColor Green
}
else {
    try {
        sqlite3 $dbPath ".databases"
        Write-Host "✅ Banco SQLite criado: $dbPath" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Erro ao criar banco SQLite: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 3. Atualizar .env para usar SQLite
Write-Host "⚙️ Configurando .env para SQLite..." -ForegroundColor Yellow
$envContent = Get-Content .env
$newEnvContent = @()

foreach ($line in $envContent) {
    if ($line -match "^DB_HOST=") {
        $newEnvContent += "DB_HOST=localhost"
    }
    elseif ($line -match "^DB_NAME=") {
        $newEnvContent += "DB_NAME=sispat_dev.db"
    }
    elseif ($line -match "^DB_USER=") {
        $newEnvContent += "DB_USER=sqlite"
    }
    elseif ($line -match "^DB_PASSWORD=") {
        $newEnvContent += "DB_PASSWORD="
    }
    elseif ($line -match "^DISABLE_DATABASE=") {
        $newEnvContent += "DISABLE_DATABASE=false"
    }
    else {
        $newEnvContent += $line
    }
}

$newEnvContent | Set-Content .env
Write-Host "✅ Arquivo .env atualizado para SQLite" -ForegroundColor Green

# 4. Criar script de migração para SQLite
Write-Host "📝 Criando script de migração SQLite..." -ForegroundColor Yellow
$sqliteMigration = @"
-- Migração SQLite para SISPAT
-- Criar tabelas básicas

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'usuario',
    municipality_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de municípios
CREATE TABLE IF NOT EXISTS municipalities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de setores
CREATE TABLE IF NOT EXISTS sectors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    municipality_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (municipality_id) REFERENCES municipalities(id)
);

-- Tabela de locais
CREATE TABLE IF NOT EXISTS locals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sector_id TEXT NOT NULL,
    municipality_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sector_id) REFERENCES sectors(id),
    FOREIGN KEY (municipality_id) REFERENCES municipalities(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabela de patrimônios
CREATE TABLE IF NOT EXISTS patrimonios (
    id TEXT PRIMARY KEY,
    numero_patrimonio TEXT NOT NULL,
    descricao TEXT NOT NULL,
    tipo TEXT,
    marca TEXT,
    modelo TEXT,
    numero_serie TEXT,
    estado TEXT,
    valor_aquisicao REAL,
    data_aquisicao DATE,
    fornecedor TEXT,
    nota_fiscal TEXT,
    local_id TEXT,
    sector_id TEXT,
    municipality_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (local_id) REFERENCES locals(id),
    FOREIGN KEY (sector_id) REFERENCES sectors(id),
    FOREIGN KEY (municipality_id) REFERENCES municipalities(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Inserir dados iniciais
INSERT OR IGNORE INTO municipalities (id, name, state) VALUES 
('00000000-0000-0000-0000-000000000001', 'Município Teste', 'SP');

INSERT OR IGNORE INTO sectors (id, name, description, municipality_id) VALUES 
('00000000-0000-0000-0000-000000000001', 'Administração', 'Setor administrativo', '00000000-0000-0000-0000-000000000001');

INSERT OR IGNORE INTO users (id, name, email, password, role, municipality_id) VALUES 
('00000000-0000-0000-0000-000000000001', 'JUNIELSON CASTRO FARIAS', 'junielsonfarias@gmail.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8K8K8K8', 'superuser', '00000000-0000-0000-0000-000000000001');
"@

$sqliteMigration | Out-File -FilePath "scripts/sqlite-migration.sql" -Encoding UTF8
Write-Host "✅ Script de migração SQLite criado" -ForegroundColor Green

# 5. Executar migração
Write-Host "🔄 Executando migração SQLite..." -ForegroundColor Yellow
try {
    sqlite3 $dbPath < "scripts/sqlite-migration.sql"
    Write-Host "✅ Migração SQLite executada com sucesso!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Erro ao executar migração: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🎉 Configuração SQLite concluída!" -ForegroundColor Green
Write-Host "💡 Agora você pode reiniciar o servidor e fazer login com:" -ForegroundColor Yellow
Write-Host "   Email: junielsonfarias@gmail.com" -ForegroundColor Cyan
Write-Host "   Senha: Tiko6273@" -ForegroundColor Cyan
Write-Host "💡 Banco de dados: $dbPath" -ForegroundColor Cyan
