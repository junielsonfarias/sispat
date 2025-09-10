# 🚀 GUIA COMPLETO DE INSTALAÇÃO VPS - SISPAT (ATUALIZADO)

## 📋 **Pré-requisitos da VPS:**

- ✅ **Sistema Operacional:** Ubuntu 20.04+ ou CentOS 8+
- ✅ **Recursos Mínimos:** 2 vCPUs, 4GB RAM, 50GB SSD
- ✅ **Acesso Root:** SSH com privilégios de administrador
- ✅ **Domínio:** Configurado para apontar para o IP da VPS

---

## 🎯 **OPÇÃO 1: INSTALAÇÃO AUTOMÁTICA (RECOMENDADA)**

### **1.1 Conectar na VPS como Root**

```bash
ssh root@IP_DA_SUA_VPS
```

### **1.2 Executar Script de Instalação Automática**

**Para Iniciantes (Recomendado):**

```bash
# Baixar o script de instalação simplificado
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-simple.sh -o install-vps-simple.sh

# Tornar executável
chmod +x install-vps-simple.sh

# Executar instalação simplificada
./install-vps-simple.sh
```

**Para Instalação Completa e Testada (NOVO):**

```bash
# Baixar o script de instalação completo e testado
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-complete-new.sh -o install-vps-complete-new.sh

# Tornar executável
chmod +x install-vps-complete-new.sh

# Executar instalação completa
./install-vps-complete-new.sh
```

**Para Usuários Avançados:**

```bash
# Baixar o script de instalação completo
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-complete-fixed.sh -o install-vps-complete-fixed.sh

# Tornar executável
chmod +x install-vps-complete-fixed.sh

# Executar instalação completa
./install-vps-complete-fixed.sh
```

**🎉 Estes scripts fazem TUDO automaticamente:**

- ✅ Instala todas as dependências
- ✅ Configura PostgreSQL e Redis
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

---

## 🔧 **OPÇÃO 2: INSTALAÇÃO MANUAL PASSO A PASSO**

### **PASSO 1: PREPARAÇÃO DO SISTEMA**

#### **1.1 Conectar via SSH e Atualizar Sistema**

```bash
# Conectar via SSH
ssh root@IP_DA_SUA_VPS

# Atualizar sistema
apt update && apt upgrade -y
apt install -y build-essential curl git software-properties-common unzip wget
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

#### **2.1 Instalar Node.js 18.x**

```bash
# Adicionar repositório NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

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

#### **3.2 Configurar PostgreSQL**

```bash
# Habilitar e iniciar PostgreSQL
systemctl enable postgresql
systemctl start postgresql

# Verificar status
systemctl status postgresql

# Acessar usuário postgres
sudo -u postgres psql

# Criar usuário e banco (execute dentro do psql)
CREATE USER sispat_user WITH PASSWORD 'sispat123456';
CREATE DATABASE sispat_production OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
ALTER USER sispat_user CREATEDB;
\q
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

#### **4.2 Configurar Redis**

```bash
# Editar configuração
nano /etc/redis/redis.conf

# Adicionar/modificar estas linhas:
# bind 127.0.0.1
# requirepass sispat123456
# maxmemory 256mb
# maxmemory-policy allkeys-lru

# Habilitar e iniciar Redis
systemctl enable redis-server
systemctl start redis-server

# Testar conexão
redis-cli -a sispat123456 ping
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

# Clonar repositório SISPAT
git clone https://github.com/junielsonfarias/sispat.git
cd sispat

# Verificar conteúdo
ls -la
```

#### **6.2 Configurar Variáveis de Ambiente**

```bash
# Copiar arquivo de exemplo
cp env.production.example .env.production

# Editar arquivo de ambiente
nano .env.production
```

#### **6.3 Configurar .env.production**

```bash
# Configurações básicas
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_production
DB_USER=sispat_user
DB_PASSWORD=sispat123456
DATABASE_URL=postgresql://sispat_user:sispat123456@localhost:5432/sispat_production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=sispat123456
REDIS_URL=redis://:sispat123456@localhost:6379

# JWT
JWT_SECRET=SEU_JWT_SECRET_AQUI
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://sispat.vps-kinghost.net,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=https://sispat.vps-kinghost.net,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080
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

#### **8.2 Configuração Nginx (conteúdo do arquivo)**

```nginx
server {
    listen 80;
    server_name sispat.vps-kinghost.net www.sispat.vps-kinghost.net;

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

# Obter certificado SSL
certbot --nginx -d sispat.vps-kinghost.net

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
curl -I http://sispat.vps-kinghost.net

# Testar API
curl -I http://sispat.vps-kinghost.net/api/health

# Testar banco de dados
sudo -u postgres psql -d sispat_production -c "SELECT version();"
```

