# 📁 Scripts de Produção - SISPAT

## 🔧 Como Usar os Scripts

### **1. Tornar Scripts Executáveis (Linux/macOS)**

```bash
# No diretório raiz do projeto
chmod +x scripts/*.sh

# Ou individualmente
chmod +x scripts/setup-production.sh
chmod +x scripts/deploy-production.sh
chmod +x scripts/deploy-production-simple.sh
chmod +x scripts/setup-husky.sh
```

### **2. Executar Scripts**

```bash
# Configuração inicial
./scripts/setup-production.sh

# Deploy para produção (versão completa)
./scripts/deploy-production.sh

# Deploy para produção (versão simplificada - RECOMENDADA)
./scripts/deploy-production-simple.sh

# Configuração específica do Husky
./scripts/setup-husky.sh
```

## 📋 Descrição dos Scripts

### **setup-production.sh**

- ✅ Verifica dependências do sistema
- ✅ Configura variáveis de ambiente
- ✅ Gera chaves de segurança
- ✅ Configura PM2
- ✅ Configura firewall (Linux)
- ✅ Configura backup automático

### **deploy-production.sh**

- ✅ Cria backup do sistema atual
- ✅ Para serviços em execução
- ✅ Instala dependências de produção
- ✅ **Instala e configura Husky corretamente**
- ✅ Gera build otimizado
- ✅ Inicia serviços com PM2
- ✅ Verifica saúde da aplicação

### **deploy-production-simple.sh** ⭐ **RECOMENDADO**

- ✅ Versão simplificada do deploy
- ✅ **Resolve automaticamente o problema do Husky**
- ✅ Instala dependências completas
- ✅ Configura Husky para produção
- ✅ Build e deploy otimizados

### **setup-husky.sh** 🆕 **NOVO**

- ✅ Instala Husky globalmente se necessário
- ✅ Configura hooks de pre-commit
- ✅ Verifica permissões dos scripts
- ✅ Testa funcionamento dos hooks
- ✅ Instala dependências necessárias (chalk)
- ✅ **Solução definitiva para o problema do Husky**

## 🚨 Problemas Comuns e Soluções

### **Problema: Husky não encontrado**

**Solução:** Use `./scripts/setup-husky.sh` para configuração completa

### **Problema: Permissões negadas**

**Solução:** `chmod +x scripts/*.sh`

### **Problema: PM2 não encontrado**

**Solução:** `npm install -g pm2`

### **Problema: Variáveis de ambiente não configuradas**

**Solução:** Configure o arquivo `.env.production` primeiro

## 🔧 Configuração do Husky em Produção

### **Por que o Husky é importante?**

O Husky executa hooks de pre-commit que garantem:

- ✅ Qualidade do código (linting)
- ✅ Formatação consistente (Prettier)
- ✅ Verificação de tipos (TypeScript)
- ✅ Testes automáticos

### **Como funciona agora:**

1. **Scripts de deploy instalam Husky automaticamente**
2. **Hooks são configurados corretamente**
3. **Permissões são definidas automaticamente**
4. **Dependências necessárias são instaladas**

### **Verificação manual:**

```bash
# Verificar se o Husky está funcionando
ls -la .husky/
cat .husky/pre-commit

# Testar hook manualmente
./scripts/pre-commit.js
```

## 🚀 Fluxo de Deploy Recomendado

### **1. Primeira vez:**

```bash
./scripts/setup-production.sh
./scripts/setup-husky.sh
```

### **2. Deploy normal:**

```bash
./scripts/deploy-production-simple.sh
```

### **3. Se houver problemas com Husky:**

```bash
./scripts/setup-husky.sh
```

## 📚 Documentação Adicional

- **`PRODUCTION-DEPLOY-GUIDE.md`** - Guia completo de deploy
- **`docs/PRODUCAO.md`** - Documentação de produção
- **`ecosystem.config.cjs`** - Configuração do PM2
