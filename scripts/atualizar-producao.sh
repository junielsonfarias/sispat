#!/bin/bash

# Script de Atualização de Produção - SISPAT
# Este script atualiza o código do repositório Git e faz rebuild do frontend
# Uso: ./scripts/atualizar-producao.sh

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variáveis
PROJECT_DIR="/var/www/sispat"
FRONTEND_DIR="$PROJECT_DIR/frontend"
FRONTEND_SRC_DIR="$PROJECT_DIR/src"
FRONTEND_DIST_DIR="$PROJECT_DIR/dist"
BACKEND_DIR="$PROJECT_DIR/backend"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
GIT_BRANCH="main"
GIT_REMOTE="origin"

# Detectar estrutura do frontend
detect_frontend_structure() {
    # IMPORTANTE: sempre que houver código-fonte (src/), o frontend DEVE ser
    # rebuildado — nunca pular o rebuild só porque já existe dist/. Isso garante
    # que mudanças do git pull realmente cheguem ao bundle servido.
    if [ -d "$FRONTEND_DIR" ]; then
        FRONTEND_WORK_DIR="$FRONTEND_DIR"
        FRONTEND_BUILD_DIR="$FRONTEND_DIR/dist"
        return 0
    elif [ -d "$FRONTEND_SRC_DIR" ] && [ -f "$PROJECT_DIR/package.json" ]; then
        FRONTEND_WORK_DIR="$PROJECT_DIR"
        FRONTEND_BUILD_DIR="$PROJECT_DIR/dist"
        return 0
    else
        return 1
    fi
}

# Função para imprimir mensagens
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo ""
}

# Verificar se está rodando como root ou com sudo
check_permissions() {
    if [ "$EUID" -eq 0 ]; then
        print_warning "Script rodando como root. Alguns comandos podem precisar de ajustes."
    fi
}

# Verificar se está no diretório correto
check_directory() {
    print_header "Verificando Diretório"
    
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "Diretório do projeto não encontrado: $PROJECT_DIR"
        print_info "Execute este script a partir do servidor de produção"
        exit 1
    fi
    
    cd "$PROJECT_DIR" || exit 1
    print_success "Diretório do projeto encontrado: $PROJECT_DIR"
}

# Criar diretório de backups se não existir
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        print_success "Diretório de backups criado: $BACKUP_DIR"
    fi
}

# Fazer backup do código atual
backup_current_code() {
    print_header "Fazendo Backup do Código Atual"
    
    create_backup_dir
    
    # Detectar e fazer backup do frontend
    if detect_frontend_structure; then
        if [ -d "$FRONTEND_BUILD_DIR" ]; then
            BACKUP_NAME="frontend_dist_$TIMESTAMP"
            cp -r "$FRONTEND_BUILD_DIR" "$BACKUP_DIR/$BACKUP_NAME" 2>/dev/null || true
            print_success "Backup do frontend (dist) criado: $BACKUP_DIR/$BACKUP_NAME"
        fi
        
        if [ -d "$FRONTEND_WORK_DIR" ] && [ "$FRONTEND_WORK_DIR" != "$PROJECT_DIR" ]; then
            BACKUP_NAME="frontend_$TIMESTAMP"
            cp -r "$FRONTEND_WORK_DIR" "$BACKUP_DIR/$BACKUP_NAME" 2>/dev/null || true
            print_success "Backup do frontend criado: $BACKUP_DIR/$BACKUP_NAME"
        fi
    elif [ -d "$FRONTEND_DIST_DIR" ]; then
        BACKUP_NAME="dist_$TIMESTAMP"
        cp -r "$FRONTEND_DIST_DIR" "$BACKUP_DIR/$BACKUP_NAME" 2>/dev/null || true
        print_success "Backup do dist criado: $BACKUP_DIR/$BACKUP_NAME"
    else
        print_warning "Estrutura do frontend não encontrada, pulando backup do frontend"
        print_info "Verificando se frontend está em outro local..."
        
        # Verificar se há dist na raiz
        if [ -d "$PROJECT_DIR/dist" ]; then
            BACKUP_NAME="dist_$TIMESTAMP"
            cp -r "$PROJECT_DIR/dist" "$BACKUP_DIR/$BACKUP_NAME" 2>/dev/null || true
            print_success "Backup do dist encontrado e criado: $BACKUP_DIR/$BACKUP_NAME"
        fi
    fi
    
    # Backup do backend (opcional)
    if [ -d "$BACKEND_DIR" ]; then
        BACKEND_BACKUP_NAME="backend_$TIMESTAMP"
        cp -r "$BACKEND_DIR" "$BACKUP_DIR/$BACKEND_BACKUP_NAME" 2>/dev/null || true
        print_success "Backup do backend criado: $BACKUP_DIR/$BACKEND_BACKUP_NAME"
    fi
}