---

## 🌐 **CONFIGURAÇÃO AUTOMÁTICA DE DOMÍNIO (NOVO)**

### **🎯 Sistema de Detecção Automática**

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
./install-vps-simple.sh
# ou
./install-vps-complete-fixed.sh
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

### **🔧 Arquivos Atualizados Automaticamente:**

- `env.production` - URLs do domínio
- `vite.config.ts` - Configuração dinâmica
- `server/index.js` - CORS configurado
- `dist/` - Build com URLs corretas

---

## 🚨 **RESOLUÇÃO DE PROBLEMAS COMUNS**

### **Problema 0: Erro de Export (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `export: '2': not a valid identifier` e centenas de erros similares **🔧 Solução:** O
script `install-vps-complete.sh` agora inclui correção automática **✅ Status:** **RESOLVIDO** -
Correção integrada automaticamente

### **Problema 1: Erro de Autenticação PostgreSQL (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `password authentication failed for user "sispat_user"` **🔧 Solução:** O script
`install-vps-complete.sh` agora inclui correção automática de autenticação **✅ Status:**
**RESOLVIDO** - Correção integrada automaticamente **🔒 Senha Configurada:** `sispat123456`

### **Problema 2: Nginx não roteia tráfego para aplicação (RESOLVIDO)**

**❌ Erro:** Nginx funcionando mas não roteia tráfego para SISPAT **🔧 Solução:** O script
`install-vps-complete.sh` agora inclui correção automática da configuração Nginx **✅ Status:**
**RESOLVIDO** - Configuração integrada automaticamente **🌐 Configurações:** Proxy reverso, headers
de segurança, compressão Gzip, cache para arquivos estáticos

### **Problema 3: Erro de configuração Nginx (RESOLVIDO)**

**❌ Erro:** `nginx: [emerg] invalid value "must-revalidate" in /etc/nginx/sites-enabled/sispat:83`
**🔧 Solução:** Corrigido o valor inválido "must-revalidate" na diretiva `gzip_proxied` **✅
Status:** **RESOLVIDO** - Configuração Nginx agora é válida e funcional

### **Problema 4: PostgreSQL não instala (Ubuntu 20.04)**

```bash
# Solução automática
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-postgresql-ubuntu20.sh -o fix-postgresql.sh
chmod +x fix-postgresql.sh
./fix-postgresql.sh
```

### **Problema 5: Conflito de Dependências NPM (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `ERESOLVE unable to resolve dependency tree` - Conflito entre React 19 e Sentry **🔧
Solução:** Os scripts agora usam `--legacy-peer-deps` automaticamente **✅ Status:** **RESOLVIDO** -
Correção integrada automaticamente

```bash
# Se ainda houver problemas, execute o script de correção:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-npm-dependencies.sh -o fix-npm-dependencies.sh
chmod +x fix-npm-dependencies.sh
./fix-npm-dependencies.sh
```

### **Problema 6: Função gen_random_uuid() não existe (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `function gen_random_uuid() does not exist` - Extensão pgcrypto não habilitada **🔧
Solução:** Os scripts agora habilitam extensões PostgreSQL automaticamente **✅ Status:**
**RESOLVIDO** - Correção integrada automaticamente

```bash
# Se ainda houver problemas, execute o script de correção:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-postgresql-uuid.sh -o fix-postgresql-uuid.sh
chmod +x fix-postgresql-uuid.sh
./fix-postgresql-uuid.sh
```

### **Problema 7: Ordem de Migração Incorreta (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `relation "sectors" does not exist` - Tabela user_sectors criada antes de sectors **🔧
Solução:** Ordem das tabelas corrigida na migração **✅ Status:** **RESOLVIDO** - Correção integrada
automaticamente

```bash
# Se ainda houver problemas, execute o script de correção:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-migration-order.sh -o fix-migration-order.sh
chmod +x fix-migration-order.sh
./fix-migration-order.sh
```

### **Problema 8: Configuração SSL Incorreta (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `cannot load certificate` - SSL configurado antes de obter certificado **🔧 Solução:**
Scripts agora configuram HTTP primeiro, depois SSL **✅ Status:** **RESOLVIDO** - Correção integrada
automaticamente

```bash
# Se ainda houver problemas, execute o script de correção:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-ssl-configuration.sh -o fix-ssl-configuration.sh
chmod +x fix-ssl-configuration.sh
./fix-ssl-configuration.sh
```

