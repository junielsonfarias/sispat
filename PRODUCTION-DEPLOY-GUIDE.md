# 🚀 GUIA COMPLETO DE DEPLOY PARA PRODUÇÃO - SISPAT

## 📋 Visão Geral

Este guia fornece instruções completas para implantar o sistema SISPAT em produção, incluindo
configuração de ambiente, deploy automatizado e monitoramento.

## 🎯 Pré-requisitos

### **Sistema Operacional**

- ✅ Ubuntu 20.04+ ou CentOS 8+
- ✅ 4GB RAM mínimo (8GB recomendado)
- ✅ 50GB espaço em disco
- ✅ Acesso root/sudo

### **Software Necessário**

- ✅ Node.js 18.x ou superior
- ✅ PostgreSQL 13+
- ✅ Redis 6+
- ✅ Git
- ✅ PM2 (gerenciador de processos)

## 🔧 CONFIGURAÇÃO INICIAL

### **1. Preparar Servidor**

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
sudo apt install -y curl wget git build-essential

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar pnpm
npm install -g pnpm

# Instalar PM2
npm install -g pm2
```

### **2. Configurar Banco de Dados**

```bash
# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Acessar PostgreSQL
sudo -u postgres psql

# Criar banco e usuário
CREATE DATABASE sispat_production;
CREATE USER sispat_user WITH PASSWORD 'sua_senha_segura_aqui';
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
\q

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

### **3. Configurar Redis**

```bash
# Instalar Redis
sudo apt install -y redis-server

# Editar configuração
sudo nano /etc/redis/redis.conf

# Adicionar senha
requirepass sua_senha_redis_aqui

# Reiniciar Redis
sudo systemctl restart redis
sudo systemctl enable redis
```

## 🚀 DEPLOY AUTOMATIZADO

### **1. Clonar Repositório**

```bash
# Clonar projeto
git clone https://github.com/seu-usuario/sispat.git
cd sispat

# Verificar branch
git checkout main
```

### **2. Configuração Automática**

```bash
# Tornar scripts executáveis
chmod +x scripts/*.sh

# Executar configuração automática
./scripts/setup-production.sh
```

**O script irá:**

- ✅ Verificar dependências do sistema
- ✅ Configurar variáveis de ambiente
- ✅ Gerar chaves de segurança
- ✅ Configurar PM2
- ✅ Configurar firewall (Linux)
- ✅ Configurar backup automático

### **3. Deploy Automatizado**

```bash
# Executar deploy
./scripts/deploy-production.sh
```

**O script irá:**

- ✅ Criar backup do sistema atual
- ✅ Parar serviços em execução
- ✅ Instalar dependências de produção
- ✅ Gerar build otimizado
- ✅ Iniciar serviços com PM2
- ✅ Verificar funcionamento

## ⚙️ CONFIGURAÇÃO MANUAL (OPCIONAL)

### **1. Variáveis de Ambiente**

```bash
# Copiar arquivo de exemplo
cp env.production.example .env.production

# Editar configurações
nano .env.production
```

**Configurações Importantes:**

```bash
# Aplicação
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Banco de dados
DB_HOST=localhost
DB_PASSWORD=sua_senha_aqui

# Redis
REDIS_PASSWORD=sua_senha_redis_aqui

# Segurança
JWT_SECRET=sua_chave_jwt_aqui
CSRF_SECRET=sua_chave_csrf_aqui

# Domínio
CORS_ORIGIN=https://seudominio.com,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080
ALLOWED_ORIGINS=https://seudominio.com,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080
```

### **2. Configuração PM2**

```bash
# Verificar configuração
pm2 show ecosystem.config.cjs

# Iniciar em produção
pm2 start ecosystem.config.cjs --env production

# Salvar configuração
pm2 save
pm2 startup
```

## 🐳 DEPLOY COM DOCKER

### **1. Usar Docker Compose**

```bash
# Configurar variáveis de ambiente
export DB_PASSWORD=sua_senha_aqui
export REDIS_PASSWORD=sua_senha_redis_aqui
export JWT_SECRET=sua_chave_jwt_aqui

# Iniciar serviços
docker-compose -f docker-compose.production.yml up -d

# Verificar status
docker-compose -f docker-compose.production.yml ps
```

### **2. Build Manual de Imagens**

