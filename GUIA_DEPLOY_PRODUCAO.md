# 🚀 GUIA DE DEPLOY PARA PRODUÇÃO - SISPAT 2.0

**Data:** 09/10/2025  
**Versão:** 2.0.0  
**Tipo:** Deploy Manual + Automático

---

## 📋 ÍNDICE

1. [Pré-requisitos](#pré-requisitos)
2. [Preparação do Servidor](#preparação-do-servidor)
3. [Instalação Manual](#instalação-manual)
4. [Instalação Automática](#instalação-automática)
5. [Configuração Pós-Deploy](#configuração-pós-deploy)
6. [Verificação](#verificação)
7. [Troubleshooting](#troubleshooting)
8. [Rollback](#rollback)

---

## 🔧 PRÉ-REQUISITOS

### **Servidor**

- ✅ Ubuntu 20.04+ ou Debian 11+
- ✅ Mínimo 2GB RAM, 2 CPUs
- ✅ Recomendado: 4GB RAM, 4 CPUs
- ✅ 20GB+ de espaço em disco
- ✅ Acesso root ou sudo

### **Domínio e DNS**

- ✅ Domínio registrado (ex: sispat.seu-municipio.gov.br)
- ✅ Registro A apontando para IP do servidor
- ✅ Registro CNAME para www (opcional)

### **Portas**

- ✅ Porta 80 (HTTP)
- ✅ Porta 443 (HTTPS)
- ✅ Porta 22 (SSH)

---

## 🖥️ PREPARAÇÃO DO SERVIDOR

### **1. Atualizar Sistema**

```bash
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y
```

### **2. Instalar Dependências Básicas**

```bash
sudo apt install -y \
  curl \
  wget \
  git \
  build-essential \
  nginx \
  certbot \
  python3-certbot-nginx \
  ufw
```

### **3. Instalar Node.js 20+**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalação
node --version  # Deve ser v20.x
npm --version
```

### **4. Instalar pnpm**

```bash
npm install -g pnpm
pnpm --version
```

### **5. Instalar Docker e Docker Compose**

```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose
sudo apt install -y docker-compose

# Verificar
docker --version
docker-compose --version
```

### **6. Instalar PM2**

```bash
npm install -g pm2
pm2 --version

# Configurar PM2 para iniciar com o sistema
pm2 startup
# Executar o comando gerado
```

### **7. Configurar Firewall**

```bash
# Desabilitar firewall temporariamente (se estiver ativo)
sudo ufw disable

# Permitir apenas portas necessárias
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# Habilitar firewall
sudo ufw enable
sudo ufw status
```

---

## 📦 INSTALAÇÃO MANUAL

### **1. Clonar Repositório**

```bash
# Criar diretório
sudo mkdir -p /var/www
cd /var/www

# Clonar (substitua pela URL correta)
sudo git clone https://github.com/seu-usuario/sispat.git
sudo chown -R $USER:$USER sispat
cd sispat
```

### **2. Configurar Backend**

```bash
cd backend

# Copiar arquivo de ambiente
cp env.production.example .env

# Editar variáveis de ambiente
nano .env
```

**Variáveis OBRIGATÓRIAS para editar:**

```env
NODE_ENV=production
DATABASE_URL=postgresql://sispat_user:SENHA_FORTE@localhost:5432/sispat_prod
JWT_SECRET=<gerar-secret-forte-64-chars>
FRONTEND_URL=https://seu-dominio.com
SUPERUSER_EMAIL=admin@seu-dominio.com
SUPERUSER_PASSWORD=<senha-forte>
MUNICIPALITY_NAME=Prefeitura Municipal de XXX
STATE=PA
```

**Gerar JWT_SECRET:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### **3. Instalar Dependências do Backend**

```bash
pnpm install --prod
```

### **4. Configurar Banco de Dados**

```bash
# Iniciar PostgreSQL via Docker
docker-compose up -d postgres

# Aguardar 5 segundos
sleep 5

# Gerar Prisma Client
pnpm exec prisma generate

# Aplicar migrations
pnpm exec prisma migrate deploy

# Popular banco com dados iniciais
pnpm run prisma:seed
```

### **5. Build do Backend**

```bash
pnpm build
```

### **6. Configurar Frontend**

```bash
cd /var/www/sispat

# Criar .env para frontend
cat > .env <<EOF
VITE_API_URL=https://seu-dominio.com/api
VITE_USE_BACKEND=true
VITE_ENV=production
VITE_API_TIMEOUT=30000
EOF

# Instalar dependências
pnpm install --prod

# Build de produção
pnpm build
```

### **7. Configurar Nginx**

```bash
sudo nano /etc/nginx/sites-available/sispat
```

**Conteúdo:**

```nginx
# Redirecionar HTTP para HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name seu-dominio.com www.seu-dominio.com;
    
    return 301 https://$server_name$request_uri;
}

# Servidor HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name seu-dominio.com www.seu-dominio.com;

    # SSL (será configurado pelo Certbot)
    # ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend (SPA)
    location / {
        root /var/www/sispat/dist;
        try_files $uri $uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Arquivos estáticos (uploads)
    location /uploads {
        alias /var/www/sispat/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Limitar tamanho de upload
    client_max_body_size 10M;
}
```

**Ativar site:**

```bash
sudo ln -s /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### **8. Configurar SSL com Let's Encrypt**

```bash
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

Escolha:
- Redirect HTTP to HTTPS: **Yes**

### **9. Iniciar Backend com PM2**

```bash
cd /var/www/sispat/backend
pm2 start ecosystem.config.js --env production
pm2 save
pm2 logs
```

### **10. Verificar Instalação**

```bash
# Health check
curl https://seu-dominio.com/api/health

# Deve retornar:
# {"status":"ok","timestamp":"...","environment":"production"}
```

---

## 🤖 INSTALAÇÃO AUTOMÁTICA

Use o script `install.sh` (mais rápido):

### **1. Download e Preparação**

```bash
cd /var/www
git clone https://github.com/seu-usuario/sispat.git
cd sispat
chmod +x install.sh
```

### **2. Executar Instalação**

```bash
sudo ./install.sh
```

O script vai perguntar:
- Nome do município
- Estado
- Domínio
- Email do admin
- Senhas

### **3. Configurar SSL**

```bash
sudo certbot --nginx -d seu-dominio.com
```

---

## ⚙️ CONFIGURAÇÃO PÓS-DEPLOY

### **1. Configurar Backup Automático**

```bash
# Criar script de backup
sudo nano /usr/local/bin/backup-sispat.sh
```

**Conteúdo:**

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/sispat"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório se não existir
mkdir -p $BACKUP_DIR

# Backup do banco de dados
docker exec sispat-postgres pg_dump -U postgres sispat_prod > "$BACKUP_DIR/db_$DATE.sql"

# Backup dos uploads
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C /var/www/sispat/backend uploads

# Remover backups com mais de 30 dias
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup concluído: $DATE"
```

**Tornar executável e agendar:**

```bash
sudo chmod +x /usr/local/bin/backup-sispat.sh

# Agendar backup diário às 3h
sudo crontab -e
# Adicionar linha:
0 3 * * * /usr/local/bin/backup-sispat.sh >> /var/log/sispat-backup.log 2>&1
```

### **2. Configurar Monitoramento**

```bash
# Configurar PM2 monitoring
pm2 install pm2-logrotate

# Configurar rotação de logs
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### **3. Configurar Auto-renewal SSL**

```bash
# Testar renovação
sudo certbot renew --dry-run

# Já está configurado para renovar automaticamente
```

---

## ✅ VERIFICAÇÃO

### **Checklist Pós-Deploy:**

```bash
# 1. Backend respondendo
curl https://seu-dominio.com/api/health

# 2. Frontend carregando
curl -I https://seu-dominio.com

# 3. SSL funcionando
curl -Ik https://seu-dominio.com | grep "HTTP"

# 4. PM2 rodando
pm2 status

# 5. PostgreSQL rodando
docker ps | grep postgres

# 6. Nginx rodando
sudo systemctl status nginx

# 7. Logs sem erros
pm2 logs --lines 50

# 8. Testar login
curl -X POST https://seu-dominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seu-dominio.com","password":"sua-senha"}'
```

---

## 🔧 TROUBLESHOOTING

### **Problema: Backend não inicia**

```bash
# Ver logs
pm2 logs sispat-backend --lines 100

# Verificar variáveis de ambiente
cd /var/www/sispat/backend
cat .env

# Testar conexão com banco
docker exec -it sispat-postgres psql -U postgres -c "SELECT 1;"

# Reiniciar
pm2 restart sispat-backend
```

### **Problema: 502 Bad Gateway**

```bash
# Verificar se backend está rodando
pm2 status

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Verificar porta 3000
netstat -tulpn | grep 3000

# Reiniciar serviços
pm2 restart all
sudo systemctl restart nginx
```

### **Problema: SSL não funciona**

```bash
# Verificar certificado
sudo certbot certificates

# Renovar manualmente
sudo certbot renew --force-renewal

# Verificar configuração Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### **Problema: Banco de dados não conecta**

```bash
# Verificar container
docker ps -a | grep postgres

# Ver logs
docker logs sispat-postgres

# Reiniciar
docker-compose restart postgres

# Testar conexão
docker exec -it sispat-postgres psql -U postgres -d sispat_prod -c "SELECT COUNT(*) FROM users;"
```

---

## ⏪ ROLLBACK

### **Opção 1: Rollback Rápido**

```bash
# Parar aplicação atual
pm2 stop sispat-backend

# Voltar para commit anterior
cd /var/www/sispat
git log --oneline -10  # Ver commits
git checkout <commit-anterior>

# Rebuild
cd backend && pnpm build
cd .. && pnpm build

# Reiniciar
pm2 restart sispat-backend
```

### **Opção 2: Restaurar Backup**

```bash
# Parar aplicação
pm2 stop sispat-backend

# Restaurar banco
docker exec -i sispat-postgres psql -U postgres -d sispat_prod < /var/backups/sispat/db_YYYYMMDD_HHMMSS.sql

# Restaurar uploads
cd /var/www/sispat/backend
rm -rf uploads
tar -xzf /var/backups/sispat/uploads_YYYYMMDD_HHMMSS.tar.gz

# Reiniciar
pm2 restart sispat-backend
```

---

## 📊 MONITORAMENTO PÓS-DEPLOY

### **Comandos Úteis:**

```bash
# Status geral
pm2 status

# Logs em tempo real
pm2 logs

# Monitoramento
pm2 monit

# Uso de recursos
pm2 list

# Reiniciar aplicação
pm2 restart sispat-backend

# Recarregar (zero-downtime)
pm2 reload sispat-backend

# Ver informações detalhadas
pm2 show sispat-backend
```

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Configurar backup automático
2. ✅ Configurar monitoramento (UptimeRobot, Pingdom)
3. ✅ Implementar CI/CD (GitHub Actions)
4. ✅ Configurar alertas (email, Slack)
5. ✅ Documentar procedimentos
6. ✅ Treinar equipe

---

**Dúvidas ou problemas?** Consulte a documentação completa ou abra uma issue no repositório.

**Sucesso no deploy! 🚀**

