#!/bin/bash

# =================================
# BACKUP COMPLETO DE CONFIGURAÇÕES
# SISPAT - Sistema de Patrimônio
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
echo "💾 ================================================"
echo "💾    BACKUP COMPLETO DE CONFIGURAÇÕES"
echo "💾    SISPAT - Sistema de Patrimônio"
echo "💾    ✅ Backup de todas as configurações críticas"
echo "💾 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz do projeto SISPAT"
fi

# Criar diretório de backup
BACKUP_DIR="./backups/config-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

log "📁 Criando backup em: $BACKUP_DIR"

# 1. Backup de variáveis de ambiente
log "🔐 Fazendo backup de variáveis de ambiente..."
if [ -f ".env" ]; then
    cp .env "$BACKUP_DIR/.env"
    success "✅ .env copiado"
else
    warning "⚠️ Arquivo .env não encontrado"
fi

if [ -f ".env.production" ]; then
    cp .env.production "$BACKUP_DIR/.env.production"
    success "✅ .env.production copiado"
else
    warning "⚠️ Arquivo .env.production não encontrado"
fi

if [ -f "env.production.example" ]; then
    cp env.production.example "$BACKUP_DIR/env.production.example"
    success "✅ env.production.example copiado"
fi

# 2. Backup de configurações do banco de dados
log "🗄️ Fazendo backup de configurações do banco de dados..."
if [ -d "server/database" ]; then
    cp -r server/database "$BACKUP_DIR/database"
    success "✅ Configurações do banco copiadas"
fi

# 3. Backup de configurações do servidor
log "🖥️ Fazendo backup de configurações do servidor..."
if [ -f "server/index.js" ]; then
    cp server/index.js "$BACKUP_DIR/server-index.js"
    success "✅ server/index.js copiado"
fi

if [ -d "server/middleware" ]; then
    cp -r server/middleware "$BACKUP_DIR/middleware"
    success "✅ Middlewares copiados"
fi

if [ -d "server/routes" ]; then
    cp -r server/routes "$BACKUP_DIR/routes"
    success "✅ Rotas copiadas"
fi

if [ -d "server/services" ]; then
    cp -r server/services "$BACKUP_DIR/services"
    success "✅ Serviços copiados"
fi

# 4. Backup de configurações do PM2
log "⚙️ Fazendo backup de configurações do PM2..."
if [ -f "ecosystem.config.cjs" ]; then
    cp ecosystem.config.cjs "$BACKUP_DIR/ecosystem.config.cjs"
    success "✅ ecosystem.config.cjs copiado"
fi

if [ -f "ecosystem.production.config.cjs" ]; then
    cp ecosystem.production.config.cjs "$BACKUP_DIR/ecosystem.production.config.cjs"
    success "✅ ecosystem.production.config.cjs copiado"
fi

# 5. Backup de configurações do Nginx
log "🌐 Fazendo backup de configurações do Nginx..."
if [ -f "nginx.conf" ]; then
    cp nginx.conf "$BACKUP_DIR/nginx.conf"
    success "✅ nginx.conf copiado"
fi

# 6. Backup de configurações do Vite
log "⚡ Fazendo backup de configurações do Vite..."
if [ -f "vite.config.ts" ]; then
    cp vite.config.ts "$BACKUP_DIR/vite.config.ts"
    success "✅ vite.config.ts copiado"
fi

# 7. Backup de configurações do TypeScript
log "📝 Fazendo backup de configurações do TypeScript..."
if [ -f "tsconfig.json" ]; then
    cp tsconfig.json "$BACKUP_DIR/tsconfig.json"
    success "✅ tsconfig.json copiado"
fi

if [ -f "tsconfig.app.json" ]; then
    cp tsconfig.app.json "$BACKUP_DIR/tsconfig.app.json"
    success "✅ tsconfig.app.json copiado"
fi

if [ -f "tsconfig.node.json" ]; then
    cp tsconfig.node.json "$BACKUP_DIR/tsconfig.node.json"
    success "✅ tsconfig.node.json copiado"
fi

# 8. Backup de configurações do ESLint
log "🔍 Fazendo backup de configurações do ESLint..."
if [ -f "eslint.config.js" ]; then
    cp eslint.config.js "$BACKUP_DIR/eslint.config.js"
    success "✅ eslint.config.js copiado"
fi

# 9. Backup de configurações do Prettier
log "💅 Fazendo backup de configurações do Prettier..."
if [ -f ".prettierrc" ]; then
    cp .prettierrc "$BACKUP_DIR/.prettierrc"
    success "✅ .prettierrc copiado"
