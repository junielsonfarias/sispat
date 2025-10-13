# 🔧 TROUBLESHOOTING - INSTALAÇÃO TRAVADA

**Problema:** Instalação parou em "Compilando frontend"  
**Servidor:** Debian 12 VPS  
**Causa Provável:** Falta de memória RAM

---

## 🚨 SINTOMAS

```
╔═══════════════════════════════════════════════════╗
║  ETAPA 2/4: Compilando frontend (React/TypeScript)║
╚═══════════════════════════════════════════════════╝

root@sispat:~#
```

O processo simplesmente para e volta para o prompt sem erro.

---

## 🔍 DIAGNÓSTICO RÁPIDO

Execute no servidor:

```bash
# 1. Verificar memória
free -h

# 2. Verificar se há processos Node travados
ps aux | grep node

# 3. Verificar logs do sistema
dmesg | tail -20

# 4. Verificar uso de disco
df -h
```

---

## ✅ SOLUÇÃO 1: ADICIONAR SWAP (RECOMENDADA)

### **Passo a Passo:**

```bash
# 1. Cancelar instalação atual
# Pressione Ctrl+C se ainda estiver rodando

# 2. Matar processos Node travados
killall node 2>/dev/null || true

# 3. Criar swap de 2GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 4. Tornar permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 5. Verificar
free -h

# 6. Limpar instalação anterior
cd ~
rm -rf /var/www/sispat

# 7. Clonar novamente
git clone https://github.com/junielsonfarias/sispat.git /var/www/sispat

# 8. Executar instalação otimizada
cd /var/www/sispat
chmod +x install-low-memory.sh
./install-low-memory.sh
```

**Tempo:** 10-15 minutos

---

## ✅ SOLUÇÃO 2: BUILD LOCAL (MAIS RÁPIDA)

### **No seu computador Windows:**

```powershell
# 1. Abrir PowerShell na raiz do projeto
cd "d:\novo ambiente\sispat - Copia"

# 2. Fazer build do frontend
pnpm install
pnpm build

# 3. Fazer build do backend
cd backend
pnpm install
pnpm build
cd ..

# 4. Comprimir os builds
# Instalar 7-Zip se não tiver
tar -czf sispat-builds.tar.gz dist backend/dist node_modules backend/node_modules

# OU usar 7-Zip GUI
# Comprimir: dist/, backend/dist/, node_modules/, backend/node_modules/
```

### **Transferir para o servidor:**

**Opção A: SCP (se tiver SSH configurado)**
```powershell
scp sispat-builds.tar.gz root@SEU_IP:/tmp/
```

**Opção B: SFTP (mais fácil)**
1. Use WinSCP ou FileZilla
2. Conecte ao servidor
3. Envie `sispat-builds.tar.gz` para `/tmp/`

### **No servidor:**

```bash
# 1. Navegar para diretório
cd /var/www/sispat

# 2. Extrair builds
tar -xzf /tmp/sispat-builds.tar.gz

# 3. Configurar backend
cd backend

# Criar .env
nano .env
# Adicionar configurações (ver env.production.example)

# 4. Configurar banco
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm run prisma:seed

# 5. Iniciar com PM2
pm2 start ecosystem.config.js --env production
pm2 save

# 6. Configurar Nginx
# (ver GUIA_DEPLOY_PRODUCAO.md)
```

**Tempo:** 15-20 minutos

---

## ✅ SOLUÇÃO 3: MODIFICAR install.sh

### **Se quiser usar o install.sh original:**

```bash
# 1. Editar install.sh
nano install.sh

# 2. Encontrar a linha de build do frontend (por volta da linha 800)
# Procurar por: pnpm run build

# 3. Substituir por:
NODE_OPTIONS="--max-old-space-size=1024" timeout 900 pnpm run build || {
    echo "Build falhou ou timeout. Tentando com configuração mínima..."
    NODE_OPTIONS="--max-old-space-size=512" pnpm exec vite build --minify false
}

# 4. Salvar (Ctrl+X, Y, Enter)

# 5. Executar novamente
./install.sh
```

---

## ✅ SOLUÇÃO 4: INSTALAÇÃO MANUAL PASSO A PASSO

Se tudo falhar, faça instalação manual:

