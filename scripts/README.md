# 📚 Scripts de Produção - SISPAT

Este diretório contém todos os scripts necessários para configurar e implantar o SISPAT em produção.

---

## 🚀 **Scripts Principais**

### **1. `install-vps-complete.sh` - INSTALAÇÃO COMPLETA (RECOMENDADO)**

**🎯 Script mais completo e robusto para VPS:**

- ✅ Instala todas as dependências automaticamente
- ✅ Detecta versão Ubuntu e resolve problemas PostgreSQL
- ✅ Configura PostgreSQL, Redis, Nginx, PM2
- ✅ Clona repositório e executa deploy
- ✅ Configura domínio e SSL
- ✅ Inclui todas as correções conhecidas

**📥 Download e execução:**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-complete.sh -o install-vps-complete.sh
chmod +x install-vps-complete.sh
./install-vps-complete.sh
```

---

### **2. `install-vps.sh` - Instalação VPS Básica**

**🎯 Script de instalação VPS padrão:**

- ✅ Instala dependências básicas
- ✅ Configura PostgreSQL e Redis
- ✅ Instala Nginx e PM2
- ✅ Clona repositório
- ✅ Executa scripts de configuração

**📥 Download e execução:**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps.sh -o install-vps.sh
chmod +x install-vps.sh
./install-vps.sh
```

---

### **3. `setup-production.sh` - Configuração de Produção**

**🎯 Configura ambiente de produção:**

- ✅ Verifica dependências do sistema
- ✅ Cria arquivo .env.production
- ✅ Configura PM2 e firewall
- ✅ Cria scripts de backup

**📥 Execução:**

```bash
chmod +x scripts/setup-production.sh
./scripts/setup-production.sh
```

---

### **4. `deploy-production.sh` - Deploy Principal**

**🎯 Script principal de deploy:**

- ✅ Instala dependências com fallbacks
- ✅ Configura Husky corretamente
- ✅ Executa build de produção
- ✅ Configura PM2
- ✅ Inclui verificações de segurança

**📥 Execução:**

```bash
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

---

### **5. `deploy-production-simple.sh` - Deploy Simplificado**

**🎯 Versão simplificada do deploy:**

- ✅ Instala dependências com fallbacks
- ✅ Configura Husky automaticamente
- ✅ Executa build de produção
- ✅ Configura PM2
- ✅ Ideal para instalações rápidas

**📥 Execução:**

```bash
chmod +x scripts/deploy-production-simple.sh
./scripts/deploy-production-simple.sh
```

---

### **6. `setup-husky.sh` - Configuração do Husky**

**🎯 Configura Husky em produção:**

- ✅ Instala Husky globalmente se necessário
- ✅ Configura variáveis de ambiente
- ✅ Instala dependências
- ✅ Verifica configuração

**📥 Execução:**

```bash
chmod +x scripts/setup-husky.sh
./scripts/setup-husky.sh
```

---

### **7. `fix-postgresql-ubuntu20.sh` - Correção PostgreSQL**

**🎯 Resolve problemas PostgreSQL no Ubuntu 20.04:**

- ✅ Remove repositórios problemáticos
- ✅ Instala PostgreSQL do repositório padrão
- ✅ Cria usuário e banco para SISPAT
- ✅ Testa conexão
- ✅ Fornece dados de conexão

**📥 Download e execução:**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-postgresql-ubuntu20.sh -o fix-postgresql.sh
chmod +x fix-postgresql.sh
./fix-postgresql.sh
```

---

## 🔧 **Como Usar os Scripts**

### **Tornar Scripts Executáveis**

```bash
# No diretório da aplicação
chmod +x scripts/*.sh
```

### **Executar Scripts**

```bash
# Executar script específico
./scripts/nome-do-script.sh

# Ou navegar para o diretório scripts
cd scripts
./nome-do-script.sh
```

---

## 🎯 **Recomendações de Uso**

### **Para Nova Instalação VPS:**

1. **Use `install-vps-complete.sh`** - Mais completo e robusto
2. **Use `install-vps.sh`** - Para instalação básica

### **Para Configuração Existente:**

1. **Use `setup-production.sh`** - Para configurar ambiente
2. **Use `deploy-production-simple.sh`** - Para deploy rápido

### **Para Resolver Problemas:**

1. **Use `fix-postgresql-ubuntu20.sh`** - Para problemas PostgreSQL
2. **Use `setup-husky.sh`** - Para problemas Husky

---

## 🚨 **Resolução de Problemas**

### **Problema: Script não executa**

```bash
# Verificar permissões
ls -la scripts/*.sh

# Tornar executável
chmod +x scripts/nome-do-script.sh
```

### **Problema: Erro de permissão**

```bash
# Executar como root
sudo ./scripts/nome-do-script.sh

# Ou usar sudo para comandos específicos
sudo chmod +x scripts/*.sh
```

### **Problema: PostgreSQL não instala**

```bash
# Usar script de correção
./scripts/fix-postgresql-ubuntu20.sh
```

### **Problema: Husky não encontrado**

```bash
# Usar script de configuração
./scripts/setup-husky.sh
```

---

## 📋 **Ordem de Execução Recomendada**

### **Instalação Completa (Recomendada):**

```bash
# 1. Baixar e executar script completo
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-complete.sh -o install-vps-complete.sh
chmod +x install-vps-complete.sh
./install-vps-complete.sh

# 2. Configurar SSL (opcional)
certbot --nginx -d seu-dominio.com
```

### **Instalação Manual:**

```bash
# 1. Configurar ambiente
./scripts/setup-production.sh

# 2. Executar deploy
./scripts/deploy-production-simple.sh

# 3. Configurar Nginx manualmente
# 4. Configurar SSL
```

---

## 🔒 **Configuração do Husky em Produção**

O Husky é configurado automaticamente pelos scripts de deploy. Ele:

- ✅ **Instala corretamente** em ambiente de produção
- ✅ **Configura variáveis** de ambiente apropriadas
- ✅ **Verifica dependências** necessárias
- ✅ **Testa hooks** antes de finalizar

**Não é necessário desabilitar o Husky em produção!**

---

## 📚 **Documentação Relacionada**

- **`VPS-INSTALLATION-GUIDE-UPDATED.md`** - Guia completo de instalação
- **`POSTGRESQL-UBUNTU20-FIX.md`** - Solução para problemas PostgreSQL
- **`HUSKY-PRODUCTION-FIX.md`** - Solução para problemas Husky

---

## 🎉 **Resultado Final**

Após executar os scripts, você terá:

- ✅ **Sistema completo** configurado
- ✅ **Aplicação rodando** em produção
- ✅ **Todos os serviços** funcionando
- ✅ **Segurança configurada** adequadamente
- ✅ **Monitoramento** ativo
- ✅ **Backup** configurado

---

**🚀 Use `install-vps-complete.sh` para uma instalação completa e sem problemas!**