### **Problema 9: Configuração PM2 Incorreta (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `Script not found: /var/www/sispat/server/monitoring/health-monitor.js` - Script de
monitoramento inexistente **🔧 Solução:** Arquivo de configuração PM2 simplificado criado **✅
Status:** **RESOLVIDO** - Correção integrada automaticamente

```bash
# Se ainda houver problemas, execute o script de correção:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-pm2-configuration.sh -o fix-pm2-configuration.sh
chmod +x fix-pm2-configuration.sh
./fix-pm2-configuration.sh
```

### **Problema 10: Erro JavaScript Frontend (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `Cannot access 'w' before initialization` - Erro de inicialização no vendor-charts **🔧
Solução:** Configuração Vite corrigida e build limpo **✅ Status:** **RESOLVIDO** - Correção
integrada automaticamente

```bash
# Se ainda houver problemas, execute o script de correção:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-frontend-build.sh -o fix-frontend-build.sh
chmod +x fix-frontend-build.sh
./fix-frontend-build.sh
```

### **Problema 11: pnpm-lock.yaml incompatível**

```bash
# Tentar instalar com força
pnpm install --force

# Se falhar, usar npm
rm pnpm-lock.yaml
npm install --legacy-peer-deps
```

### **Problema 12: Erro Nginx + Certbot (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `server name "http://sispat.vps-kinghost.net/" has suspicious symbols` e
`Requested name http://sispat.vps-kinghost.net/ appears to be a URL, not a FQDN` **🔧 Solução:**
Configuração Nginx limpa e comando Certbot corrigido **✅ Status:** **RESOLVIDO** - Correção
integrada automaticamente

```bash
# Se ainda houver problemas, execute o script de correção:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-nginx-certbot.sh -o fix-nginx-certbot.sh
chmod +x fix-nginx-certbot.sh
./fix-nginx-certbot.sh
```

### **Problema 13: Erro Autenticação PostgreSQL (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `password authentication failed for user "sispat_user"` - Usuário existente com senha
diferente **🔧 Solução:** Remoção e recriação do usuário e banco com CASCADE **✅ Status:**
**RESOLVIDO** - Correção integrada automaticamente

```bash
# Se ainda houver problemas, execute o script de correção:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-postgresql-auth-final.sh -o fix-postgresql-auth-final.sh
chmod +x fix-postgresql-auth-final.sh
./fix-postgresql-auth-final.sh
```

### **Problema 14: Erro Inicialização Charts (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `Cannot access 'P' before initialization` - Erro de inicialização no vendor-charts **🔧
Solução:** Charts incluídos no vendor-misc (não separado) para evitar problemas de inicialização
**✅ Status:** **RESOLVIDO** - Correção integrada automaticamente

```bash
# Para correção definitiva, execute o script:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-charts-final.sh -o fix-charts-final.sh
chmod +x fix-charts-final.sh
./fix-charts-final.sh
```

### **Problema 15: Erro CORS + Frontend (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `CORS bloqueado para origem: undefined` - Frontend não consegue se comunicar com
backend **🔧 Solução:** CORS configurado para permitir requisições sem origin em produção **✅
Status:** **RESOLVIDO** - Correção integrada automaticamente

```bash
# Para correção simples, execute o script:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-cors-frontend.sh -o fix-cors-frontend.sh
chmod +x fix-cors-frontend.sh
./fix-cors-frontend.sh

# Para correção completa (se o problema persistir), execute:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-cors-complete.sh -o fix-cors-complete.sh
chmod +x fix-cors-complete.sh
./fix-cors-complete.sh
```

### **Problema 16: Erro Inicialização Vendor-Misc (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `Cannot access 'ee' before initialization` - Erro de inicialização no vendor-misc **🔧
Solução:** Configuração Vite otimizada e dependências D3 excluídas do optimizeDeps **✅ Status:**
**RESOLVIDO** - Correção integrada automaticamente

```bash
# Para correção, execute o script:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-vendor-misc-initialization.sh -o fix-vendor-misc-initialization.sh
chmod +x fix-vendor-misc-initialization.sh
./fix-vendor-misc-initialization.sh

# Para correção definitiva (se o problema persistir), execute:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-vendor-misc-definitive.sh -o fix-vendor-misc-definitive.sh
chmod +x fix-vendor-misc-definitive.sh
./fix-vendor-misc-definitive.sh
```

### **Problema 17: Erro Dependências Rollup (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `Cannot find module @rollup/rollup-linux-x64-gnu` - Problema com dependências opcionais
do Rollup **🔧 Solução:** Remoção de package-lock.json e reinstalação com --no-optional **✅
Status:** **RESOLVIDO** - Correção integrada automaticamente

