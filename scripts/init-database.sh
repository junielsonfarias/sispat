#!/bin/bash

# =============================================================================
# SCRIPT DE INICIALIZAÇÃO DO BANCO DE DADOS - SISPAT
# Cria todas as tabelas necessárias do zero
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${BLUE}🚀 $1${NC}"
}

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
    log_error "Este script deve ser executado como root!"
    log_info "Execute: sudo su -"
    exit 1
fi

log_header "Inicializando banco de dados SISPAT..."

# Definir credenciais do banco
DB_NAME="sispat_db"
DB_USER="postgres"
DB_PASSWORD="postgres"

# Navegar para o diretório do SISPAT
cd /var/www/sispat

# Função para executar SQL
execute_sql() {
    local sql="$1"
    log_info "Executando: $sql"
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "$sql"
}

# Função para executar arquivo SQL
execute_sql_file() {
    local file="$1"
    if [ -f "$file" ]; then
        log_info "Executando arquivo: $file"
        PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -f "$file"
    else
        log_warning "Arquivo não encontrado: $file"
    fi
}

# Criar tabelas básicas
log_info "Criando tabelas básicas..."

# Tabela de usuários
execute_sql "
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    municipality_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Garantir índice único para email (necessário para ON CONFLICT)
execute_sql "
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users(email);
"

