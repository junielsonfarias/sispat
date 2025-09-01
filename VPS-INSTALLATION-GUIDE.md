# 🚀 GUIA COMPLETO: Instalação SISPAT em VPS usando Scripts

## 📋 **Pré-requisitos da VPS:**

- ✅ **Sistema Operacional:** Ubuntu 20.04+ ou CentOS 8+
- ✅ **Recursos Mínimos:** 2 vCPUs, 4GB RAM, 50GB SSD
- ✅ **Recursos Recomendados:** 4 vCPUs, 8GB RAM, 100GB SSD
- ✅ **Acesso:** Root ou usuário com sudo

---

## 🎯 **OPÇÃO 1: Instalação Automática (RECOMENDADA)**

### **1.1 Conectar na VPS como Root**

```bash
ssh root@IP_DA_SUA_VPS
```

### **1.2 Executar Script de Instalação Automática**

```bash
# Baixar o script de instalação
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps.sh -o install-vps.sh

# Tornar executável
chmod +x install-vps.sh

# Executar instalação completa
./install-vps.sh
```

**🎉 Este script faz TUDO automaticamente:**

- ✅ Instala todas as dependências
- ✅ Configura PostgreSQL e Redis
- ✅ Configura Nginx
- ✅ Clona a aplicação
- ✅ Executa deploy automático
- ✅ Configura firewall e SSL

---

## 🔧 **OPÇÃO 2: Instalação Manual Passo a Passo**

### **PASSO 1: Preparar o Sistema Base**

#### **1.1 Conectar na VPS e Atualizar Sistema**

```bash
# Conectar via SSH
ssh root@IP_DA_SUA_VPS

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
sudo apt install -y curl wget git build-essential unzip software-properties-common
```

#### **1.2 Configurar Fuso Horário e Locale**

```bash
# Configurar fuso horário (Brasil)
sudo timedatectl set-timezone America/Sao_Paulo

# Configurar locale
sudo locale-gen pt_BR.UTF-8
sudo update-locale LANG=pt_BR.UTF-8
```

---

### **PASSO 2: Instalar Software Base**

#### **2.1 Instalar Node.js 18.x**

```bash
# Adicionar repositório NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Instalar Node.js
sudo apt install -y nodejs

# Verificar instalação
node --version
npm --version
```

#### **2.2 Instalar pnpm e PM2**

```bash
# Instalar pnpm globalmente
npm install -g pnpm@8

# Instalar PM2 globalmente
npm install -g pm2

# Verificar instalações
pnpm --version
pm2 --version
```

---

### **PASSO 3: Instalar e Configurar PostgreSQL**

#### **3.1 Instalar PostgreSQL**

```bash
# Adicionar repositório oficial
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Atualizar e instalar
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Verificar instalação
sudo systemctl status postgresql
```

#### **3.2 Configurar PostgreSQL**

```bash
# Acessar usuário postgres
sudo -u postgres psql

# Criar banco e usuário (execute dentro do psql)
CREATE DATABASE sispat_production;
CREATE USER sispat_user WITH PASSWORD 'SUA_SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
ALTER USER sispat_user CREATEDB;
\q

# Habilitar e iniciar PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

---

### **PASSO 4: Instalar e Configurar Redis**

#### **4.1 Instalar Redis**

```bash
# Instalar Redis
sudo apt install -y redis-server

# Configurar Redis
sudo nano /etc/redis/redis.conf
```

#### **4.2 Configurar Redis (editar arquivo)**

```bash
# Adicionar/modificar estas linhas no redis.conf:
bind 127.0.0.1
port 6379
requirepass SUA_SENHA_REDIS_FORTE_AQUI
maxmemory 256mb
maxmemory-policy allkeys-lru
```

#### **4.3 Iniciar Redis**

```bash
# Habilitar e iniciar Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verificar status
sudo systemctl status redis-server
```

---

### **PASSO 5: Configurar Nginx**

#### **5.1 Instalar Nginx**

```bash
# Instalar Nginx
sudo apt install -y nginx

# Verificar instalação
nginx -v
```

#### **5.2 Configurar Firewall**

```bash
# Configurar UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3001
sudo ufw enable

# Verificar status
sudo ufw status
```

---

### **PASSO 6: Clonar e Configurar Aplicação**

#### **6.1 Clonar Repositório**

```bash
# Criar diretório para aplicações
sudo mkdir -p /var/www
cd /var/www

# Clonar repositório
sudo git clone https://github.com/junielsonfarias/sispat.git
sudo chown -R $USER:$USER sispat
cd sispat

# Verificar arquivos
ls -la
```

#### **6.2 Configurar Variáveis de Ambiente**

```bash
# Copiar arquivo de exemplo
cp env.production.example .env.production

# Editar variáveis de ambiente
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
DB_PASSWORD=SUA_SENHA_FORTE_AQUI
DATABASE_URL=postgresql://sispat_user:SUA_SENHA_FORTE_AQUI@localhost:5432/sispat_production

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=SUA_SENHA_REDIS_FORTE_AQUI

