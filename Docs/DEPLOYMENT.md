# 🚀 Guia de Deploy para Produção - SISPAT 2.0

## 📋 Pré-requisitos

### **Servidor de Produção:**
- Ubuntu 20.04+ ou CentOS 8+
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM mínimo (8GB recomendado)
- 50GB espaço em disco
- Portas 80, 443, 3000 abertas

### **Domínio e SSL:**
- Domínio configurado (ex: sispat.seudominio.com)
- Certificado SSL (Let's Encrypt recomendado)
- DNS apontando para o servidor

## 🔧 Configuração Inicial

### **1. Preparar Servidor:**
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reiniciar sessão
exit
```

### **2. Clonar Repositório:**
```bash
git clone https://github.com/seu-usuario/sispat.git
cd sispat
```

### **3. Configurar Variáveis de Ambiente:**
```bash
# Copiar arquivos de exemplo
cp env.production .env
cp backend/env.production backend/.env

# Editar variáveis de produção
nano .env
nano backend/.env
```

### **Variáveis Importantes:**
```bash
# Frontend (.env)
VITE_API_URL=https://api.sispat.seudominio.com
VITE_USE_BACKEND=true

# Backend (backend/.env)
DATABASE_URL="postgresql://sispat_prod_user:SENHA_FORTE@postgres:5432/sispat_prod"
JWT_SECRET="CHAVE_JWT_256_BITS_SUPER_SECRETA"
JWT_EXPIRES_IN="24h"
NODE_ENV="production"
FRONTEND_URL="https://sispat.seudominio.com"
REDIS_PASSWORD="SENHA_REDIS_FORTE"
```

## 🚀 Deploy Automático

### **Deploy Completo:**
```bash
# Executar script de deploy
./scripts/deploy.sh production

# Ou usar npm script
pnpm run deploy
```

### **Deploy Manual:**
```bash
# 1. Build das imagens
pnpm run docker:prod:build

# 2. Subir serviços
pnpm run docker:prod:up

# 3. Executar migrações
pnpm run backend:migrate:deploy

# 4. Popular dados iniciais
pnpm run backend:seed
```

## 🔍 Verificação Pós-Deploy

### **Health Checks:**
```bash
# Verificar status dos serviços
pnpm run maintenance status

# Verificar saúde detalhada
pnpm run maintenance health

# Ver logs
pnpm run maintenance logs
```

### **Testes de Funcionalidade:**
```bash
# Testar endpoints
curl https://sispat.seudominio.com/health
curl https://api.sispat.seudominio.com/health

# Testar login
curl -X POST https://api.sispat.seudominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sispat.com","password":"senha123"}'
```

## 🔒 Configuração de SSL

### **Let's Encrypt com Certbot:**
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d sispat.seudominio.com -d api.sispat.seudominio.com

# Renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **Nginx com SSL:**
```nginx
server {
    listen 443 ssl http2;
    server_name sispat.seudominio.com;
    
    ssl_certificate /etc/letsencrypt/live/sispat.seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sispat.seudominio.com/privkey.pem;
    
    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Resto da configuração...
}
```

## 📊 Monitoramento

### **Logs:**
```bash
# Logs em tempo real
pnpm run maintenance monitor

# Logs específicos
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
```

### **Métricas:**
```bash
# Uso de recursos
docker stats

# Espaço em disco
df -h

# Uso de memória
free -h
```

## 💾 Backup e Restauração

### **Backup Automático:**
```bash
# Backup manual
pnpm run backup

# Configurar cron para backup diário
crontab -e
# Adicionar: 0 2 * * * /opt/sispat/scripts/backup.sh
```

### **Restauração:**
```bash
# Restaurar backup
pnpm run restore /backups/sispat_backup_20241201_020000.sql.gz
```

## 🔄 Atualizações

### **Atualização de Código:**
```bash
# 1. Backup antes da atualização
pnpm run backup

# 2. Pull do código
git pull origin main

# 3. Deploy da nova versão
pnpm run deploy

# 4. Verificar funcionamento
pnpm run maintenance health
```

### **Rollback:**
```bash
# 1. Voltar para commit anterior
git checkout HEAD~1

# 2. Rebuild e restart
pnpm run docker:prod:build
pnpm run docker:prod:up

# 3. Restaurar backup se necessário
pnpm run restore /backups/backup_anterior.sql.gz
```

## 🛠️ Manutenção

### **Comandos Úteis:**
```bash
# Status dos serviços
pnpm run maintenance status

# Reiniciar serviços
pnpm run maintenance restart

# Atualizar imagens
pnpm run maintenance update

# Limpeza de sistema
pnpm run maintenance cleanup

# Monitorar logs
pnpm run maintenance monitor
```

### **Limpeza Regular:**
```bash
# Limpar logs antigos
sudo find /var/log -name "*.log" -mtime +30 -delete

# Limpar backups antigos
find /backups -name "*.sql.gz" -mtime +30 -delete

# Limpar imagens Docker antigas
docker image prune -f
```

## 🚨 Troubleshooting

### **Problemas Comuns:**

#### **Backend não inicia:**
```bash
# Verificar logs
docker-compose -f docker-compose.prod.yml logs backend

# Verificar banco de dados
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Verificar variáveis de ambiente
docker-compose -f docker-compose.prod.yml config
```

#### **Frontend não carrega:**
```bash
# Verificar Nginx
docker-compose -f docker-compose.prod.yml logs frontend

# Verificar conectividade
curl -I http://localhost

# Verificar configuração
docker-compose -f docker-compose.prod.yml exec frontend nginx -t
```

#### **Banco de dados não conecta:**
```bash
# Verificar status do PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Verificar logs do banco
docker-compose -f docker-compose.prod.yml logs postgres

# Testar conexão
docker-compose -f docker-compose.prod.yml exec backend npm run migrate:deploy
```

## 📞 Suporte

### **Logs para Análise:**
```bash
# Coletar logs completos
mkdir -p /tmp/sispat-logs
docker-compose -f docker-compose.prod.yml logs > /tmp/sispat-logs/complete.log
docker stats --no-stream > /tmp/sispat-logs/docker-stats.log
df -h > /tmp/sispat-logs/disk-usage.log
free -h > /tmp/sispat-logs/memory-usage.log
```

### **Informações do Sistema:**
```bash
# Versões
docker --version
docker-compose --version
node --version
npm --version

# Configuração
docker-compose -f docker-compose.prod.yml config
```

---

**📅 Última Atualização:** 30/09/2025  
**👨‍💻 Desenvolvido por:** Equipe SISPAT  
**🔧 Versão:** 2.0.0 - Pronto para Produção