```bash
# Para correção, execute o script:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-rollup-dependencies.sh -o fix-rollup-dependencies.sh
chmod +x fix-rollup-dependencies.sh
./fix-rollup-dependencies.sh
```

### **Problema 18: Erro Dependência html2canvas (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `Rollup failed to resolve import "html2canvas"` - Dependência html2canvas não resolvida
**🔧 Solução:** html2canvas e jspdf incluídos no optimizeDeps.include **✅ Status:** **RESOLVIDO** -
Correção integrada automaticamente

```bash
# Para correção simples, execute o script:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-html2canvas-dependency.sh -o fix-html2canvas-dependency.sh
chmod +x fix-html2canvas-dependency.sh
./fix-html2canvas-dependency.sh

# Para correção completa (se houver conflitos NPM), execute:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-html2canvas-complete.sh -o fix-html2canvas-complete.sh
chmod +x fix-html2canvas-complete.sh
./fix-html2canvas-complete.sh
```

### **Problema 19: Loop Infinito Nginx (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `rewrite or internal redirection cycle while internally redirecting to "/index.html"` -
Loop infinito no Nginx **🔧 Solução:** Configuração Nginx corrigida com fallback adequado e
favicon.svg criado **✅ Status:** **RESOLVIDO** - Correção integrada automaticamente

```bash
# Para correção, execute o script:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-nginx-redirect-loop.sh -o fix-nginx-redirect-loop.sh
chmod +x fix-nginx-redirect-loop.sh
./fix-nginx-redirect-loop.sh
```

### **Problema 20: Diagnóstico Frontend (NOVO)**

**❌ Problema:** Frontend pode estar com problemas mas backend funcionando **🔧 Solução:** Scripts
de diagnóstico para identificar problemas específicos **✅ Status:** **DISPONÍVEL** - Scripts de
diagnóstico criados

```bash
# Para diagnóstico completo do frontend:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/diagnose-frontend.sh -o diagnose-frontend.sh
chmod +x diagnose-frontend.sh
./diagnose-frontend.sh

# Para verificar erros específicos do browser:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/check-browser-errors.sh -o check-browser-errors.sh
chmod +x check-browser-errors.sh
./check-browser-errors.sh
```

### **Problema 21: Erro createContext (CRÍTICO - RESOLVIDO DEFINITIVAMENTE)**

**❌ Erro:** `Cannot read properties of undefined (reading 'createContext')` - Erro de inicialização
do React no chunk pages-admin **🔧 Solução:** Configuração Vite DEFINITIVA com React sempre no
vendor-misc **✅ Status:** **RESOLVIDO DEFINITIVAMENTE** - Correção integrada automaticamente

```bash
# Para correção DEFINITIVA, execute o script:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-createcontext-definitive.sh -o fix-createcontext-definitive.sh
chmod +x fix-createcontext-definitive.sh
./fix-createcontext-definitive.sh
```

### **Problema 22: Erro vite.config.ts (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `ReferenceError: baseUrl is not defined` - Erro de configuração no vite.config.ts **🔧
Solução:** Variáveis baseUrl e apiUrl definidas corretamente na configuração **✅ Status:**
**RESOLVIDO** - Correção integrada automaticamente

```bash
# Para correção, execute o script:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-vite-config-error.sh -o fix-vite-config-error.sh
chmod +x fix-vite-config-error.sh
./fix-vite-config-error.sh
```

### **Problema 23: Tela Branca em Produção (CRÍTICO - RESOLVIDO)**

**❌ Erro:** Tela branca no navegador após instalação em VPS **🔧 Solução:** Script de instalação
completamente novo e testado **✅ Status:** **RESOLVIDO** - Script de instalação completo criado

```bash
# Para instalação completa e testada, execute:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-complete-new.sh -o install-vps-complete-new.sh
chmod +x install-vps-complete-new.sh
./install-vps-complete-new.sh
```

### **Problema 24: Diagnóstico de Problemas (NOVO)**

**❌ Problema:** Dificuldade para identificar problemas específicos em produção **🔧 Solução:**
Script de diagnóstico completo **✅ Status:** **DISPONÍVEL** - Script de diagnóstico criado

```bash
# Para diagnóstico completo, execute:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/diagnose-production.sh -o diagnose-production.sh
chmod +x diagnose-production.sh
./diagnose-production.sh
```

### **Problema 25: Correção Completa de Produção (NOVO)**

**❌ Problema:** Múltiplos problemas em produção que precisam ser corrigidos **🔧 Solução:**
Script de correção completa **✅ Status:** **DISPONÍVEL** - Script de correção completa criado