# JWT
JWT_SECRET=SUA_CHAVE_JWT_SUPER_FORTE_32_CARACTERES_MINIMO
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=https://seudominio.com
```

---

### **PASSO 7: Executar Scripts de Configuração**

#### **7.1 Tornar Scripts Executáveis**

```bash
# No diretório da aplicação
cd /var/www/sispat

# Tornar scripts executáveis
chmod +x scripts/*.sh

# Verificar permissões
ls -la scripts/
```

#### **7.2 Executar Script de Configuração**

```bash
# Executar configuração inicial
./scripts/setup-production.sh

# Se houver problemas, executar configuração específica do Husky
./scripts/setup-husky.sh
```

#### **7.3 Executar Deploy**

```bash
# Executar deploy para produção
./scripts/deploy-production-simple.sh

# Verificar status
pm2 status
pm2 logs
```

---

### **PASSO 8: Configurar Nginx como Proxy Reverso**

#### **8.1 Criar Configuração do Site**

```bash
# Criar arquivo de configuração
sudo nano /etc/nginx/sites-available/sispat
```

#### **8.2 Configuração Nginx (conteúdo do arquivo)**

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO_AQUI.com www.SEU_DOMINIO_AQUI.com;

    # Frontend (arquivos estáticos)
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
sudo ln -s /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/

# Remover site padrão
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

---

### **PASSO 9: Configurar SSL com Let's Encrypt**

#### **9.1 Instalar Certbot**

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d SEU_DOMINIO_AQUI.com -d www.SEU_DOMINIO_AQUI.com

# Verificar renovação automática
sudo certbot renew --dry-run
```

---

### **PASSO 10: Configurar Monitoramento e Logs**

#### **10.1 Configurar PM2**

```bash
# Salvar configuração do PM2
pm2 save

# Configurar startup automático
pm2 startup

# Verificar status
pm2 status
pm2 monit
```

#### **10.2 Configurar Logs**

```bash
# Ver logs em tempo real
pm2 logs

# Ver logs específicos
pm2 logs --lines 100

# Limpar logs
pm2 flush
```

---

### **PASSO 11: Testar Aplicação**

#### **11.1 Verificar Serviços**

```bash
# Verificar status dos serviços
sudo systemctl status postgresql
sudo systemctl status redis-server
sudo systemctl status nginx
pm2 status

# Verificar portas
sudo netstat -tlnp | grep -E ':(80|443|3001|6379|5432)'
```

#### **11.2 Testar Endpoints**

```bash
# Testar frontend
curl -I http://localhost

# Testar API
curl -I http://localhost:3001/api/health

# Testar banco de dados
sudo -u postgres psql -d sispat_production -c "SELECT version();"
```

---

## 🚀 **RESUMO DOS COMANDOS PRINCIPAIS**

### **Comandos Essenciais (execute em sequência):**

```bash
# 1. Preparar sistema
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential

# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Instalar ferramentas
npm install -g pnpm@8 pm2

# 4. Instalar PostgreSQL e Redis
sudo apt install -y postgresql postgresql-contrib redis-server

# 5. Instalar Nginx
sudo apt install -y nginx

# 6. Clonar aplicação
cd /var/www
sudo git clone https://github.com/junielsonfarias/sispat.git
sudo chown -R $USER:$USER sispat
cd sispat

# 7. Configurar ambiente
cp env.production.example .env.production
nano .env.production

# 8. Executar scripts
chmod +x scripts/*.sh
./scripts/setup-production.sh
./scripts/deploy-production-simple.sh

# 9. Configurar Nginx
sudo nano /etc/nginx/sites-available/sispat
sudo ln -s /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
sudo systemctl reload nginx

# 10. Configurar SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d SEU_DOMINIO_AQUI.com
```

---

## 🎯 **IMPORTANTE - ANTES DE EXECUTAR:**

1. **Substitua `SEU_DOMINIO_AQUI.com`** pelo seu domínio real
2. **Substitua `SUA_SENHA_FORTE_AQUI`** por senhas seguras
3. **Configure o DNS** para apontar para o IP da sua VPS
4. **Tenha um domínio válido** para o SSL funcionar
5. **Execute os comandos como root** ou com sudo

---

## 🎉 **RESULTADO FINAL:**

Após executar todos os passos, você terá:

- ✅ **Frontend** rodando na porta 80/443 (HTTPS)
- ✅ **Backend API** rodando na porta 3001
- ✅ **PostgreSQL** configurado e funcionando
- ✅ **Redis** configurado para cache
- ✅ **Nginx** como proxy reverso
- ✅ **SSL** configurado automaticamente
- ✅ **PM2** gerenciando a aplicação
- ✅ **Backup automático** configurado
- ✅ **Firewall** configurado

---

## 🚀 **OPÇÃO MAIS RÁPIDA:**

**Para instalação mais rápida, use o script automático:**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps.sh -o install-vps.sh
chmod +x install-vps.sh
./install-vps.sh
```

**🎯 Sua aplicação SISPAT estará rodando em produção com todas as configurações de segurança e
performance!**
