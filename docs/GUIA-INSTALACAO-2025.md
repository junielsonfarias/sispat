# 🚀 Guia de Instalação - SISPAT 2025

## 📋 Pré-requisitos

### Sistema Operacional

- **Windows 10/11** (recomendado)
- **Ubuntu 20.04+** / **CentOS 8+**
- **macOS 12+**

### Software Necessário

- **Node.js 18+** ([Download](https://nodejs.org/))
- **PostgreSQL 13+** ([Download](https://postgresql.org/))
- **pnpm** (gerenciador de pacotes)
- **Git** ([Download](https://git-scm.com/))

### Recursos Mínimos

- **RAM:** 4GB (8GB recomendado)
- **CPU:** 2 cores (4 cores recomendado)
- **Disco:** 10GB livres
- **Rede:** Conexão estável com internet

---

## 🔧 Instalação Rápida

### 1. Clone o Repositório

```bash
git clone https://github.com/sispat/sispat.git
cd sispat
```

### 2. Instale as Dependências

```bash
# Instalar pnpm globalmente
npm install -g pnpm

# Instalar dependências do projeto
pnpm install
```

### 3. Configure o Banco de Dados

```bash
# Criar banco de dados PostgreSQL
createdb sispat_db

# Executar migrações
node server/database/migrate.js
```

### 4. Configure as Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp env.example .env

# Editar configurações
nano .env
```

### 5. Inicie o Sistema

```bash
# Desenvolvimento
pnpm run dev

# Produção
pnpm run build
pnpm run start:prod
```

---

## ⚙️ Configuração Detalhada

### Variáveis de Ambiente (.env)

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_db
DB_USER=postgres
DB_PASSWORD=sua_senha_segura

# JWT Configuration
JWT_SECRET=sua_chave_jwt_super_secreta
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration (Produção)
ALLOWED_ORIGINS=https://seudominio.com,https://www.seudominio.com

# Security Configuration
BCRYPT_ROUNDS=14
SESSION_TIMEOUT=1800000
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=1800000

# Performance Configuration
ENABLE_CACHE=true
CACHE_TTL=300000
VIRTUALIZATION_THRESHOLD=100

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
```

### Configuração do PostgreSQL

```sql
-- Criar usuário e banco
CREATE USER sispat_user WITH PASSWORD 'senha_segura';
CREATE DATABASE sispat_db OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_db TO sispat_user;

-- Configurações de performance
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Recarregar configurações
SELECT pg_reload_conf();
```

---

## 🐳 Instalação com Docker

### Docker Compose

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: sispat_db
      POSTGRES_USER: sispat_user
      POSTGRES_PASSWORD: senha_segura
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  app:
    build: .
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

### Comandos Docker

```bash
# Construir e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

---

## 🚀 Deploy em Produção

### 1. Configuração do Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Instalar PM2
sudo npm install -g pm2
```

### 2. Configuração do Nginx

```nginx
server {
    listen 80;
    server_name seudominio.com;

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
}
```

### 3. Configuração do PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'sispat',
      script: 'server/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
    },
  ],
};
```

### 4. SSL com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d seudominio.com

# Renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🔧 Otimizações de Performance

### 1. Índices do Banco de Dados

```bash
# Criar índices de performance
node server/database/optimize.js
```

### 2. Configuração de Cache

```bash
# Habilitar monitoramento
node server/database/analyze-performance.js
```

### 3. Build de Produção

```bash
# Build otimizado
pnpm run build

# Verificar bundle size
pnpm run analyze
```

---

## 🛡️ Configurações de Segurança

### 1. Firewall

```bash
# Configurar UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3001
```

### 2. Backup Automático

```bash
# Configurar backup
crontab -e
# Adicionar: 0 2 * * * /path/to/backup-script.sh
```

### 3. Monitoramento

```bash
# Instalar ferramentas de monitoramento
sudo apt install htop iotop nethogs

# Configurar logs
sudo mkdir -p /var/log/sispat
sudo chown -R www-data:www-data /var/log/sispat
```

---

## 🔍 Verificação da Instalação

### 1. Testes Automáticos

```bash
# Executar testes
pnpm run test

# Testes de integração
pnpm run test:integration

# Testes E2E
pnpm run test:e2e
```

### 2. Verificação Manual

- ✅ Acesse `http://localhost:3001`
- ✅ Verifique logs do sistema
- ✅ Teste login de superuser
- ✅ Verifique dashboards
- ✅ Teste funcionalidades principais

### 3. Health Check

```bash
# Verificar status
curl http://localhost:3001/api/health

# Verificar banco
psql -h localhost -U sispat_user -d sispat_db -c "SELECT version();"
```

---

## 🆘 Solução de Problemas

### Problemas Comuns

#### 1. Erro de Conexão com Banco

```bash
# Verificar status do PostgreSQL
sudo systemctl status postgresql

# Verificar logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### 2. Erro de Permissões

```bash
# Corrigir permissões
sudo chown -R $USER:$USER /path/to/sispat
chmod -R 755 /path/to/sispat
```

#### 3. Erro de Memória

```bash
# Verificar uso de memória
free -h
htop

# Ajustar configurações do Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### 4. Erro de Porta em Uso

```bash
# Verificar portas em uso
sudo netstat -tulpn | grep :3001

# Matar processo
sudo kill -9 PID_DO_PROCESSO
```

---

## 📞 Suporte

### Documentação

- 📚 [Documentação Completa](docs/)
- 🔒 [Guia de Segurança](docs/AUDITORIA-SEGURANCA-2025.md)
- ⚡ [Relatório de Performance](docs/RELATORIO-PERFORMANCE-2025.md)

### Contato

- 📧 Email: suporte@sispat.com
- 💬 Discord: [Servidor SISPAT](https://discord.gg/sispat)
- 🐛 Issues: [GitHub Issues](https://github.com/sispat/sispat/issues)

---

**Versão:** 0.0.193  
**Última Atualização:** 09/09/2025  
**Status:** ✅ Pronto para Produção
