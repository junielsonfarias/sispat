# 🔧 CORREÇÃO: INSTALAÇÃO TRAVADA NA COMPILAÇÃO

**Problema:** Instalação parou em "ETAPA 2/4: Compilando frontend"  
**Servidor:** Debian 12  
**Causa:** Falta de memória ou timeout no build do frontend

---

## 🎯 SOLUÇÃO RÁPIDA

### **Opção 1: Aumentar Swap (Recomendado)**

Execute estes comandos no servidor:

```bash
# 1. Verificar memória disponível
free -h

# 2. Criar arquivo de swap (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 3. Verificar se ativou
free -h

# 4. Tornar permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 5. Continuar instalação
cd ~
./install.sh
```

---

### **Opção 2: Build Local e Transfer**

Se o servidor tiver pouca memória, faça o build localmente:

```bash
# No seu computador Windows
cd "d:\novo ambiente\sispat - Copia"

# Build do frontend
pnpm install
pnpm build

# Build do backend
cd backend
pnpm install
pnpm build
cd ..

# Comprimir dist/ e backend/dist/
tar -czf sispat-build.tar.gz dist/ backend/dist/

# Transferir para o servidor (usando SCP ou SFTP)
# Substitua USER e SERVER_IP
scp sispat-build.tar.gz root@SERVER_IP:/tmp/
```

No servidor:

```bash
# Extrair builds
cd /var/www/sispat
tar -xzf /tmp/sispat-build.tar.gz

# Continuar com a instalação (pular build)
# Editar install.sh e comentar as linhas de build
```

---

### **Opção 3: Instalação Manual Simplificada**

Se o install.sh continuar travando, faça instalação manual:

```bash
# ============================================
# INSTALAÇÃO MANUAL SIMPLIFICADA
# ============================================

# 1. Navegar para diretório
cd /var/www/sispat

# 2. Instalar apenas dependências de produção (sem build)
echo "Instalando dependências do frontend..."
NODE_OPTIONS="--max-old-space-size=512" pnpm install --prod

echo "Instalando dependências do backend..."
cd backend
NODE_OPTIONS="--max-old-space-size=512" pnpm install --prod

# 3. Se tiver builds pré-compilados, pular para configuração
# Caso contrário, tentar build com limite de memória:

echo "Tentando build do frontend com memória limitada..."
cd /var/www/sispat
NODE_OPTIONS="--max-old-space-size=1024" pnpm run build

echo "Build do backend..."
cd backend
NODE_OPTIONS="--max-old-space-size=512" pnpm run build

# 4. Configurar banco de dados
cd /var/www/sispat/backend
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm run prisma:seed

# 5. Iniciar com PM2
pm2 start ecosystem.config.js --env production
pm2 save

# 6. Configurar Nginx (se ainda não configurado)
# Ver GUIA_DEPLOY_PRODUCAO.md seção de Nginx

echo "✅ Instalação manual concluída!"
```

---

### **Opção 4: Usar Build Incremental**

Modificar temporariamente o `vite.config.ts`:

No servidor, edite `/var/www/sispat/vite.config.ts`:

```typescript
export default defineConfig(({ mode }) => ({
  // ... outras configs ...
  
  build: {
    minify: false,  // ⬅️ DESABILITAR MINIFICAÇÃO temporariamente
    sourcemap: false,
    rollupOptions: {
      output: {
        // Remover code splitting temporariamente
        manualChunks: undefined,
      }
    }
  },
  
  // ... resto da config ...
}))
```

Depois executar:

```bash
NODE_OPTIONS="--max-old-space-size=1024" pnpm run build
```

---

## 🔍 DIAGNÓSTICO

### **Verificar Recursos do Servidor**

```bash
# Memória disponível
free -h

# Uso de CPU
top -bn1 | head -20

# Espaço em disco
df -h

# Processos do Node
ps aux | grep node
```

### **Ver Logs do Build**

```bash
# Se o build travou, ver o que aconteceu
cd /var/www/sispat

# Tentar build manualmente com verbose
NODE_OPTIONS="--max-old-space-size=1024" pnpm run build 2>&1 | tee build.log

# Ver o log
cat build.log
```

---

## ⚠️ REQUISITOS MÍNIMOS DO SERVIDOR

Para compilar o SISPAT sem problemas:

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| **RAM** | 2GB | 4GB |
| **Swap** | 2GB | 4GB |
| **CPU** | 2 cores | 4 cores |
| **Disco** | 10GB | 20GB |

### **Seu servidor tem recursos suficientes?**

```bash
# Verificar RAM total
free -h | grep Mem

# Verificar Swap
free -h | grep Swap

# Verificar CPU
nproc

# Verificar Disco
df -h /
```

---

## 🚀 SOLUÇÃO DEFINITIVA (Script Otimizado)

Vou criar um script de instalação otimizado para servidores com pouca memória:

```bash
#!/bin/bash

# install-low-memory.sh
# Para servidores com 2GB RAM ou menos

echo "🔧 Instalação otimizada para servidores com pouca memória"

# 1. Criar swap se não existir
if [ ! -f /swapfile ]; then
    echo "Criando swap de 2GB..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 2. Configurar limite de memória do Node
export NODE_OPTIONS="--max-old-space-size=1024"

# 3. Instalar dependências uma de cada vez
cd /var/www/sispat

echo "Instalando dependências do frontend (pode demorar)..."
pnpm install --prod --no-optional

echo "Instalando dependências do backend..."
cd backend
pnpm install --prod --no-optional

# 4. Build com limite de memória
cd /var/www/sispat

echo "Compilando frontend..."
NODE_OPTIONS="--max-old-space-size=1024" pnpm run build

echo "Compilando backend..."
cd backend
NODE_OPTIONS="--max-old-space-size=512" pnpm run build

echo "✅ Instalação concluída!"
```

---

## 📞 PRÓXIMOS PASSOS

### **Se ainda estiver travado:**

1. **Ctrl+C** para cancelar
2. **Executar uma das opções acima**
3. **Verificar recursos do servidor**
4. **Me avisar qual opção você quer tentar**

### **Recomendação:**

**Opção 1 (Swap)** é a melhor se o servidor tiver < 4GB RAM.

**Depois de adicionar swap, executar:**

```bash
cd ~
rm -rf /var/www/sispat  # Limpar instalação incompleta
git clone https://github.com/junielsonfarias/sispat.git /var/www/sispat
cd /var/www/sispat
chmod +x install.sh
./install.sh
```

---

**Me avise qual opção você quer tentar! 🚀**