```bash
# Build da aplicação
docker build -t sispat:latest .

# Build do frontend
docker build -f Dockerfile.frontend -t sispat-frontend:latest .

# Executar containers
docker run -d --name sispat-backend -p 3001:3001 sispat:latest
docker run -d --name sispat-frontend -p 80:80 sispat-frontend:latest
```

## 🔒 CONFIGURAÇÃO DE SEGURANÇA

### **1. Firewall**

```bash
# Configurar UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3001
sudo ufw allow 8080
```

### **2. SSL/TLS com Let's Encrypt**

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d seu-dominio.com

# Renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **3. Nginx (Proxy Reverso)**

```bash
# Instalar Nginx
sudo apt install nginx

# Copiar configuração
sudo cp nginx.proxy.conf /etc/nginx/nginx.conf

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 📊 MONITORAMENTO

### **1. PM2 Dashboard**

```bash
# Ver status
pm2 status
pm2 monit

# Ver logs
pm2 logs
pm2 logs --lines 100
```

### **2. Prometheus + Grafana**

```bash
# Iniciar monitoramento
docker-compose -f docker-compose.production.yml up -d prometheus grafana

# Acessar Grafana
# URL: http://seu-servidor:3000
# Usuário: admin
# Senha: configurada no .env
```

### **3. Logs do Sistema**

```bash
# Ver logs da aplicação
tail -f logs/app.log

# Ver logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ver logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## 🔄 MANUTENÇÃO

### **1. Atualizações**

```bash
# Parar aplicação
pm2 stop sispat-backend

# Backup antes da atualização
pg_dump -h localhost -U sispat_user sispat_production > backup_pre_update.sql

# Atualizar código
git pull origin main

# Instalar dependências
pnpm install --prod

# Build
pnpm run build

# Reiniciar aplicação
pm2 restart sispat-backend
```

### **2. Backup Automático**

```bash
# Verificar cron jobs
crontab -l

# Backup manual
./scripts/backup.sh

# Verificar backups
ls -la backups/
```

### **3. Limpeza**

```bash
# Limpar logs antigos
pm2 flush

# Limpar cache do Redis
redis-cli FLUSHALL

# Limpar backups antigos (mais de 30 dias)
find backups -name "*.sql" -mtime +30 -delete
```

## 🚨 TROUBLESHOOTING

### **1. Problemas Comuns**

**Aplicação não inicia:**

```bash
pm2 logs sispat-backend --lines 50
pm2 restart sispat-backend
```

**Erro de conexão com banco:**

```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
```

**Erro de memória:**

```bash
free -h
pm2 restart sispat-backend
```

**SSL não funciona:**

```bash
sudo certbot certificates
sudo nginx -t
sudo systemctl restart nginx
```

### **2. Verificações de Saúde**

```bash
# Health check da API
curl http://localhost:3001/api/health

# Health check do frontend
curl http://localhost:8080/health

# Verificar portas
netstat -tlnp | grep -E ':(80|443|3001|8080)'
```

## 📋 CHECKLIST FINAL

### **✅ Configuração do Sistema**

- [ ] Sistema operacional atualizado
- [ ] Node.js 18+ instalado
- [ ] PostgreSQL configurado
- [ ] Redis configurado
- [ ] PM2 instalado

### **✅ Configuração da Aplicação**

- [ ] Variáveis de ambiente configuradas
- [ ] Build de produção gerado
- [ ] PM2 configurado
- [ ] Serviços iniciados

### **✅ Segurança**

- [ ] Firewall configurado
- [ ] SSL/TLS configurado
- [ ] Nginx configurado
- [ ] Headers de segurança ativos

### **✅ Monitoramento**

- [ ] PM2 funcionando
- [ ] Logs configurados
- [ ] Backup automático ativo
- [ ] Alertas configurados

### **✅ Testes**

- [ ] Health check funcionando
- [ ] APIs respondendo
- [ ] Frontend carregando
- [ ] Banco de dados conectado

## 🎉 CONCLUSÃO

Após seguir este guia, o sistema SISPAT estará:

- ✅ **Operacional** em produção
- ✅ **Seguro** com SSL e firewall
- ✅ **Monitorado** com PM2 e logs
- ✅ **Backup** automático configurado
- ✅ **Escalável** com Docker (opcional)

## 📞 SUPORTE

- **Logs**: `./logs/`
- **Configurações**: `.env.production`
- **Backups**: `./backups/`
- **Scripts**: `./scripts/`
- **Documentação**: `docs/`

---

**Status:** ✅ **SISTEMA PRONTO PARA PRODUÇÃO**
