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

#### **Opção A: Instalação Normal (Recomendada)**

**Copie e cole este comando completo:**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-simple.sh -o install.sh && chmod +x install.sh && ./install.sh
```

#### **Opção B: Instalação Limpa (Para problemas persistentes)**

**Se você tem problemas com instalação anterior, use este comando:**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-clean.sh -o install-clean.sh && chmod +x install-clean.sh && ./install-clean.sh
```

**O que estes comandos fazem:**

- ✅ Baixa o script de instalação **ATUALIZADO**
- ✅ Torna o arquivo executável
- ✅ Executa a instalação automática
- ✅ **Configura domínio automaticamente** (se fornecido)
- ✅ **Corrige URLs** nos arquivos de build
- ✅ **Backend e frontend online** sem erros de localhost
- ✅ **Instalação limpa:** Remove instalação anterior e instala do zero

**⏱️ Tempo estimado:** 10-15 minutos

**🆕 NOVIDADES DA VERSÃO 2025:**

- ✅ **Correção automática de domínio** - Não usa mais localhost
- ✅ **URLs corrigidas** nos arquivos de build
- ✅ **Correções agressivas** de URLs HTTPS por HTTP
- ✅ **Correção de emergência** para HTTPS forçado
- ✅ **Verificação de status** do backend automática
- ✅ **CORS configurado** para o domínio correto
- ✅ **Nginx otimizado** para domínio específico
- ✅ **HTTP por padrão** (sem HTTPS forçado)

### **PASSO 3: Escolher Tipo de Instalação** 🎯

Se você já tem uma instalação anterior, o script oferecerá opções:

- **1. Instalação normal:** Atualiza a instalação existente
- **2. Instalação limpa:** Remove tudo e instala do zero
- **3. Sair:** Cancela a instalação

**Recomendação:** Use "Instalação limpa" se tiver problemas persistentes.

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

- **Com domínio:** `http://seu-dominio.com.br` (HTTPS disponível após configurar SSL)
- **Sem domínio:** `http://IP_DA_SUA_VPS`

### **Login padrão:**

- **Email:** `junielsonfarias@gmail.com`
- **Nome:** `Junielson Farias`
- **Senha:** `Tiko6273@`
- **Role:** `superuser`
- **⚠️ IMPORTANTE:** Altere a senha após o primeiro login!

### **Banco de dados:**

- **✅ PostgreSQL configurado automaticamente**
- **✅ Tabelas criadas automaticamente**
- **✅ Dados iniciais inseridos**
- **✅ Backup automático configurado**
- **👤 Usuário:** `postgres`
- **🔑 Senha:** `postgres`
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

## 🔄 **ATUALIZAR INSTALAÇÃO EXISTENTE**

### **Se você já tem o SISPAT instalado e quer atualizar:**

#### **Opção 1: Atualização Automática (Recomendada)**

```bash
# Baixar e executar script de atualização
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-simple.sh -o install-update.sh
chmod +x install-update.sh
./install-update.sh
```

**Durante a execução, escolha:**

- **1. Instalação normal** (atualiza a instalação existente)

#### **Opção 2: Remoção Completa e Nova Instalação**

```bash
# Parar todos os serviços
pm2 stop all
pm2 delete all

# Remover instalação anterior
rm -rf /var/www/sispat

# Baixar e executar instalação limpa
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-clean.sh -o install-clean.sh
chmod +x install-clean.sh
./install-clean.sh
```

#### **Opção 3: Correção Rápida (Para problemas de domínio)**

```bash
# Aplicar apenas correções de domínio
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-proxy-and-domain-issues.sh -o fix-domain.sh
chmod +x fix-domain.sh
./fix-domain.sh
```

### **🆕 O que mudou na nova versão:**

- ✅ **Domínio configurado automaticamente** - Não usa mais localhost
- ✅ **URLs corrigidas** nos arquivos de build
- ✅ **CORS configurado** para o domínio correto
- ✅ **Nginx otimizado** para domínio específico
- ✅ **HTTP por padrão** (sem HTTPS forçado)
- ✅ **Backend e frontend online** sem erros de conexão

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