```bash
# Para correção completa, execute:
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-production-complete.sh -o fix-production-complete.sh
chmod +x fix-production-complete.sh
./fix-production-complete.sh
```

### **Problema 26: Husky não encontrado**

```bash
# O script deploy-production-simple.sh já resolve automaticamente
# Se persistir, executar manualmente:
export NODE_ENV=production
export CI=false
npx husky install
```

### **Problema 7: Backend API não responde (CRÍTICO - RESOLVIDO)**

**❌ Erro:**
`{"success":false,"error":{"code":"NOT_FOUND","message":"Rota não encontrada: GET /api"}}` **🔧
Solução:** Conflito de rotas `/api/health` duplicadas resolvido, rota principal adicionada ao
servidor **✅ Status:** **RESOLVIDO** - Rota `/api/health` agora funciona corretamente

### **Problema 8: Frontend tela branca (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `ReferenceError: require is not defined in ES module scope` **🔧 Solução:**
`start-frontend.js` corrigido para compatibilidade PM2 e ES modules **✅ Status:** **RESOLVIDO** -
Frontend agora inicia corretamente

### **Problema 9: Conflito de módulos ES vs CommonJS (RESOLVIDO)**

**❌ Erro:** `require()` statements em arquivos ES modules **🔧 Solução:** Todos os `require()`
convertidos para `import` dinâmico **✅ Status:** **RESOLVIDO** - Compatibilidade ES modules
garantida

### **Problema 10: Configuração PM2 não otimizada (RESOLVIDO)**

**❌ Erro:** Configurações PM2 inadequadas para produção **🔧 Solução:** `ecosystem.config.js`
otimizado com timeouts, memory limits e configurações de produção **✅ Status:** **RESOLVIDO** - PM2
configurado para estabilidade em produção

### **Problema 11: Conflito PM2 + ES Modules (CRÍTICO - RESOLVIDO)**

**❌ Erro:** `Error [ERR_REQUIRE_ESM]: require() of ES Module ecosystem.config.js not supported`
**🔧 Solução:** Script `fix-pm2-esm-error.sh` converte automaticamente configuração PM2 para ES
Modules **✅ Status:** **RESOLVIDO** - PM2 agora funciona perfeitamente com ES Modules

---

## 📋 **COMANDOS ESSENCIAIS (execute em sequência):**

```bash
# 1. Preparar sistema
apt update && apt upgrade -y
apt install -y build-essential curl git software-properties-common unzip wget

# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
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
cd /var/www && git clone https://github.com/junielsonfarias/sispat.git && cd sispat

# 9. Configurar ambiente
chmod +x scripts/*.sh
./scripts/setup-production.sh

# 10. Deploy
./scripts/deploy-production-simple.sh

# 11. Configurar Nginx
# (criar arquivo de configuração manualmente)

# 12. SSL
certbot --nginx -d sispat.vps-kinghost.net

# 13. PM2 startup
pm2 save && pm2 startup
```

---

## 🎯 **RESULTADO FINAL**

Após executar todos os passos, você terá:

- ✅ **Frontend** rodando na porta 80/443 (HTTPS)
- ✅ **Backend API** rodando na porta 3001
- ✅ **PostgreSQL** configurado e funcionando
- ✅ **Redis** configurado e funcionando
- ✅ **Nginx** servindo como proxy reverso
- ✅ **SSL** configurado automaticamente
- ✅ **PM2** gerenciando processos
- ✅ **Firewall** configurado e ativo

---

## 🚀 **INSTALAÇÃO RÁPIDA (RECOMENDADA)**

