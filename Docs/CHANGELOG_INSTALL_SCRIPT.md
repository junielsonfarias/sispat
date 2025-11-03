# 📝 Changelog - Script de Instalação (install.sh)

## 🔧 Versão Atualizada - 13/10/2025

### 🎯 Problema Resolvido

**Erro:** `sh: 1: vite: not found`

Durante a instalação, o build do frontend falhava porque o pacote `vite` não estava sendo instalado corretamente, causando interrupção abrupta da instalação.

---

## ✅ Melhorias Implementadas

### 1. **Limpeza Automática de node_modules**

**Antes:**
```bash
npm install --legacy-peer-deps
```

**Depois:**
```bash
# Limpar instalação anterior se existir
if [ -d "node_modules" ]; then
    echo "Removendo node_modules anterior..."
    rm -rf node_modules package-lock.json
fi

npm install --legacy-peer-deps
```

**Benefício:** Evita conflitos com instalações anteriores corrompidas.

---

### 2. **Verificação Pós-Instalação de Dependências**

#### Frontend (Vite)

**Adicionado:**
```bash
if [ -f "node_modules/.bin/vite" ]; then
    success "✅ Dependências do frontend instaladas"
else
    warning "⚠️  Vite não encontrado, reinstalando com --force..."
    rm -rf node_modules package-lock.json
    npm install --legacy-peer-deps --force
    
    if [ -f "node_modules/.bin/vite" ]; then
        success "✅ Dependências reinstaladas com sucesso"
    else
        error "❌ Falha ao instalar Vite!"
    fi
fi
```

**Benefício:** Detecta e corrige automaticamente falhas na instalação do Vite.

#### Backend (TypeScript)

**Adicionado:**
```bash
if [ -f "node_modules/.bin/tsc" ]; then
    local types_count=$(ls node_modules/@types 2>/dev/null | wc -l)
    success "✅ Dependências do backend instaladas (@types: $types_count pacotes)"
else
    warning "⚠️  TypeScript não encontrado, reinstalando..."
    # ... lógica de reinstalação
fi
```

**Benefício:** Garante que o TypeScript esteja instalado antes de tentar compilar.

---

### 3. **Verificação Pré-Build**

**Adicionado no build do frontend:**
```bash
# Verificar novamente se vite existe antes de fazer build
if [ ! -f "node_modules/.bin/vite" ]; then
    error "❌ Vite não está instalado! Não é possível fazer build do frontend."
fi
```

**Adicionado no build do backend:**
```bash
# Verificar se TypeScript existe antes de compilar
if [ ! -f "node_modules/.bin/tsc" ]; then
    error "❌ TypeScript não está instalado! Não é possível compilar o backend."
fi
```

**Benefício:** Previne tentativas de build sem as ferramentas necessárias.

---

### 4. **Verificação Pós-Build Melhorada**

#### Frontend

**Antes:**
```bash
if [ $build_frontend_status -eq 0 ]; then
    success "✅ Frontend compilado com sucesso"
fi
```

**Depois:**
```bash
if [ $build_frontend_status -eq 0 ]; then
    # Verificar se gerou os arquivos
    if [ -f "dist/index.html" ] && [ -d "dist/assets" ]; then
        success "✅ Frontend compilado com sucesso"
    else
        warning "⚠️  Build reportou sucesso mas arquivos não foram gerados"
        tail -20 /tmp/build-frontend.log
        error "❌ Frontend não foi compilado corretamente"
    fi
fi
```

**Benefício:** Detecta builds que reportam sucesso mas não geram arquivos.

#### Backend

**Melhorado:**
```bash
if [ -f "dist/index.js" ]; then
    local compiled_files=$(find dist -name "*.js" 2>/dev/null | wc -l)
    success "✅ Backend compilado com sucesso! ($compiled_files arquivos JS)"
else
    warning "⚠️  Build reportou sucesso mas arquivos não foram criados!"
    error "❌ Backend não foi compilado corretamente"
fi
```

**Benefício:** Mostra quantos arquivos foram compilados e valida a compilação.

---