# Verificar status do Git
check_git_status() {
    print_header "Verificando Status do Git"
    
    cd "$PROJECT_DIR" || exit 1
    
    if [ ! -d ".git" ]; then
        print_error "Diretório não é um repositório Git"
        exit 1
    fi
    
    # Verificar se há alterações não commitadas
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "Há alterações não commitadas no repositório"
        read -p "Deseja fazer stash das alterações? (s/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            git stash save "Backup antes de atualizar - $TIMESTAMP"
            print_success "Alterações salvas em stash"
        else
            print_error "Abortando atualização. Resolva as alterações pendentes primeiro."
            exit 1
        fi
    fi
    
    print_success "Repositório Git verificado"
}

# Atualizar código do repositório
update_from_git() {
    print_header "Atualizando Código do Repositório"
    
    cd "$PROJECT_DIR" || exit 1
    
    # Buscar atualizações
    print_info "Buscando atualizações do repositório remoto..."
    git fetch "$GIT_REMOTE"
    
    # Verificar se há atualizações
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse "$GIT_REMOTE/$GIT_BRANCH")
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        print_warning "Já está na versão mais recente"
        return 0
    fi
    
    # Mostrar commits que serão aplicados
    print_info "Commits que serão aplicados:"
    git log HEAD.."$GIT_REMOTE/$GIT_BRANCH" --oneline
    
    # Fazer pull
    print_info "Aplicando atualizações..."
    git pull "$GIT_REMOTE" "$GIT_BRANCH"
    
    # Verificar commit atual
    CURRENT_COMMIT=$(git rev-parse --short HEAD)
    print_success "Código atualizado para commit: $CURRENT_COMMIT"
    
    # Mostrar último commit
    echo ""
    print_info "Último commit:"
    git log -1 --oneline
}

# Rebuild do pacote compartilhado (@sispat/shared)
# Frontend e backend dependem de shared/dist (gitignored). Deve ser compilado
# ANTES de buildar frontend/backend para refletir mudanças do git pull.
rebuild_shared() {
    print_header "Rebuild do Pacote Compartilhado (@sispat/shared)"

    if [ ! -d "$PROJECT_DIR/shared" ]; then
        print_warning "Diretório shared não encontrado, pulando build do pacote compartilhado"
        return 0
    fi

    cd "$PROJECT_DIR/shared" || return 1

    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        print_info "Instalando dependências do shared..."
        npm install
    fi

    print_info "Compilando @sispat/shared..."
    npm run build

    if [ ! -f "dist/index.js" ]; then
        print_error "Build do shared falhou - dist/index.js não encontrado"
        return 1
    fi

    print_success "Pacote compartilhado compilado"
    cd "$PROJECT_DIR" || return 1
}

# Aplicar migrations do banco (Prisma)
run_migrations() {
    print_header "Aplicando Migrations do Banco (Prisma)"

    if [ ! -d "$BACKEND_DIR" ]; then
        print_warning "Diretório backend não encontrado, pulando migrations"
        return 0
    fi

    cd "$BACKEND_DIR" || return 1

    print_info "Gerando Prisma Client..."
    npx prisma generate

    print_info "Aplicando migrations (prisma migrate deploy)..."
    npx prisma migrate deploy

    print_success "Migrations aplicadas"
    cd "$PROJECT_DIR" || return 1
}

