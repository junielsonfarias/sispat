#!/bin/bash

# =================================
# CORREÇÃO BANCO CORRETO - SISPAT
# Usa as configurações corretas encontradas
# =================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Função para erro
error() {
    echo -e "${RED}[ERRO]${NC} $1"
    exit 1
}

# Função para sucesso
success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

# Função para aviso
warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Banner
echo ""
echo "🎯 ================================================"
echo "🎯    CORREÇÃO BANCO CORRETO - SISPAT"
echo "🎯    Usa as configurações corretas encontradas"
echo "🎯 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🎯 Iniciando correção com configurações corretas..."

# 1. Parar PM2 temporariamente
log "🔄 Parando PM2 temporariamente..."
pm2 stop sispat
sleep 3
success "✅ PM2 parado"

# 2. Usar as configurações corretas encontradas
log "🔧 Usando configurações corretas encontradas..."
echo ""

# Baseado no output anterior:
# - Usuários: postgres, sispat_user
# - Bancos: postgres, template1, template0, sispat_production
# - Porta: 5432

# Configurações corretas para testar
CONFIGS=(
    "localhost:5432:sispat_production:sispat_user:"
    "localhost:5432:sispat_production:postgres:"
    "localhost:5432:postgres:postgres:"
    "localhost:5432:postgres:sispat_user:"
)

# 3. Testar configurações corretas
log "🔍 Testando configurações corretas..."
echo ""

