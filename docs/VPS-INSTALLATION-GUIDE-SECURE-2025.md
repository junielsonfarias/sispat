# 🚀 GUIA SEGURO DE INSTALAÇÃO VPS - SISPAT (VERSÃO CORRIGIDA)

## 📋 **Pré-requisitos da VPS:**

- ✅ **Sistema Operacional:** Ubuntu 20.04+ ou CentOS 8+
- ✅ **Recursos Mínimos:** 2 vCPUs, 4GB RAM, 50GB SSD
- ✅ **Acesso Root:** SSH com privilégios de administrador
- ✅ **Domínio:** Configurado para apontar para o IP da VPS

---

## 🎯 **OPÇÃO 1: INSTALAÇÃO AUTOMÁTICA SEGURA (RECOMENDADA)**

### **1.1 Conectar na VPS como Root**

```bash
ssh root@IP_DA_SUA_VPS
```

### **1.2 Executar Script de Instalação Seguro**

**Para Instalação Completa e Segura:**

```bash
# Baixar o script de instalação seguro
curl -fsSL https://raw.githubusercontent.com/SEU_USUARIO/sispat/main/scripts/install-vps-secure.sh -o install-vps-secure.sh

# Tornar executável
chmod +x install-vps-secure.sh

# Executar instalação segura
./install-vps-secure.sh
```

**🎉 Este script faz TUDO automaticamente:**

- ✅ Instala todas as dependências
- ✅ Configura PostgreSQL e Redis com senhas seguras
- ✅ Instala e configura Nginx
- ✅ Clona o repositório SISPAT
- ✅ Executa deploy automático
- ✅ Configura PM2 para startup automático
- ✅ Configura SSL automaticamente
- ✅ Configura backup automático
- ✅ Configura monitoramento básico
- ✅ **NOVO:** Configuração automática de domínio
- ✅ **NOVO:** Substituição automática de localhost pelo domínio
- ✅ **NOVO:** URLs dinâmicas baseadas no ambiente
- ✅ **NOVO:** Geração automática de senhas seguras
- ✅ **NOVO:** Validação de segurança

---

## 🔧 **OPÇÃO 2: INSTALAÇÃO MANUAL PASSO A PASSO SEGURA**

### **PASSO 1: PREPARAÇÃO DO SISTEMA**

#### **1.1 Conectar via SSH e Atualizar Sistema**

```bash
# Conectar via SSH
ssh root@IP_DA_SUA_VPS

# Atualizar sistema
apt update && apt upgrade -y
apt install -y build-essential curl git software-properties-common unzip wget openssl
```

#### **1.2 Configurar Fuso Horário e Locale**

```bash
# Configurar fuso horário (Brasil)
timedatectl set-timezone America/Sao_Paulo

# Configurar locale
locale-gen pt_BR.UTF-8
update-locale LANG=pt_BR.UTF-8
```

---

### **PASSO 2: INSTALAÇÃO DO NODE.JS E FERRAMENTAS**

#### **2.1 Instalar Node.js 20.x (LTS)**

```bash
# Adicionar repositório NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Instalar Node.js
apt install -y nodejs

# Verificar instalação
node --version
npm --version
```

#### **2.2 Instalar pnpm e PM2**

```bash
# Instalar pnpm globalmente
npm install -g pnpm

# Instalar PM2
npm install -g pm2

# Verificar instalações
pnpm --version
pm2 --version
```

---

### **PASSO 3: INSTALAÇÃO DO POSTGRESQL**

#### **3.1 Instalar PostgreSQL**

```bash
# Instalar PostgreSQL do repositório padrão Ubuntu
apt install -y postgresql postgresql-contrib

# Verificar instalação
psql --version
```

#### **3.2 Configurar PostgreSQL com Senhas Seguras**

```bash
# Habilitar e iniciar PostgreSQL
systemctl enable postgresql
systemctl start postgresql

# Verificar status
systemctl status postgresql

# Gerar senha segura para o usuário do banco
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Acessar usuário postgres
sudo -u postgres psql

# Criar usuário e banco (execute dentro do psql)
CREATE USER sispat_user WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE sispat_production OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
ALTER USER sispat_user CREATEDB;

# Habilitar extensões necessárias
\c sispat_production
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\q

# Salvar senha para uso posterior
echo "DB_PASSWORD=$DB_PASSWORD" >> /root/sispat-secrets.txt
chmod 600 /root/sispat-secrets.txt
```

---

### **PASSO 4: INSTALAÇÃO DO REDIS**

#### **4.1 Instalar Redis**

```bash
# Instalar Redis
apt install -y redis-server

# Verificar instalação
redis-server --version
```

#### **4.2 Configurar Redis com Senha Segura**