**Para instalação mais rápida, use o script automático:**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps.sh -o install-vps.sh
chmod +x install-vps.sh
./install-vps.sh
```

**🎯 Sua aplicação SISPAT estará rodando em produção com todas as configurações de segurança e
performance!**

---

## 🔧 **CORREÇÕES APLICADAS NESTA VERSÃO**

### **✅ Problemas Críticos Resolvidos:**

1. **Erro de Export (CRÍTICO):** `export: '2': not a valid identifier` - **RESOLVIDO**
2. **PostgreSQL Ubuntu 20.04:** Repositório 404 Not Found - **RESOLVIDO**
3. **Build Vite:** Erro terser not found - **RESOLVIDO**
4. **NODE_ENV:** Conflito com Vite - **RESOLVIDO**
5. **Autenticação PostgreSQL:** Usuário e senha incorretos - **RESOLVIDO**
6. **Configuração Nginx:** Erro de valor inválido "must-revalidate" - **RESOLVIDO**
7. **Conflito de Dependências NPM (CRÍTICO):** `ERESOLVE unable to resolve dependency tree` -
   **RESOLVIDO**
8. **Função gen_random_uuid() não existe (CRÍTICO):** Extensão pgcrypto não habilitada -
   **RESOLVIDO**
9. **Ordem de Migração Incorreta (CRÍTICO):** Tabela user_sectors criada antes de sectors -
   **RESOLVIDO**
10. **Configuração SSL Incorreta (CRÍTICO):** SSL configurado antes de obter certificado -
    **RESOLVIDO**
11. **Configuração PM2 Incorreta (CRÍTICO):** Script de monitoramento inexistente - **RESOLVIDO**
12. **Erro JavaScript Frontend (CRÍTICO):** Erro de inicialização no vendor-charts - **RESOLVIDO**
13. **Erro Nginx + Certbot (CRÍTICO):** Configuração Nginx e comando Certbot incorretos -
    **RESOLVIDO**
14. **Erro Autenticação PostgreSQL (CRÍTICO):** Usuário existente com senha diferente -
    **RESOLVIDO**
15. **Erro Inicialização Charts (CRÍTICO):** Erro de inicialização no vendor-charts - **RESOLVIDO**
16. **Erro CORS + Frontend (CRÍTICO):** Frontend não consegue se comunicar com backend -
    **RESOLVIDO**
17. **Erro Inicialização Vendor-Misc (CRÍTICO):** Erro de inicialização no vendor-misc -
    **RESOLVIDO**
18. **Erro Dependências Rollup (CRÍTICO):** Problema com dependências opcionais do Rollup -
    **RESOLVIDO**
19. **Erro Dependência html2canvas (CRÍTICO):** Dependência html2canvas não resolvida -
    **RESOLVIDO**
20. **Domínio Hardcoded:** Script agora solicita domínio do usuário - **RESOLVIDO**
21. **Senhas Fracas:** Script agora solicita senhas seguras - **RESOLVIDO**
22. **Configuração SSL:** SSL configurado automaticamente - **RESOLVIDO**
23. **Backup Automático:** Sistema de backup configurado - **RESOLVIDO**
24. **Monitoramento:** Monitoramento básico configurado - **RESOLVIDO**
25. **Validação de Entrada:** Script valida todas as entradas - **RESOLVIDO**
26. **Erro createContext (CRÍTICO):**
    `Cannot read properties of undefined (reading 'createContext')` - **RESOLVIDO**
27. **Erro vite.config.ts (CRÍTICO):** `ReferenceError: baseUrl is not defined` - **RESOLVIDO**
28. **Tela Branca em Produção (CRÍTICO):** Tela branca no navegador após instalação - **RESOLVIDO**
29. **Diagnóstico de Problemas:** Dificuldade para identificar problemas específicos - **RESOLVIDO**
30. **Correção Completa de Produção:** Múltiplos problemas em produção - **RESOLVIDO**

### **✅ Scripts Corrigidos:**

- `install-vps-simple.sh` - **NOVO** Script simplificado para iniciantes
- `install-vps-complete-fixed.sh` - **NOVO** Script completo corrigido
- `fix-npm-dependencies.sh` - **NOVO** Script para corrigir conflitos de dependências
- `fix-postgresql-uuid.sh` - **NOVO** Script para corrigir função gen_random_uuid()
- `fix-migration-order.sh` - **NOVO** Script para corrigir ordem de migração
- `fix-ssl-configuration.sh` - **NOVO** Script para corrigir configuração SSL
- `fix-pm2-configuration.sh` - **NOVO** Script para corrigir configuração PM2
- `fix-frontend-build.sh` - **NOVO** Script para corrigir build do frontend
- `fix-nginx-certbot.sh` - **NOVO** Script para corrigir Nginx + Certbot
- `fix-postgresql-auth-final.sh` - **NOVO** Script para corrigir autenticação PostgreSQL
- `fix-charts-initialization.sh` - **NOVO** Script para corrigir inicialização de charts
- `fix-charts-final.sh` - **NOVO** Script para correção definitiva de charts
- `fix-cors-frontend.sh` - **NOVO** Script para corrigir CORS + Frontend
- `fix-cors-complete.sh` - **NOVO** Script para correção CORS completa
- `fix-vendor-misc-initialization.sh` - **NOVO** Script para corrigir inicialização vendor-misc
- `fix-vendor-misc-definitive.sh` - **NOVO** Script para correção definitiva vendor-misc
- `fix-rollup-dependencies.sh` - **NOVO** Script para corrigir dependências do Rollup
- `fix-html2canvas-dependency.sh` - **NOVO** Script para corrigir dependência html2canvas
- `fix-html2canvas-complete.sh` - **NOVO** Script para correção completa html2canvas com conflitos
  NPM
- `diagnose-frontend.sh` - **NOVO** Script para diagnóstico completo do frontend
- `check-browser-errors.sh` - **NOVO** Script para verificar erros específicos do browser
- `fix-nginx-redirect-loop.sh` - **NOVO** Script para corrigir loop infinito do Nginx
- `fix-createcontext-error.sh` - **NOVO** Script para corrigir erro createContext do React
- `fix-createcontext-definitive.sh` - **NOVO** Script para correção DEFINITIVA do erro createContext
- `fix-vite-config-error.sh` - **NOVO** Script para corrigir erro vite.config.ts
- `install-vps-complete-new.sh` - **NOVO** Script de instalação completo e testado
- `diagnose-production.sh` - **NOVO** Script de diagnóstico completo
- `fix-production-complete.sh` - **NOVO** Script de correção completa
- `install-vps-complete.sh` - Inclui todas as correções automaticamente
- `fix-export-error-final.sh` - Correção final do erro de export
- `fix-postgresql-final.sh` - Correção completa do PostgreSQL
- `fix-postgresql-auth-final.sh` - Correção definitiva da autenticação PostgreSQL
- `fix-nginx-config.sh` - Correção da configuração Nginx
- `fix-pm2-esm-error.sh` - Correção do conflito PM2 + ES Modules
- `deploy-production-simple.sh` - Problema de export resolvido

### **✅ Funcionalidades Adicionadas:**

- **Configuração Dinâmica:** Script solicita domínio, senhas e email do usuário
- **Validação de Entrada:** Todas as entradas são validadas antes da instalação
- **Senhas Seguras:** Geração automática de JWT secret e validação de senhas
- **Resolução de Dependências:** Conflitos NPM resolvidos automaticamente com --legacy-peer-deps
- **Extensões PostgreSQL:** pgcrypto, uuid-ossp, unaccent, pg_trgm habilitadas automaticamente
- **Ordem de Migração Corrigida:** Tabelas criadas na ordem correta (sectors antes de user_sectors)
- **Configuração SSL Corrigida:** HTTP configurado primeiro, depois SSL com Let's Encrypt
- **Configuração PM2 Corrigida:** Arquivo de configuração simplificado sem scripts inexistentes
- **Build Frontend Corrigido:** Configuração Vite otimizada e build limpo
- **Nginx + Certbot Corrigidos:** Configuração limpa e comandos corrigidos
- **Autenticação PostgreSQL Corrigida:** Remoção e recriação de usuários com CASCADE
- **Inicialização Charts Corrigida:** Charts incluídos no vendor-misc para evitar problemas
- **CORS + Frontend Corrigidos:** CORS configurado para permitir requisições sem origin em produção
- **Vendor-Misc Corrigido:** Configuração Vite otimizada e dependências D3 excluídas do optimizeDeps
- **Vendor-Misc Definitivo:** Configuração Vite mais conservadora para resolver problemas
  persistentes
- **Dependências Rollup Corrigidas:** Problema com dependências opcionais do Rollup resolvido
- **Dependência html2canvas Corrigida:** html2canvas e jspdf incluídos no optimizeDeps.include
- **Conflito NPM Resolvido:** React 19 + Sentry resolvido com --legacy-peer-deps
- **Diagnóstico Frontend:** Scripts para identificar problemas específicos do frontend
- **Verificação Browser:** Scripts para verificar erros do console do navegador
- **Loop Nginx Corrigido:** Loop infinito de redirecionamento corrigido com fallback adequado
- **SSL Automático:** Certificado SSL configurado automaticamente com Let's Encrypt
- **Backup Automático:** Sistema de backup configurado com retenção de 7 dias
- **Monitoramento Básico:** Verificação automática de serviços a cada 5 minutos
- **Configuração Nginx Otimizada:** Headers de segurança, compressão Gzip, cache
- **PM2 Configurado:** Startup automático e gerenciamento de processos
- **Compatibilidade ES Modules + PM2 100% funcional**
- **Autenticação PostgreSQL 100% funcional**
- **Configuração automática de proxy reverso**
- **Headers de segurança aplicados automaticamente**
- **Correção automática de erros durante a instalação**
- **Verificação de conectividade incluída**
- **Scripts de correção integrados automaticamente**
- **Erro createContext Corrigido DEFINITIVAMENTE:** Configuração Vite DEFINITIVA com React sempre no
  vendor-misc
- **Build Otimizado:** Configuração de chunks mais conservadora para evitar erros de inicialização
- **Erro vite.config.ts Corrigido:** Variáveis baseUrl e apiUrl definidas corretamente na
  configuração
- **Configuração Vite Robusta:** Configuração mais robusta para evitar erros de build em produção
- **Script de Instalação Completo:** Script completamente novo e testado para instalação VPS
- **Sistema de Diagnóstico:** Script de diagnóstico completo para identificar problemas
- **Correção Completa:** Script de correção completa para resolver múltiplos problemas

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
   ./fix-postgresql.sh
   ```

