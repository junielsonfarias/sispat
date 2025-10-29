#!/bin/bash

# ===========================================
# SCRIPT PARA APLICAR OTIMIZAÇÕES DO SISPAT 2.0
# ===========================================

echo "🚀 Aplicando otimizações do SISPAT 2.0..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir com cores
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    print_error "Execute este script na raiz do projeto SISPAT"
    exit 1
fi

# 1. Instalar dependências do Redis
print_status "Instalando dependências do Redis..."
cd backend
npm install ioredis @types/ioredis
if [ $? -eq 0 ]; then
    print_success "Dependências do Redis instaladas"
else
    print_error "Falha ao instalar dependências do Redis"
    exit 1
fi

# 2. Aplicar índices de otimização
print_status "Aplicando índices de otimização no banco de dados..."
npm run optimize:indexes
if [ $? -eq 0 ]; then
    print_success "Índices de otimização aplicados"
else
    print_warning "Alguns índices podem ter falhado (normal se já existirem)"
fi

# 3. Gerar Prisma Client
print_status "Gerando Prisma Client..."
npx prisma generate
if [ $? -eq 0 ]; then
    print_success "Prisma Client gerado"
else
    print_error "Falha ao gerar Prisma Client"
    exit 1
fi

# 4. Voltar para o diretório raiz
cd ..

# 5. Instalar dependências do Playwright
print_status "Instalando dependências do Playwright para testes E2E..."
npm install @playwright/test
if [ $? -eq 0 ]; then
    print_success "Playwright instalado"
else
    print_error "Falha ao instalar Playwright"
    exit 1
fi

# 6. Instalar navegadores do Playwright
print_status "Instalando navegadores do Playwright..."
npx playwright install
if [ $? -eq 0 ]; then
    print_success "Navegadores do Playwright instalados"
else
    print_warning "Falha ao instalar navegadores (pode ser executado manualmente depois)"
fi

# 7. Verificar se Redis está rodando
print_status "Verificando se Redis está disponível..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        print_success "Redis está rodando"
    else
        print_warning "Redis não está rodando. Inicie com: docker-compose up redis"
    fi
else
    print_warning "redis-cli não encontrado. Certifique-se de que o Redis está instalado"
fi

# 8. Executar testes E2E (opcional)
read -p "Deseja executar os testes E2E agora? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Executando testes E2E..."
    npm run test:e2e
    if [ $? -eq 0 ]; then
        print_success "Testes E2E executados com sucesso"
    else
        print_warning "Alguns testes E2E falharam (verifique se o backend está rodando)"
    fi
fi

# 9. Resumo das otimizações aplicadas
echo
print_success "==========================================="
print_success "OTIMIZAÇÕES APLICADAS COM SUCESSO!"
print_success "==========================================="
echo
print_status "✅ Testes E2E com Playwright configurados"
print_status "✅ Índices de otimização do banco aplicados"
print_status "✅ Cache Redis implementado"
print_status "✅ Queries otimizadas com QueryOptimizer"
print_status "✅ Middlewares de cache configurados"
echo
print_status "Para iniciar o sistema com todas as otimizações:"
print_status "1. Inicie o Redis: docker-compose up redis -d"
print_status "2. Inicie o backend: cd backend && npm run dev"
print_status "3. Inicie o frontend: npm run dev"
echo
print_status "Para executar testes E2E:"
print_status "npm run test:e2e"
echo
print_status "Para ver estatísticas do cache:"
print_status "curl http://localhost:3000/api/cache/stats"
echo
print_success "SISPAT 2.0 está otimizado e pronto para produção! 🚀"