```bash
# ============================================
# INSTALAÇÃO MANUAL COMPLETA
# ============================================

# 1. Criar swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 2. Clonar repositório
cd /var/www
git clone https://github.com/junielsonfarias/sispat.git
cd sispat

# 3. Instalar pnpm
npm install -g pnpm

# 4. Frontend - Instalar dependências
echo "Instalando dependências do frontend (5 min)..."
NODE_OPTIONS="--max-old-space-size=1024" pnpm install --prod

# 5. Frontend - Build
echo "Compilando frontend (10 min)..."
NODE_OPTIONS="--max-old-space-size=1024" pnpm run build

# 6. Backend - Instalar dependências
cd backend
echo "Instalando dependências do backend (3 min)..."
NODE_OPTIONS="--max-old-space-size=512" pnpm install --prod

# 7. Backend - Build
echo "Compilando backend (2 min)..."
NODE_OPTIONS="--max-old-space-size=512" pnpm run build

# 8. Configurar .env
cp env.production.example .env
nano .env
# Preencher: DATABASE_URL, JWT_SECRET, etc.

# 9. PostgreSQL via Docker
cd ..
docker-compose up -d postgres

# Aguardar 10 segundos
sleep 10

# 10. Configurar banco
cd backend
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm run prisma:seed

# 11. PM2
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Executar comando gerado

# 12. Nginx
# Ver GUIA_DEPLOY_PRODUCAO.md para configuração completa

echo "✅ Instalação manual concluída!"
```

---

## 📊 COMPARAÇÃO DAS SOLUÇÕES

| Solução | Tempo | Dificuldade | Quando Usar |
|---------|-------|-------------|-------------|
| **Solução 1: Swap** | 15 min | Fácil | RAM < 4GB |
| **Solução 2: Build Local** | 20 min | Média | Mais rápido, requer Windows |
| **Solução 3: Modificar script** | 30 min | Média | Quer usar install.sh |
| **Solução 4: Manual** | 40 min | Difícil | Máximo controle |

---

## 🆘 ERROS COMUNS

### **Erro: "JavaScript heap out of memory"**

**Causa:** Node sem memória  
**Solução:**
```bash
export NODE_OPTIONS="--max-old-space-size=2048"
# Ou adicionar swap
```

### **Erro: "ENOSPC: no space left on device"**

**Causa:** Disco cheio  
**Solução:**
```bash
# Verificar espaço
df -h

# Limpar cache do npm/pnpm
pnpm store prune
npm cache clean --force

# Remover builds antigos
rm -rf node_modules/.vite
rm -rf dist
```

### **Erro: "Process killed"**

**Causa:** Sistema matou processo por falta de memória  
**Solução:**
```bash
# Adicionar swap (ver Solução 1)
# OU fazer build local (ver Solução 2)
```

### **Timeout / Travou sem erro**

**Causa:** Processo travou silenciosamente  
**Solução:**
```bash
# Matar processos travados
killall node

# Limpar cache
rm -rf node_modules/.vite

# Tentar novamente com timeout
timeout 900 pnpm run build
```

---

## 🔍 DEBUG AVANÇADO

### **Ver o que está acontecendo:**

```bash
# Terminal 1: Monitorar recursos
watch -n 1 'free -h; echo ""; ps aux | grep node | grep -v grep'

# Terminal 2: Executar build
NODE_OPTIONS="--max-old-space-size=1024" pnpm run build

# Terminal 3: Monitorar logs do sistema
tail -f /var/log/syslog
```

### **Verificar se Node está rodando:**

```bash
# Ver processos Node
ps aux | grep node

# Ver uso de memória
top -bn1 | grep node

# Ver arquivos abertos
lsof -p $(pgrep -f node) | wc -l
```

---

## 💡 DICAS

### **Servidor com pouca memória (<2GB):**
- ✅ Use **Solução 2** (Build local)
- ✅ Ou upgrade do servidor

### **Servidor com 2-4GB RAM:**
- ✅ Use **Solução 1** (Swap)
- ✅ Funciona perfeitamente

### **Servidor com 4GB+ RAM:**
- ✅ install.sh normal deve funcionar
- ✅ Se travar, adicione swap mesmo assim

---

## 📞 PRÓXIMOS PASSOS

### **Depois que o build funcionar:**

1. ✅ Configurar Nginx
2. ✅ Configurar SSL (certbot)
3. ✅ Executar testes: `./scripts/test-deploy.sh`
4. ✅ Configurar backup: cron job
5. ✅ Configurar monitoramento: UptimeRobot

---

## 🎯 RECOMENDAÇÃO

### **Para o seu caso (Debian 12):**

**EXECUTE A SOLUÇÃO 1:**

```bash
# No servidor SSH:

# 1. Criar swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 2. Verificar
free -h

# 3. Limpar e recomeçar
cd ~
rm -rf /var/www/sispat
git clone https://github.com/junielsonfarias/sispat.git /var/www/sispat

# 4. Executar script otimizado
cd /var/www/sispat
chmod +x install-low-memory.sh
./install-low-memory.sh
```

**Isso deve funcionar perfeitamente! 🚀**

---

**Me avise se funcionou ou se precisa de mais ajuda!**