### 5. **Melhor Exibição de Erros**

**Adicionado:**
```bash
else
    echo ""
    echo -e "${YELLOW}Erro no build do frontend:${NC}"
    tail -30 /tmp/build-frontend.log
    echo ""
    error "❌ Falha ao compilar frontend! Ver log completo: /tmp/build-frontend.log"
fi
```

**Benefício:** Mostra as últimas 30 linhas do log diretamente no terminal para diagnóstico rápido.

---

## 🆕 Novo Script de Recuperação

Foi criado o arquivo `fix-build-error.sh` para corrigir problemas de build manualmente:

### Uso:
```bash
sudo bash fix-build-error.sh
```

### O que faz:
1. ✅ Limpa cache e node_modules
2. ✅ Reinstala dependências corretamente
3. ✅ Verifica Vite e TypeScript
4. ✅ Faz build do frontend e backend
5. ✅ Fornece instruções de próximos passos

---

## 📊 Fluxo de Verificação Atualizado

```
┌─────────────────────────────┐
│  Instalar Dependências      │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Limpar node_modules?       │◄─── NOVO
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  npm install                │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Vite/TSC instalado?        │◄─── NOVO
└──────────┬──────────────────┘
           │ SIM
           ▼
┌─────────────────────────────┐
│  npm run build              │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Arquivos gerados?          │◄─── NOVO
└──────────┬──────────────────┘
           │ SIM
           ▼
┌─────────────────────────────┐
│  ✅ Build concluído!        │
└─────────────────────────────┘
```

---

## 🔍 Logs Disponíveis para Diagnóstico

O script agora gera logs detalhados em:

- `/tmp/build-frontend-deps.log` - Instalação de deps do frontend
- `/tmp/build-frontend-deps-retry.log` - Retry com --force (se necessário)
- `/tmp/build-frontend.log` - Compilação do frontend
- `/tmp/build-backend-deps.log` - Instalação de deps do backend
- `/tmp/build-backend-deps-retry.log` - Retry do backend (se necessário)
- `/tmp/build-backend.log` - Compilação do backend

---

## 📈 Melhorias de Performance

1. **Instalação mais rápida:** Limpeza prévia evita conflitos
2. **Menos falhas:** Verificações múltiplas garantem sucesso
3. **Recuperação automática:** Retry automático com --force
4. **Feedback claro:** Mensagens indicam exatamente o que está acontecendo

---

## 🎯 Compatibilidade

- ✅ Debian 11/12
- ✅ Ubuntu 20.04/22.04/24.04
- ✅ Servidores com 2GB+ RAM (com SWAP)
- ✅ Servidores com 4GB+ RAM (sem SWAP)

---

## 📝 Notas Técnicas

### Por que adicionar --force?

Em alguns ambientes, o npm pode ter problemas com peer dependencies mesmo usando `--legacy-peer-deps`. A flag `--force` ignora esses conflitos completamente.

### Por que limpar node_modules?

Instalações anteriores corrompidas ou incompletas podem causar problemas sutis. Começar limpo garante instalação consistente.

### Por que verificar os binários?

`npm install` pode reportar sucesso mesmo se alguns pacotes falharem silenciosamente. Verificar os binários garante que as ferramentas essenciais estão disponíveis.

---

## 🚀 Próximas Melhorias Sugeridas

1. **Build incremental:** Detectar o que já está compilado e pular
2. **Cache inteligente:** Reutilizar node_modules se estiver OK
3. **Paralelização:** Frontend e backend em paralelo (se RAM suficiente)
4. **Rollback automático:** Voltar para versão anterior em caso de falha

---

## 📧 Suporte

Se encontrar problemas mesmo após essas melhorias:

1. Verifique os logs em `/tmp/build-*.log`
2. Execute `fix-build-error.sh` para tentar correção automática
3. Reporte o issue no GitHub com os logs anexados

---

**Versão do Script:** 2.0.1  
**Data:** 13 de Outubro de 2025  
**Autor:** Sistema SISPAT 2.0  
**Status:** ✅ Testado e Funcional

