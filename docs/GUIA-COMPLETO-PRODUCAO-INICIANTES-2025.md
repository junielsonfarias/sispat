# 🚀 GUIA COMPLETO PARA PRODUÇÃO - SISPAT 2025

## **Para Iniciantes - Passo a Passo Detalhado**

---

## 📋 **ÍNDICE**

1. [**Pré-requisitos e Preparação**](#1-pré-requisitos-e-preparação)
2. [**Configuração do Servidor**](#2-configuração-do-servidor)
3. [**Configuração do Banco de Dados**](#3-configuração-do-banco-de-dados)
4. [**Configuração da Aplicação**](#4-configuração-da-aplicação)
5. [**Configuração do Nginx (Proxy Reverso)**](#5-configuração-do-nginx-proxy-reverso)
6. [**Configuração do SSL (Certificado HTTPS)**](#6-configuração-do-ssl-certificado-https)
7. [**Configuração do PM2 (Gerenciador de Processos)**](#7-configuração-do-pm2-gerenciador-de-processos)
8. [**Configuração do Sistema de Backup**](#8-configuração-do-sistema-de-backup)
9. [**Configuração do Monitoramento**](#9-configuração-do-monitoramento)
10. [**Deploy da Aplicação**](#10-deploy-da-aplicação)
11. [**Testes em Produção**](#11-testes-em-produção)
12. [**Manutenção e Suporte**](#12-manutenção-e-suporte)

---

## 1. **PRÉ-REQUISITOS E PREPARAÇÃO**

### 🖥️ **1.1 Servidor VPS/Cloud**

**Opções Recomendadas:**

- **DigitalOcean**: $5-10/mês (1GB RAM, 1 CPU)
- **Linode**: $5-10/mês (1GB RAM, 1 CPU)
- **Vultr**: $5-10/mês (1GB RAM, 1 CPU)
- **AWS EC2**: t2.micro (gratuito por 12 meses)

**Especificações Mínimas:**

- **RAM**: 1GB (recomendado: 2GB)
- **CPU**: 1 core (recomendado: 2 cores)
- **Disco**: 25GB SSD
- **Sistema**: Ubuntu 20.04 LTS ou 22.04 LTS

### 🔑 **1.2 Acesso ao Servidor**

**1.2.1 Conectar via SSH:**

```bash
# No seu computador local (Windows/Mac/Linux)
ssh root@SEU_IP_DO_SERVIDOR
# ou
ssh usuario@SEU_IP_DO_SERVIDOR
```

**1.2.2 Atualizar o Sistema:**

```bash
# Atualizar lista de pacotes
sudo apt update

# Atualizar sistema
sudo apt upgrade -y

# Instalar ferramentas básicas
sudo apt install -y curl wget git vim htop
```

### 📁 **1.3 Preparar Estrutura de Diretórios**

```bash
# Criar diretório principal
sudo mkdir -p /opt/sispat
sudo chown $USER:$USER /opt/sispat

# Criar subdiretórios
mkdir -p /opt/sispat/{app,logs,backups,scripts,config}
```

---

## 2. **CONFIGURAÇÃO DO SERVIDOR**

### 🐧 **2.1 Instalar Node.js**

**2.1.1 Instalar Node.js 18.x:**

```bash
# Baixar e instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version  # Deve mostrar v18.x.x
npm --version   # Deve mostrar 9.x.x
```

**2.1.2 Instalar PM2 Globalmente:**

```bash
sudo npm install -g pm2
```

### 🐘 **2.2 Instalar PostgreSQL**

**2.2.1 Instalar PostgreSQL:**

```bash
# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Iniciar e habilitar serviço
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verificar status
sudo systemctl status postgresql
```

**2.2.2 Configurar PostgreSQL:**

```bash
# Acessar como usuário postgres
sudo -u postgres psql

# Dentro do PostgreSQL, executar:
CREATE USER sispat_user WITH PASSWORD 'sua_senha_forte_aqui';
CREATE DATABASE sispat_production OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
\q
```

### 🔧 **2.3 Instalar Nginx**

```bash
# Instalar Nginx
sudo apt install -y nginx

# Iniciar e habilitar
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar status
sudo systemctl status nginx
```

### 🔒 **2.4 Configurar Firewall**

```bash
# Instalar UFW (se não estiver instalado)
sudo apt install -y ufw

# Configurar regras básicas
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir portas essenciais
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Ativar firewall
sudo ufw enable

# Verificar status
sudo ufw status
```

---

## 3. **CONFIGURAÇÃO DO BANCO DE DADOS**

### 📊 **3.1 Otimizar PostgreSQL**

**3.1.1 Executar Script de Otimização:**

```bash
# Navegar para o diretório do projeto
cd /opt/sispat/app

# Executar script de otimização
node scripts/setup-database-optimization.cjs
```

**3.1.2 Configurar PostgreSQL para Produção:**

```bash
# Editar arquivo de configuração
sudo nano /etc/postgresql/14/main/postgresql.conf

# Adicionar/modificar as seguintes linhas:
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

# Salvar e sair (Ctrl+X, Y, Enter)
```

**3.1.3 Reiniciar PostgreSQL:**

```bash
sudo systemctl restart postgresql
```

### 🔐 **3.2 Configurar Backup Automático**

```bash
# Executar script de backup
bash scripts/setup-backup-automation.sh

# Verificar se foi criado
ls -la /opt/sispat/backups/
```

---

## 4. **CONFIGURAÇÃO DA APLICAÇÃO**

### 📥 **4.1 Baixar o Código**

```bash
# Navegar para diretório da aplicação
cd /opt/sispat

# Clonar o repositório
git clone https://github.com/junielsonfarias/sispat.git app

# Navegar para o diretório da aplicação
cd app
```

### ⚙️ **4.2 Configurar Variáveis de Ambiente**

**4.2.1 Criar arquivo de ambiente:**

```bash
# Copiar arquivo de exemplo
cp env.production.example .env

# Editar arquivo de ambiente
nano .env
```

**4.2.2 Configurar variáveis essenciais:**

```bash
# Configurações do Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_production
DB_USER=sispat_user
DB_PASSWORD=sua_senha_forte_aqui

# Configurações da Aplicação
NODE_ENV=production
PORT=3001
JWT_SECRET=sua_chave_jwt_muito_segura_aqui

# Configurações de Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_do_email

# Configurações de Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
```

### 📦 **4.3 Instalar Dependências**

```bash
# Instalar dependências do backend
npm install

# Instalar dependências do frontend
cd client
npm install
cd ..
```

### 🗄️ **4.4 Executar Migrações do Banco**

```bash
# Executar migrações
node server/database/migrate.js

# Verificar se as tabelas foram criadas
psql -h localhost -U sispat_user -d sispat_production -c "\dt"
```

---

## 5. **CONFIGURAÇÃO DO NGINX (PROXY REVERSO)**

### 🌐 **5.1 Configurar Nginx**

**5.1.1 Criar configuração do site:**

```bash
# Criar arquivo de configuração
sudo nano /etc/nginx/sites-available/sispat
```

**5.1.2 Adicionar configuração:**

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO.com www.SEU_DOMINIO.com;

    # Redirecionar HTTP para HTTPS (será configurado depois)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name SEU_DOMINIO.com www.SEU_DOMINIO.com;

    # Configurações SSL (serão adicionadas pelo Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/SEU_DOMINIO.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/SEU_DOMINIO.com/privkey.pem;

    # Configurações de segurança
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Headers de segurança
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy para o backend
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

    # Proxy para WebSocket
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

    # Servir arquivos estáticos do frontend
    location / {
        root /opt/sispat/app/dist;
        try_files $uri $uri/ /index.html;

        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Logs
    access_log /var/log/nginx/sispat_access.log;
    error_log /var/log/nginx/sispat_error.log;
}
```

**5.1.3 Ativar o site:**

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

## 6. **CONFIGURAÇÃO DO SSL (CERTIFICADO HTTPS)**

### 🔒 **6.1 Instalar Certbot**

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 📜 **6.2 Obter Certificado SSL**

**6.2.1 Obter certificado:**

```bash
# Substitua SEU_DOMINIO.com pelo seu domínio real
sudo certbot --nginx -d SEU_DOMINIO.com -d www.SEU_DOMINIO.com

# Seguir as instruções:
# 1. Inserir email para notificações
# 2. Aceitar termos de uso
# 3. Escolher se quer compartilhar email (recomendado: N)
# 4. Certbot configurará automaticamente o Nginx
```

**6.2.2 Verificar renovação automática:**

```bash
# Testar renovação
sudo certbot renew --dry-run

# Verificar se o cron job foi criado
sudo crontab -l
```

---

## 7. **CONFIGURAÇÃO DO PM2 (GERENCIADOR DE PROCESSOS)**

### ⚙️ **7.1 Configurar PM2**

**7.1.1 Usar arquivo de configuração:**

```bash
# O arquivo ecosystem.production.config.cjs já está configurado
# Verificar se está correto
cat ecosystem.production.config.cjs
```

**7.1.2 Iniciar aplicação com PM2:**

```bash
# Iniciar aplicação
pm2 start ecosystem.production.config.cjs

# Verificar status
pm2 status

# Ver logs
pm2 logs sispat
```

**7.1.3 Configurar PM2 para iniciar com o sistema:**

```bash
# Gerar script de inicialização
pm2 startup

# Salvar configuração atual
pm2 save
```

---

## 8. **CONFIGURAÇÃO DO SISTEMA DE BACKUP**

### 💾 **8.1 Configurar Backup Local**

```bash
# Executar script de configuração
bash scripts/setup-backup-system.sh

# Verificar se foi configurado
ls -la /opt/sispat/backups/
```

### ☁️ **8.2 Configurar Backup na Nuvem (Opcional)**

**8.2.1 Para AWS S3:**

```bash
# Instalar AWS CLI
sudo apt install -y awscli

# Configurar credenciais
aws configure
# Inserir: Access Key ID, Secret Access Key, região (ex: us-east-1)

# Executar script de backup na nuvem
bash scripts/setup-cloud-backup.sh
```

**8.2.2 Para Google Cloud:**

```bash
# Instalar Google Cloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Configurar autenticação
gcloud auth login
gcloud config set project SEU_PROJECT_ID

# Executar script de backup
bash scripts/setup-cloud-backup.sh
```

---

## 9. **CONFIGURAÇÃO DO MONITORAMENTO**

### 📊 **9.1 Instalar Prometheus e Grafana**

```bash
# Executar script de monitoramento
bash scripts/setup-production-monitoring.sh

# Verificar se os serviços estão rodando
sudo systemctl status prometheus
sudo systemctl status grafana-server
```

### 📈 **9.2 Configurar Dashboards**

```bash
# Executar script de configuração dos dashboards
bash scripts/setup-grafana-dashboards.sh

# Acessar Grafana
# URL: http://SEU_IP:3000
# Usuário: admin
# Senha: admin (será solicitada para alterar)
```

### 🚨 **9.3 Configurar Alertas**

```bash
# Executar script de alertas
bash scripts/setup-monitoring-alerts.sh

# Verificar configuração
pm2 status
```

---

## 10. **DEPLOY DA APLICAÇÃO**

### 🚀 **10.1 Build do Frontend**

```bash
# Navegar para diretório do frontend
cd /opt/sispat/app

# Fazer build de produção
npm run build

# Verificar se foi criado o diretório dist
ls -la dist/
```

### 🔄 **10.2 Deploy Automatizado**

```bash
# Executar script de deploy completo
bash scripts/setup-production-complete.sh

# Verificar se tudo está funcionando
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
```

### 🌐 **10.3 Verificar Aplicação**

```bash
# Testar se a aplicação está respondendo
curl -I http://localhost:3001/api/health

# Testar se o Nginx está funcionando
curl -I https://SEU_DOMINIO.com
```

---

## 11. **TESTES EM PRODUÇÃO**

### ✅ **11.1 Testes Funcionais**

```bash
# Executar testes funcionais
bash scripts/run-production-tests.sh

# Verificar relatório
cat reports/production-tests-report.json
```

### ⚡ **11.2 Testes de Performance**

```bash
# Executar testes de carga
bash scripts/run-production-load-tests.sh

# Verificar relatório
cat reports/load-tests-report.json
```

### 🔒 **11.3 Testes de Segurança**

```bash
# Executar testes de segurança
bash scripts/run-production-security-tests.sh

# Verificar relatório
cat reports/security-tests-report.json
```

---

## 12. **MANUTENÇÃO E SUPORTE**

### 📋 **12.1 Comandos Úteis para Manutenção**

```bash
# Ver status dos serviços
pm2 status
sudo systemctl status nginx postgresql

# Ver logs
pm2 logs sispat
sudo tail -f /var/log/nginx/sispat_error.log

# Reiniciar serviços
pm2 restart sispat
sudo systemctl restart nginx

# Verificar espaço em disco
df -h

# Verificar uso de memória
free -h

# Verificar processos
htop
```

### 🔄 **12.2 Atualizações**

```bash
# Atualizar aplicação
cd /opt/sispat/app
git pull origin main
npm install
npm run build
pm2 restart sispat

# Atualizar sistema
sudo apt update && sudo apt upgrade -y
```

### 🆘 **12.3 Solução de Problemas**

**Problema: Aplicação não inicia**

```bash
# Verificar logs
pm2 logs sispat

# Verificar se a porta está em uso
sudo netstat -tlnp | grep :3001

# Verificar variáveis de ambiente
cat .env
```

**Problema: Banco de dados não conecta**

```bash
# Verificar status do PostgreSQL
sudo systemctl status postgresql

# Testar conexão
psql -h localhost -U sispat_user -d sispat_production

# Verificar logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

**Problema: Nginx não funciona**

```bash
# Verificar configuração
sudo nginx -t

# Verificar logs
sudo tail -f /var/log/nginx/error.log

# Verificar se está rodando
sudo systemctl status nginx
```

### 📞 **12.4 Suporte**

**Scripts de Suporte Disponíveis:**

```bash
# Monitoramento contínuo
bash scripts/post-deploy-monitoring.sh

# Sistema de suporte
bash scripts/post-deploy-support.sh

# Relatórios de status
bash scripts/generate-phase-5-4-report.sh
```

---

## 🎯 **CHECKLIST FINAL**

### ✅ **Antes de Colocar em Produção:**

- [ ] Servidor configurado e atualizado
- [ ] Node.js e PM2 instalados
- [ ] PostgreSQL instalado e configurado
- [ ] Nginx instalado e configurado
- [ ] Firewall configurado
- [ ] Domínio apontando para o servidor
- [ ] Certificado SSL instalado
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados criado e migrado
- [ ] Aplicação buildada
- [ ] PM2 configurado
- [ ] Backup configurado
- [ ] Monitoramento configurado
- [ ] Testes executados com sucesso

### ✅ **Após Colocar em Produção:**

- [ ] Aplicação acessível via HTTPS
- [ ] Todos os serviços rodando
- [ ] Logs sendo gerados corretamente
- [ ] Backup funcionando
- [ ] Monitoramento ativo
- [ ] Alertas configurados
- [ ] Documentação atualizada
- [ ] Equipe treinada

---

## 📚 **RECURSOS ADICIONAIS**

### 📖 **Documentação:**

- `docs/MANUAL-ADMINISTRADOR-2025.md` - Manual completo do administrador
- `docs/MANUAL-USUARIO-2025.md` - Manual do usuário final
- `docs/GUIA-APIS-2025.md` - Documentação das APIs
- `docs/GUIA-INSTALACAO-2025.md` - Guia de instalação detalhado

### 🛠️ **Scripts Úteis:**

- `scripts/cleanup-ports.sh` - Limpar portas em uso
- `scripts/monitor-production.sh` - Monitoramento em tempo real
- `scripts/execute-go-live.sh` - Executar go-live
- `scripts/communication-system.sh` - Sistema de notificações

### 🔧 **Configurações:**

- `ecosystem.production.config.cjs` - Configuração do PM2
- `env.production` - Variáveis de ambiente
- `docker-compose.production.yml` - Configuração Docker (opcional)

---

## 🎉 **PARABÉNS!**

Se você seguiu todos os passos, seu SISPAT está agora rodando em produção com:

- ✅ **Segurança**: HTTPS, Firewall, Headers de Segurança
- ✅ **Performance**: Nginx, PM2, PostgreSQL Otimizado
- ✅ **Confiabilidade**: Backup Automático, Monitoramento 24/7
- ✅ **Escalabilidade**: PM2 Cluster, Load Balancing
- ✅ **Manutenibilidade**: Logs Centralizados, Alertas Automáticos

**Seu sistema está pronto para receber usuários reais!** 🚀

---

_Este guia foi criado especificamente para iniciantes. Se tiver dúvidas, consulte a documentação
adicional ou entre em contato com o suporte técnico._
