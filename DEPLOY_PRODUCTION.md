# 🚀 SISPAT 2.0 - GUIA DE DEPLOY PARA PRODUÇÃO

## 📋 **ÍNDICE**

1. [Pré-requisitos](#pré-requisitos)
2. [Preparação do Servidor](#preparação-do-servidor)
3. [Configuração do Ambiente](#configuração-do-ambiente)
4. [Deploy com Docker](#deploy-com-docker)
5. [Deploy Nativo](#deploy-nativo)
6. [Configuração de SSL](#configuração-de-ssl)
7. [Monitoramento](#monitoramento)
8. [Backup](#backup)
9. [Manutenção](#manutenção)
10. [Troubleshooting](#troubleshooting)

---

## 🔧 **PRÉ-REQUISITOS**

### **Servidor Debian 12**
- **RAM**: 4GB mínimo, 8GB recomendado
- **CPU**: 2 cores mínimo, 4 cores recomendado
- **Disco**: 50GB SSD recomendado
- **Rede**: 100Mbps mínimo

### **Software Necessário**
- Node.js 18+
- PostgreSQL 15
- Nginx
- Docker & Docker Compose (opcional)
- Certbot (Let's Encrypt)

---

## 🖥️ **PREPARAÇÃO DO SERVIDOR**

### **1. Setup Automático**
```bash
# Executar como root
sudo bash scripts/setup-server.sh
```

### **2. Setup Manual**
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
sudo apt install -y curl wget git build-essential

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PNPM
sudo npm install -g pnpm

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar Nginx
sudo apt install -y nginx

# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx
```

---

## ⚙️ **CONFIGURAÇÃO DO AMBIENTE**

### **1. Configurar PostgreSQL**
```bash
# Criar usuário e banco
sudo -u postgres psql
CREATE USER sispat_user WITH PASSWORD 'SUA_SENHA_FORTE';
CREATE DATABASE sispat_prod OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_prod TO sispat_user;
\q
```

### **2. Configurar Variáveis de Ambiente**

#### **Frontend (.env)**
```bash
VITE_API_URL=https://api.sispat.seudominio.com
VITE_USE_BACKEND=true
VITE_APP_NAME=SISPAT 2.0
VITE_APP_VERSION=2.0.0
VITE_APP_ENV=production
```

#### **Backend (backend/.env)**
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://sispat_user:SUA_SENHA@localhost:5432/sispat_prod"
JWT_SECRET="SUA_CHAVE_JWT_256_BITS"
JWT_EXPIRES_IN="24h"
FRONTEND_URL="https://sispat.seudominio.com"
CORS_ORIGIN="https://sispat.seudominio.com"
```

### **3. Configurar DNS**
```bash
# Apontar domínio para o servidor
sispat.seudominio.com     A     IP_DO_SERVIDOR
api.sispat.seudominio.com A     IP_DO_SERVIDOR
```

---

## 🐳 **DEPLOY COM DOCKER**

### **1. Deploy Automático**
```bash
# Deploy completo
./scripts/deploy.sh

# Deploy com rollback automático em caso de erro
./scripts/deploy.sh deploy
```

### **2. Deploy Manual**
```bash
# Build da aplicação
pnpm run build:prod
cd backend && npm run build:prod && cd ..

# Build da imagem Docker
docker-compose -f docker-compose.prod.yml build

# Iniciar serviços
docker-compose -f docker-compose.prod.yml up -d

# Verificar status
docker-compose -f docker-compose.prod.yml ps
```

### **3. Configurar Docker Compose**
```bash
# Copiar arquivo de exemplo
cp docker-compose.prod.yml docker-compose.yml

# Editar variáveis de ambiente
nano docker-compose.yml
```

---

## 🖥️ **DEPLOY NATIVO**

### **1. Deploy Automático**
```bash
# Deploy nativo
./scripts/deploy.sh deploy-native
```

### **2. Deploy Manual**
```bash
# Build da aplicação
pnpm run build:prod
cd backend && npm run build:prod && cd ..

# Executar migrações
cd backend && npm run prisma:migrate:prod && cd ..

# Iniciar aplicação
cd backend && npm run start:prod
```

### **3. Configurar Systemd**
```bash
# Copiar arquivo de serviço
sudo cp scripts/sispat-backend.service /etc/systemd/system/

# Ativar serviço
sudo systemctl enable sispat-backend
sudo systemctl start sispat-backend

# Verificar status
sudo systemctl status sispat-backend
```

---

## 🔒 **CONFIGURAÇÃO DE SSL**

### **1. Obter Certificado Let's Encrypt**
```bash
# Obter certificado
sudo certbot --nginx -d sispat.seudominio.com -d api.sispat.seudominio.com

# Configurar renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **2. Configurar Nginx**
```bash
# Copiar configuração
sudo cp nginx/conf.d/sispat.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/sispat.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 📊 **MONITORAMENTO**

### **1. Monitoramento Automático**
```bash
# Executar monitoramento
./scripts/monitor.sh

# Gerar relatório
./scripts/monitor.sh --report

# Limpeza de logs
./scripts/monitor.sh --cleanup
```

### **2. Configurar Cron para Monitoramento**
```bash
# Adicionar ao crontab
sudo crontab -e

# Monitoramento a cada 5 minutos
*/5 * * * * /caminho/para/sispat/scripts/monitor.sh

# Relatório diário às 6h
0 6 * * * /caminho/para/sispat/scripts/monitor.sh --report
```

### **3. Endpoints de Monitoramento**
```bash
# Health check
curl http://localhost:3000/health

# Métricas detalhadas
curl http://localhost:3000/api/metrics
```

---

## 💾 **BACKUP**

### **1. Backup Automático**
```bash
# Backup completo
./scripts/backup.sh

# Backup com relatório
./scripts/backup.sh backup

# Limpeza de backups antigos
./scripts/backup.sh cleanup
```

### **2. Configurar Cron para Backup**
```bash
# Backup diário às 2h
0 2 * * * /caminho/para/sispat/scripts/backup.sh

# Limpeza semanal
0 3 * * 0 /caminho/para/sispat/scripts/backup.sh cleanup
```

### **3. Restaurar Backup**
```bash
# Restaurar banco de dados
./scripts/backup.sh restore db 20240101_120000

# Restaurar uploads
./scripts/backup.sh restore uploads 20240101_120000
```

---

## 🔧 **MANUTENÇÃO**

### **1. Atualizações**
```bash
# Atualizar aplicação
git pull origin main
./scripts/deploy.sh

# Atualizar dependências
pnpm update
cd backend && npm update && cd ..
```

### **2. Logs**
```bash
# Ver logs da aplicação
sudo journalctl -u sispat-backend -f

# Ver logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ver logs do sistema
sudo tail -f /var/log/syslog
```

### **3. Performance**
```bash
# Verificar uso de recursos
htop
df -h
free -h

# Verificar conexões
netstat -tulpn | grep :3000
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

---

## 🚨 **TROUBLESHOOTING**

### **1. Aplicação não inicia**
```bash
# Verificar logs
sudo journalctl -u sispat-backend -n 50

# Verificar configuração
sudo systemctl status sispat-backend

# Reiniciar serviço
sudo systemctl restart sispat-backend
```

### **2. Banco de dados não conecta**
```bash
# Verificar status do PostgreSQL
sudo systemctl status postgresql

# Verificar conexão
pg_isready -h localhost -p 5432 -U sispat_user

# Verificar logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### **3. Nginx não funciona**
```bash
# Verificar configuração
sudo nginx -t

# Verificar status
sudo systemctl status nginx

# Verificar logs
sudo tail -f /var/log/nginx/error.log
```

### **4. SSL não funciona**
```bash
# Verificar certificado
sudo certbot certificates

# Renovar certificado
sudo certbot renew --dry-run

# Verificar configuração SSL
openssl s_client -connect sispat.seudominio.com:443
```

### **5. Performance baixa**
```bash
# Verificar uso de CPU
top
htop

# Verificar uso de memória
free -h
cat /proc/meminfo

# Verificar I/O
iostat -x 1

# Verificar conexões de rede
ss -tulpn
```

---

## 📞 **SUPORTE**

### **Logs Importantes**
- `/var/log/sispat/app.log` - Logs da aplicação
- `/var/log/nginx/access.log` - Logs de acesso do Nginx
- `/var/log/nginx/error.log` - Logs de erro do Nginx
- `/var/log/postgresql/postgresql-15-main.log` - Logs do PostgreSQL

### **Comandos Úteis**
```bash
# Status geral
sudo systemctl status nginx postgresql sispat-backend

# Reiniciar todos os serviços
sudo systemctl restart nginx postgresql sispat-backend

# Verificar espaço em disco
df -h

# Verificar uso de memória
free -h

# Verificar processos
ps aux | grep node
ps aux | grep nginx
ps aux | grep postgres
```

### **Contatos**
- **Documentação**: [README.md](README.md)
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/sispat/issues)
- **Suporte**: admin@sispat.seudominio.com

---

## ✅ **CHECKLIST DE DEPLOY**

- [ ] Servidor Debian 12 configurado
- [ ] Dependências instaladas
- [ ] PostgreSQL configurado
- [ ] Variáveis de ambiente configuradas
- [ ] DNS configurado
- [ ] Aplicação buildada
- [ ] Migrações executadas
- [ ] Nginx configurado
- [ ] SSL configurado
- [ ] Monitoramento ativo
- [ ] Backup configurado
- [ ] Testes realizados
- [ ] Documentação atualizada

---

**🎉 Parabéns! O SISPAT 2.0 está pronto para produção!**
