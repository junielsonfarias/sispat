# 🚀 Guia de Deploy em Produção - SISPAT

## 📋 Pré-requisitos

### **Servidor**

- Ubuntu 20.04+ ou CentOS 8+
- 4GB RAM mínimo (8GB recomendado)
- 50GB espaço em disco
- Node.js 18.x ou superior
- PostgreSQL 13+
- Redis 6+
- Nginx (opcional, para proxy reverso)

### **Domínio e SSL**

- Domínio configurado
- Certificado SSL (Let's Encrypt ou comercial)
- DNS configurado

## 🔧 Instalação

### **1. Preparar Servidor**

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y curl wget git build-essential

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar Redis
sudo apt install -y redis-server

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2
```

### **2. Configurar Banco de Dados**

```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Criar banco e usuário
CREATE DATABASE sispat_production;
CREATE USER sispat_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
\q
```

### **3. Configurar Redis**

```bash
# Editar configuração do Redis
sudo nano /etc/redis/redis.conf

# Adicionar senha
requirepass your_redis_password_here

# Reiniciar Redis
sudo systemctl restart redis
```

### **4. Deploy da Aplicação**

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/sispat.git
cd sispat

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp config/production.js .env.production
nano .env.production

# Build da aplicação
npm run build

# Iniciar com PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## 🔒 Configuração de Segurança

### **1. Firewall**

```bash
# Configurar UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3001
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

```nginx
# /etc/nginx/sites-available/sispat
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Headers de segurança
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Proxy para aplicação
    location / {
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

    # Cache para assets estáticos
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📊 Monitoramento

### **1. Logs**

```bash
# Ver logs da aplicação
pm2 logs sispat

# Ver logs do sistema
sudo journalctl -u nginx
sudo journalctl -u postgresql
sudo journalctl -u redis
```

### **2. Métricas**

```bash
# Status do PM2
pm2 status
pm2 monit

# Uso de recursos
htop
df -h
free -h
```

### **3. Backup**

```bash
# Backup do banco
pg_dump -h localhost -U sispat_user sispat_production > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup dos arquivos
tar -czf sispat_files_$(date +%Y%m%d_%H%M%S).tar.gz /var/sispat/uploads/
```

## 🔄 Manutenção

### **1. Atualizações**

```bash
# Parar aplicação
pm2 stop sispat

# Backup antes da atualização
pg_dump -h localhost -U sispat_user sispat_production > backup_pre_update.sql

# Atualizar código
git pull origin main

# Instalar dependências
npm install

# Build
npm run build

# Reiniciar aplicação
pm2 restart sispat
```

### **2. Limpeza**

```bash
# Limpar logs antigos
pm2 flush

# Limpar cache do Redis
redis-cli FLUSHALL

# Limpar backups antigos (mais de 30 dias)
find /var/sispat/backups -name "*.sql" -mtime +30 -delete
```

## 🚨 Troubleshooting

### **Problemas Comuns**

1. **Aplicação não inicia**

   ```bash
   pm2 logs sispat --lines 50
   ```

2. **Erro de conexão com banco**

   ```bash
   sudo systemctl status postgresql
   sudo -u postgres psql -c "SELECT version();"
   ```

3. **Erro de memória**

   ```bash
   free -h
   pm2 restart sispat
   ```

4. **SSL não funciona**
   ```bash
   sudo certbot certificates
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## 📞 Suporte

- **Logs**: `/var/log/sispat/`
- **Configurações**: `/etc/sispat/`
- **Backups**: `/var/sispat/backups/`
- **Uploads**: `/var/sispat/uploads/`

## 🚀 Comandos PM2

### **Iniciar Aplicação**

```bash
# Iniciar em produção
pm2 start ecosystem.config.js --env production

# Ou usar o script npm
npm run start:prod
```

### **Gerenciar Aplicação**

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs

# Monitorar recursos
pm2 monit

# Reiniciar aplicação
pm2 restart ecosystem.config.js

# Recarregar aplicação (zero downtime)
pm2 reload ecosystem.config.js

# Parar aplicação
pm2 stop ecosystem.config.js

# Deletar aplicação
pm2 delete ecosystem.config.js
```

### **Scripts NPM Disponíveis**

```bash
# Iniciar produção
npm run start:prod

# Parar produção
npm run stop:prod

# Reiniciar produção
npm run restart:prod

# Recarregar produção
npm run reload:prod

# Ver logs
npm run logs:prod

# Monitorar
npm run monit:prod
```

### **Troubleshooting PM2**

#### **1. PM2 não encontra o arquivo ecosystem.config.js**

```bash
# Verificar se o arquivo existe
ls -la ecosystem.config.js

# Se não existir, criar baseado no exemplo
cp ecosystem.config.js.example ecosystem.config.js
```

#### **2. Erro de permissão nos logs**

```bash
# Corrigir permissões
sudo chown -R $USER:$USER /var/log/sispat
sudo chmod -R 755 /var/log/sispat
```

#### **3. Aplicação não inicia**

```bash
# Verificar logs
pm2 logs

# Verificar variáveis de ambiente
pm2 env 0

# Reiniciar com logs detalhados
pm2 restart ecosystem.config.js --env production --log
```

#### **4. Problemas de memória**

```bash
# Verificar uso de memória
pm2 monit

# Ajustar limite de memória no ecosystem.config.js
max_memory_restart: '2G'
```

## ✅ Checklist de Produção

- [ ] Servidor configurado e atualizado
- [ ] Banco de dados criado e configurado
- [ ] Redis configurado com senha
- [ ] Aplicação deployada com PM2
- [ ] SSL/TLS configurado
- [ ] Firewall configurado
- [ ] Backup automático configurado
- [ ] Monitoramento ativo
- [ ] Logs configurados
- [ ] Testes de funcionalidade realizados
- [ ] Documentação atualizada
