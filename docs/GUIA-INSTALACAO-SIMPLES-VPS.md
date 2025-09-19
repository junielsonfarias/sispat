# 🚀 GUIA SUPER SIMPLES - INSTALAÇÃO SISPAT NA VPS

> **Para pessoas sem conhecimento técnico**  
> **Instalação em 3 passos simples!**

---

## 📋 **O QUE VOCÊ PRECISA ANTES DE COMEÇAR:**

### ✅ **VPS (Servidor Virtual)**

- **Onde comprar:** DigitalOcean, Vultr, Linode, AWS, etc.
- **Configuração mínima:** 2 CPUs, 4GB RAM, 50GB disco
- **Sistema:** Ubuntu 20.04 ou 22.04
- **Acesso:** SSH (você receberá IP, usuário e senha)

### ✅ **Domínio (opcional mas recomendado)**

- **Exemplo:** `meusispat.com.br`
- **Onde comprar:** Registro.br, GoDaddy, Namecheap, etc.
- **Configurar:** Apontar para o IP da sua VPS

---

## 🎯 **INSTALAÇÃO EM 3 PASSOS SIMPLES**

### **PASSO 1: Conectar na VPS** 🔌

1. **Abra o Terminal/Prompt de Comando:**
   - **Windows:** Pressione `Win + R`, digite `cmd` e pressione Enter
   - **Mac:** Pressione `Cmd + Espaço`, digite `Terminal` e pressione Enter
   - **Linux:** Pressione `Ctrl + Alt + T`

2. **Conecte na sua VPS:**

   ```bash
   ssh root@IP_DA_SUA_VPS
   ```

   > **Substitua `IP_DA_SUA_VPS` pelo IP que você recebeu** **Exemplo:** `ssh root@192.168.1.100`

3. **Digite a senha quando solicitado**

### **PASSO 2: Executar Script Automático** 🤖

**Copie e cole este comando completo:**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-simple.sh -o install.sh && chmod +x install.sh && ./install.sh
```

**O que este comando faz:**

- ✅ Baixa o script de instalação
- ✅ Torna o arquivo executável
- ✅ Executa a instalação automática

**⏱️ Tempo estimado:** 10-15 minutos

### **PASSO 3: Configurar Domínio (Opcional)** 🌐

**Se você tem um domínio:**

1. **Durante a instalação, o script perguntará:**

   ```
   Digite seu domínio (ex: meusispat.com.br) ou pressione Enter para pular:
   ```

2. **Digite seu domínio e pressione Enter**

3. **O script configurará tudo automaticamente!**

---

## 🎉 **PRONTO! SEU SISPAT ESTÁ FUNCIONANDO**

### **Como acessar:**

- **Com domínio:** `https://seu-dominio.com.br`
- **Sem domínio:** `http://IP_DA_SUA_VPS:8080`

### **Login padrão:**

- **Email:** `admin@sispat.com`
- **Senha:** `admin123`
- **⚠️ IMPORTANTE:** Altere a senha após o primeiro login!

### **Banco de dados:**

- **✅ PostgreSQL configurado automaticamente**
- **✅ Tabelas criadas automaticamente**
- **✅ Dados iniciais inseridos**
- **✅ Backup automático configurado**
- **📁 Credenciais salvas em:** `/root/sispat-db-credentials.txt`

---

## 🛠️ **COMANDOS ÚTEIS (Para depois)**

### **Verificar se está funcionando:**

```bash
pm2 status
```

### **Ver logs (se houver problemas):**

```bash
pm2 logs
```

### **Reiniciar o sistema:**

```bash
pm2 restart all
```

### **Parar o sistema:**

```bash
pm2 stop all
```

### **Iniciar o sistema:**

```bash
pm2 start all
```

### **Comandos do banco de dados:**

```bash
# Ver status do PostgreSQL
systemctl status postgresql

# Reiniciar PostgreSQL
systemctl restart postgresql

# Fazer backup manual
/usr/local/bin/sispat-backup.sh

# Ver credenciais do banco
cat /root/sispat-db-credentials.txt
```

---

## ❓ **PROBLEMAS COMUNS E SOLUÇÕES**

### **❌ "Comando não encontrado"**

**Solução:** Execute este comando primeiro:

```bash
apt update && apt install -y curl
```

### **❌ "Permissão negada"**

**Solução:** Certifique-se de estar conectado como root:

```bash
sudo su -
```

### **❌ "Erro de conexão"**