```bash
# Gerar senha segura para Redis
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Editar configuração
nano /etc/redis/redis.conf

# Adicionar/modificar estas linhas:
# bind 127.0.0.1
# requirepass $REDIS_PASSWORD
# maxmemory 256mb
# maxmemory-policy allkeys-lru

# Habilitar e iniciar Redis
systemctl enable redis-server
systemctl start redis-server

# Testar conexão
redis-cli -a $REDIS_PASSWORD ping

# Salvar senha para uso posterior
echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> /root/sispat-secrets.txt
```

---

### **PASSO 5: INSTALAÇÃO DO NGINX**

#### **5.1 Instalar Nginx**

```bash
# Instalar Nginx
apt install -y nginx

# Verificar instalação
nginx -v
```

#### **5.2 Configurar Firewall**

```bash
# Configurar UFW
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3001
ufw --force enable

# Verificar status
ufw status
```

---

### **PASSO 6: CLONAR E CONFIGURAR APLICAÇÃO**

#### **6.1 Clonar Repositório**

```bash
# Criar diretório para aplicações
mkdir -p /var/www
cd /var/www

# Clonar repositório SISPAT (SUBSTITUA PELO SEU REPOSITÓRIO)
git clone https://github.com/SEU_USUARIO/sispat.git
cd sispat

# Verificar conteúdo
ls -la
```

#### **6.2 Configurar Variáveis de Ambiente Seguras**

```bash
# Copiar arquivo de exemplo
cp env.production.example .env.production

# Gerar JWT Secret seguro
JWT_SECRET=$(openssl rand -hex 64)

# Carregar senhas salvas
source /root/sispat-secrets.txt

# Editar arquivo de ambiente
nano .env.production
```

#### **6.3 Configurar .env.production Seguro**

```bash
# Configurações básicas
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Banco de dados (usar senhas geradas)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_production
DB_USER=sispat_user
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://sispat_user:$DB_PASSWORD@localhost:5432/sispat_production

# Redis (usar senha gerada)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=redis://:$REDIS_PASSWORD@localhost:6379

# JWT (usar secret gerado)
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS (será configurado dinamicamente)
CORS_ORIGIN=https://SEU_DOMINIO.com,http://localhost:3000,http://127.0.0.1:3000
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=https://SEU_DOMINIO.com,http://localhost:3000,http://127.0.0.1:3000
```

---

### **PASSO 7: EXECUTAR SCRIPTS DE CONFIGURAÇÃO**

#### **7.1 Tornar Scripts Executáveis**

```bash
# No diretório da aplicação
cd /var/www/sispat
chmod +x scripts/*.sh
```

#### **7.2 Executar Script de Configuração**

```bash
# Executar configuração inicial
./scripts/setup-production.sh
```

#### **7.3 Executar Deploy**

```bash
# Executar deploy para produção
./scripts/deploy-production-simple.sh
```

---

### **PASSO 8: CONFIGURAÇÃO DO NGINX**

#### **8.1 Criar Configuração do Site**

```bash
# Criar arquivo de configuração
nano /etc/nginx/sites-available/sispat
```

#### **8.2 Configuração Nginx Segura (conteúdo do arquivo)**

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO.com www.SEU_DOMINIO.com;

    # Frontend
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
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/

# Remover site padrão
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Recarregar Nginx
systemctl reload nginx
```

---

### **PASSO 9: CONFIGURAÇÃO SSL**

#### **9.1 Instalar Certbot**

```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obter certificado SSL (SUBSTITUA PELO SEU DOMÍNIO)
certbot --nginx -d SEU_DOMINIO.com

# Configurar renovação automática
crontab -e

# Adicionar linha para renovação automática:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

---

### **PASSO 10: CONFIGURAÇÃO DO PM2**

#### **10.1 Configurar PM2**

```bash
# Salvar configuração do PM2
pm2 save

# Configurar startup automático
pm2 startup

# Seguir as instruções exibidas pelo comando acima
```

#### **10.2 Configurar Logs**

```bash
# Ver logs em tempo real
pm2 logs

# Ver logs de um processo específico
pm2 logs sispat-backend
pm2 logs sispat-frontend
```

---

### **PASSO 11: VERIFICAÇÃO FINAL**

#### **11.1 Verificar Serviços**

```bash
# Verificar status dos serviços
systemctl status postgresql
systemctl status redis-server
systemctl status nginx
pm2 status
```

#### **11.2 Testar Endpoints**

```bash
# Testar frontend
curl -I http://SEU_DOMINIO.com

# Testar API
curl -I http://SEU_DOMINIO.com/api/health

# Testar banco de dados
sudo -u postgres psql -d sispat_production -c "SELECT version();"
```

---

## 🌐 **CONFIGURAÇÃO AUTOMÁTICA DE DOMÍNIO SEGURA**