### **❌ "Erro de autenticação PostgreSQL"**

**Causa:** Problemas de autenticação com o usuário do banco de dados.

**Solução:**

1.  **Executar script de correção de autenticação:**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-postgresql-simple.sh -o fix-auth.sh
    chmod +x fix-auth.sh
    ./fix-auth.sh
    ```

2.  **Verificar credenciais:**

    ```bash
    cat /root/sispat-db-credentials.txt
    ```

3.  **Testar conexão manual:**
    ```bash
    PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "SELECT version();"
    ```

### **❌ "ERESOLVE unable to resolve dependency tree"**

**Causa:** Conflito de dependências entre React 19 e outras bibliotecas.

**Solução:**

1.  **Executar script de correção de dependências:**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-npm-dependencies.sh -o fix-deps.sh
    chmod +x fix-deps.sh
    ./fix-deps.sh
    ```

2.  **Ou executar manualmente:**

    ```bash
    cd /var/www/sispat
    npm cache clean --force
    rm -rf node_modules package-lock.json
    npm install --legacy-peer-deps
    ```

### **❌ "ERR_ERL_UNEXPECTED_X_FORWARDED_FOR" ou "ERR_CONNECTION_REFUSED"**

**Causa:** Problemas de configuração de proxy e domínio - frontend tentando acessar localhost em vez
do domínio.

**✅ SOLUÇÃO: Script atualizado já corrige automaticamente!**

**Se ainda tiver problemas, execute:**

1.  **Executar script de correção de proxy e domínio:**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-proxy-and-domain-issues.sh -o fix-proxy.sh
    chmod +x fix-proxy.sh
    ./fix-proxy.sh
    ```

2.  **Ou atualizar para a nova versão:**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-simple.sh -o install-update.sh
    chmod +x install-update.sh
    ./install-update.sh
    ```

**O script corrige automaticamente:**

- ✅ Configuração de trust proxy no Express
- ✅ Rate limiting para funcionar com Nginx
- ✅ Substituição de localhost pelo domínio nos arquivos de build
- ✅ Configuração de CORS e domínio no .env
- ✅ Configuração do Nginx para o domínio
- ✅ URLs corrigidas automaticamente

### **❌ "Failed to ensure superuser exists" ou "ERR_CONNECTION_REFUSED" para API**

**Causa:** Frontend tentando acessar API via HTTPS mas backend rodando apenas em HTTP, ou problemas
de proxy entre frontend e backend.

**Solução IMEDIATA:**

1.  **Executar script de correção de emergência (RECOMENDADO):**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-https-emergency.sh -o fix-https-emergency.sh
    chmod +x fix-https-emergency.sh
    ./fix-https-emergency.sh
    ```

2.  **Ou executar script de correção específico:**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-https-frontend-http-backend.sh -o fix-https-http.sh
    chmod +x fix-https-http.sh
    ./fix-https-http.sh
    ```

3.  **O script de emergência corrige automaticamente:**
    - Para todos os serviços (Nginx, PM2)
    - Substitui TODAS as URLs HTTPS por HTTP nos arquivos de build
    - Corrige arquivo .env
    - Recria configuração do Nginx forçando HTTP
    - Reinicia todos os serviços
    - Testa conectividade final

### **❌ "Network Error" ou "ERR_CONNECTION_REFUSED" persistente**

**Causa:** Problemas persistentes de URLs HTTPS hardcoded ou configuração incorreta.

**Solução IMEDIATA:**

1.  **Executar diagnóstico específico:**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/diagnose-https-issue.sh -o diagnose-https.sh
    chmod +x diagnose-https.sh
    ./diagnose-https.sh
    ```

2.  **Executar correção de emergência:**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-https-emergency.sh -o fix-https-emergency.sh
    chmod +x fix-https-emergency.sh
    ./fix-https-emergency.sh
    ```

3.  **O diagnóstico verifica:**
    - URLs HTTPS nos arquivos de build
    - URLs localhost nos arquivos de build
    - Configuração do Nginx
    - Status dos serviços (Nginx, PM2, PostgreSQL)
    - Conectividade da API
    - Arquivo .env
    - Logs recentes

