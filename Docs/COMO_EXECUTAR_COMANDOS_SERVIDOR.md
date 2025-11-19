# 🖥️ Como Executar Comandos no Servidor Linux

## ⚠️ **IMPORTANTE: Leia Antes de Começar**

Os comandos Linux (`sudo`, `chown`, `chmod`, `pm2`, etc.) **NÃO funcionam no Windows PowerShell**.

Eles devem ser executados **NO SERVIDOR LINUX** via SSH.

---

## 📋 **Passo a Passo Completo**

### **1. Conectar ao Servidor Linux**

No PowerShell do Windows, execute:

```powershell
ssh root@sispat.vps-kinghost.net
```

**Se aparecer aviso sobre chave SSH:**
```powershell
# Remover chave antiga (no Windows)
ssh-keygen -R sispat.vps-kinghost.net

# Conectar novamente
ssh root@sispat.vps-kinghost.net
# Digite "yes" quando perguntar sobre a nova chave
```

---

### **2. No Servidor Linux (após conectar via SSH)**

Agora você está no servidor Linux. O prompt deve mostrar algo como:
```
root@sispat:/var/www/sispat#
```

**Execute os comandos:**

```bash
# 1. Ir para o diretório do projeto
cd /var/www/sispat

# 2. Atualizar código do repositório
git pull origin main

# 3. Dar permissão de execução ao script
chmod +x scripts/corrigir-permissoes-logs.sh

# 4. Executar script de correção
./scripts/corrigir-permissoes-logs.sh
```

---

### **3. Ou Execute Manualmente (sem script)**

Se preferir executar os comandos manualmente:

```bash
# 1. Atualizar código
cd /var/www/sispat
git pull origin main

# 2. Corrigir permissões de logs
sudo chown -R www-data:www-data /var/www/sispat/backend/logs/
sudo chmod -R 755 /var/www/sispat/backend/logs/

# 3. Corrigir permissões de uploads
sudo chown -R www-data:www-data /var/www/sispat/backend/uploads/
sudo find /var/www/sispat/backend/uploads -type f -exec chmod 644 {} \;
sudo find /var/www/sispat/backend/uploads -type d -exec chmod 755 {} \;

# 4. Parar backend
pm2 stop sispat-backend
pm2 delete sispat-backend

# 5. Reiniciar backend
cd /var/www/sispat/backend
pm2 start ecosystem.config.js --env production
pm2 save

# 6. Verificar status
pm2 status
pm2 logs sispat-backend --lines 20
```

---

## 🔍 **Como Saber se Está no Servidor Linux?**

### ✅ **Você está no servidor Linux se:**
- O prompt mostra: `root@sispat:/var/www/sispat#`
- O comando `pwd` retorna: `/var/www/sispat` ou `/root`
- Os comandos `sudo`, `chmod`, `chown` funcionam
- O comando `pm2` funciona

### ❌ **Você está no Windows se:**
- O prompt mostra: `PS D:\novo ambiente\sispat - Copia>`
- Os comandos `sudo`, `chmod`, `chown` dão erro "não reconhecido"
- O caminho começa com `D:\` ou `C:\`

---

## 🚀 **Comando Rápido (Copiar e Colar Tudo)**

Execute no servidor Linux (após conectar via SSH):

```bash
cd /var/www/sispat && git pull origin main && sudo chown -R www-data:www-data /var/www/sispat/backend/logs/ /var/www/sispat/backend/uploads/ && sudo chmod -R 755 /var/www/sispat/backend/logs/ && sudo find /var/www/sispat/backend/uploads -type f -exec chmod 644 {} \; && sudo find /var/www/sispat/backend/uploads -type d -exec chmod 755 {} \; && pm2 stop sispat-backend 2>/dev/null; pm2 delete sispat-backend 2>/dev/null; cd /var/www/sispat/backend && pm2 start ecosystem.config.js --env production && pm2 save && echo "✅ Concluído!" && pm2 status
```

---

## 📝 **Resumo Visual**

```
┌─────────────────────────────────────────────────────────┐
│  WINDOWS (PowerShell)                                   │
│  PS D:\novo ambiente\sispat - Copia>                   │
│                                                          │
│  ✅ git add, git commit, git push                       │
│  ❌ sudo, chmod, chown, pm2 (não funcionam)            │
└─────────────────────────────────────────────────────────┘
                        │
                        │ ssh root@sispat.vps-kinghost.net
                        ▼
┌─────────────────────────────────────────────────────────┐
│  SERVIDOR LINUX (Bash)                                   │
│  root@sispat:/var/www/sispat#                           │
│                                                          │
│  ✅ sudo, chmod, chown, pm2 (funcionam)                  │
│  ✅ git pull, npm, node                                  │
└─────────────────────────────────────────────────────────┘
```

---

## ❓ **Perguntas Frequentes**

### **P: Por que os comandos não funcionam no Windows?**
**R:** Porque `sudo`, `chmod`, `chown` são comandos específicos do Linux/Unix. O Windows usa comandos diferentes.

### **P: Como sei se estou conectado ao servidor?**
**R:** O prompt muda. No servidor Linux você verá algo como `root@sispat:/var/www/sispat#` em vez de `PS D:\...`.

### **P: Posso executar comandos do Windows no servidor?**
**R:** Não. No servidor Linux você deve usar comandos Linux/Bash.

### **P: Como sair do servidor e voltar ao Windows?**
**R:** Digite `exit` ou pressione `Ctrl+D` no terminal SSH.

---

## 🆘 **Precisa de Ajuda?**

Se tiver dúvidas:
1. Verifique se está conectado ao servidor: `pwd`
2. Verifique se está no diretório correto: `ls -la`
3. Verifique se o PM2 está instalado: `pm2 --version`

