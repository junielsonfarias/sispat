# 🚨 SOLUÇÃO IMEDIATA - ERRO PM2 + ES MODULES

## ❌ **PROBLEMA IDENTIFICADO:**

```
[PM2][ERROR] File ecosystem.config.js malformated
Error [ERR_REQUIRE_ESM]: require() of ES Module /var/www/sispat/ecosystem.config.js from /usr/lib/node_modules/pm2/lib/Common.js not supported.
```

## 🔧 **SOLUÇÃO IMEDIATA (Execute na VPS):**

### **PASSO 1: Acessar a VPS e navegar para o projeto**

```bash
ssh root@sispat.vps-kinghost.net
cd /var/www/sispat
```

### **PASSO 2: Executar o script de correção automática**

```bash
# Tornar executável
chmod +x scripts/fix-pm2-esm-error.sh

# Executar correção
./scripts/fix-pm2-esm-error.sh
```

---

## 🛠️ **SOLUÇÃO MANUAL (Se o script não funcionar):**

### **PASSO 1: Parar todos os serviços PM2**

```bash
pm2 stop all
pm2 delete all
```

### **PASSO 2: Verificar tipo de módulo**

```bash
grep '"type"' package.json
```

**Se retornar:** `"type": "module"` → **ES Modules** **Se não retornar nada** → **CommonJS**

### **PASSO 3: Criar configuração PM2 compatível**

#### **Para ES Modules (RECOMENDADO):**

```bash
# Remover arquivo antigo
mv ecosystem.config.cjs ecosystem.config.cjs.backup

# Criar novo arquivo para ES Modules
cat > ecosystem.config.js << 'EOF'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(import.meta.url);

export default {
  apps: [
    {
      name: 'sispat-backend',
      script: 'server/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_NAME: 'sispat_production',
        DB_USER: 'sispat_user',
        DB_PASSWORD: 'sispat123456',
        JWT_SECRET: 'sispat_jwt_secret_production_2025_very_secure_key_here',
        CORS_ORIGIN: 'https://sispat.vps-kinghost.net,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080',
      },
      log_file: join(__dirname, 'logs', 'combined.log'),
      out_file: join(__dirname, 'logs', 'out.log'),
      error_file: join(__dirname, 'logs', 'err.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 5000,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'backups'],
      source_map_support: false,
      node_args: '--max-old-space-size=2048',
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,
      max_memory_restart: '1G',
    }
  ],
};
EOF
```

#### **Para CommonJS (Alternativo):**

```bash
# Manter ecosystem.config.cjs mas verificar sintaxe
cat > ecosystem.config.cjs << 'EOF'
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'sispat-backend',
      script: 'server/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_NAME: 'sispat_production',
        DB_USER: 'sispat_user',
        DB_PASSWORD: 'sispat123456',
        JWT_SECRET: 'sispat_jwt_secret_production_2025_very_secure_key_here',
        CORS_ORIGIN: 'https://sispat.vps-kinghost.net,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080',
      },
      log_file: path.join(__dirname, 'logs', 'combined.log'),
      out_file: path.join(__dirname, 'logs', 'out.log'),
      error_file: path.join(__dirname, 'logs', 'err.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 5000,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'backups'],
      source_map_support: false,
      node_args: '--max-old-space-size=2048',
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,
      max_memory_restart: '1G',
    }
  ],
};
EOF
```

### **PASSO 4: Verificar se o build existe**

```bash
# Se não existir, executar build
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "Build não encontrado, executando..."
    pnpm run build
fi
```

### **PASSO 5: Iniciar backend com PM2**

```bash
# Para ES Modules
pm2 start ecosystem.config.js --env production --name "sispat-backend"

# OU para CommonJS
pm2 start ecosystem.config.cjs --env production --name "sispat-backend"
```

### **PASSO 6: Verificar status**

```bash
pm2 status
pm2 logs sispat-backend
```

---

## 🚀 **SOLUÇÃO RÁPIDA (Comando único):**

```bash
# Na VPS, execute este comando único:
cd /var/www/sispat && \
pm2 stop all 2>/dev/null || true && \
pm2 delete all 2>/dev/null || true && \
mv ecosystem.config.cjs ecosystem.config.cjs.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true && \
cat > ecosystem.config.js << 'EOF'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(import.meta.url);

export default {
  apps: [
    {
      name: 'sispat-backend',
      script: 'server/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_NAME: 'sispat_production',
        DB_USER: 'sispat_user',
        DB_PASSWORD: 'sispat123456',
        JWT_SECRET: 'sispat_jwt_secret_production_2025_very_secure_key_here',
        CORS_ORIGIN: 'https://sispat.vps-kinghost.net,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080',
      },
      log_file: join(__dirname, 'logs', 'combined.log'),
      out_file: join(__dirname, 'logs', 'out.log'),
      error_file: join(__dirname, 'logs', 'err.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 5000,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'backups'],
      source_map_support: false,
      node_args: '--max-old-space-size=2048',
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,
      max_memory_restart: '1G',
    }
  ],
};
EOF
&& pm2 start ecosystem.config.js --env production --name "sispat-backend" && \
pm2 save && \
echo "✅ PROBLEMA RESOLVIDO!" && \
pm2 status
```

---

## 🔍 **VERIFICAÇÃO PÓS-CORREÇÃO:**

### **1. Verificar status do PM2:**

```bash
pm2 status
```

### **2. Verificar logs:**

```bash
pm2 logs sispat-backend
```

### **3. Testar conectividade:**

```bash
curl http://localhost:3001/api/health
```

### **4. Verificar arquivos:**

```bash
ls -la ecosystem.config*
```

---

## 📋 **RESUMO DO PROBLEMA:**

- **Causa:** Conflito entre ES Modules (`"type": "module"` no package.json) e arquivo de
  configuração PM2 em CommonJS
- **Solução:** Converter `ecosystem.config.cjs` para `ecosystem.config.js` com sintaxe ES Modules
- **Resultado:** PM2 consegue executar a aplicação SISPAT corretamente

---

## 🎯 **PRÓXIMOS PASSOS APÓS CORREÇÃO:**

1. ✅ **Backend funcionando** com PM2
2. 🔧 **Configurar frontend** se necessário
3. 🌐 **Configurar Nginx** como proxy reverso
4. 🔒 **Configurar SSL** com Certbot
5. 📊 **Monitorar logs** e performance

---

**🎉 Com esta correção, o SISPAT deve funcionar perfeitamente com PM2!**