fi

# 10. Backup de configurações do Tailwind
log "🎨 Fazendo backup de configurações do Tailwind..."
if [ -f "tailwind.config.ts" ]; then
    cp tailwind.config.ts "$BACKUP_DIR/tailwind.config.ts"
    success "✅ tailwind.config.ts copiado"
fi

if [ -f "postcss.config.js" ]; then
    cp postcss.config.js "$BACKUP_DIR/postcss.config.js"
    success "✅ postcss.config.js copiado"
fi

# 11. Backup de configurações do Jest
log "🧪 Fazendo backup de configurações do Jest..."
if [ -f "jest.config.js" ]; then
    cp jest.config.js "$BACKUP_DIR/jest.config.js"
    success "✅ jest.config.js copiado"
fi

# 12. Backup de configurações do Playwright
log "🎭 Fazendo backup de configurações do Playwright..."
if [ -f "playwright.config.ts" ]; then
    cp playwright.config.ts "$BACKUP_DIR/playwright.config.ts"
    success "✅ playwright.config.ts copiado"
fi

# 13. Backup de configurações do Docker
log "🐳 Fazendo backup de configurações do Docker..."
if [ -f "Dockerfile" ]; then
    cp Dockerfile "$BACKUP_DIR/Dockerfile"
    success "✅ Dockerfile copiado"
fi

if [ -f "docker-compose.production.yml" ]; then
    cp docker-compose.production.yml "$BACKUP_DIR/docker-compose.production.yml"
    success "✅ docker-compose.production.yml copiado"
fi

# 14. Backup de dependências
log "📦 Fazendo backup de dependências..."
if [ -f "package.json" ]; then
    cp package.json "$BACKUP_DIR/package.json"
    success "✅ package.json copiado"
fi

if [ -f "pnpm-lock.yaml" ]; then
    cp pnpm-lock.yaml "$BACKUP_DIR/pnpm-lock.yaml"
    success "✅ pnpm-lock.yaml copiado"
fi

if [ -f "pnpm-workspace.yaml" ]; then
    cp pnpm-workspace.yaml "$BACKUP_DIR/pnpm-workspace.yaml"
    success "✅ pnpm-workspace.yaml copiado"
fi

# 15. Backup de scripts
log "📜 Fazendo backup de scripts..."
if [ -d "scripts" ]; then
    cp -r scripts "$BACKUP_DIR/scripts"
    success "✅ Scripts copiados"
fi

# 16. Backup de documentação
log "📚 Fazendo backup de documentação..."
if [ -d "docs" ]; then
    cp -r docs "$BACKUP_DIR/docs"
    success "✅ Documentação copiada"
fi

# 17. Backup de testes
log "🧪 Fazendo backup de testes..."
if [ -d "tests" ]; then
    cp -r tests "$BACKUP_DIR/tests"
    success "✅ Testes copiados"
fi

# 18. Backup de configurações de componentes
log "🧩 Fazendo backup de configurações de componentes..."
if [ -f "components.json" ]; then
    cp components.json "$BACKUP_DIR/components.json"
    success "✅ components.json copiado"
fi

# 19. Backup de configurações de Lighthouse
log "🏠 Fazendo backup de configurações do Lighthouse..."
if [ -f "lighthouserc.json" ]; then
    cp lighthouserc.json "$BACKUP_DIR/lighthouserc.json"
    success "✅ lighthouserc.json copiado"
fi

# 20. Backup de configurações de Husky
log "🐕 Fazendo backup de configurações do Husky..."
if [ -d ".husky" ]; then
    cp -r .husky "$BACKUP_DIR/.husky"
    success "✅ Configurações do Husky copiadas"
fi

# 21. Backup de configurações do Git
log "🔧 Fazendo backup de configurações do Git..."
if [ -f ".gitignore" ]; then
    cp .gitignore "$BACKUP_DIR/.gitignore"
    success "✅ .gitignore copiado"
fi

if [ -f ".gitattributes" ]; then
    cp .gitattributes "$BACKUP_DIR/.gitattributes"
    success "✅ .gitattributes copiado"
fi

# 22. Backup de configurações do Editor
log "✏️ Fazendo backup de configurações do Editor..."
if [ -f ".editorconfig" ]; then
    cp .editorconfig "$BACKUP_DIR/.editorconfig"
    success "✅ .editorconfig copiado"
fi

