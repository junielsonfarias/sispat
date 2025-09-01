# 🚀 GUIA COMPLETO DE INSTALAÇÃO VPS - SISPAT (ATUALIZADO)

## 📋 **Pré-requisitos da VPS:**

- ✅ **Sistema Operacional:** Ubuntu 20.04+ ou CentOS 8+
- ✅ **Recursos Mínimos:** 2 vCPUs, 4GB RAM, 50GB SSD
- ✅ **Acesso Root:** SSH com privilégios de administrador
- ✅ **Domínio:** Configurado para apontar para o IP da VPS

---

## 🎯 **OPÇÃO 1: INSTALAÇÃO AUTOMÁTICA (RECOMENDADA)**

### **1.1 Conectar na VPS como Root**

```bash
ssh root@IP_DA_SUA_VPS
```

### **1.2 Executar Script de Instalação Automática**

```bash
# Baixar o script de instalação
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-complete.sh -o install-vps-complete.sh

# Tornar executável
chmod +x install-vps-complete.sh

# Executar instalação completa
./install-vps-complete.sh
```

**🎉 Este script faz TUDO automaticamente:**

- ✅ Instala todas as dependências
- ✅ Configura PostgreSQL e Redis
- ✅ Instala e configura Nginx
- ✅ Clona o repositório SISPAT
- ✅ Executa deploy automático
- ✅ Configura PM2 para startup automático

---

## 🔧 **OPÇÃO 2: INSTALAÇÃO MANUAL PASSO A PASSO**

### **PASSO 1: PREPARAÇÃO DO SISTEMA**

#### **1.1 Conectar via SSH e Atualizar Sistema**

```bash
# Conectar via SSH
ssh root@IP_DA_SUA_VPS

# Atualizar sistema
apt update && apt upgrade -y
apt install -y build-essential curl git software-properties-common unzip wget
```

#### **1.2 Configurar Fuso Horário e Locale**

```bash
# Configurar fuso horário (Brasil)
timedatectl set-timezone America/Sao_Paulo

# Configurar locale
locale-gen pt_BR.UTF-8
update-locale LANG=pt_BR.UTF-8
```

---

### **PASSO 2: INSTALAÇÃO DO NODE.JS E FERRAMENTAS**

#### **2.1 Instalar Node.js 18.x**

```bash
# Adicionar repositório NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

# Instalar Node.js
apt install -y nodejs

# Verificar instalação
node --version
npm --version
```

#### **2.2 Instalar pnpm e PM2**

```bash
# Instalar pnpm globalmente
npm install -g pnpm

# Instalar PM2
npm install -g pm2

# Verificar instalações
pnpm --version
pm2 --version
```

---

### **PASSO 3: INSTALAÇÃO DO POSTGRESQL**

#### **3.1 Instalar PostgreSQL**

```bash
# Instalar PostgreSQL do repositório padrão Ubuntu
apt install -y postgresql postgresql-contrib

# Verificar instalação
psql --version
```

#### **3.2 Configurar PostgreSQL**

```bash
# Habilitar e iniciar PostgreSQL
systemctl enable postgresql
systemctl start postgresql

# Verificar status
systemctl status postgresql

# Acessar usuário postgres
sudo -u postgres psql

# Criar usuário e banco (execute dentro do psql)
CREATE USER sispat_user WITH PASSWORD 'sispat123456';
CREATE DATABASE sispat_production OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
ALTER USER sispat_user CREATEDB;
\q
```

---

### **PASSO 4: INSTALAÇÃO DO REDIS**

#### **4.1 Instalar Redis**

```bash
# Instalar Redis
apt install -y redis-server

# Verificar instalação
redis-server --version
```

#### **4.2 Configurar Redis**

```bash
# Editar configuração
nano /etc/redis/redis.conf

# Adicionar/modificar estas linhas:
# bind 127.0.0.1
# requirepass sispat123456
# maxmemory 256mb
# maxmemory-policy allkeys-lru

# Habilitar e iniciar Redis
systemctl enable redis-server
systemctl start redis-server

# Testar conexão
redis-cli -a sispat123456 ping
```

---

### **PASSO 5: INSTALAÇÃO DO NGINX**

#### **5.1 Instalar Nginx**

```bash
# Instalar Nginx
apt install -y nginx

# Verificar instalação
nginx -v
```

#### **5.2 Configurar Firewall**

```bash
# Configurar UFW
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3001
ufw --force enable

# Verificar status
ufw status
```

---

### **PASSO 6: CLONAR E CONFIGURAR APLICAÇÃO**

#### **6.1 Clonar Repositório**

```bash
# Criar diretório para aplicações
mkdir -p /var/www
cd /var/www

# Clonar repositório SISPAT
git clone https://github.com/junielsonfarias/sispat.git
cd sispat

# Verificar conteúdo
ls -la
```

#### **6.2 Configurar Variáveis de Ambiente**