### **❌ "Could not read package.json: ENOENT: no such file or directory"**

**Causa:** O arquivo `package.json` não foi baixado corretamente devido a problemas na limpeza do
diretório.

**Solução IMEDIATA:**

1.  **Executar script de correção imediata:**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-current-install.sh -o fix-now.sh
    chmod +x fix-now.sh
    ./fix-now.sh
    ```

2.  **Ou executar instalação limpa (Recomendado para problemas persistentes):**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-clean.sh -o install-clean.sh
    chmod +x install-clean.sh
    ./install-clean.sh
    ```

### **❌ "relation 'imoveis' does not exist" ou "Erro ao criar tabelas"**

**Causa:** As tabelas do banco de dados não foram criadas corretamente.

**Solução IMEDIATA:**

1.  **Executar script de correção do banco de dados:**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-current-database.sh -o fix-db.sh
    chmod +x fix-db.sh
    ./fix-db.sh
    ```

2.  **Ou executar script de inicialização do banco manualmente:**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/init-database.sh -o init-db.sh
    chmod +x init-db.sh
    ./init-db.sh
    ```

### **❌ "relation 'report_templates' does not exist"**

**Causa:** Tabelas adicionais não foram criadas durante a inicialização do banco.

**Solução IMEDIATA:**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-installation-errors.sh -o fix-errors.sh
chmod +x fix-errors.sh
./fix-errors.sh
```

### **❌ "cannot load certificate" ou "SSL certificate error"**

**Causa:** O Nginx está tentando carregar certificados SSL que não existem.

**Solução IMEDIATA:**

1.  **Executar script de correção de erros:**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-installation-errors.sh -o fix-errors.sh
    chmod +x fix-errors.sh
    ./fix-errors.sh
    ```

2.  **Ou corrigir manualmente:**

    ```bash
    # Remover configuração SSL problemática
    sed -i '/ssl_certificate/d' /etc/nginx/sites-available/sispat
    sed -i '/listen 443/d' /etc/nginx/sites-available/sispat

    # Testar e recarregar Nginx
    nginx -t && systemctl reload nginx
    ```

### **❌ "relation 'label_templates' does not exist"**

**Causa:** Tabelas adicionais não foram criadas durante a inicialização do banco.

**Solução IMEDIATA:**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-installation-errors.sh -o fix-errors.sh
chmod +x fix-errors.sh
./fix-errors.sh
```

### **❌ "location directive is not allowed" no Nginx**

**Causa:** Configuração do Nginx com estrutura incorreta (diretivas location fora do bloco server).

**Solução IMEDIATA:**

1.  **Executar script de correção de erros:**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-installation-errors.sh -o fix-errors.sh
    chmod +x fix-errors.sh
    ./fix-errors.sh
    ```

2.  **Ou corrigir manualmente:**

    ```bash
    # Recriar configuração correta do Nginx
    cat > /etc/nginx/sites-available/sispat << 'EOF'
    server {
        listen 80;
        server_name sispat.vps-kinghost.net;

        location / {
            root /var/www/sispat/dist;
            try_files $uri $uri/ /index.html;
        }

        location /api/ {
            proxy_pass http://localhost:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
    EOF

    # Testar e recarregar
    nginx -t && systemctl reload nginx
    ```

### **❌ "User sispat cannot be found" no PM2**

**Causa:** Configuração do PM2 tentando usar usuário inexistente.

**Solução IMEDIATA:**

