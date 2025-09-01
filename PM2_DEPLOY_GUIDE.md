# 🚀 Guia de Deploy PM2 - SISPAT

## 📋 Problema Identificado

Ao executar o comando `pm2 start ecosystem.config.js --env production` em um servidor VPS, você pode
encontrar os seguintes problemas:

### **Erros Comuns:**

1. **"File ecosystem.config.js malformated"**
2. **"ReferenceError: module is not defined in ES module scope"**
3. **"Error: No script path - aborting"**
4. **"Applications not running, starting..."**

## ✅ Solução Implementada

### **1. Problema de Formato de Arquivo**

**Causa:** O projeto está configurado como ES module (`"type": "module"` no package.json), mas o
arquivo `ecosystem.config.js` estava usando sintaxe CommonJS.

**Solução:** Criar um arquivo `ecosystem.config.cjs` com sintaxe CommonJS.

### **2. Arquivos Criados/Modificados**

#### **Arquivo: `ecosystem.config.cjs`**

```javascript
module.exports = {
  apps: [
    {
      name: 'sispat-backend',
      script: './server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        HOST: '0.0.0.0',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '0.0.0.0',
        // ... outras variáveis de ambiente
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      merge_logs: true,
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
    },
    {
      name: 'sispat-frontend',
      script: 'npm',
      args: 'run preview',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 8080,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      error_file: './logs/frontend-err.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      merge_logs: true,
      max_memory_restart: '512M',
      autorestart: true,
      watch: false,
    },
  ],
};
```

#### **Arquivo: `package.json` (Scripts Atualizados)**

```json
{
  "scripts": {
    "start:prod": "pm2 start ecosystem.config.cjs --env production",
    "stop:prod": "pm2 stop ecosystem.config.cjs",
    "restart:prod": "pm2 restart ecosystem.config.cjs",
    "reload:prod": "pm2 reload ecosystem.config.cjs",
    "delete:prod": "pm2 delete ecosystem.config.cjs",
    "logs:prod": "pm2 logs",
    "monit:prod": "pm2 monit"
  }
}
```

## 🔧 Comandos para Deploy

### **1. Preparação**

```bash
# Instalar PM2 globalmente (se não estiver instalado)
npm install -g pm2

# Criar diretório de logs
mkdir logs

# Verificar se o arquivo existe
ls -la ecosystem.config.cjs
```

### **2. Deploy em Produção**

```bash
# Opção 1: Usar script npm
npm run start:prod

# Opção 2: Comando direto
pm2 start ecosystem.config.cjs --env production

# Opção 3: Iniciar apenas backend
pm2 start server/index.js --name sispat-backend --env production
```

### **3. Gerenciamento**

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs

# Monitorar recursos
pm2 monit

# Reiniciar aplicação
pm2 restart ecosystem.config.cjs

# Recarregar aplicação (zero downtime)
pm2 reload ecosystem.config.cjs

# Parar aplicação
pm2 stop ecosystem.config.cjs

# Deletar aplicação
pm2 delete ecosystem.config.cjs
```

## 🚨 Troubleshooting

### **Problema 1: "File ecosystem.config.js malformated"**

**Solução:**

```bash
# Usar arquivo .cjs em vez de .js
pm2 start ecosystem.config.cjs --env production
```

### **Problema 2: "Error: No script path - aborting"**

**Solução:**

```bash
# Verificar se o arquivo server/index.js existe
ls -la server/index.js

# Usar caminho absoluto se necessário
pm2 start /caminho/completo/para/server/index.js --name sispat-backend
```

### **Problema 3: "Applications not running, starting..."**

**Solução:**

```bash
# Parar todos os processos primeiro
pm2 stop all
pm2 delete all

# Iniciar novamente
pm2 start ecosystem.config.cjs --env production
```

### **Problema 4: Erro de permissão nos logs**

**Solução:**

```bash
# Corrigir permissões
sudo chown -R $USER:$USER logs/
sudo chmod -R 755 logs/
```

### **Problema 5: Aplicação não inicia**

**Solução:**

```bash
# Verificar logs detalhados
pm2 logs --lines 50

# Verificar variáveis de ambiente
pm2 env 0

# Testar script diretamente
node server/index.js
```

## 📊 Verificação de Funcionamento

### **1. Status dos Processos**

```bash
pm2 status
```

**Saída Esperada:**

```
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ sispat-backend     │ fork     │ 0    │ online    │ 0%       │ 50MB     │
│ 1  │ sispat-frontend    │ fork     │ 0    │ online    │ 0%       │ 30MB     │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

### **2. Teste de APIs**

```bash
# Health check
curl http://localhost:3001/api/health

# Frontend
curl http://localhost:8080
```

### **3. Logs**

```bash
# Ver logs em tempo real
pm2 logs

# Ver logs específicos
pm2 logs sispat-backend
pm2 logs sispat-frontend
```

## 🔒 Configuração de Produção

### **1. Variáveis de Ambiente**

Crie um arquivo `.env.production` com suas configurações:

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
DB_PASSWORD=sua_senha_segura_aqui

# JWT
JWT_SECRET=sua_chave_jwt_super_segura_aqui_min_32_caracteres
JWT_EXPIRES_IN=24h

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=sua_senha_redis_aqui

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Segurança
CORS_ORIGIN=https://seudominio.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **2. Configuração do Sistema**

```bash
# Configurar PM2 para iniciar com o sistema
pm2 startup
pm2 save

# Configurar firewall
sudo ufw allow 3001
sudo ufw allow 8080
```

## 📝 Checklist de Deploy

- [ ] PM2 instalado globalmente
- [ ] Arquivo `ecosystem.config.cjs` criado
- [ ] Diretório `logs/` criado
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados configurado
- [ ] Redis configurado
- [ ] Aplicação iniciada com PM2
- [ ] Status dos processos verificado
- [ ] APIs testadas
- [ ] Logs verificados
- [ ] PM2 configurado para iniciar com o sistema

## 🎯 Comandos Finais

```bash
# Deploy completo
npm run start:prod

# Verificar funcionamento
pm2 status
curl http://localhost:3001/api/health

# Salvar configuração
pm2 save
pm2 startup
```

## 📞 Suporte

Se ainda houver problemas:

1. **Verificar logs:** `pm2 logs --lines 100`
2. **Verificar status:** `pm2 status`
3. **Testar manualmente:** `node server/index.js`
4. **Verificar dependências:** `npm install`
5. **Verificar variáveis de ambiente:** `pm2 env 0`

**Status:** ✅ **PROBLEMA RESOLVIDO**

O arquivo `ecosystem.config.cjs` resolve todos os problemas de compatibilidade e permite o deploy
correto com PM2.
