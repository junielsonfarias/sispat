#!/bin/bash

# =================================
# CORREÇÃO DE SEGURANÇA DO GUIA VPS
# Remove credenciais expostas e corrige problemas
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
echo "🔧 ================================================"
echo "🔧    CORREÇÃO DE SEGURANÇA DO GUIA VPS"
echo "🔧    Removendo credenciais expostas e corrigindo problemas"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "docs/VPS-INSTALLATION-GUIDE-UPDATED.md" ]; then
    error "Execute este script no diretório raiz do projeto"
fi

# Fazer backup do guia original
log "Fazendo backup do guia original..."
cp docs/VPS-INSTALLATION-GUIDE-UPDATED.md docs/VPS-INSTALLATION-GUIDE-UPDATED.md.backup
success "Backup criado: docs/VPS-INSTALLATION-GUIDE-UPDATED.md.backup"

# Corrigir credenciais expostas
log "Removendo credenciais expostas..."

# Remover senhas hardcoded
sed -i 's/sispat123456/CHANGE_ME_SECURE_PASSWORD/g' docs/VPS-INSTALLATION-GUIDE-UPDATED.md

# Remover email e senha de login expostos
sed -i 's/junielsonfarias@gmail.com/SEU_EMAIL_AQUI/g' docs/VPS-INSTALLATION-GUIDE-UPDATED.md
sed -i 's/Tiko6273@/SUA_SENHA_AQUI/g' docs/VPS-INSTALLATION-GUIDE-UPDATED.md

# Corrigir JWT Secret
sed -i 's/SEU_JWT_SECRET_AQUI/CHANGE_ME_SECURE_JWT_SECRET/g' docs/VPS-INSTALLATION-GUIDE-UPDATED.md

success "Credenciais expostas removidas"

# Corrigir domínio hardcoded
log "Tornando domínio dinâmico..."
sed -i 's/sispat\.vps-kinghost\.net/SEU_DOMINIO.com/g' docs/VPS-INSTALLATION-GUIDE-UPDATED.md
success "Domínio hardcoded corrigido"

# Corrigir URLs do repositório GitHub
log "Corrigindo URLs do repositório GitHub..."
sed -i 's/junielsonfarias\/sispat/SEU_USUARIO\/sispat/g' docs/VPS-INSTALLATION-GUIDE-UPDATED.md
success "URLs do repositório corrigidas"

# Adicionar aviso de segurança no início do guia
log "Adicionando avisos de segurança..."
cat > temp_header.md << 'EOF'
# 🚨 **AVISO DE SEGURANÇA - GUIA CORRIGIDO**

## ⚠️ **PROBLEMAS CRÍTICOS CORRIGIDOS:**

- ✅ **Credenciais expostas removidas**
- ✅ **Domínio hardcoded corrigido**
- ✅ **URLs do repositório corrigidas**
- ✅ **Senhas seguras implementadas**

## 🔒 **AÇÕES OBRIGATÓRIAS ANTES DO USO:**

1. **Substitua `SEU_DOMINIO.com`** pelo seu domínio real
2. **Substitua `SEU_USUARIO`** pelo seu usuário do GitHub
3. **Substitua `SEU_EMAIL_AQUI`** pelo seu email
4. **Substitua `SUA_SENHA_AQUI`** por uma senha segura
5. **Substitua `CHANGE_ME_SECURE_PASSWORD`** por senhas seguras
6. **Substitua `CHANGE_ME_SECURE_JWT_SECRET`** por um JWT secret seguro

## 🎯 **RECOMENDAÇÃO:**
Use o guia seguro em `docs/VPS-INSTALLATION-GUIDE-SECURE-2025.md` que já inclui todas as correções.

---

EOF

# Combinar header com o guia corrigido
cat temp_header.md docs/VPS-INSTALLATION-GUIDE-UPDATED.md > temp_guide.md
mv temp_guide.md docs/VPS-INSTALLATION-GUIDE-UPDATED.md
rm temp_header.md

success "Avisos de segurança adicionados"

# Verificar se as correções foram aplicadas
log "Verificando correções..."

# Verificar se ainda há credenciais expostas
if grep -q "sispat123456\|junielsonfarias@gmail.com\|Tiko6273@" docs/VPS-INSTALLATION-GUIDE-UPDATED.md; then
    warning "Ainda há credenciais expostas no guia"
else
    success "Todas as credenciais expostas foram removidas"
fi

# Verificar se domínio foi corrigido
if grep -q "SEU_DOMINIO.com" docs/VPS-INSTALLATION-GUIDE-UPDATED.md; then
    success "Domínio hardcoded foi corrigido"
else
    warning "Domínio hardcoded pode não ter sido corrigido"
fi

# Verificar se repositório foi corrigido
if grep -q "SEU_USUARIO/sispat" docs/VPS-INSTALLATION-GUIDE-UPDATED.md; then
    success "URLs do repositório foram corrigidas"
else
    warning "URLs do repositório podem não ter sido corrigidas"
fi

# Mostrar resumo das correções
echo ""
echo "🔧 ================================================"
echo "🔧    CORREÇÕES APLICADAS COM SUCESSO!"
echo "🔧 ================================================"
echo ""
echo "📋 Correções Realizadas:"
echo "   ✅ Credenciais expostas removidas"
echo "   ✅ Domínio hardcoded corrigido"
echo "   ✅ URLs do repositório corrigidas"
echo "   ✅ Avisos de segurança adicionados"
echo "   ✅ Backup do guia original criado"
echo ""
echo "📁 Arquivos:"
echo "   📄 Guia corrigido: docs/VPS-INSTALLATION-GUIDE-UPDATED.md"
echo "   📄 Guia seguro: docs/VPS-INSTALLATION-GUIDE-SECURE-2025.md"
echo "   💾 Backup: docs/VPS-INSTALLATION-GUIDE-UPDATED.md.backup"
echo ""
echo "⚠️ IMPORTANTE:"
echo "   - Revise o guia antes de usar"
echo "   - Substitua todos os placeholders"
echo "   - Use o guia seguro para instalações"
echo "   - Mantenha as senhas seguras"
echo ""

success "Correção de segurança concluída!"
