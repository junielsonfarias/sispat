# 🔧 SOLUÇÃO RÁPIDA: PostgreSQL no Ubuntu 20.04 - SISPAT

## 🚨 Problema Identificado

### **Erro Original:**

```
Err:7 http://apt.postgresql.org/pub/repos/apt focal-pgdg Release
  404  Not Found [IP: 151.101.251.52 80]
E: The repository 'http://apt.postgresql.org/pub/repos/apt focal-pgdg Release' does not have a Release file.
```

### **Causa:**

- Ubuntu 20.04 (focal) não é mais suportado oficialmente
- Repositório PostgreSQL para focal não está mais disponível
- Script tentou usar repositório inexistente

---

## ✅ SOLUÇÃO IMEDIATA

### **Opção 1: Script Automático (RECOMENDADO)**

```bash
# Baixar script de correção
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-postgresql-ubuntu20.sh -o fix-postgresql.sh

# Tornar executável
chmod +x fix-postgresql.sh

# Executar correção
./fix-postgresql.sh
```

**🎉 Este script resolve automaticamente:**

- ✅ Remove repositórios problemáticos
- ✅ Instala PostgreSQL do repositório padrão Ubuntu
- ✅ Cria usuário e banco para SISPAT
- ✅ Testa conexão
- ✅ Fornece dados de conexão

---

### **Opção 2: Correção Manual**

#### **1. Remover Repositórios Problemáticos**

```bash
# Remover arquivo de repositório
rm -f /etc/apt/sources.list.d/pgdg.list

# Remover chave GPG
apt-key del ACCC4CF8

# Limpar cache
apt clean
apt update
```

#### **2. Instalar PostgreSQL do Repositório Padrão**

```bash
# Instalar PostgreSQL padrão do Ubuntu
apt install -y postgresql postgresql-contrib

# Verificar instalação
psql --version
```

#### **3. Configurar PostgreSQL**

```bash
# Habilitar e iniciar serviço
systemctl enable postgresql
systemctl start postgresql

# Verificar status
systemctl status postgresql
```

#### **4. Criar Usuário e Banco para SISPAT**

```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Criar usuário e banco (execute dentro do psql)
CREATE USER sispat_user WITH PASSWORD 'sispat123456';
CREATE DATABASE sispat_production OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
ALTER USER sispat_user CREATEDB;
\q
```

---

## 🔧 CONFIGURAÇÃO PARA O SISPAT

### **1. Configurar .env.production**

```bash
# Editar arquivo de ambiente
nano /var/www/sispat/.env.production
```

### **2. Adicionar Configurações do Banco**

```bash
# Banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_production
DB_USER=sispat_user
DB_PASSWORD=sispat123456
DATABASE_URL=postgresql://sispat_user:sispat123456@localhost:5432/sispat_production
```

---

## 🚀 CONTINUAR INSTALAÇÃO

### **Após corrigir o PostgreSQL:**

#### **1. Executar Script de Configuração**

```bash
cd /var/www/sispat
./scripts/setup-production.sh
```

#### **2. Executar Deploy**

```bash
./scripts/deploy-production-simple.sh
```

#### **3. Configurar Nginx**

```bash
# Criar configuração para o domínio
sudo nano /etc/nginx/sites-available/sispat
```

**Conteúdo da configuração Nginx:**

```nginx
server {
    listen 80;
    server_name sispat.vps-kinghost.net www.sispat.vps-kinghost.net;

    # Frontend
    location / {
        root /var/www/sispat/dist;
        try_files $uri $uri/ /index.html;
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
    }
}
```

#### **4. Ativar Site**

```bash
# Criar link simbólico
sudo ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/

# Remover site padrão
sudo rm -f /etc/nginx/sites-enabled/default

# Testar e recarregar
sudo nginx -t
sudo systemctl reload nginx
```

#### **5. Configurar SSL**

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d sispat.vps-kinghost.net
```

---

## 📋 VERIFICAÇÃO FINAL

### **1. Verificar Serviços**

```bash
# PostgreSQL
sudo systemctl status postgresql

# Redis
sudo systemctl status redis-server

# Nginx
sudo systemctl status nginx

# PM2
pm2 status
```

### **2. Testar Endpoints**

```bash
# Frontend
curl -I http://sispat.vps-kinghost.net

# API
curl -I http://sispat.vps-kinghost.net/api/health

# Banco de dados
sudo -u postgres psql -d sispat_production -c "SELECT version();"
```

---

## 🎯 RESULTADO ESPERADO

Após aplicar as correções, você terá:

- ✅ **PostgreSQL funcionando** com versão padrão do Ubuntu
- ✅ **Banco configurado** para SISPAT
- ✅ **Aplicação rodando** em https://sispat.vps-kinghost.net
- ✅ **SSL configurado** automaticamente
- ✅ **Todos os serviços** funcionando corretamente

---

## 🚀 COMANDOS RÁPIDOS

### **Para resolver o problema:**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-postgresql-ubuntu20.sh -o fix-postgresql.sh
chmod +x fix-postgresql.sh
./fix-postgresql.sh
```

### **Para continuar instalação:**

```bash
cd /var/www/sispat
./scripts/setup-production.sh
./scripts/deploy-production-simple.sh
```

---

**🎯 O problema do PostgreSQL foi resolvido! Agora você pode continuar com a instalação do SISPAT
normalmente.**