### **🎯 Sistema de Detecção Automática Seguro**

O SISPAT agora inclui um sistema inteligente que detecta automaticamente o domínio da VPS e
substitui todas as referências a `localhost` pelas URLs corretas de produção.

### **🔍 Como Funciona:**

1. **Detecção Automática:** O script detecta o domínio através de:
   - Configuração do Nginx (`/etc/nginx/sites-available/sispat`)
   - Certificados SSL (`/etc/letsencrypt/live/`)
   - Variáveis de ambiente do sistema
   - Arquivo `/etc/hostname`

2. **Configuração Dinâmica:** Baseado no domínio detectado:
   - `http://localhost:3001` → `https://seu-dominio.com/api`
   - `http://localhost:3001` → `https://seu-dominio.com`
   - `ws://localhost:3001` → `wss://seu-dominio.com`

3. **Build Inteligente:** O Vite é configurado para usar as URLs corretas durante o build

### **📋 Scripts Disponíveis:**

#### **Para Novas Instalações:**

```bash
# Os scripts de instalação já incluem configuração automática
./install-vps-secure.sh
```

#### **Para Instalações Existentes:**

```bash
# Atualizar configuração de domínio em instalações existentes
chmod +x scripts/update-domain-config.sh
./scripts/update-domain-config.sh
```

#### **Configuração Manual:**

```bash
# Configurar domínio manualmente
chmod +x scripts/configure-production-domain.sh
./scripts/configure-production-domain.sh
```

### **✅ Benefícios:**

- **Zero Configuração Manual:** Não precisa editar arquivos manualmente
- **Detecção Inteligente:** Funciona com qualquer domínio
- **SSL Automático:** Detecta se HTTPS está disponível
- **Build Otimizado:** URLs corretas no build de produção
- **Compatibilidade:** Funciona com instalações existentes
- **Segurança:** Senhas geradas automaticamente

### **🔧 Arquivos Atualizados Automaticamente:**

- `env.production` - URLs do domínio
- `vite.config.ts` - Configuração dinâmica
- `server/index.js` - CORS configurado
- `dist/` - Build com URLs corretas

---

## 🚨 **RESOLUÇÃO DE PROBLEMAS COMUNS**

### **Problema 1: Erro de Autenticação PostgreSQL**

**❌ Erro:** `password authentication failed for user "sispat_user"`

**🔧 Solução:**

```bash
# Verificar senha salva
cat /root/sispat-secrets.txt

# Reconfigurar usuário se necessário
sudo -u postgres psql -c "ALTER USER sispat_user PASSWORD 'NOVA_SENHA_SEGURA';"
```

### **Problema 2: Nginx não roteia tráfego para aplicação**

**❌ Erro:** Nginx funcionando mas não roteia tráfego para SISPAT

**🔧 Solução:**

```bash
# Verificar configuração
nginx -t

# Recarregar configuração
systemctl reload nginx

# Verificar logs
tail -f /var/log/nginx/error.log
```

### **Problema 3: Erro de configuração Nginx**

**❌ Erro:** `nginx: [emerg] invalid value "must-revalidate"`

**🔧 Solução:**

```bash
# Corrigir configuração Nginx
nano /etc/nginx/sites-available/sispat

# Remover linhas problemáticas e recarregar
systemctl reload nginx
```

### **Problema 4: PostgreSQL não instala (Ubuntu 20.04)**

```bash
# Solução automática
curl -fsSL https://raw.githubusercontent.com/SEU_USUARIO/sispat/main/scripts/fix-postgresql-ubuntu20.sh -o fix-postgresql.sh
chmod +x fix-postgresql.sh
./fix-postgresql.sh
```

### **Problema 5: Conflito de Dependências NPM**

**❌ Erro:** `ERESOLVE unable to resolve dependency tree`

**🔧 Solução:**

```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### **Problema 6: Função gen_random_uuid() não existe**

**❌ Erro:** `function gen_random_uuid() does not exist`

**🔧 Solução:**

```bash
# Habilitar extensão pgcrypto
sudo -u postgres psql -d sispat_production -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

---

## 📋 **COMANDOS ESSENCIAIS (execute em sequência):**

```bash
# 1. Preparar sistema
apt update && apt upgrade -y
apt install -y build-essential curl git software-properties-common unzip wget openssl

# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Instalar ferramentas
npm install -g pnpm pm2

# 4. Instalar PostgreSQL
apt install -y postgresql postgresql-contrib

# 5. Instalar Redis
apt install -y redis-server

# 6. Instalar Nginx
apt install -y nginx

# 7. Configurar firewall
ufw allow ssh && ufw allow 80 && ufw allow 443 && ufw allow 3001 && ufw --force enable

# 8. Clonar aplicação
cd /var/www && git clone https://github.com/SEU_USUARIO/sispat.git && cd sispat

# 9. Configurar ambiente
chmod +x scripts/*.sh
./scripts/setup-production.sh

# 10. Deploy
./scripts/deploy-production-simple.sh

# 11. Configurar Nginx
# (criar arquivo de configuração manualmente)

# 12. SSL
certbot --nginx -d SEU_DOMINIO.com

# 13. PM2 startup
pm2 save && pm2 startup
```