**Solução:** Verifique se o IP da VPS está correto e se a VPS está ligada

### **❌ "Site não carrega"**

**Solução:** Aguarde 2-3 minutos após a instalação e tente novamente

### **❌ "Erro de SSL"**

**Solução:** Se você configurou domínio, aguarde até 10 minutos para o SSL ser configurado

### **❌ "Erro de banco de dados"**

**Solução:** Verifique se o PostgreSQL está rodando:

```bash
systemctl status postgresql
systemctl restart postgresql
```

### **❌ "Não consegue fazer login"**

**Solução:** Verifique se o banco de dados está funcionando:

```bash
# Ver logs do SISPAT
pm2 logs

# Verificar conexão com banco
systemctl status postgresql
```

---

## 📞 **PRECISA DE AJUDA?**

### **1. Verificar Status:**

```bash
# Ver se tudo está funcionando
pm2 status

# Ver logs de erro
pm2 logs --err

# Ver logs do sistema
journalctl -u nginx -f
```

### **2. Reiniciar Tudo:**

```bash
# Parar tudo
pm2 stop all

# Aguardar 10 segundos
sleep 10

# Iniciar tudo
pm2 start all
```

### **3. Reinstalar (se necessário):**

```bash
# Parar tudo
pm2 stop all
pm2 delete all

# Executar instalação novamente
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-simple.sh -o install.sh && chmod +x install.sh && ./install.sh
```

---

## 🔒 **SEGURANÇA BÁSICA**

### **Após a instalação, faça:**

1. **Alterar senha do admin:**
   - Acesse o sistema
   - Vá em "Perfil" → "Alterar Senha"
   - Use uma senha forte

2. **Configurar backup automático:**
   - O sistema já vem com backup automático configurado
   - Os backups ficam em `/var/backups/sispat/`

3. **Manter o sistema atualizado:**
   ```bash
   # Atualizar sistema (execute mensalmente)
   apt update && apt upgrade -y
   ```

---

## 📊 **MONITORAMENTO SIMPLES**

### **Verificar uso de recursos:**

```bash
# Ver uso de CPU e memória
htop

# Ver espaço em disco
df -h

# Ver status dos serviços
systemctl status nginx
systemctl status postgresql
```

### **Verificar logs:**

```bash
# Logs do SISPAT
pm2 logs

# Logs do servidor web
tail -f /var/log/nginx/error.log

# Logs do banco de dados
tail -f /var/log/postgresql/postgresql-*.log
```

---

## 🎯 **RESUMO RÁPIDO**

### **Para instalar:**

1. Conecte na VPS: `ssh root@IP_DA_SUA_VPS`
2. Execute:
   `curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-simple.sh -o install.sh && chmod +x install.sh && ./install.sh`
3. Acesse: `http://IP_DA_SUA_VPS:8080` ou `https://seu-dominio.com.br`

### **Login padrão:**

- **Email:** `admin@sispat.com`
- **Senha:** `admin123`

### **Banco de dados:**

- **✅ PostgreSQL configurado automaticamente**
- **✅ Tabelas criadas automaticamente**
- **✅ Backup automático configurado**
- **📁 Credenciais:** `/root/sispat-db-credentials.txt`

### **Comandos úteis:**

- **Status:** `pm2 status`
- **Logs:** `pm2 logs`
- **Reiniciar:** `pm2 restart all`
- **Banco:** `systemctl status postgresql`
- **Backup:** `/usr/local/bin/sispat-backup.sh`

---

## 🚀 **PRÓXIMOS PASSOS**

Após a instalação bem-sucedida:

1. ✅ **Acesse o sistema** e faça login
2. ✅ **Altere a senha** do administrador
3. ✅ **Configure seu município** nas configurações
4. ✅ **Adicione usuários** conforme necessário
5. ✅ **Configure backup** (já vem configurado)
6. ✅ **Teste todas as funcionalidades**

---

## 📝 **NOTAS IMPORTANTES**

- ⚠️ **Sempre use HTTPS** em produção
- ⚠️ **Faça backup regular** dos dados
- ⚠️ **Mantenha o sistema atualizado**
- ⚠️ **Use senhas fortes**
- ⚠️ **Monitore o uso de recursos**

---

**🎉 Parabéns! Seu SISPAT está funcionando!**

_Este guia foi criado para ser o mais simples possível. Se você seguiu todos os passos e ainda tem
problemas, verifique a seção "Problemas Comuns" acima._