```bash
# Copiar arquivo de exemplo
cp env.production.example .env.production

# Editar arquivo de ambiente
nano .env.production
```

#### **6.3 Configurar .env.production**

```bash
# Configurações básicas
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_production
DB_USER=sispat_user
DB_PASSWORD=sispat123456
DATABASE_URL=postgresql://sispat_user:sispat123456@localhost:5432/sispat_production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=sispat123456
REDIS_URL=redis://:sispat123456@localhost:6379

# JWT
JWT_SECRET=SEU_JWT_SECRET_AQUI
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://sispat.vps-kinghost.net,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=https://sispat.vps-kinghost.net,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080
```

---

### **PASSO 7: EXECUTAR SCRIPTS DE CONFIGURAÇÃO**

#### **7.1 Tornar Scripts Executáveis**

```bash
# No diretório da aplicação
cd /var/www/sispat
chmod +x scripts/*.sh
```

#### **7.2 Executar Script de Configuração**

```bash
# Executar configuração inicial
./scripts/setup-production.sh
```

#### **7.3 Executar Deploy**

```bash
# Executar deploy para produção
./scripts/deploy-production-simple.sh
```

---

### **PASSO 8: CONFIGURAÇÃO DO NGINX**

#### **8.1 Criar Configuração do Site**

```bash
# Criar arquivo de configuração
nano /etc/nginx/sites-available/sispat
```

#### **8.2 Configuração Nginx (conteúdo do arquivo)**

```nginx
server {
    listen 80;
    server_name sispat.vps-kinghost.net www.sispat.vps-kinghost.net;

    # Frontend
    location / {
        root /var/www/sispat/dist;
        try_files $uri $uri/ /index.html;

        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

#### **8.3 Ativar Site**

```bash
# Criar link simbólico
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/

# Remover site padrão
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Recarregar Nginx
systemctl reload nginx
```

---

### **PASSO 9: CONFIGURAÇÃO SSL**

#### **9.1 Instalar Certbot**

```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
certbot --nginx -d sispat.vps-kinghost.net

# Configurar renovação automática
crontab -e

# Adicionar linha para renovação automática:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

---

### **PASSO 10: CONFIGURAÇÃO DO PM2**

#### **10.1 Configurar PM2**

```bash
# Salvar configuração do PM2
pm2 save

# Configurar startup automático
pm2 startup

# Seguir as instruções exibidas pelo comando acima
```

#### **10.2 Configurar Logs**

```bash
# Ver logs em tempo real
pm2 logs

# Ver logs de um processo específico
pm2 logs sispat-backend
pm2 logs sispat-frontend
```

---

### **PASSO 11: VERIFICAÇÃO FINAL**

#### **11.1 Verificar Serviços**

```bash
# Verificar status dos serviços
systemctl status postgresql
systemctl status redis-server
systemctl status nginx
pm2 status
```

#### **11.2 Testar Endpoints**

```bash
# Testar frontend
curl -I http://sispat.vps-kinghost.net

# Testar API
curl -I http://sispat.vps-kinghost.net/api/health

# Testar banco de dados
sudo -u postgres psql -d sispat_production -c "SELECT version();"
```

---

## 🚨 **RESOLUÇÃO DE PROBLEMAS COMUNS**

### **Problema 0: Erro de Export (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `export: '2': not a valid identifier` e centenas de erros similares **🔧 Solução:** O
script `install-vps-complete.sh` agora inclui correção automática **✅ Status:** **RESOLVIDO** -
Correção integrada automaticamente

### **Problema 1: Erro de Autenticação PostgreSQL (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `password authentication failed for user "sispat_user"` **🔧 Solução:** O script
`install-vps-complete.sh` agora inclui correção automática de autenticação **✅ Status:**
**RESOLVIDO** - Correção integrada automaticamente **🔒 Senha Configurada:** `sispat123456`

### **Problema 2: Nginx não roteia tráfego para aplicação (RESOLVIDO)**

**❌ Erro:** Nginx funcionando mas não roteia tráfego para SISPAT **🔧 Solução:** O script
`install-vps-complete.sh` agora inclui correção automática da configuração Nginx **✅ Status:**
**RESOLVIDO** - Configuração integrada automaticamente **🌐 Configurações:** Proxy reverso, headers
de segurança, compressão Gzip, cache para arquivos estáticos

### **Problema 3: Erro de configuração Nginx (RESOLVIDO)**

**❌ Erro:** `nginx: [emerg] invalid value "must-revalidate" in /etc/nginx/sites-enabled/sispat:83`
**🔧 Solução:** Corrigido o valor inválido "must-revalidate" na diretiva `gzip_proxied` **✅
Status:** **RESOLVIDO** - Configuração Nginx agora é válida e funcional

### **Problema 4: PostgreSQL não instala (Ubuntu 20.04)**