1.  **Executar script de correção específica:**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-pm2-user-error.sh -o fix-pm2.sh
    chmod +x fix-pm2.sh
    ./fix-pm2.sh
    ```

2.  **Ou corrigir manualmente:**

    ```bash
    # Parar PM2
    pm2 kill

    # Navegar para o diretório do SISPAT
    cd /var/www/sispat

    # Corrigir configuração do PM2
    cat > ecosystem.production.config.cjs << 'EOF'
    module.exports = {
      apps: [{
        name: 'sispat-backend',
        script: 'server/index.js',
        cwd: '/var/www/sispat',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
          NODE_ENV: 'production',
          PORT: 3001
        },
        log_file: '/var/www/sispat/logs/pm2.log',
        out_file: '/var/www/sispat/logs/pm2-out.log',
        error_file: '/var/www/sispat/logs/pm2-error.log',
        merge_logs: true,
        time: true,
        max_restarts: 10,
        min_uptime: '10s',
        max_memory_restart: '1G',
        node_args: '--max-old-space-size=1024'
      }]
    };
    EOF

    # Iniciar PM2
    pm2 start ecosystem.production.config.cjs --env production
    pm2 save
    ```

### **❌ "duplicate key value violates unique constraint"**

**Causa:** Script de dados de exemplo tentando inserir dados duplicados.

**Solução IMEDIATA:**

```bash
# Este erro é normal e não impede o funcionamento
# Os dados duplicados são ignorados automaticamente
# O sistema continuará funcionando normalmente
```

### **❌ "destination path '.' already exists and is not an empty directory"**

**Causa:** O diretório `/var/www/sispat` já existe e não está vazio, impedindo o clone do
repositório.

**Solução:**

1.  **Executar script de correção de diretório:**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-directory-conflict.sh -o fix-dir.sh
    chmod +x fix-dir.sh
    ./fix-dir.sh
    ```

2.  **Ou executar correção forçada:**

    ```bash
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-directory-force.sh -o fix-force.sh
    chmod +x fix-force.sh
    ./fix-force.sh
    ```

3.  **Ou executar manualmente:**

    ```bash
    cd /var/www
    rm -rf sispat
    mkdir -p sispat
    cd sispat
    git clone https://github.com/junielsonfarias/sispat.git .
    ```

### **🧹 Quando Usar Instalação Limpa**

**Use a instalação limpa quando:**

- ❌ **Problemas persistentes** com instalação anterior
- ❌ **Erros de dependências** que não conseguem ser resolvidos
- ❌ **Conflitos de configuração** entre versões
- ❌ **Corrupção de arquivos** ou diretórios
- ❌ **Falhas múltiplas** nos scripts de correção
- ❌ **Quer começar do zero** com instalação limpa

**A instalação limpa:**

- ✅ **Remove completamente** a instalação anterior
- ✅ **Limpa todos os arquivos** e configurações
- ✅ **Reinstala tudo do zero** com configurações frescas
- ✅ **Resolve problemas persistentes** automaticamente
- ✅ **Garante instalação limpa** sem conflitos

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

## 🔧 **CORREÇÕES DE PRODUÇÃO APLICADAS**

### **Versão 2025 - Correções Implementadas:**

✅ **Dependências Estáveis:**

- React downgradeado de 19.1.1 para 18.2.0 estável
- Helmet atualizado para versão 7.1.0 compatível
- Express, Socket.io e outras dependências em versões estáveis

✅ **Configurações de Segurança:**

- CORS configurado para permitir acesso externo em produção
- CSP (Content Security Policy) flexível para Google Fonts/Maps
- Rate limiting aplicado apenas na API (não nos assets estáticos)
- HSTS habilitado apenas quando SSL estiver configurado

✅ **Performance e Estabilidade:**

- PM2 configurado para 1 instância (adequado para VPS pequena)
- Coluna `deleted_at` adicionada nas tabelas `patrimonios` e `imoveis`
- Índices de performance criados automaticamente
- Speakeasy (2FA) movido para backend (resolve warnings do Vite)
- Trust proxy configurado para funcionar com Nginx
- Rate limiting corrigido para X-Forwarded-For

✅ **🆕 NOVIDADES - Correção de Domínio:**

- **Frontend configurado para usar domínio em vez de localhost**
- **URLs corrigidas automaticamente** nos arquivos de build
- **Correções agressivas** de URLs HTTPS por HTTP
- **Verificação de status** do backend automática
- **Nginx configurado para domínio específico**
- **CORS configurado para o domínio correto**
- **HTTP por padrão** (sem HTTPS forçado)
- **Backend e frontend online** sem erros de conexão

✅ **Scripts de Correção:**