# Rebuild do frontend
rebuild_frontend() {
    print_header "Rebuild do Frontend"
    
    # Detectar estrutura do frontend
    if ! detect_frontend_structure; then
        print_error "Estrutura do frontend não encontrada!"
        print_info "Locais verificados:"
        print_info "  - $FRONTEND_DIR"
        print_info "  - $FRONTEND_SRC_DIR (com package.json na raiz)"
        print_warning "Pulando rebuild do frontend. Continuando com outras atualizações..."
        return 1
    fi

    cd "$FRONTEND_WORK_DIR" || exit 1
    
    # Verificar se node_modules existe
    if [ ! -d "node_modules" ]; then
        print_info "Instalando dependências..."
        npm install
    else
        # Verificar se package.json foi modificado
        if [ "package.json" -nt "node_modules" ]; then
            print_info "package.json foi modificado, reinstalando dependências..."
            npm install
        fi
    fi
    
    # Build
    print_info "Executando build de produção..."
    npm run build
    
    # Verificar se o build foi bem-sucedido
    if [ ! -d "dist" ]; then
        print_error "Build falhou - diretório dist não encontrado"
        return 1
    fi
    
    # Verificar tamanho dos arquivos
    DIST_SIZE=$(du -sh dist | cut -f1)
    print_success "Build concluído com sucesso (tamanho: $DIST_SIZE)"
    
    # Listar alguns arquivos gerados
    echo ""
    print_info "Arquivos gerados:"
    if [ -d "dist/assets" ]; then
        ls -lh dist/assets/*.js 2>/dev/null | head -3 || print_warning "Nenhum arquivo JS encontrado em dist/assets"
    else
        ls -lh dist/*.js 2>/dev/null | head -3 || print_warning "Nenhum arquivo JS encontrado em dist"
    fi
}

# Rebuild do backend (opcional)
rebuild_backend() {
    print_header "Rebuild do Backend"
    
    if [ ! -d "$BACKEND_DIR" ]; then
        print_warning "Diretório backend não encontrado, pulando rebuild"
        return 0
    fi
    
    cd "$BACKEND_DIR" || return 1
    
    # Verificar se node_modules existe
    if [ ! -d "node_modules" ]; then
        print_info "Instalando dependências do backend..."
        npm install
    fi
    
    # Build do backend (se houver script de build)
    if grep -q "\"build\"" package.json 2>/dev/null; then
        print_info "Executando build do backend..."
        npm run build
        print_success "Build do backend concluído"
    else
        print_info "Backend não possui script de build, pulando..."
    fi
}

# Reiniciar serviços
restart_services() {
    print_header "Reiniciando Serviços"
    
    # Verificar se PM2 está instalado e em uso
    if command -v pm2 &> /dev/null; then
        print_info "Reiniciando serviços com PM2..."
        
        # Reiniciar frontend (se existir)
        if pm2 list | grep -q "sispat-frontend"; then
            pm2 restart sispat-frontend
            print_success "Serviço frontend reiniciado"
        fi
        
        # Reiniciar backend (se existir)
        if pm2 list | grep -q "sispat-backend"; then
            pm2 restart sispat-backend
            print_success "Serviço backend reiniciado"
        fi
        
        # Mostrar status
        echo ""
        print_info "Status dos serviços:"
        pm2 status
    else
        print_warning "PM2 não encontrado, pulando reinicialização automática"
    fi
    
    # Reiniciar Nginx (se necessário)
    if command -v nginx &> /dev/null; then
        print_info "Recarregando configuração do Nginx..."
        sudo systemctl reload nginx 2>/dev/null || print_warning "Não foi possível recarregar Nginx (pode precisar de sudo)"
    fi
}

# Verificações finais
final_checks() {
    print_header "Verificações Finais"
    
    # Verificar estrutura do frontend
    if detect_frontend_structure; then
        if [ -d "$FRONTEND_BUILD_DIR" ]; then
            print_success "Diretório dist existe: $FRONTEND_BUILD_DIR"
            
            # Verificar tamanho
            DIST_SIZE=$(du -sh "$FRONTEND_BUILD_DIR" | cut -f1)
            print_info "Tamanho do build: $DIST_SIZE"
            
            # Verificar arquivos principais
            if [ -f "$FRONTEND_BUILD_DIR/index.html" ]; then
                print_success "index.html encontrado"
            else
                print_warning "index.html não encontrado em $FRONTEND_BUILD_DIR"
            fi
        else
            print_warning "Diretório dist não encontrado em $FRONTEND_BUILD_DIR"
        fi
    elif [ -d "$FRONTEND_DIST_DIR" ]; then
        print_success "Diretório dist encontrado: $FRONTEND_DIST_DIR"
        DIST_SIZE=$(du -sh "$FRONTEND_DIST_DIR" | cut -f1)
        print_info "Tamanho do build: $DIST_SIZE"
        
        if [ -f "$FRONTEND_DIST_DIR/index.html" ]; then
            print_success "index.html encontrado"
        else
            print_warning "index.html não encontrado"
        fi
    else
        print_warning "Estrutura do frontend não detectada. Verifique manualmente."
    fi
    
    # Verificar último commit
    cd "$PROJECT_DIR" || exit 1
    CURRENT_COMMIT=$(git rev-parse --short HEAD)
    print_info "Commit atual: $CURRENT_COMMIT"
    git log -1 --oneline
}

# Mostrar resumo
show_summary() {
    print_header "Resumo da Atualização"
    
    echo -e "${GREEN}✅ Atualização concluída com sucesso!${NC}"
    echo ""
    echo "📋 Próximos passos:"
    echo "  1. Limpar cache do navegador (Ctrl+Shift+R ou Cmd+Shift+R)"
    echo "  2. Acessar o sistema e testar funcionalidades"
    echo "  3. Verificar console do navegador para erros"
    echo "  4. Testar geração de PDFs e visualização de imagens"
    echo ""
    echo "📦 Backups salvos em: $BACKUP_DIR"
    echo ""
    
    if command -v pm2 &> /dev/null; then
        echo "📊 Para ver logs:"
        echo "  pm2 logs sispat-frontend"
        echo "  pm2 logs sispat-backend"
    fi
}

# Função principal
main() {
    print_header "🚀 Atualização de Produção - SISPAT"
    
    print_info "Iniciando atualização..."
    print_info "Diretório do projeto: $PROJECT_DIR"
    print_info "Timestamp: $TIMESTAMP"
    echo ""
    
    # Executar etapas
    check_permissions
    check_directory
    backup_current_code
    check_git_status
    update_from_git
    rebuild_shared
    rebuild_frontend
    rebuild_backend
    run_migrations
    restart_services
    final_checks
    show_summary
    
    print_success "Processo concluído!"
}

# Executar script
main "$@"