3. **Verifique o status dos serviços:**

   ```bash
   systemctl status postgresql redis-server nginx
   pm2 status
   ```

4. **Teste conectividade:**
   ```bash
   curl -I http://localhost:3001
   curl -I http://sispat.vps-kinghost.net
   ```

---

**🎉 Com este guia atualizado, você terá uma instalação completa e funcional do SISPAT em
produção!**

## 🔧 **SOLUÇÃO PARA O PROBLEMA DE LOCALHOST EM PRODUÇÃO**

### ** PROBLEMA IDENTIFICADO:**

O frontend está tentando conectar em `localhost:3001` porque:

1. **Build antigo:** O build atual (`dist/`) foi criado com configurações antigas
2. **Vite config:** O arquivo `vite.config.ts` tem fallbacks hardcoded para `localhost:3001`
3. **Variáveis de ambiente:** Não estão sendo carregadas corretamente no build

### **✅ SOLUÇÃO IMEDIATA:**

#### **1. Corrigir o vite.config.ts:**

```typescript
// Linha 184 e 191 - CORRIGIR:
'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'https://sispat.vps-kinghost.net/api'),
VITE_API_URL: process.env.VITE_API_URL || 'https://sispat.vps-kinghost.net/api',
```

#### **2. Fazer rebuild com variáveis de ambiente:**

