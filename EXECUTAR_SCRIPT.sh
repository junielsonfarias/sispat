#!/bin/bash

# Script wrapper que sempre atualiza o repositório antes de executar um script
# Uso: ./EXECUTAR_SCRIPT.sh NOME_DO_SCRIPT.sh
# Autor: GPT-4

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_NAME="$1"

if [ -z "$SCRIPT_NAME" ]; then
    echo -e "${RED}✗ Erro: Especifique o nome do script${NC}"
    echo ""
    echo "Uso: ./EXECUTAR_SCRIPT.sh NOME_DO_SCRIPT.sh"
    echo ""
    echo "Exemplos:"
    echo "  ./EXECUTAR_SCRIPT.sh CORRIGIR_PROBLEMAS_FINAIS.sh"
    echo "  ./EXECUTAR_SCRIPT.sh DIAGNOSTICO_RAPIDO.sh"
    exit 1
fi

# Navegar para o diretório do projeto
cd /var/www/sispat || {
    echo -e "${RED}✗ Erro: Diretório /var/www/sispat não encontrado${NC}"
    exit 1
}

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  EXECUTOR DE SCRIPT COM ATUALIZAÇÃO AUTOMÁTICA${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""

# ============================================
# 1. CONFIGURAR GIT
# ============================================
echo -e "${BLUE}[1/3]${NC} Configurando Git..."
git config --global --add safe.directory /var/www/sispat 2>/dev/null || true
echo -e "${GREEN}✓${NC} Git configurado"

# ============================================
# 2. ATUALIZAR REPOSITÓRIO
# ============================================
echo -e "${BLUE}[2/3]${NC} Atualizando código do repositório..."

echo "  → Buscando atualizações..."
git fetch origin main 2>/dev/null || {
    echo -e "${YELLOW}⚠${NC} Falha ao buscar atualizações (continuando...)"
}

echo "  → Baixando atualizações..."
if sudo git pull origin main 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Código atualizado"
else
    echo -e "${YELLOW}⚠${NC} Falha ao atualizar (tentando reset...)"
    git reset --hard origin/main 2>/dev/null || {
        echo -e "${YELLOW}⚠${NC} Não foi possível atualizar, continuando com código local..."
    }
fi

# ============================================
# 3. VERIFICAR SE SCRIPT EXISTE
# ============================================
if [ ! -f "$SCRIPT_NAME" ]; then
    echo -e "${RED}✗${NC} Erro: Script '$SCRIPT_NAME' não encontrado!"
    echo ""
    echo "Scripts disponíveis:"
    ls -1 *.sh 2>/dev/null | head -10
    exit 1
fi

# ============================================
# 4. EXECUTAR SCRIPT
# ============================================
echo -e "${BLUE}[3/3]${NC} Executando script: $SCRIPT_NAME"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""

# Dar permissão de execução
chmod +x "$SCRIPT_NAME"

# Executar o script
bash "$SCRIPT_NAME" "$@"

EXIT_CODE=$?

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Script executado com sucesso${NC}"
else
    echo -e "${RED}✗ Script falhou com código de saída: $EXIT_CODE${NC}"
fi
echo ""

exit $EXIT_CODE
