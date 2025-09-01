# 📚 Scripts de Produção - SISPAT

Este diretório contém todos os scripts necessários para configurar, deployar e manter o SISPAT em
produção.

## 🚀 **Scripts Principais**

### **1. `install-vps-complete.sh` - INSTALAÇÃO COMPLETA VPS**

**🎯 Função:** Instalação completa e automatizada do SISPAT em uma VPS **✅ Inclui:** Todas as
correções e soluções para problemas comuns **🔧 Correções aplicadas:**

- Repositório PostgreSQL problemático removido previamente
- Terser instalado automaticamente
- NODE_ENV=production removido do .env
- Usuário PostgreSQL recriado com senha correta
- Script de correção PostgreSQL incluído automaticamente
- Configuração Nginx otimizada
- PM2 configurado para startup automático
- Verificações de conectividade incluídas
- Correção automática de autenticação PostgreSQL
- **Scripts corrigidos (problema export resolvido)**

**📋 Uso:**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-complete.sh -o install-vps-complete.sh
chmod +x install-vps-complete.sh
./install-vps-complete.sh
```

---

### **2. `setup-production.sh` - CONFIGURAÇÃO INICIAL**

**🎯 Função:** Configura o ambiente de produção básico **✅ Inclui:** Variáveis de ambiente,
dependências, configurações de sistema

**📋 Uso:**

```bash
./scripts/setup-production.sh
```

---

### **3. `deploy-production-simple.sh` - DEPLOY SIMPLIFICADO**

**🎯 Função:** Deploy simplificado para produção **✅ Inclui:** Build, instalação de dependências,
configuração PM2

**📋 Uso:**

```bash
./scripts/deploy-production-simple.sh
```

---

## 🚨 **CORREÇÕES RECENTES - VERSÃO ATUALIZADA**

### **Problema Resolvido: Erro de Export no Deploy**

- **Erro**: `export: 'ANALISE_PROBLEMAS_SISPAT.md': not a valid identifier`
- **Causa**: Comando `export $(cat .env | xargs)` interpretando nomes de arquivos como variáveis
- **Solução**: Substituído por `source .env` com validação de arquivo
- **Status**: ✅ **RESOLVIDO** em todos os scripts

### **Scripts Corrigidos:**

- ✅ `deploy-production-simple.sh` - Problema export resolvido
- ✅ `install-vps-complete.sh` - Inclui correção automática PostgreSQL
- ✅ Todos os scripts agora usam método seguro de carregamento de variáveis

---

## 🔧 **Scripts de Correção**

### **4. `fix-postgresql-final.sh` - CORREÇÃO COMPLETA POSTGRESQL**

**🎯 Função:** Correção completa e definitiva do PostgreSQL **✅ Inclui:** Recriação de usuário,
banco, permissões, testes completos **🔧 Problemas resolvidos:**

- Usuário PostgreSQL com senha incorreta
- Banco de dados não configurado
- Permissões insuficientes
- Problemas de conectividade

**📋 Uso:**

```bash
./scripts/fix-postgresql-final.sh
```

---

### **5. `fix-postgresql-quick-final.sh` - CORREÇÃO RÁPIDA POSTGRESQL**

**🎯 Função:** Correção rápida para problemas de autenticação PostgreSQL **✅ Inclui:** Correção
básica de usuário e senha **🔧 Uso:** Para correções rápidas sem testes extensivos

**📋 Uso:**

```bash
./scripts/fix-postgresql-quick-final.sh
```

---

### **6. `fix-export-error.sh` - CORREÇÃO ERRO EXPORT**

**🎯 Função:** Corrige erros de export no deploy **✅ Inclui:** Correção de caracteres especiais,
reinicialização de serviços

**📋 Uso:**

```bash
./scripts/fix-export-error.sh
```

---

### **7. `fix-build-error.sh` - CORREÇÃO ERRO BUILD**

**🎯 Função:** Corrige erros de build do Vite **✅ Inclui:** Instalação de terser, limpeza de cache,
correção de configurações

**📋 Uso:**

```bash
./scripts/fix-build-error.sh
```

---

### **8. `fix-postgresql-quick.sh` - CORREÇÃO POSTGRESQL UBUNTU 20.04**

**🎯 Função:** Corrige problemas específicos do PostgreSQL no Ubuntu 20.04 **✅ Inclui:** Remoção de
repositórios problemáticos, instalação alternativa

**📋 Uso:**

```bash
./scripts/fix-postgresql-quick.sh
```

---

## 🎯 **Ordem de Execução Recomendada**

### **Para Nova Instalação:**

1. `install-vps-complete.sh` - Instalação completa e automatizada

### **Para Correção de Problemas:**

1. `fix-postgresql-quick-final.sh` - Correção rápida PostgreSQL
2. `fix-export-error.sh` - Se houver erro de export
3. `fix-build-error.sh` - Se houver erro de build

### **Para Correção Completa:**

1. `fix-postgresql-final.sh` - Correção completa PostgreSQL

---

## 🔒 **Configurações de Segurança**

### **PostgreSQL:**

- **Usuário:** `sispat_user`
- **Senha:** `sispat123456`
- **Banco:** `sispat_production`
- **Host:** `localhost`
- **Porta:** `5432`

### **Redis:**

- **Host:** `localhost`
- **Porta:** `6379`
- **Senha:** `sispat123456`

### **JWT:**

- **Secret:** Gerado automaticamente
- **Expiração:** 24h
- **Refresh:** 7d

---

## 📋 **Comandos Úteis**

### **Verificar Status:**

```bash
pm2 status                    # Status dos processos
pm2 logs                      # Logs em tempo real
systemctl status postgresql   # Status PostgreSQL
systemctl status redis-server # Status Redis
systemctl status nginx        # Status Nginx
```

### **Reiniciar Serviços:**

```bash
pm2 restart all              # Reiniciar todos os processos
pm2 restart sispat-backend   # Reiniciar apenas backend
systemctl restart postgresql # Reiniciar PostgreSQL
systemctl restart nginx      # Reiniciar Nginx
```

### **Verificar Logs:**

```bash
pm2 logs --lines 50          # Últimas 50 linhas
journalctl -u nginx -f       # Logs Nginx em tempo real
tail -f logs/app.log         # Logs da aplicação
```

---

## 🚨 **Resolução de Problemas**

### **Problema: "password authentication failed"**

**Solução:** Execute `fix-postgresql-quick-final.sh`

### **Problema: "export: not a valid identifier"**

**Solução:** Execute `fix-export-error.sh`

### **Problema: "terser not found"**

**Solução:** Execute `fix-build-error.sh`

### **Problema: "404 Not Found" PostgreSQL Ubuntu 20.04**

**Solução:** Execute `fix-postgresql-quick.sh`

---

## 🌟 **Recursos Avançados**

### **Backup Automático:**

```bash
./scripts/backup.sh          # Backup manual
crontab -e                    # Configurar backup automático
# 0 2 * * * /var/www/sispat/scripts/backup.sh
```

### **Monitoramento:**

```bash
pm2 monit                     # Monitor PM2
htop                          # Monitor de sistema
iotop                         # Monitor de I/O
```

---

## 📞 **Suporte**

### **Se encontrar problemas:**

1. Execute o script de correção apropriado
2. Verifique os logs com `pm2 logs`
3. Verifique o status dos serviços
4. Execute testes de conectividade

### **Logs importantes:**

- **Aplicação:** `./logs/`
- **PM2:** `~/.pm2/logs/`
- **Sistema:** `/var/log/`
- **Nginx:** `/var/log/nginx/`
- **PostgreSQL:** `/var/log/postgresql/`

---

**🎉 Com estes scripts, o SISPAT estará 100% funcional em produção!**