- `scripts/fix-dependencies.sh` - Corrige dependências instáveis
- `scripts/apply-production-fixes.sh` - Aplica todas as correções
- `scripts/post-install-check.sh` - Verificação pós-instalação automática
- `scripts/fix-proxy-and-domain-issues.sh` - Corrige problemas de proxy e domínio
- `scripts/fix-backend-connection.sh` - Corrige problemas de conectividade do backend
- `scripts/fix-https-frontend-http-backend.sh` - Corrige problemas Frontend HTTPS + Backend HTTP
- `scripts/fix-urls-aggressive.sh` - Correção agressiva de URLs HTTPS por HTTP
- `scripts/fix-https-emergency.sh` - Correção de emergência para HTTPS forçado
- `scripts/diagnose-https-issue.sh` - Diagnóstico específico de problemas HTTPS
- `scripts/check-backend-status.sh` - Verificação de status do backend
- **`scripts/install-vps-simple.sh` - Script principal ATUALIZADO com correções de domínio**

### **Para aplicar correções em instalação existente:**

```bash
# Baixar e executar script de correções
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/apply-production-fixes.sh -o fixes.sh
chmod +x fixes.sh
./fixes.sh
```

---

## 🎯 **RESUMO RÁPIDO**

### **Para instalar:**

1. Conecte na VPS: `ssh root@IP_DA_SUA_VPS`
2. Execute:
   `curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-simple.sh -o install.sh && chmod +x install.sh && ./install.sh`
3. Acesse: `http://IP_DA_SUA_VPS` ou `http://seu-dominio.com.br`

### **Login padrão:**

- **Email:** `junielsonfarias@gmail.com`
- **Nome:** `Junielson Farias`
- **Senha:** `Tiko6273@`
- **Role:** `superuser`

### **Banco de dados:**

- **✅ PostgreSQL configurado automaticamente**
- **✅ Tabelas criadas automaticamente**
- **✅ Backup automático configurado**
- **👤 Usuário:** `postgres`
- **🔑 Senha:** `postgres`
- **📁 Credenciais:** `/root/sispat-db-credentials.txt`

### **Comandos úteis:**

- **Status:** `pm2 status`
- **Logs:** `pm2 logs`
- **Reiniciar:** `pm2 restart all`
- **Banco:** `systemctl status postgresql`
- **Conectar:** `PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db`
- **Backup:** `/usr/local/bin/sispat-backup.sh`

---

## 🆕 **MELHORIAS DA VERSÃO 2025**

### **✅ Problemas Resolvidos:**

- **❌ Antes:** Frontend tentando acessar `localhost:3001` ou `localhost:8080`
- **✅ Agora:** Frontend configurado para usar domínio/IP correto

- **❌ Antes:** Erros `ERR_CONNECTION_REFUSED` para API
- **✅ Agora:** Backend e frontend online sem erros de conexão

- **❌ Antes:** CORS bloqueando requisições do domínio
- **✅ Agora:** CORS configurado para aceitar requisições do domínio

- **❌ Antes:** Nginx configurado para qualquer domínio
- **✅ Agora:** Nginx configurado para domínio específico

- **❌ Antes:** URLs hardcoded nos arquivos de build
- **✅ Agora:** URLs corrigidas automaticamente nos arquivos de build

### **🔧 Correções Automáticas:**

1. **Detecção de domínio** - Script pergunta se você tem domínio
2. **Configuração dinâmica** - URLs baseadas no domínio/IP
3. **Correção de build** - URLs corrigidas nos arquivos JavaScript/HTML
4. **Correção agressiva** - URLs HTTPS forçadas para HTTP
5. **Verificação de status** - Backend verificado automaticamente
6. **Nginx otimizado** - Configurado para domínio específico
7. **CORS configurado** - Aceita requisições do domínio correto
8. **HTTP por padrão** - Sem HTTPS forçado

### **📊 Resultado:**

- ✅ **Backend online** - `http://seu-dominio.com/api`
- ✅ **Frontend online** - `http://seu-dominio.com`
- ✅ **Login funcionando** - Sem mais erros de conexão
- ✅ **CORS funcionando** - Requisições aceitas
- ✅ **URLs corretas** - Sem mais localhost

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