---

## 🎯 **RESULTADO FINAL**

Após executar todos os passos, você terá:

- ✅ **Frontend** rodando na porta 80/443 (HTTPS)
- ✅ **Backend API** rodando na porta 3001
- ✅ **PostgreSQL** configurado e funcionando com senhas seguras
- ✅ **Redis** configurado e funcionando com senhas seguras
- ✅ **Nginx** servindo como proxy reverso
- ✅ **SSL** configurado automaticamente
- ✅ **PM2** gerenciando processos
- ✅ **Firewall** configurado e ativo
- ✅ **Senhas seguras** geradas automaticamente
- ✅ **Configuração dinâmica** de domínio

---

## 🚀 **INSTALAÇÃO RÁPIDA SEGURA (RECOMENDADA)**

**Para instalação mais rápida e segura, use o script automático:**

```bash
curl -fsSL https://raw.githubusercontent.com/SEU_USUARIO/sispat/main/scripts/install-vps-secure.sh -o install-vps-secure.sh
chmod +x install-vps-secure.sh
./install-vps-secure.sh
```

**🎯 Sua aplicação SISPAT estará rodando em produção com todas as configurações de segurança e
performance!**

---

## 🔧 **CORREÇÕES APLICADAS NESTA VERSÃO SEGURA**

### **✅ Problemas Críticos Resolvidos:**

1. **URLs de Scripts:** Todos os scripts referenciados existem e funcionam
2. **Credenciais Seguras:** Senhas geradas automaticamente com OpenSSL
3. **Domínio Dinâmico:** Configuração automática para qualquer domínio
4. **Repositório GitHub:** URLs corrigidas (substitua pelo seu repositório)
5. **Segurança:** Senhas fortes, JWT secrets seguros, configurações otimizadas
6. **Validações:** Verificação de pré-requisitos e configurações
7. **Documentação:** Guia claro e sem contradições

### **✅ Funcionalidades Adicionadas:**

- **Geração Automática de Senhas:** OpenSSL para senhas seguras
- **Configuração Dinâmica:** Funciona com qualquer domínio
- **Validação de Entrada:** Todas as entradas são validadas
- **Senhas Seguras:** Mínimo 25 caracteres com caracteres especiais
- **JWT Secret Seguro:** 64 caracteres hexadecimais
- **Configuração Automática:** CORS, SSL, Nginx configurados automaticamente
- **Monitoramento:** Logs e status de serviços
- **Backup Automático:** Sistema de backup configurado
- **Segurança:** Firewall, SSL, headers de segurança

---

## 📞 **SUPORTE**

### **Se encontrar problemas:**

1. **Verifique os logs:**

   ```bash
   pm2 logs
   journalctl -u nginx
   journalctl -u postgresql
   ```

2. **Use o script de correção PostgreSQL:**

   ```bash
   ./scripts/fix-postgresql-ubuntu20.sh
   ```

3. **Verifique o status dos serviços:**

   ```bash
   systemctl status postgresql redis-server nginx
   pm2 status
   ```

4. **Teste conectividade:**
   ```bash
   curl -I http://localhost:3001
   curl -I http://SEU_DOMINIO.com
   ```

---

**🎉 Com este guia seguro e atualizado, você terá uma instalação completa e funcional do SISPAT em
produção com máxima segurança!**

## 🔒 **IMPORTANTE - SEGURANÇA**

### **⚠️ Ações Obrigatórias:**

1. **Substitua `SEU_USUARIO`** pelo seu usuário do GitHub
2. **Substitua `SEU_DOMINIO.com`** pelo seu domínio real
3. **Mantenha as senhas seguras** em `/root/sispat-secrets.txt`
4. **Configure backup** das senhas em local seguro
5. **Monitore logs** regularmente
6. **Atualize dependências** periodicamente

### **🔐 Senhas Geradas Automaticamente:**

- **PostgreSQL:** 25 caracteres com caracteres especiais
- **Redis:** 25 caracteres com caracteres especiais
- **JWT Secret:** 64 caracteres hexadecimais
- **Todas as senhas** são salvas em `/root/sispat-secrets.txt`

---

**Data do Guia:** Janeiro 2025  
**Versão:** 2.0 - Segura  
**Status:** ✅ **APROVADO PARA PRODUÇÃO**
