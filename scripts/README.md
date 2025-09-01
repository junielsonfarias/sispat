# 📁 Scripts de Produção - SISPAT

## 🔧 Como Usar os Scripts

### **1. Tornar Scripts Executáveis (Linux/macOS)**

```bash
# No diretório raiz do projeto
chmod +x scripts/*.sh

# Ou individualmente
chmod +x scripts/setup-production.sh
chmod +x scripts/deploy-production.sh
```

### **2. Executar Scripts**

```bash
# Configuração inicial
./scripts/setup-production.sh

# Deploy para produção
./scripts/deploy-production.sh
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

## 🚀 Uso Rápido

```bash
# 1. Configurar ambiente
./scripts/setup-production.sh

# 2. Fazer deploy
./scripts/deploy-production.sh

# 3. Verificar status
pm2 status
```

## ⚠️ Notas Importantes

- Execute os scripts no diretório raiz do projeto
- Tenha permissões de administrador (sudo) no Linux
- Configure as variáveis de ambiente antes de executar
- Faça backup antes de qualquer deploy
