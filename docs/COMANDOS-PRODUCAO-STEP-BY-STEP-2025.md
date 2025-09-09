# 🛠️ COMANDOS STEP-BY-STEP PARA PRODUÇÃO

## **SISPAT 2025 - Guia de Comandos Detalhado**

---

## 📋 **ÍNDICE DE COMANDOS**

1. [**Preparação Inicial**](#1-preparação-inicial)
2. [**Instalação de Dependências**](#2-instalação-de-dependências)
3. [**Configuração do Banco**](#3-configuração-do-banco)
4. [**Configuração da Aplicação**](#4-configuração-da-aplicação)
5. [**Configuração do Nginx**](#5-configuração-do-nginx)
6. [**Configuração do SSL**](#6-configuração-do-ssl)
7. [**Configuração do PM2**](#7-configuração-do-pm2)
8. [**Deploy e Testes**](#8-deploy-e-testes)
9. [**Monitoramento**](#9-monitoramento)
10. [**Manutenção**](#10-manutenção)

---

## 1. **PREPARAÇÃO INICIAL**

### 🔧 **1.1 Conectar ao Servidor**

```bash
# Conectar via SSH (substitua pelo seu IP)
ssh root@SEU_IP_DO_SERVIDOR

# Ou se usar usuário específico
ssh usuario@SEU_IP_DO_SERVIDOR
```

### 📦 **1.2 Atualizar Sistema**

```bash
# Atualizar lista de pacotes
sudo apt update

# Atualizar sistema
sudo apt upgrade -y

# Instalar ferramentas básicas
sudo apt install -y curl wget git vim htop unzip
```

### 📁 **1.3 Criar Estrutura de Diretórios**

```bash
# Criar diretório principal
sudo mkdir -p /opt/sispat
sudo chown $USER:$USER /opt/sispat

# Criar subdiretórios
mkdir -p /opt/sispat/{app,logs,backups,scripts,config}

# Verificar estrutura
tree /opt/sispat
```

---

## 2. **INSTALAÇÃO DE DEPENDÊNCIAS**

### 🟢 **2.1 Instalar Node.js**

```bash
# Baixar e instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version

# Instalar PM2 globalmente
sudo npm install -g pm2

# Verificar PM2
pm2 --version
```

### 🐘 **2.2 Instalar PostgreSQL**

```bash
# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Iniciar e habilitar serviço
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verificar status
sudo systemctl status postgresql

# Verificar versão
sudo -u postgres psql -c "SELECT version();"
```

### 🌐 **2.3 Instalar Nginx**

```bash
# Instalar Nginx
sudo apt install -y nginx

# Iniciar e habilitar
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar status
sudo systemctl status nginx

# Verificar se está rodando
curl -I http://localhost
```

### 🔒 **2.4 Configurar Firewall**

```bash
# Instalar UFW
sudo apt install -y ufw

# Configurar regras
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir portas essenciais
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Ativar firewall
sudo ufw enable

# Verificar status
sudo ufw status verbose
```

---

## 3. **CONFIGURAÇÃO DO BANCO**

### 👤 **3.1 Criar Usuário e Banco**

```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Dentro do PostgreSQL, executar:
CREATE USER sispat_user WITH PASSWORD 'MinhaSenh@Forte123!';
CREATE DATABASE sispat_production OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
\q

# Testar conexão
psql -h localhost -U sispat_user -d sispat_production -c "SELECT current_database();"
```

### ⚙️ **3.2 Otimizar PostgreSQL**

```bash
# Editar configuração
sudo nano /etc/postgresql/14/main/postgresql.conf

# Adicionar/modificar estas linhas:
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB

# Salvar (Ctrl+X, Y, Enter)

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Verificar se reiniciou corretamente
sudo systemctl status postgresql
```

---

## 4. **CONFIGURAÇÃO DA APLICAÇÃO**

### 📥 **4.1 Baixar Código**

```bash
# Navegar para diretório
cd /opt/sispat

# Clonar repositório
git clone https://github.com/junielsonfarias/sispat.git app

# Navegar para app
cd app

# Verificar arquivos
ls -la
```

### ⚙️ **4.2 Configurar Variáveis de Ambiente**

```bash
# Copiar arquivo de exemplo
cp env.production.example .env

# Editar arquivo
nano .env

# Configurar as seguintes variáveis:
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_production
DB_USER=sispat_user
DB_PASSWORD=MinhaSenh@Forte123!
JWT_SECRET=MinhaChaveJWTMuitoSegura123456789
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_do_email
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *

# Salvar (Ctrl+X, Y, Enter)
```

### 📦 **4.3 Instalar Dependências**

```bash
# Instalar dependências do backend
npm install

# Verificar se instalou corretamente
ls node_modules/

# Instalar dependências do frontend (se existir pasta client)
if [ -d "client" ]; then
    cd client
    npm install
    cd ..
fi
```

### 🗄️ **4.4 Executar Migrações**

```bash
# Executar migrações
node server/database/migrate.js

# Verificar se as tabelas foram criadas
psql -h localhost -U sispat_user -d sispat_production -c "\dt"

# Verificar estrutura de uma tabela
psql -h localhost -U sispat_user -d sispat_production -c "\d users"
```

### 🏗️ **4.5 Build do Frontend**

```bash
# Fazer build de produção
npm run build

# Verificar se foi criado o diretório dist
ls -la dist/

# Verificar tamanho
du -sh dist/
```

---

## 5. **CONFIGURAÇÃO DO NGINX**

### 📝 **5.1 Criar Configuração do Site**

```bash
# Criar arquivo de configuração
sudo nano /etc/nginx/sites-available/sispat

# Adicionar a seguinte configuração (substitua SEU_DOMINIO.com):
server {
    listen 80;
    server_name SEU_DOMINIO.com www.SEU_DOMINIO.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name SEU_DOMINIO.com www.SEU_DOMINIO.com;

    ssl_certificate /etc/letsencrypt/live/SEU_DOMINIO.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/SEU_DOMINIO.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location /api/ {
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

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /opt/sispat/app/dist;
        try_files $uri $uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    access_log /var/log/nginx/sispat_access.log;
    error_log /var/log/nginx/sispat_error.log;
}

# Salvar (Ctrl+X, Y, Enter)
```

### 🔗 **5.2 Ativar Site**

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/

# Remover site padrão
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Se OK, recarregar Nginx
sudo systemctl reload nginx

# Verificar status
sudo systemctl status nginx
```

---

## 6. **CONFIGURAÇÃO DO SSL**

### 🔧 **6.1 Instalar Certbot**

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Verificar instalação
certbot --version
```

### 📜 **6.2 Obter Certificado SSL**

```bash
# Obter certificado (substitua SEU_DOMINIO.com)
sudo certbot --nginx -d SEU_DOMINIO.com -d www.SEU_DOMINIO.com

# Seguir as instruções:
# 1. Email: seu_email@exemplo.com
# 2. Aceitar termos: A
# 3. Compartilhar email: N
# 4. Aguardar configuração automática

# Verificar certificado
sudo certbot certificates

# Testar renovação
sudo certbot renew --dry-run
```

---

## 7. **CONFIGURAÇÃO DO PM2**

### ⚙️ **7.1 Configurar PM2**

```bash
# Navegar para diretório da aplicação
cd /opt/sispat/app

# Verificar arquivo de configuração
cat ecosystem.production.config.cjs

# Iniciar aplicação
pm2 start ecosystem.production.config.cjs

# Verificar status
pm2 status

# Ver logs
pm2 logs sispat

# Ver informações detalhadas
pm2 show sispat
```

### 🔄 **7.2 Configurar Inicialização Automática**

```bash
# Gerar script de inicialização
pm2 startup

# Copiar e executar o comando que aparecer (será algo como):
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# Salvar configuração atual
pm2 save

# Verificar se foi salvo
pm2 list
```

---

## 8. **DEPLOY E TESTES**

### 🚀 **8.1 Deploy Completo**

```bash
# Executar script de deploy
bash scripts/setup-production-complete.sh

# Verificar se todos os serviços estão rodando
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql

# Verificar logs
pm2 logs sispat --lines 50
```

### ✅ **8.2 Testes Básicos**

```bash
# Testar API
curl -I http://localhost:3001/api/health

# Testar Nginx
curl -I https://SEU_DOMINIO.com

# Testar aplicação completa
curl -I https://SEU_DOMINIO.com/api/health

# Verificar se está servindo arquivos estáticos
curl -I https://SEU_DOMINIO.com/
```

### 🧪 **8.3 Testes Automatizados**

```bash
# Executar testes funcionais
bash scripts/run-production-tests.sh

# Verificar relatório
cat reports/production-tests-report.json

# Executar testes de performance
bash scripts/run-production-load-tests.sh

# Verificar relatório
cat reports/load-tests-report.json
```

---

## 9. **MONITORAMENTO**

### 📊 **9.1 Instalar Monitoramento**

```bash
# Instalar Prometheus e Grafana
bash scripts/setup-production-monitoring.sh

# Verificar serviços
sudo systemctl status prometheus
sudo systemctl status grafana-server

# Verificar portas
sudo netstat -tlnp | grep -E "(3000|9090)"
```

### 📈 **9.2 Configurar Dashboards**

```bash
# Configurar dashboards
bash scripts/setup-grafana-dashboards.sh

# Acessar Grafana
# URL: http://SEU_IP:3000
# Usuário: admin
# Senha: admin

# Verificar se está funcionando
curl -I http://localhost:3000
```

### 🚨 **9.3 Configurar Alertas**

```bash
# Configurar sistema de alertas
bash scripts/setup-monitoring-alerts.sh

# Verificar configuração
pm2 status
ls -la /opt/sispat/logs/
```

---

## 10. **MANUTENÇÃO**

### 📋 **10.1 Comandos de Verificação**

```bash
# Ver status geral
pm2 status
sudo systemctl status nginx postgresql
df -h
free -h

# Ver logs
pm2 logs sispat --lines 100
sudo tail -f /var/log/nginx/sispat_error.log
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Ver processos
htop
ps aux | grep -E "(node|nginx|postgres)"
```

### 🔄 **10.2 Comandos de Reinicialização**

```bash
# Reiniciar aplicação
pm2 restart sispat

# Reiniciar Nginx
sudo systemctl restart nginx

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Reiniciar todos os serviços
pm2 restart all
sudo systemctl restart nginx postgresql
```

### 📦 **10.3 Comandos de Atualização**

```bash
# Atualizar aplicação
cd /opt/sispat/app
git pull origin main
npm install
npm run build
pm2 restart sispat

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Limpar cache
npm cache clean --force
sudo apt autoremove -y
sudo apt autoclean
```

### 🗑️ **10.4 Comandos de Limpeza**

```bash
# Limpar logs antigos
pm2 flush
sudo journalctl --vacuum-time=7d

# Limpar backups antigos
find /opt/sispat/backups -name "*.tar.gz" -mtime +30 -delete

# Limpar cache do sistema
sudo apt autoremove -y
sudo apt autoclean
```

### 🆘 **10.5 Comandos de Troubleshooting**

```bash
# Verificar portas em uso
sudo netstat -tlnp | grep -E "(3001|80|443|5432)"

# Verificar espaço em disco
df -h
du -sh /opt/sispat/*

# Verificar uso de memória
free -h
ps aux --sort=-%mem | head -10

# Verificar conectividade
ping google.com
curl -I https://SEU_DOMINIO.com

# Verificar certificado SSL
openssl s_client -connect SEU_DOMINIO.com:443 -servername SEU_DOMINIO.com
```

---

## 🎯 **COMANDOS DE EMERGÊNCIA**

### 🚨 **11.1 Parar Tudo**

```bash
# Parar aplicação
pm2 stop all

# Parar serviços
sudo systemctl stop nginx postgresql

# Verificar se parou
pm2 status
sudo systemctl status nginx postgresql
```

### 🔄 **11.2 Reiniciar Tudo**

```bash
# Reiniciar aplicação
pm2 restart all

# Reiniciar serviços
sudo systemctl restart nginx postgresql

# Verificar se reiniciou
pm2 status
sudo systemctl status nginx postgresql
```

### 📋 **11.3 Verificar Saúde do Sistema**

```bash
# Script de verificação rápida
echo "=== STATUS DOS SERVIÇOS ==="
pm2 status
echo ""
echo "=== STATUS DO NGINX ==="
sudo systemctl status nginx --no-pager
echo ""
echo "=== STATUS DO POSTGRESQL ==="
sudo systemctl status postgresql --no-pager
echo ""
echo "=== USO DE RECURSOS ==="
free -h
df -h
echo ""
echo "=== PORTAS EM USO ==="
sudo netstat -tlnp | grep -E "(3001|80|443|5432)"
```

---

## 📚 **COMANDOS ÚTEIS ADICIONAIS**

### 🔍 **12.1 Investigação de Problemas**

```bash
# Ver logs em tempo real
pm2 logs sispat --follow
sudo tail -f /var/log/nginx/sispat_error.log

# Verificar configurações
cat /opt/sispat/app/.env
cat /etc/nginx/sites-available/sispat

# Testar conectividade
curl -v https://SEU_DOMINIO.com/api/health
```

### 📊 **12.2 Monitoramento Avançado**

```bash
# Ver métricas do PM2
pm2 monit

# Ver estatísticas do sistema
iostat -x 1
vmstat 1

# Ver conexões de rede
ss -tuln
```

### 🛠️ **12.3 Manutenção do Banco**

```bash
# Backup manual
pg_dump -h localhost -U sispat_user -d sispat_production > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
psql -h localhost -U sispat_user -d sispat_production < backup_arquivo.sql

# Verificar tamanho do banco
psql -h localhost -U sispat_user -d sispat_production -c "SELECT pg_size_pretty(pg_database_size('sispat_production'));"
```

---

## ✅ **CHECKLIST DE COMANDOS EXECUTADOS**

### 📋 **Marque cada comando executado:**

**Preparação:**

- [ ] `ssh root@SEU_IP`
- [ ] `sudo apt update && sudo apt upgrade -y`
- [ ] `sudo apt install -y curl wget git vim htop unzip`
- [ ] `sudo mkdir -p /opt/sispat && sudo chown $USER:$USER /opt/sispat`

**Instalação:**

- [ ] `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -`
- [ ] `sudo apt-get install -y nodejs`
- [ ] `sudo npm install -g pm2`
- [ ] `sudo apt install -y postgresql postgresql-contrib`
- [ ] `sudo apt install -y nginx`
- [ ] `sudo apt install -y ufw`

**Configuração:**

- [ ] `sudo ufw allow ssh && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable`
- [ ] `sudo -u postgres psql` (criar usuário e banco)
- [ ] `git clone https://github.com/junielsonfarias/sispat.git app`
- [ ] `cp env.production.example .env` (configurar variáveis)
- [ ] `npm install`
- [ ] `node server/database/migrate.js`
- [ ] `npm run build`

**Deploy:**

- [ ] `sudo nano /etc/nginx/sites-available/sispat` (configurar Nginx)
- [ ] `sudo ln -s /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/`
- [ ] `sudo nginx -t && sudo systemctl reload nginx`
- [ ] `sudo certbot --nginx -d SEU_DOMINIO.com`
- [ ] `pm2 start ecosystem.production.config.cjs`
- [ ] `pm2 startup && pm2 save`

**Testes:**

- [ ] `curl -I https://SEU_DOMINIO.com`
- [ ] `pm2 status`
- [ ] `sudo systemctl status nginx postgresql`

---

_Este guia contém todos os comandos necessários para colocar o SISPAT em produção. Execute-os na
ordem apresentada e marque cada um conforme for executando._