```bash
# Solução automática
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-postgresql-ubuntu20.sh -o fix-postgresql.sh
chmod +x fix-postgresql.sh
./fix-postgresql.sh
```

### **Problema 5: pnpm-lock.yaml incompatível**

```bash
# Tentar instalar com força
pnpm install --force

# Se falhar, usar npm
rm pnpm-lock.yaml
npm install
```

### **Problema 6: Husky não encontrado**

```bash
# O script deploy-production-simple.sh já resolve automaticamente
# Se persistir, executar manualmente:
export NODE_ENV=production
export CI=false
npx husky install
```

---

## 📋 **COMANDOS ESSENCIAIS (execute em sequência):**

```bash
# 1. Preparar sistema
apt update && apt upgrade -y
apt install -y build-essential curl git software-properties-common unzip wget

# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 3. Instalar ferramentas
npm install -g pnpm pm2

# 4. Instalar PostgreSQL
apt install -y postgresql postgresql-contrib

# 5. Instalar Redis
apt install -y redis-server

# 6. Instalar Nginx
apt install -y nginx

# 7. Configurar firewall
ufw allow ssh && ufw allow 80 && ufw allow 443 && ufw allow 3001 && ufw --force enable

# 8. Clonar aplicação
cd /var/www && git clone https://github.com/junielsonfarias/sispat.git && cd sispat

# 9. Configurar ambiente
chmod +x scripts/*.sh
./scripts/setup-production.sh

# 10. Deploy
./scripts/deploy-production-simple.sh

# 11. Configurar Nginx
# (criar arquivo de configuração manualmente)

# 12. SSL
certbot --nginx -d sispat.vps-kinghost.net

# 13. PM2 startup
pm2 save && pm2 startup
```

---

## 🎯 **RESULTADO FINAL**

Após executar todos os passos, você terá:

- ✅ **Frontend** rodando na porta 80/443 (HTTPS)
- ✅ **Backend API** rodando na porta 3001
- ✅ **PostgreSQL** configurado e funcionando
- ✅ **Redis** configurado e funcionando
- ✅ **Nginx** servindo como proxy reverso
- ✅ **SSL** configurado automaticamente
- ✅ **PM2** gerenciando processos
- ✅ **Firewall** configurado e ativo

---

## 🚀 **INSTALAÇÃO RÁPIDA (RECOMENDADA)**

**Para instalação mais rápida, use o script automático:**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps.sh -o install-vps.sh
chmod +x install-vps.sh
./install-vps.sh
```

**🎯 Sua aplicação SISPAT estará rodando em produção com todas as configurações de segurança e
performance!**

---

## 🔧 **CORREÇÕES APLICADAS NESTA VERSÃO**

### **✅ Problemas Críticos Resolvidos:**

1. **Erro de Export (CRÍTICO):** `export: '2': not a valid identifier` - **RESOLVIDO**
2. **PostgreSQL Ubuntu 20.04:** Repositório 404 Not Found - **RESOLVIDO**
3. **Build Vite:** Erro terser not found - **RESOLVIDO**
4. **NODE_ENV:** Conflito com Vite - **RESOLVIDO**
5. **Autenticação PostgreSQL:** Usuário e senha incorretos - **RESOLVIDO**
6. **Configuração Nginx:** Erro de valor inválido "must-revalidate" - **RESOLVIDO**

### **✅ Scripts Corrigidos:**

- `install-vps-complete.sh` - Inclui todas as correções automaticamente
- `fix-export-error-final.sh` - Correção final do erro de export
- `fix-postgresql-final.sh` - Correção completa do PostgreSQL
- `fix-postgresql-auth-final.sh` - Correção definitiva da autenticação PostgreSQL
- `fix-nginx-config.sh` - Correção da configuração Nginx
- `deploy-production-simple.sh` - Problema de export resolvido

### **✅ Funcionalidades Adicionadas:**

- Correção automática de erros durante a instalação
- Verificação de conectividade incluída
- Scripts de correção integrados automaticamente
- Configuração Nginx otimizada
- PM2 configurado para startup automático
- Autenticação PostgreSQL 100% funcional (senha: sispat123456)
- Configuração automática de proxy reverso
- Headers de segurança aplicados automaticamente

---

## 📞 **SUPORTE**

### **Se encontrar problemas:**

1. **Verifique os logs:**

   ```bash
   pm2 logs
   journalctl -u nginx
   journalctl -u postgresql
   ```

2. **Use o script de correção PostgreSQL:**

   ```bash
   ./fix-postgresql.sh
   ```

3. **Verifique o status dos serviços:**

   ```bash
   systemctl status postgresql redis-server nginx
   pm2 status
   ```

4. **Teste conectividade:**
   ```bash
   curl -I http://localhost:3001
   curl -I http://sispat.vps-kinghost.net
   ```

---

**🎉 Com este guia atualizado, você terá uma instalação completa e funcional do SISPAT em
produção!**