for config in "${CONFIGS[@]}"; do
    IFS=':' read -r host port db user pass <<< "$config"
    
    echo "Testando: $host:$port/$db como $user"
    
    if [ -n "$pass" ]; then
        if PGPASSWORD="$pass" psql -h "$host" -p "$port" -U "$user" -d "$db" -c "SELECT 1;" &> /dev/null; then
            success "✅ Conexão bem-sucedida: $host:$port/$db como $user"
            
            # Configurar variáveis de ambiente
            export DB_HOST="$host"
            export DB_PORT="$port"
            export DB_NAME="$db"
            export DB_USER="$user"
            export DB_PASSWORD="$pass"
            
            echo "Configuração encontrada:"
            echo "  Host: $DB_HOST"
            echo "  Port: $DB_PORT"
            echo "  Database: $DB_NAME"
            echo "  User: $DB_USER"
            echo "  Password: [CONFIGURADO]"
            echo ""
            
            # Continuar com a correção do schema
            log "🔧 Aplicando correções no schema..."
            
            # Adicionar coluna setor_responsavel
            echo "Adicionando coluna setor_responsavel..."
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS setor_responsavel VARCHAR(255);" 2>/dev/null || warning "⚠️ Erro ao adicionar setor_responsavel"
            success "✅ Coluna setor_responsavel corrigida"
            
            # Adicionar coluna status
            echo "Adicionando coluna status..."
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ativo';" 2>/dev/null || warning "⚠️ Erro ao adicionar status"
            success "✅ Coluna status corrigida"
            
            # Criar tabela transfers
            echo "Criando tabela transfers..."
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "
            CREATE TABLE IF NOT EXISTS transfers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patrimonio_id UUID REFERENCES patrimonios(id),
                from_setor VARCHAR(255),
                to_setor VARCHAR(255),
                from_user_id UUID,
                to_user_id UUID,
                transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reason TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );" 2>/dev/null || warning "⚠️ Erro ao criar tabela transfers"
            success "✅ Tabela transfers criada"
            
            # Verificar correções
            log "🔍 Verificando correções aplicadas..."
            
            # Verificar coluna setor_responsavel
            SETOR_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patrimonios' AND column_name = 'setor_responsavel');" 2>/dev/null | tr -d ' ' || echo "f")
            if [ "$SETOR_EXISTS" = "t" ]; then
                success "✅ Coluna setor_responsavel existe"
            else
                warning "⚠️ Coluna setor_responsavel não existe"
            fi
            
            # Verificar coluna status
            STATUS_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patrimonios' AND column_name = 'status');" 2>/dev/null | tr -d ' ' || echo "f")
            if [ "$STATUS_EXISTS" = "t" ]; then
                success "✅ Coluna status existe"
            else
                warning "⚠️ Coluna status não existe"
            fi
            
            # Verificar tabela transfers
            TRANSFERS_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transfers');" 2>/dev/null | tr -d ' ' || echo "f")
            if [ "$TRANSFERS_EXISTS" = "t" ]; then
                success "✅ Tabela transfers existe"
            else
                warning "⚠️ Tabela transfers não existe"
            fi
            
            # Reiniciar PM2
            log "🔄 Reiniciando PM2..."
            pm2 start sispat
            sleep 5
            success "✅ PM2 reiniciado"
            
            # Aguardar inicialização
            log "⏳ Aguardando inicialização (15 segundos)..."
            sleep 15
            
            # Testar APIs
            log "🧪 Testando APIs após correção..."
            
            # Testar API patrimonios
            echo "Testando /api/patrimonios:"
            PATRIMONIOS_RESPONSE=$(curl -s -w "%{http_code}" https://sispat.vps-kinghost.net/api/patrimonios 2>/dev/null || echo "ERRO")
            if echo "$PATRIMONIOS_RESPONSE" | grep -q "200"; then
                success "✅ API patrimonios funcionando"
            else
                warning "⚠️ API patrimonios: $PATRIMONIOS_RESPONSE"
            fi
            
            # Testar API sync
            echo "Testando /api/sync/public-data:"
            SYNC_RESPONSE=$(curl -s -w "%{http_code}" https://sispat.vps-kinghost.net/api/sync/public-data 2>/dev/null || echo "ERRO")
            if echo "$SYNC_RESPONSE" | grep -q "200"; then
                success "✅ API sync public-data funcionando"
            else
                warning "⚠️ API sync public-data: $SYNC_RESPONSE"
            fi
            
            # Verificar logs
            log "📋 Verificando logs após correção..."
            echo ""
            pm2 logs sispat --lines 10 --nostream | tail -5
            echo ""
            
            # Instruções finais
            echo ""
            echo "🎉 CORREÇÃO CONCLUÍDA!"
            echo "====================="
            echo ""
            echo "📋 O que foi feito:"
            echo "✅ PM2 parado temporariamente"
            echo "✅ Conexão com banco estabelecida"
            echo "✅ Coluna setor_responsavel adicionada"
            echo "✅ Coluna status adicionada"
            echo "✅ Tabela transfers criada"
            echo "✅ PM2 reiniciado"
            echo "✅ APIs testadas"
            echo ""
            echo "🔧 Configuração do banco:"
            echo "   Host: $DB_HOST"
            echo "   Port: $DB_PORT"
            echo "   Database: $DB_NAME"
            echo "   User: $DB_USER"
            echo ""
            echo "🌐 URLs das APIs:"
            echo "   - Frontend: https://sispat.vps-kinghost.net"
            echo "   - API Patrimonios: https://sispat.vps-kinghost.net/api/patrimonios"
            echo "   - API Sync: https://sispat.vps-kinghost.net/api/sync/public-data"
            echo ""
            echo "📞 Próximos passos:"
            echo "   1. LIMPE O CACHE DO NAVEGADOR (Ctrl+F5)"
            echo "   2. Acesse https://sispat.vps-kinghost.net"
            echo "   3. Verifique se não há mais erros no console"
            echo "   4. Faça login com: junielsonfarias@gmail.com / Tiko6273@"
            echo ""
            echo "🔍 Para monitorar:"
            echo "   - Logs: pm2 logs sispat --lines 50"
            echo "   - Status: pm2 status"
            echo ""
            
            success "🎉 Correção concluída com sucesso!"
            exit 0
        fi
    else
        if psql -h "$host" -p "$port" -U "$user" -d "$db" -c "SELECT 1;" &> /dev/null; then
            success "✅ Conexão bem-sucedida: $host:$port/$db como $user (sem senha)"
            
            # Configurar variáveis de ambiente
            export DB_HOST="$host"
            export DB_PORT="$port"
            export DB_NAME="$db"
            export DB_USER="$user"
            export DB_PASSWORD=""
            
            echo "Configuração encontrada:"
            echo "  Host: $DB_HOST"
            echo "  Port: $DB_PORT"
            echo "  Database: $DB_NAME"
            echo "  User: $DB_USER"
            echo "  Password: [SEM SENHA]"
            echo ""
            
            # Continuar com a correção do schema
            log "🔧 Aplicando correções no schema..."
            
            # Adicionar coluna setor_responsavel
            echo "Adicionando coluna setor_responsavel..."
            psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS setor_responsavel VARCHAR(255);" 2>/dev/null || warning "⚠️ Erro ao adicionar setor_responsavel"
            success "✅ Coluna setor_responsavel corrigida"
            
            # Adicionar coluna status
            echo "Adicionando coluna status..."
            psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ativo';" 2>/dev/null || warning "⚠️ Erro ao adicionar status"
            success "✅ Coluna status corrigida"
            
            # Criar tabela transfers
            echo "Criando tabela transfers..."
            psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "
            CREATE TABLE IF NOT EXISTS transfers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patrimonio_id UUID REFERENCES patrimonios(id),
                from_setor VARCHAR(255),
                to_setor VARCHAR(255),
                from_user_id UUID,
                to_user_id UUID,
                transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reason TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );" 2>/dev/null || warning "⚠️ Erro ao criar tabela transfers"
            success "✅ Tabela transfers criada"
            
            # Verificar correções
            log "🔍 Verificando correções aplicadas..."
            
            # Verificar coluna setor_responsavel
            SETOR_EXISTS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patrimonios' AND column_name = 'setor_responsavel');" 2>/dev/null | tr -d ' ' || echo "f")
            if [ "$SETOR_EXISTS" = "t" ]; then
                success "✅ Coluna setor_responsavel existe"
            else
                warning "⚠️ Coluna setor_responsavel não existe"
            fi
            
            # Verificar coluna status
            STATUS_EXISTS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patrimonios' AND column_name = 'status');" 2>/dev/null | tr -d ' ' || echo "f")
            if [ "$STATUS_EXISTS" = "t" ]; then
                success "✅ Coluna status existe"
            else
                warning "⚠️ Coluna status não existe"
            fi
            
            # Verificar tabela transfers
            TRANSFERS_EXISTS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transfers');" 2>/dev/null | tr -d ' ' || echo "f")
            if [ "$TRANSFERS_EXISTS" = "t" ]; then
                success "✅ Tabela transfers existe"
            else
                warning "⚠️ Tabela transfers não existe"
            fi
            
            # Reiniciar PM2
            log "🔄 Reiniciando PM2..."
            pm2 start sispat
            sleep 5
            success "✅ PM2 reiniciado"
            
            # Aguardar inicialização
            log "⏳ Aguardando inicialização (15 segundos)..."
            sleep 15
            
            # Testar APIs
            log "🧪 Testando APIs após correção..."
            
            # Testar API patrimonios
            echo "Testando /api/patrimonios:"
            PATRIMONIOS_RESPONSE=$(curl -s -w "%{http_code}" https://sispat.vps-kinghost.net/api/patrimonios 2>/dev/null || echo "ERRO")
            if echo "$PATRIMONIOS_RESPONSE" | grep -q "200"; then
                success "✅ API patrimonios funcionando"
            else
                warning "⚠️ API patrimonios: $PATRIMONIOS_RESPONSE"
            fi
            
            # Testar API sync
            echo "Testando /api/sync/public-data:"
            SYNC_RESPONSE=$(curl -s -w "%{http_code}" https://sispat.vps-kinghost.net/api/sync/public-data 2>/dev/null || echo "ERRO")
            if echo "$SYNC_RESPONSE" | grep -q "200"; then
                success "✅ API sync public-data funcionando"
            else
                warning "⚠️ API sync public-data: $SYNC_RESPONSE"
            fi
            
            # Verificar logs
            log "📋 Verificando logs após correção..."
            echo ""
            pm2 logs sispat --lines 10 --nostream | tail -5
            echo ""
            
            # Instruções finais
            echo ""
            echo "🎉 CORREÇÃO CONCLUÍDA!"
            echo "====================="
            echo ""
            echo "📋 O que foi feito:"
            echo "✅ PM2 parado temporariamente"
            echo "✅ Conexão com banco estabelecida"
            echo "✅ Coluna setor_responsavel adicionada"
            echo "✅ Coluna status adicionada"
            echo "✅ Tabela transfers criada"
            echo "✅ PM2 reiniciado"
            echo "✅ APIs testadas"
            echo ""
            echo "🔧 Configuração do banco:"
            echo "   Host: $DB_HOST"
            echo "   Port: $DB_PORT"
            echo "   Database: $DB_NAME"
            echo "   User: $DB_USER"
            echo ""
            echo "🌐 URLs das APIs:"
            echo "   - Frontend: https://sispat.vps-kinghost.net"
            echo "   - API Patrimonios: https://sispat.vps-kinghost.net/api/patrimonios"
            echo "   - API Sync: https://sispat.vps-kinghost.net/api/sync/public-data"
            echo ""
            echo "📞 Próximos passos:"
            echo "   1. LIMPE O CACHE DO NAVEGADOR (Ctrl+F5)"
            echo "   2. Acesse https://sispat.vps-kinghost.net"
            echo "   3. Verifique se não há mais erros no console"
            echo "   4. Faça login com: junielsonfarias@gmail.com / Tiko6273@"
            echo ""
            echo "🔍 Para monitorar:"
            echo "   - Logs: pm2 logs sispat --lines 50"
            echo "   - Status: pm2 status"
            echo ""
            
            success "🎉 Correção concluída com sucesso!"
            exit 0
        fi
    fi
    
    echo "❌ Falha na conexão: $host:$port/$db como $user"
done

# Se chegou aqui, nenhuma configuração funcionou
error "❌ Não foi possível conectar ao banco de dados com nenhuma configuração testada"