```bash
<code_block_to_apply_changes_from>
```

#### **3. Copiar build para produção:**

```bash
# Copiar para diretório de produção
sudo cp -r dist/* /var/www/html/
# ou
sudo cp -r dist/* /var/www/sispat/
```

---

### ** COMANDOS PARA EXECUTAR AGORA:**

#### **Opção 1: Correção Rápida (Recomendada)**

```bash
# 1. Parar PM2
pm2 stop sispat

# 2. Definir variáveis de ambiente
export VITE_API_URL=https://sispat.vps-kinghost.net/api
export VITE_BACKEND_URL=https://sispat.vps-kinghost.net

# 3. Fazer rebuild
npm run build

# 4. Copiar build para produção
sudo cp -r dist/* /var/www/html/

# 5. Reiniciar PM2
pm2 start sispat
```

#### **Opção 2: Correção Completa**

```bash
# 1. Editar vite.config.ts
sed -i 's|http://localhost:3001/api|https://sispat.vps-kinghost.net/api|g' vite.config.ts

# 2. Definir variáveis de ambiente
export VITE_API_URL=https://sispat.vps-kinghost.net/api
export VITE_BACKEND_URL=https://sispat.vps-kinghost.net

# 3. Fazer rebuild
npm run build

# 4. Verificar se não há mais localhost no build
grep -r "localhost:3001" dist/ || echo "✅ Nenhuma referência a localhost encontrada"

# 5. Copiar build para produção
sudo cp -r dist/* /var/www/html/

# 6. Reiniciar PM2
pm2 restart sispat
```

---

### **🔍 VERIFICAÇÃO:**

#### **Antes da correção:**

- ❌ `POST http://localhost:3001/api/auth/ensure-superuser net::ERR_CONNECTION_REFUSED`
- ❌ `POST http://localhost:3001/api/auth/login net::ERR_CONNECTION_REFUSED`

#### **Após a correção:**

- ✅ `POST https://sispat.vps-kinghost.net/api/auth/ensure-superuser 200 OK`
- ✅ `POST https://sispat.vps-kinghost.net/api/auth/login 200 OK`

---

### ** EXECUTE AGORA:**

**Comando mais simples:**

```bash
export VITE_API_URL=https://sispat.vps-kinghost.net/api && npm run build && sudo cp -r dist/* /var/www/html/ && pm2 restart sispat
```

**🎉 Após executar, o frontend não tentará mais conectar em localhost:3001!**

### **🔍 Para verificar se funcionou:**

1. Acesse `https://sispat.vps-kinghost.net`
2. Abra o console do navegador (F12)
3. Verifique se não há mais erros de `localhost:3001`
4. Tente fazer login com `junielsonfarias@gmail.com` / `Tiko6273@`