if [ -f ".vscode" ]; then
    cp -r .vscode "$BACKUP_DIR/.vscode"
    success "✅ Configurações do VSCode copiadas"
fi

# 23. Backup de configurações do Cursor
log "🖱️ Fazendo backup de configurações do Cursor..."
if [ -f ".cursor" ]; then
    cp -r .cursor "$BACKUP_DIR/.cursor"
    success "✅ Configurações do Cursor copiadas"
fi

# 24. Backup de configurações do sistema
log "🖥️ Fazendo backup de configurações do sistema..."
if [ -f "README.md" ]; then
    cp README.md "$BACKUP_DIR/README.md"
    success "✅ README.md copiado"
fi

if [ -f "CHANGELOG.md" ]; then
    cp CHANGELOG.md "$BACKUP_DIR/CHANGELOG.md"
    success "✅ CHANGELOG.md copiado"
fi

# 25. Criar arquivo de informações do backup
log "📋 Criando arquivo de informações do backup..."
cat > "$BACKUP_DIR/backup-info.txt" << EOF
BACKUP COMPLETO DE CONFIGURAÇÕES - SISPAT
==========================================

Data/Hora: $(date)
Versão: $(git describe --tags --always 2>/dev/null || echo "N/A")
Branch: $(git branch --show-current 2>/dev/null || echo "N/A")
Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")

Conteúdo do Backup:
- Variáveis de ambiente (.env, .env.production)
- Configurações do banco de dados
- Configurações do servidor (index.js, middleware, routes, services)
- Configurações do PM2 (ecosystem.config.cjs)
- Configurações do Nginx (nginx.conf)
- Configurações do Vite (vite.config.ts)
- Configurações do TypeScript (tsconfig.*.json)
- Configurações do ESLint (eslint.config.js)
- Configurações do Prettier (.prettierrc)
- Configurações do Tailwind (tailwind.config.ts, postcss.config.js)
- Configurações do Jest (jest.config.js)
- Configurações do Playwright (playwright.config.ts)
- Configurações do Docker (Dockerfile, docker-compose.production.yml)
- Dependências (package.json, pnpm-lock.yaml, pnpm-workspace.yaml)
- Scripts (scripts/)
- Documentação (docs/)
- Testes (tests/)
- Configurações de componentes (components.json)
- Configurações do Lighthouse (lighthouserc.json)
- Configurações do Husky (.husky/)
- Configurações do Git (.gitignore, .gitattributes)
- Configurações do Editor (.editorconfig, .vscode/, .cursor/)
- Documentação do sistema (README.md, CHANGELOG.md)

Total de arquivos: $(find "$BACKUP_DIR" -type f | wc -l)
Tamanho total: $(du -sh "$BACKUP_DIR" | cut -f1)

Para restaurar este backup:
1. Copie os arquivos de volta para suas localizações originais
2. Verifique as permissões dos arquivos
3. Reinicie os serviços necessários
4. Teste a aplicação

EOF

success "✅ Arquivo de informações criado"

# 26. Comprimir o backup
log "🗜️ Comprimindo o backup..."
cd "$(dirname "$BACKUP_DIR")"
tar -czf "$(basename "$BACKUP_DIR").tar.gz" "$(basename "$BACKUP_DIR")"
cd - > /dev/null

success "✅ Backup comprimido: $(basename "$BACKUP_DIR").tar.gz"

# 27. Relatório final
echo ""
echo "📊 RELATÓRIO DE BACKUP COMPLETO"
echo "================================"
echo "✅ Diretório de backup: $BACKUP_DIR"
echo "✅ Arquivo comprimido: $(dirname "$BACKUP_DIR")/$(basename "$BACKUP_DIR").tar.gz"
echo "✅ Total de arquivos: $(find "$BACKUP_DIR" -type f | wc -l)"
echo "✅ Tamanho total: $(du -sh "$BACKUP_DIR" | cut -f1)"
echo "✅ Tamanho comprimido: $(du -sh "$(dirname "$BACKUP_DIR")/$(basename "$BACKUP_DIR").tar.gz" | cut -f1)"
echo ""
echo "🎯 BACKUP COMPLETO REALIZADO COM SUCESSO!"
echo ""
echo "💡 Para restaurar este backup:"
echo "   1. Extraia o arquivo .tar.gz"
echo "   2. Copie os arquivos para suas localizações originais"
echo "   3. Verifique as permissões"
echo "   4. Reinicie os serviços"
echo "   5. Teste a aplicação"
echo ""