# Tabela de municípios
execute_sql "
CREATE TABLE IF NOT EXISTS municipalities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    state VARCHAR(2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de setores
execute_sql "
CREATE TABLE IF NOT EXISTS sectors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    municipality_id INTEGER REFERENCES municipalities(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de locais
execute_sql "
CREATE TABLE IF NOT EXISTS locals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    sector_id INTEGER REFERENCES sectors(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de patrimônios (bens)
execute_sql "
CREATE TABLE IF NOT EXISTS patrimonios (
    id SERIAL PRIMARY KEY,
    numero_patrimonio VARCHAR(50) UNIQUE NOT NULL,
    descricao TEXT NOT NULL,
    valor_aquisicao DECIMAL(15,2),
    data_aquisicao DATE,
    estado_conservacao VARCHAR(50),
    observacoes TEXT,
    municipality_id INTEGER REFERENCES municipalities(id),
    sector_id INTEGER REFERENCES sectors(id),
    local_id INTEGER REFERENCES locals(id),
    user_id INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de imóveis
execute_sql "
CREATE TABLE IF NOT EXISTS imoveis (
    id SERIAL PRIMARY KEY,
    numero_patrimonio VARCHAR(50) UNIQUE NOT NULL,
    descricao TEXT NOT NULL,
    endereco TEXT,
    area_total DECIMAL(10,2),
    area_construida DECIMAL(10,2),
    valor_aquisicao DECIMAL(15,2),
    data_aquisicao DATE,
    estado_conservacao VARCHAR(50),
    tipo_imovel VARCHAR(100),
    situacao_juridica VARCHAR(100),
    observacoes TEXT,
    municipality_id INTEGER REFERENCES municipalities(id),
    sector_id INTEGER REFERENCES sectors(id),
    local_id INTEGER REFERENCES locals(id),
    user_id INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de transferências
execute_sql "
CREATE TABLE IF NOT EXISTS transferencias (
    id SERIAL PRIMARY KEY,
    patrimonio_id INTEGER,
    imovel_id INTEGER,
    sector_origem_id INTEGER REFERENCES sectors(id),
    sector_destino_id INTEGER REFERENCES sectors(id),
    local_origem_id INTEGER REFERENCES locals(id),
    local_destino_id INTEGER REFERENCES locals(id),
    user_origem_id INTEGER REFERENCES users(id),
    user_destino_id INTEGER REFERENCES users(id),
    data_transferencia DATE NOT NULL,
    motivo TEXT,
    observacoes TEXT,
    status VARCHAR(50) DEFAULT 'pendente',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de empréstimos
execute_sql "
CREATE TABLE IF NOT EXISTS emprestimos (
    id SERIAL PRIMARY KEY,
    patrimonio_id INTEGER,
    imovel_id INTEGER,
    user_solicitante_id INTEGER REFERENCES users(id),
    user_responsavel_id INTEGER REFERENCES users(id),
    data_emprestimo DATE NOT NULL,
    data_devolucao_prevista DATE,
    data_devolucao_real DATE,
    motivo TEXT,
    observacoes TEXT,
    status VARCHAR(50) DEFAULT 'ativo',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de inventários
execute_sql "
CREATE TABLE IF NOT EXISTS inventarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    municipality_id INTEGER REFERENCES municipalities(id),
    sector_id INTEGER REFERENCES sectors(id),
    data_inicio DATE,
    data_fim DATE,
    status VARCHAR(50) DEFAULT 'em_andamento',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de configurações do sistema
execute_sql "
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    municipality_id INTEGER REFERENCES municipalities(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de logs de auditoria
execute_sql "
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de templates de relatório
execute_sql "
CREATE TABLE IF NOT EXISTS report_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    descricao TEXT,
    config JSONB,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de manutenção
execute_sql "
CREATE TABLE IF NOT EXISTS manutencao_tasks (
    id SERIAL PRIMARY KEY,
    patrimonio_id INTEGER REFERENCES patrimonios(id),
    imovel_id INTEGER REFERENCES imoveis(id),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo_manutencao VARCHAR(100),
    prioridade VARCHAR(50) DEFAULT 'media',
    status VARCHAR(50) DEFAULT 'pendente',
    data_agendada DATE,
    data_inicio DATE,
    data_fim DATE,
    custo_estimado DECIMAL(15,2),
    custo_real DECIMAL(15,2),
    fornecedor VARCHAR(255),
    observacoes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de transferências (corrigir nome)
execute_sql "
CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    patrimonio_id INTEGER REFERENCES patrimonios(id),
    imovel_id INTEGER REFERENCES imoveis(id),
    sector_origem_id INTEGER REFERENCES sectors(id),
    sector_destino_id INTEGER REFERENCES sectors(id),
    local_origem_id INTEGER REFERENCES locals(id),
    local_destino_id INTEGER REFERENCES locals(id),
    user_origem_id INTEGER REFERENCES users(id),
    user_destino_id INTEGER REFERENCES users(id),
    data_transferencia DATE NOT NULL,
    motivo TEXT,
    observacoes TEXT,
    status VARCHAR(50) DEFAULT 'pendente',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de templates de etiqueta
execute_sql "
CREATE TABLE IF NOT EXISTS label_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    descricao TEXT,
    tamanho VARCHAR(50) DEFAULT 'standard',
    config JSONB,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de campos de formulário
execute_sql "
CREATE TABLE IF NOT EXISTS form_fields (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    label VARCHAR(255),
    placeholder VARCHAR(255),
    obrigatorio BOOLEAN DEFAULT false,
    opcoes JSONB,
    ordem INTEGER DEFAULT 0,
    tabela_alvo VARCHAR(100),
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de templates Excel/CSV
execute_sql "
CREATE TABLE IF NOT EXISTS excel_csv_templates (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    descricao TEXT,
    colunas JSONB,
    filtros JSONB,
    formato VARCHAR(50) DEFAULT 'xlsx',
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Tabela de configurações de personalização
execute_sql "
CREATE TABLE IF NOT EXISTS customization_settings (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(255) UNIQUE NOT NULL,
    valor TEXT,
    descricao TEXT,
    categoria VARCHAR(100),
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Criar usuário administrador padrão
log_info "Criando usuário administrador padrão..."
execute_sql "
INSERT INTO users (name, email, password, role) 
VALUES ('Administrador', 'admin@sispat.com', '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8KLrqfU2Xm', 'superuser')
ON CONFLICT (email) DO NOTHING;
"

# Criar município padrão
log_info "Criando município padrão..."
execute_sql "
INSERT INTO municipalities (name, code, state) 
VALUES ('Município Padrão', '000001', 'SP')
ON CONFLICT (code) DO NOTHING;
"

# Criar setor padrão
log_info "Criando setor padrão..."
execute_sql "
INSERT INTO sectors (name, code, municipality_id) 
VALUES ('Setor Administrativo', '001', 1)
ON CONFLICT DO NOTHING;
"

# Criar local padrão
log_info "Criando local padrão..."
execute_sql "
INSERT INTO locals (name, code, sector_id) 
VALUES ('Sala Administrativa', '001', 1)
ON CONFLICT DO NOTHING;
"

# Criar índices para melhor performance
log_info "Criando índices..."
execute_sql "
CREATE INDEX IF NOT EXISTS idx_patrimonios_numero ON patrimonios(numero_patrimonio);
CREATE INDEX IF NOT EXISTS idx_patrimonios_municipality ON patrimonios(municipality_id);
CREATE INDEX IF NOT EXISTS idx_patrimonios_sector ON patrimonios(sector_id);
CREATE INDEX IF NOT EXISTS idx_imoveis_numero ON imoveis(numero_patrimonio);
CREATE INDEX IF NOT EXISTS idx_imoveis_municipality ON imoveis(municipality_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_municipality ON users(municipality_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
"

# Executar scripts de otimização se existirem
if [ -f "server/database/optimize.js" ]; then
    log_info "Executando otimizações do banco..."
    node server/database/optimize.js || log_warning "Falha nas otimizações - continuando..."
fi

log_success "Banco de dados inicializado com sucesso!"

# Mostrar estatísticas
log_info "Verificando tabelas criadas..."
execute_sql "
SELECT 
    schemaname,
    tablename,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) as columns
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
"

log_header "Inicialização Concluída!"
echo -e "\n${GREEN}🎉 Banco de dados SISPAT inicializado com sucesso!${NC}"
echo -e "\n${BLUE}📋 INFORMAÇÕES:${NC}"
echo -e "🔑 Login: ${YELLOW}admin@sispat.com${NC}"
echo -e "🔒 Senha: ${YELLOW}admin123${NC}"
echo -e "🏢 Município: ${YELLOW}Município Padrão${NC}"
echo -e "📁 Setor: ${YELLOW}Setor Administrativo${NC}"
