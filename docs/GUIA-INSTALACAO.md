# 🚀 Guia de Instalação - SISPAT Single-Tenant

Este guia fornece instruções completas para instalar e configurar o SISPAT Single-Tenant.

## 📋 **Pré-requisitos**

### **Sistema Operacional**

- Windows 10/11
- Linux (Ubuntu 20.04+, CentOS 8+)
- macOS 12+

### **Software Necessário**

#### **Node.js 18+**

```bash
# Verificar versão
node --version

# Instalar via NodeSource (Linux)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar via Homebrew (macOS)
brew install node@18

# Windows: Download do site oficial
# https://nodejs.org/
```

#### **PostgreSQL 13+**

```bash
# Verificar versão
psql --version

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql

# Windows: Download do site oficial
# https://www.postgresql.org/download/windows/
```

#### **pnpm (Recomendado)**

```bash
# Instalar pnpm globalmente
npm install -g pnpm

# Verificar versão
pnpm --version
```

## 🔧 **Instalação**

### **1. Clonar o Repositório**

```bash
# Clonar repositório
git clone <repository-url> sispat-single-tenant
cd sispat-single-tenant

# Ou criar manualmente se não tiver repositório
mkdir sispat-single-tenant
cd sispat-single-tenant
```

### **2. Instalar Dependências**

```bash
# Instalar todas as dependências
pnpm install

# Ou usar npm se preferir
npm install
```

### **3. Configurar Banco de Dados**

#### **Criar Banco de Dados**

```sql
-- Conectar como postgres
sudo -u postgres psql

-- Criar banco de dados
CREATE DATABASE sispat_single_tenant;

-- Criar usuário (opcional)
CREATE USER sispat_user WITH PASSWORD 'sua_senha_segura';

-- Dar permissões
GRANT ALL PRIVILEGES ON DATABASE sispat_single_tenant TO sispat_user;

-- Sair
\q
```

#### **Configurar Variáveis de Ambiente**

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar configurações
nano .env
```

**Configurações do .env:**

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_single_tenant
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui

# JWT Configuration
JWT_SECRET=sua_chave_jwt_super_secreta_minimo_32_caracteres
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend Configuration
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001

# Organization Configuration
ORGANIZATION_NAME=Seu Município
ORGANIZATION_LOGO_URL=/logo-sispat.svg
```

### **4. Configurar Banco de Dados**

```bash
# Executar migrações
pnpm run db:migrate

# Popular dados iniciais
pnpm run db:seed
```

### **5. Iniciar Aplicação**

#### **Desenvolvimento**

```bash
# Iniciar frontend e backend simultaneamente
pnpm run dev

# Ou iniciar separadamente
pnpm run dev:frontend  # Frontend em http://localhost:5173
pnpm run dev:backend   # Backend em http://localhost:3001
```

#### **Produção**

```bash
# Build da aplicação
pnpm run build

# Iniciar em produção
pnpm run start:prod
```

## 🔐 **Primeiro Acesso**

### **Dados de Login**

- **URL**: http://localhost:3001
- **Email**: junielsonfarias@gmail.com
- **Senha**: Tiko6273@
- **Role**: supervisor

### **Verificações Iniciais**

1. ✅ Login realizado com sucesso
2. ✅ Dashboard carregando corretamente
3. ✅ Setores e locais criados
4. ✅ Patrimônios de exemplo visíveis
5. ✅ Menus e permissões funcionando

## 🛠️ **Comandos Úteis**

### **Desenvolvimento**

```bash
pnpm run dev              # Frontend + Backend
pnpm run dev:frontend     # Apenas frontend
pnpm run dev:backend      # Apenas backend
```

### **Banco de Dados**

```bash
pnpm run db:migrate       # Executar migrações
pnpm run db:seed          # Popular dados iniciais
pnpm run db:reset         # Limpar e recriar dados
```

### **Build e Produção**

```bash
pnpm run build            # Build de produção
pnpm run start:prod       # Iniciar em produção
pnpm run preview          # Preview do build
```

### **Qualidade de Código**

```bash
pnpm run lint             # Verificar código
pnpm run lint:fix         # Corrigir problemas
pnpm run format           # Formatar código
pnpm run type-check       # Verificar tipos TypeScript
```

### **Testes**

```bash
pnpm run test             # Executar todos os testes
pnpm run test:watch       # Testes em modo watch
pnpm run test:coverage    # Cobertura de testes
```

## 🔧 **Configurações Avançadas**

### **SSL/HTTPS**

Para produção, configure SSL:

```bash
# Gerar certificados SSL (Let's Encrypt)
sudo certbot --nginx -d seudominio.com

# Ou usar certificados próprios
# Configurar no nginx ou diretamente no Node.js
```

### **PM2 (Produção)**

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
pm2 start ecosystem.config.js --env production

# Outros comandos PM2
pm2 status        # Status das aplicações
pm2 logs          # Ver logs
pm2 restart all   # Reiniciar todas
pm2 stop all      # Parar todas
```

### **Nginx (Proxy Reverso)**

```nginx
# /etc/nginx/sites-available/sispat
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

### **Backup Automático**

```bash
# Script de backup do banco (crontab)
0 2 * * * /usr/local/bin/pg_dump sispat_single_tenant > /backups/sispat_$(date +\%Y\%m\%d).sql
```

## 🐛 **Solução de Problemas**

### **Erro de Conexão com Banco**

```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Verificar conexão
psql -h localhost -U postgres -d sispat_single_tenant

# Verificar configurações no .env
cat .env | grep DB_
```

### **Erro de Porta em Uso**

```bash
# Verificar porta 3001
lsof -i :3001

# Matar processo se necessário
kill -9 <PID>

# Ou usar porta diferente no .env
PORT=3002
```

### **Erro de Permissões**

```bash
# Verificar permissões da pasta
ls -la

# Corrigir permissões se necessário
sudo chown -R $USER:$USER .
chmod -R 755 .
```

### **Erro de Dependências**

```bash
# Limpar cache e reinstalar
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install

# Ou forçar instalação
pnpm install --force
```

## 📞 **Suporte**

### **Logs do Sistema**

```bash
# Logs da aplicação
tail -f logs/combined.log

# Logs de erro
tail -f logs/error.log

# Logs do PM2
pm2 logs
```

### **Contato**

- **Sistema**: SISPAT Single-Tenant
- **Supervisor**: Junielson Farias
- **Email**: junielsonfarias@gmail.com

### **Documentação Adicional**

- `README.md` - Visão geral do projeto
- `docs/` - Documentação técnica completa
- Código comentado com explicações detalhadas

---

**🎉 Instalação concluída! O SISPAT Single-Tenant está pronto para uso!**
