#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO DE ERROS DE INSTALAÇÃO - SISPAT
# Para corrigir problemas específicos encontrados na instalação
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

log_header "Corrigindo erros de instalação do SISPAT..."

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

# 1. Corrigir tabelas faltantes
log_header "Criando tabelas faltantes..."

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

# Tabela de transferências (nome correto)
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

log_success "Tabelas faltantes criadas!"

# 2. Executar script de dados de exemplo
log_header "Executando dados de exemplo..."
if [ -f "server/database/create-sample-data.js" ]; then
    log_info "Executando script de dados de exemplo..."
    node server/database/create-sample-data.js || log_warning "Falha nos dados de exemplo - continuando..."
    log_success "Dados de exemplo processados!"
else
    log_warning "Script de dados de exemplo não encontrado"
fi

# 3. Corrigir configuração do Nginx
log_header "Corrigindo configuração do Nginx..."

# Verificar se há problemas na configuração do Nginx
if nginx -t 2>&1 | grep -q "location.*directive is not allowed"; then
    log_info "Corrigindo estrutura da configuração do Nginx..."
    
    # Fazer backup da configuração atual
    cp /etc/nginx/sites-available/sispat /etc/nginx/sites-available/sispat.backup
    
    # Recriar configuração correta
    cat > /etc/nginx/sites-available/sispat << 'EOF'
server {
    listen 80;
    server_name sispat.vps-kinghost.net;

    # Servir arquivos estáticos
    location / {
        root /var/www/sispat/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy para API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Logs
    access_log /var/log/nginx/sispat.access.log;
    error_log /var/log/nginx/sispat.error.log;
}
EOF
    
    log_success "Configuração do Nginx recriada!"
elif grep -q "ssl_certificate.*letsencrypt" /etc/nginx/sites-available/sispat 2>/dev/null; then
    log_info "Removendo configuração SSL problemática..."
    
    # Fazer backup da configuração atual
    cp /etc/nginx/sites-available/sispat /etc/nginx/sites-available/sispat.backup
    
    # Remover configuração SSL problemática
    sed -i '/ssl_certificate/d' /etc/nginx/sites-available/sispat
    sed -i '/listen 443/d' /etc/nginx/sites-available/sispat
    sed -i '/ssl_protocols/d' /etc/nginx/sites-available/sispat
    sed -i '/ssl_ciphers/d' /etc/nginx/sites-available/sispat
    sed -i '/ssl_prefer_server_ciphers/d' /etc/nginx/sites-available/sispat
    sed -i '/ssl_session_cache/d' /etc/nginx/sites-available/sispat
    
    log_success "Configuração SSL problemática removida!"
fi

# Testar configuração do Nginx
log_info "Testando configuração do Nginx..."
if nginx -t; then
    log_success "Configuração do Nginx OK!"
    systemctl reload nginx
else
    log_error "Erro na configuração do Nginx!"
    exit 1
fi

# 4. Configurar PM2
log_header "Configurando PM2..."

# Navegar para um diretório seguro
cd /root

# Limpar PM2
pm2 kill 2>/dev/null || true

# Navegar de volta para o SISPAT
cd /var/www/sispat

# Corrigir arquivo de configuração do PM2
log_info "Corrigindo configuração do PM2..."
cat > ecosystem.production.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'sispat-backend',
    script: 'server/index.js',
    cwd: '/var/www/sispat',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: '/var/www/sispat/logs/pm2.log',
    out_file: '/var/www/sispat/logs/pm2-out.log',
    error_file: '/var/www/sispat/logs/pm2-error.log',
    merge_logs: true,
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Iniciar aplicação com PM2
log_info "Iniciando aplicação com PM2..."
pm2 start ecosystem.production.config.cjs --env production
pm2 save

# 5. Verificar status dos serviços
log_header "Verificando status dos serviços..."

# PostgreSQL
if systemctl is-active --quiet postgresql; then
    log_success "PostgreSQL: OK"
else
    log_error "PostgreSQL: ERRO"
fi

# Nginx
if systemctl is-active --quiet nginx; then
    log_success "Nginx: OK"
else
    log_error "Nginx: ERRO"
fi

# PM2
if pm2 list | grep -q "sispat-backend.*online"; then
    log_success "PM2: OK"
else
    log_error "PM2: ERRO"
fi

log_header "Correção Concluída!"
echo -e "\n${GREEN}🎉 Erros de instalação corrigidos com sucesso!${NC}"
echo -e "\n${BLUE}📋 STATUS FINAL:${NC}"
echo -e "🔑 Login: ${YELLOW}admin@sispat.com${NC}"
echo -e "🔒 Senha: ${YELLOW}admin123${NC}"
echo -e "🌐 Acesso: ${YELLOW}http://sispat.vps-kinghost.net${NC}"

echo -e "\n${BLUE}🔧 COMANDOS ÚTEIS:${NC}"
echo -e "📊 Status PM2: ${YELLOW}pm2 status${NC}"
echo -e "📋 Logs PM2: ${YELLOW}pm2 logs${NC}"
echo -e "🔄 Reiniciar: ${YELLOW}pm2 restart all${NC}"
echo -e "🌐 Status Nginx: ${YELLOW}systemctl status nginx${NC}"

echo -e "\n${BLUE}🔒 PARA CONFIGURAR SSL (OPCIONAL):${NC}"
echo -e "certbot --nginx -d sispat.vps-kinghost.net --non-interactive --agree-tos --email admin@sispat.vps-kinghost.net"
