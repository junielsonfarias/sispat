# 🚀 Guia Completo de Instalação do SISPAT 2.0 em VPS

**Versão:** 2.0.4  
**Última atualização:** 13/10/2025  
**Tempo estimado:** 15-30 minutos  
**Nível:** Iniciante a Intermediário

---

## 📋 Índice

1. [Pré-requisitos](#-pré-requisitos)
2. [Preparação do Servidor](#-preparação-do-servidor)
3. [Instalação Automática](#-instalação-automática)
4. [Instalação Manual (Opção Avançada)](#-instalação-manual-opção-avançada)
5. [Configuração Pós-Instalação](#-configuração-pós-instalação)
6. [Verificação da Instalação](#-verificação-da-instalação)
7. [Solução de Problemas](#-solução-de-problemas)
8. [Manutenção e Backup](#-manutenção-e-backup)
9. [Atualização do Sistema](#-atualização-do-sistema)

---

## 🔧 Pré-requisitos

### Servidor VPS

**Especificações Mínimas:**
- **Sistema Operacional:** Debian 11/12 ou Ubuntu 20.04/22.04/24.04 LTS
- **RAM:** 4GB (mínimo 2GB)
- **Disco:** 50GB SSD (mínimo 20GB)
- **CPU:** 2 vCPUs (mínimo 1 vCPU)
- **Rede:** IP público fixo

**Especificações Recomendadas:**
- **RAM:** 8GB ou mais
- **Disco:** 100GB SSD ou mais
- **CPU:** 4 vCPUs ou mais
- **Swap:** 4GB configurado

### Domínio e DNS

- **Domínio registrado:** Exemplo: `sispat.prefeitura.com.br`
- **DNS configurado:** Registro A apontando para o IP do VPS
- **Propagação DNS:** Aguardar 1-24h após configuração

**Como configurar DNS:**
```
Tipo: A
Nome: sispat (ou @)
Valor: [IP do seu VPS]
TTL: 3600
```

### Informações Necessárias

Antes de iniciar, tenha em mãos:

1. **Acesso SSH:** `ssh root@seu-servidor.com`
2. **Email administrativo:** Para certificado SSL e recuperação
3. **Credenciais:** Email e senha para o superusuário
4. **Informações do município:**
   - Nome completo da prefeitura/órgão
   - Estado (UF)
   - Logo (opcional, pode adicionar depois)

---

## 🖥️ Preparação do Servidor

### 1. Conectar ao Servidor

```bash
# Linux/Mac
ssh root@seu-servidor.com

# Windows (PowerShell)
ssh root@seu-servidor.com

# Ou use PuTTY no Windows
```

### 2. Atualizar Sistema

```bash
# Atualizar lista de pacotes
apt update

# Atualizar pacotes instalados
apt upgrade -y

# Reiniciar se necessário
reboot
```

### 3. Configurar Timezone (Opcional)

```bash
# Listar timezones disponíveis
timedatectl list-timezones | grep Brazil

# Configurar timezone (exemplo: São Paulo)
timedatectl set-timezone America/Sao_Paulo

# Verificar
timedatectl
```

### 4. Configurar Swap (Recomendado para VPS com pouca RAM)

```bash
# Verificar se já existe swap
free -h

# Se não houver swap ou for pequeno, criar 4GB
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Tornar permanente
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Verificar
free -h
```

---

## 🚀 Instalação Automática

### Método Recomendado: Script Automatizado

O SISPAT 2.0 inclui um instalador automático que configura tudo para você.

#### 1. Baixar o Script

```bash
# Baixar script de instalação
wget https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh

# Dar permissão de execução
chmod +x install.sh
```

#### 2. Executar o Instalador

```bash
# Executar como root
sudo bash install.sh
```

#### 3. Responder às Perguntas

O instalador fará **8 perguntas simples:**

**Pergunta 1: Domínio do Sistema**
```
Digite o endereço do seu site (sem http://)
Exemplo: sispat.prefeitura.com.br
```

**Pergunta 2: Seu Email (Superusuário)**
```
Email do administrador principal
Exemplo: admin@prefeitura.com.br
```

**Pergunta 3: Seu Nome Completo**
```
Nome que aparecerá no sistema
Exemplo: João Silva
```

**Pergunta 4: Credenciais do Supervisor**
```
Email: supervisor@sistema.com
Senha: (mínimo 12 caracteres, maiúsculas, números, símbolos)
Nome: Supervisor do Sistema
```

**Pergunta 5: Senha do Banco de Dados**
```
Senha PostgreSQL (ou pressione ENTER para usar padrão)
```

**Pergunta 6: Sua Senha de Acesso**
```
Senha que você usará para fazer login
Recomendação: Use uma senha forte!
```

**Pergunta 7: Nome do Município/Órgão**
```
Exemplo: Prefeitura Municipal de Vista Serrana
```

**Pergunta 8: Estado (UF)**
```
Exemplo: PB, SP, RJ, MG, etc.
```

**Pergunta Adicional: SSL/HTTPS**
```
Deseja configurar SSL automaticamente? [S/n]
⚠️ Importante: DNS deve estar apontando para o servidor!
```

#### 4. Aguardar Instalação

O instalador executará **5 fases automaticamente:**

```
📦 FASE 1/5: Instalando dependências do sistema (5-10 min)
   ✓ Node.js 18
   ✓ PNPM
   ✓ PM2
   ✓ PostgreSQL 15
   ✓ Nginx
   ✓ Certbot (se SSL habilitado)

📦 FASE 2/5: Configurando ambiente (2-3 min)
   ✓ Banco de dados PostgreSQL
   ✓ Código do GitHub
   ✓ Variáveis de ambiente

📦 FASE 3/5: Compilando aplicação (5-10 min) ☕
   ✓ Dependências do frontend
   ✓ Build do frontend (React/TypeScript)
   ✓ Dependências do backend
   ✓ Build do backend (Node.js/TypeScript)

📦 FASE 4/5: Configurando banco e usuários (1-2 min)
   ✓ Prisma Client
   ✓ Migrações do banco
   ✓ Criação do superusuário
   ✓ Dados iniciais

📦 FASE 5/5: Iniciando sistema (2-3 min)
   ✓ Configuração do Nginx
   ✓ Serviço systemd
   ✓ Firewall (UFW)
   ✓ Permissões
   ✓ Iniciar com PM2
   ✓ Certificado SSL (se habilitado)
   ✓ Backup automático
   ✓ Monitoramento
```

#### 5. Instalação Concluída!

Ao final, você verá:

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║              🎉  INSTALAÇÃO CONCLUÍDA COM SUCESSO!  🎉            ║
║                                                                   ║
║                  O SISPAT 2.0 ESTÁ FUNCIONANDO!                   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

🌐 ENDEREÇO DO SISTEMA:
   https://seu-dominio.com.br

🔐 SUAS CREDENCIAIS DE ACESSO:

👑 SUPERUSUÁRIO:
   📧 Email: seu-email@dominio.com
   🔑 Senha: sua-senha
   👤 Nome: Seu Nome

👨‍💼 SUPERVISOR:
   📧 Email: supervisor@sistema.com
   🔑 Senha: senha-supervisor
   👤 Nome: Supervisor do Sistema

⚠️  SEGURANÇA: ALTERE SUA SENHA APÓS O PRIMEIRO ACESSO!
```

---

## 🔨 Instalação Manual (Opção Avançada)

Se preferir instalar manualmente ou o script automático falhar:

### 1. Instalar Dependências

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar ferramentas básicas
apt install -y curl wget git build-essential software-properties-common

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Instalar PNPM
npm install -g pnpm

# Instalar PM2
npm install -g pm2

# Instalar PostgreSQL
apt install -y postgresql postgresql-contrib

# Instalar Nginx
apt install -y nginx

# Instalar Certbot (para SSL)
apt install -y certbot python3-certbot-nginx
```

### 2. Configurar PostgreSQL

```bash
# Conectar ao PostgreSQL
sudo -u postgres psql

# Criar banco e usuário (dentro do psql)
CREATE DATABASE sispat_prod;
CREATE USER sispat_user WITH PASSWORD 'sua_senha_segura';
GRANT ALL PRIVILEGES ON DATABASE sispat_prod TO sispat_user;
ALTER DATABASE sispat_prod OWNER TO sispat_user;
\q
```

### 3. Clonar Repositório

```bash
# Criar diretório
mkdir -p /var/www/sispat

# Clonar código
git clone https://github.com/junielsonfarias/sispat.git /var/www/sispat

# Entrar no diretório
cd /var/www/sispat
```

### 4. Configurar Variáveis de Ambiente

**Frontend (.env):**

```bash
cat > .env << 'EOF'
VITE_API_URL=https://seu-dominio.com.br/api
VITE_USE_BACKEND=true
VITE_APP_NAME=SISPAT 2.0
VITE_APP_VERSION=2.0.0
VITE_APP_ENV=production
VITE_BUILD_OPTIMIZE=true
VITE_BUILD_COMPRESS=true
VITE_ENABLE_DEVTOOLS=false
VITE_ENABLE_LOGGING=false
EOF
```

**Backend (backend/.env):**

```bash
cat > backend/.env << 'EOF'
NODE_ENV=production
PORT=3000

DATABASE_URL="postgresql://sispat_user:sua_senha@localhost:5432/sispat_prod"
DATABASE_SSL=false
DATABASE_POOL_SIZE=20

JWT_SECRET="sua_chave_secreta_aqui_64_caracteres_ou_mais"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

FRONTEND_URL="https://seu-dominio.com.br"
CORS_ORIGIN="https://seu-dominio.com.br"
CORS_CREDENTIALS=true

BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
MAX_REQUEST_SIZE=10mb

MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"

LOG_LEVEL=error
LOG_FILE="./logs/app.log"
EOF

# Gerar JWT_SECRET seguro
JWT_SECRET=$(openssl rand -hex 64)
sed -i "s|sua_chave_secreta_aqui_64_caracteres_ou_mais|$JWT_SECRET|g" backend/.env
```

### 5. Build da Aplicação

```bash
# Build Frontend
npm install --legacy-peer-deps
npm run build

# Build Backend
cd backend
npm install
npm run build
cd ..
```

### 6. Configurar Banco de Dados

```bash
cd backend

# Gerar Prisma Client
npx prisma generate

# Executar migrações
npx prisma migrate deploy

# Popular banco (seed)
npm run prisma:seed

cd ..
```

### 7. Configurar Nginx

```bash
cat > /etc/nginx/sites-available/sispat << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name seu-dominio.com.br;
    
    location / {
        root /var/www/sispat/dist;
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /uploads/ {
        alias /var/www/sispat/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    location /health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar e recarregar
nginx -t
systemctl reload nginx
```

### 8. Configurar SSL

```bash
# Obter certificado (DNS deve estar configurado!)
certbot --nginx -d seu-dominio.com.br

# Renovação automática já está configurada pelo Certbot
```

### 9. Iniciar Aplicação

```bash
cd /var/www/sispat/backend

# Iniciar com PM2
pm2 start dist/index.js --name sispat-backend

# Salvar configuração
pm2 save

# Configurar inicialização automática
pm2 startup
```

### 10. Configurar Permissões

```bash
# Criar diretórios necessários
mkdir -p /var/www/sispat/backend/uploads
mkdir -p /var/www/sispat/backend/logs
mkdir -p /var/www/sispat/backend/backups

# Configurar permissões
chown -R www-data:www-data /var/www/sispat
chmod 755 /var/www/sispat/backend/uploads
chmod 755 /var/www/sispat/backend/logs
```

---

## ⚙️ Configuração Pós-Instalação

### 1. Primeiro Acesso

1. Acesse `https://seu-dominio.com.br`
2. Faça login com as credenciais do superusuário
3. **IMPORTANTE:** Altere sua senha imediatamente!

**Como alterar senha:**
- Clique no seu nome (canto superior direito)
- Selecione "Perfil" → "Alterar Senha"
- Use senha forte: mínimo 8 caracteres, maiúsculas, minúsculas, números e símbolos

### 2. Upload da Logo

1. Vá em "Configurações" → "Personalização"
2. Clique em "Upload de Logo"
3. Selecione a logo da prefeitura (PNG ou JPG, até 10MB)
4. Clique em "Salvar"

### 3. Criar Setores

1. Vá em "Cadastros" → "Setores"
2. Clique em "Novo Setor"
3. Preencha as informações:
   - Nome: Secretaria Municipal de Administração
   - Sigla: SEMAD
   - Código: SEMAD-001
   - Descrição, Endereço, CNPJ (opcional)

### 4. Criar Usuários

1. Vá em "Usuários" → "Novo Usuário"
2. Preencha:
   - Nome completo
   - Email
   - Senha (será enviada por email ou informada pessoalmente)
   - Perfil: Admin, Supervisor, Usuário ou Visualizador
   - Setores responsáveis (se aplicável)

**Perfis disponíveis:**
- **Superusuário:** Controle total (criado na instalação)
- **Admin:** Acesso total, pode criar usuários
- **Supervisor:** Acesso total, pode criar usuários
- **Usuário:** Pode criar e editar patrimônios nos setores atribuídos
- **Visualizador:** Apenas visualiza patrimônios dos setores atribuídos

### 5. Cadastrar Tipos de Bens

1. Vá em "Cadastros" → "Tipos de Bens"
2. Adicione tipos comuns:
   - Veículos (vida útil: 10 anos)
   - Computadores (vida útil: 5 anos)
   - Móveis e Utensílios (vida útil: 10 anos)
   - Equipamentos (vida útil: 10 anos)

### 6. Cadastrar Formas de Aquisição

1. Vá em "Cadastros" → "Formas de Aquisição"
2. Adicione formas comuns:
   - Compra
   - Doação
   - Permuta
   - Cessão
   - Produção Própria

---

## ✅ Verificação da Instalação

### Testes Básicos

```bash
# 1. Verificar se PM2 está rodando
pm2 status

# Deve mostrar:
# ┌─────┬──────────────────┬─────────┬────────┐
# │ id  │ name             │ status  │ cpu    │
# ├─────┼──────────────────┼─────────┼────────┤
# │ 0   │ sispat-backend   │ online  │ 0%     │
# └─────┴──────────────────┴─────────┴────────┘

# 2. Verificar logs do PM2
pm2 logs sispat-backend --lines 50

# 3. Verificar Nginx
systemctl status nginx

# 4. Verificar PostgreSQL
systemctl status postgresql

# 5. Testar API health check
curl http://localhost:3000/api/health

# Deve retornar: {"status":"ok","timestamp":"..."}

# 6. Testar acesso externo
curl https://seu-dominio.com.br/api/health

# 7. Verificar certificado SSL
curl -I https://seu-dominio.com.br

# Deve retornar HTTP/2 200 (se SSL estiver configurado)
```

### Checklist de Verificação

- [ ] PM2 mostra status "online"
- [ ] Nginx está ativo
- [ ] PostgreSQL está ativo
- [ ] API responde em `/api/health`
- [ ] Frontend carrega no navegador
- [ ] Login funciona
- [ ] SSL/HTTPS está ativo (cadeado verde)
- [ ] Upload de logo funciona
- [ ] Criação de setor funciona
- [ ] Criação de patrimônio funciona

---

## 🔧 Solução de Problemas

### Problema: PM2 não está rodando

```bash
# Ver logs de erro
pm2 logs sispat-backend --err --lines 100

# Reiniciar aplicação
pm2 restart sispat-backend

# Se não resolver, reiniciar do zero
pm2 delete sispat-backend
cd /var/www/sispat/backend
pm2 start dist/index.js --name sispat-backend
pm2 save
```

### Problema: Erro ao conectar ao banco

```bash
# Verificar se PostgreSQL está rodando
systemctl status postgresql

# Reiniciar PostgreSQL
systemctl restart postgresql

# Testar conexão
sudo -u postgres psql -d sispat_prod -c "SELECT 1;"

# Verificar DATABASE_URL no .env
cat /var/www/sispat/backend/.env | grep DATABASE_URL

# Deve estar: postgresql://sispat_user:senha@localhost:5432/sispat_prod
```

### Problema: Erro 502 Bad Gateway (Nginx)

```bash
# Verificar se backend está rodando
pm2 status

# Ver logs do Nginx
tail -f /var/log/nginx/error.log

# Verificar porta
netstat -tlnp | grep 3000

# Deve mostrar: tcp ... 0.0.0.0:3000 ... LISTEN pid/node

# Reiniciar Nginx
systemctl restart nginx
```

### Problema: SSL não foi configurado

```bash
# Verificar DNS primeiro
host seu-dominio.com.br

# Deve retornar o IP do seu VPS

# Obter certificado manualmente
certbot --nginx -d seu-dominio.com.br

# Testar renovação
certbot renew --dry-run
```

### Problema: Erro ao fazer build

```bash
# Ver logs completos
cat /tmp/build-backend.log
cat /tmp/build-frontend.log

# Limpar e tentar novamente
cd /var/www/sispat
rm -rf node_modules backend/node_modules
npm cache clean --force

# Reinstalar
npm install --legacy-peer-deps
cd backend && npm install && cd ..

# Rebuild
npm run build
cd backend && npm run build && cd ..
```

### Problema: Disco cheio

```bash
# Verificar espaço
df -h

# Limpar logs antigos
find /var/log -type f -name "*.log" -mtime +30 -delete
pm2 flush

# Limpar cache
apt-get clean
npm cache clean --force

# Limpar pacotes não usados
apt-get autoremove -y
```

### Problema: Sistema lento (pouca RAM)

```bash
# Verificar uso de memória
free -h
pm2 monit

# Adicionar ou aumentar swap
# (Ver seção "Configurar Swap" acima)

# Otimizar PM2
pm2 delete sispat-backend
pm2 start dist/index.js --name sispat-backend --max-memory-restart 500M
pm2 save
```

---

## 💾 Manutenção e Backup

### Backup Manual do Banco de Dados

```bash
# Criar backup
sudo -u postgres pg_dump sispat_prod > /var/backups/sispat/backup_$(date +%Y%m%d_%H%M%S).sql

# Comprimir backup
gzip /var/backups/sispat/backup_*.sql
```

### Restaurar Backup

```bash
# Descomprimir
gunzip /var/backups/sispat/backup_XXXXXXXX_XXXXXX.sql.gz

# Restaurar (CUIDADO: Isso sobrescreve o banco!)
sudo -u postgres psql sispat_prod < /var/backups/sispat/backup_XXXXXXXX_XXXXXX.sql
```

### Backup Automático (Já Configurado)

O instalador configura backup automático diário às 2h da manhã.

```bash
# Ver configuração do cron
crontab -l

# Ver logs de backup
cat /var/log/sispat/backup.log

# Testar backup manualmente
/var/www/sispat/scripts/backup.sh
```

### Backup dos Uploads

```bash
# Fazer backup da pasta de uploads
tar -czf /var/backups/sispat/uploads_$(date +%Y%m%d).tar.gz /var/www/sispat/backend/uploads
```

### Monitoramento

```bash
# Ver status geral
pm2 monit

# Ver métricas
pm2 describe sispat-backend

# Ver uso de recursos
htop

# Ver logs em tempo real
pm2 logs sispat-backend --lines 100
tail -f /var/log/nginx/access.log
```

---

## 🔄 Atualização do Sistema

### Atualizar para Nova Versão

```bash
# 1. Fazer backup primeiro!
sudo -u postgres pg_dump sispat_prod > /var/backups/sispat/pre_update_$(date +%Y%m%d).sql

# 2. Parar aplicação
pm2 stop sispat-backend

# 3. Fazer backup dos uploads
cp -r /var/www/sispat/backend/uploads /var/backups/sispat/uploads_backup

# 4. Atualizar código
cd /var/www/sispat
git pull origin main

# 5. Atualizar dependências
npm install --legacy-peer-deps
cd backend && npm install && cd ..

# 6. Rebuild
npm run build
cd backend && npm run build && cd ..

# 7. Aplicar migrações do banco
cd backend
npx prisma migrate deploy
cd ..

# 8. Reiniciar aplicação
pm2 restart sispat-backend

# 9. Verificar
pm2 logs sispat-backend --lines 50
curl http://localhost:3000/api/health
```

### Rollback em Caso de Erro

```bash
# Parar aplicação
pm2 stop sispat-backend

# Voltar para versão anterior
cd /var/www/sispat
git log --oneline -10  # Ver commits
git reset --hard [COMMIT_HASH]  # Hash do commit estável

# Rebuild
npm install --legacy-peer-deps
npm run build
cd backend && npm install && npm run build && cd ..

# Restaurar banco se necessário
sudo -u postgres psql sispat_prod < /var/backups/sispat/pre_update_XXXXXXXX.sql

# Reiniciar
pm2 restart sispat-backend
```

---

## 📚 Comandos Úteis

### PM2 (Gerenciamento do Backend)

```bash
pm2 status                     # Ver status
pm2 logs sispat-backend        # Ver logs em tempo real
pm2 restart sispat-backend     # Reiniciar
pm2 stop sispat-backend        # Parar
pm2 start sispat-backend       # Iniciar
pm2 delete sispat-backend      # Remover
pm2 monit                      # Monitoramento interativo
pm2 flush                      # Limpar logs
```

### Nginx (Servidor Web)

```bash
systemctl status nginx         # Ver status
systemctl restart nginx        # Reiniciar
systemctl reload nginx         # Recarregar configuração
nginx -t                       # Testar configuração
tail -f /var/log/nginx/error.log  # Ver logs de erro
```

### PostgreSQL (Banco de Dados)

```bash
systemctl status postgresql    # Ver status
systemctl restart postgresql   # Reiniciar
sudo -u postgres psql          # Conectar ao psql
sudo -u postgres psql -d sispat_prod  # Conectar ao banco

# Dentro do psql:
\l                            # Listar bancos
\c sispat_prod                # Conectar ao banco
\dt                           # Listar tabelas
\q                            # Sair
```

### Sistema

```bash
df -h                         # Espaço em disco
free -h                       # Memória RAM
htop                          # Processos e recursos
netstat -tlnp                 # Portas em uso
systemctl list-units --failed  # Serviços com erro
```

---

## 🆘 Suporte

### Documentação

- **GitHub:** [https://github.com/junielsonfarias/sispat](https://github.com/junielsonfarias/sispat)
- **Issues:** [https://github.com/junielsonfarias/sispat/issues](https://github.com/junielsonfarias/sispat/issues)
- **Wiki:** [https://github.com/junielsonfarias/sispat/wiki](https://github.com/junielsonfarias/sispat/wiki)

### Arquivos de Log

```bash
# Backend (PM2)
pm2 logs sispat-backend

# Nginx
/var/log/nginx/access.log
/var/log/nginx/error.log

# Sistema
/var/log/syslog

# Instalação
/var/log/sispat-install.log
```

### Informações para Suporte

Ao reportar problemas, inclua:

1. **Sistema operacional:** `lsb_release -a`
2. **Versão Node.js:** `node -v`
3. **Status PM2:** `pm2 status`
4. **Logs:** `pm2 logs sispat-backend --lines 100`
5. **Nginx:** `nginx -t`
6. **Banco:** `sudo -u postgres psql -d sispat_prod -c "SELECT version();"`

---

## 🎉 Conclusão

Parabéns! Você instalou com sucesso o SISPAT 2.0 em seu servidor VPS.

**Próximos Passos:**

1. ✅ Altere sua senha
2. ✅ Configure a logo da prefeitura
3. ✅ Crie setores e usuários
4. ✅ Comece a cadastrar patrimônios
5. ✅ Configure backup automático
6. ✅ Monitore o sistema regularmente

**Dicas Importantes:**

- Faça backup regularmente (o sistema faz automaticamente às 2h)
- Mantenha o sistema atualizado
- Monitore o uso de recursos
- Use senhas fortes
- Ative notificações de backup

---

**SISPAT 2.0 - Sistema Integrado de Patrimônio**  
**Desenvolvido com ❤️ para o serviço público**

---

**Última atualização:** 13/10/2025  
**Versão do guia:** 1.0.0

