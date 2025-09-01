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
```

### **2. Executar Scripts**

```bash
# Configuração inicial
./scripts/setup-production.sh

# Deploy para produção (versão completa)
./scripts/deploy-production.sh

# Deploy para produção (versão simplificada - RECOMENDADA)
./scripts/deploy-production-simple.sh
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
- ✅ Gera build otimizado
- ✅ Inicia serviços com PM2
- ✅ Verifica funcionamento

### **deploy-production-simple.sh** ⭐ **RECOMENDADO**

- ✅ Versão simplificada do deploy
- ✅ **Resolve automaticamente o problema do Husky**
- ✅ Instala dependências sem scripts problemáticos
- ✅ Mais estável e confiável
- ✅ Ideal para primeira execução

## 🚨 Problema Conhecido: Husky

### **Erro Comum:**

```
sh: 1: husky: not found
ELIFECYCLE: Failed to execute script 'prepare'
```

### **Causa:**

O script `prepare: "husky install"` no package.json é executado automaticamente durante a
instalação, mas o husky não está disponível em produção.

### **Soluções:**

#### **1. Usar Script Simplificado (RECOMENDADO):**

```bash
./scripts/deploy-production-simple.sh
```

#### **2. Configurar Variáveis de Ambiente:**

```bash
export HUSKY=0
export CI=true
export SKIP_HUSKY=1
pnpm install --prod --frozen-lockfile --ignore-scripts
```

#### **3. Modificar Temporariamente o package.json:**

```bash
# Backup
cp package.json package.json.backup

# Remover script prepare
sed -i 's/"prepare": "husky install"//' package.json

# Instalar dependências
pnpm install --prod --frozen-lockfile

# Restaurar
mv package.json.backup package.json
```

## 🚀 Uso Rápido

```bash
# 1. Configurar ambiente
./scripts/setup-production.sh

# 2. Fazer deploy (versão simplificada)
./scripts/deploy-production-simple.sh

# 3. Verificar status
pm2 status
```

## ⚠️ Notas Importantes

- Execute os scripts no diretório raiz do projeto
- Tenha permissões de administrador (sudo) no Linux
- Configure as variáveis de ambiente antes de executar
- Faça backup antes de qualquer deploy
- **Use o script simplificado para evitar problemas com Husky**

## 🔧 Troubleshooting

### **Problema: Husky não encontrado**

**Solução:** Use `./scripts/deploy-production-simple.sh`

### **Problema: Permissões negadas**

**Solução:** `chmod +x scripts/*.sh`

### **Problema: PM2 não encontrado**

**Solução:** `npm install -g pm2`

### **Problema: Variáveis de ambiente não configuradas**

**Solução:** Configure o arquivo `.env.production` primeiro
