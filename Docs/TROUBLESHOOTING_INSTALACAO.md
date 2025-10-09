# 🔧 TROUBLESHOOTING - INSTALAÇÃO SISPAT 2.0

**Soluções para problemas comuns durante a instalação**

---

## 🐛 **PROBLEMA: Script parece travado**

### **Sintoma:**
```
╔═══════════════════════════════════════════════════╗
║  ETAPA 4/4: Compilando backend (Node.js/TypeScript)║
╚═══════════════════════════════════════════════════╝

root@sispat:~#
```

O prompt `root@sispat:~#` aparece mas o script não terminou.

---

### **✅ SOLUÇÃO 1: Verificar se ainda está rodando**

```bash
# Ver processos do instalador
ps aux | grep -E "npm|pnpm|node" | grep -v grep
```

**Se mostrar processos:**
```
root  12345  npm run build
root  12346  node dist/index.js
```

✅ **Ainda está rodando!** Aguarde mais alguns minutos.

---

### **✅ SOLUÇÃO 2: Verificar logs em tempo real**

```bash
# Ver o que está acontecendo
tail -f /tmp/build-backend.log
```

**Se mostrar:**
```
Compiling TypeScript files...
src/controllers/...
src/middlewares/...
```

✅ **Está compilando!** Aguarde terminar (pode levar 3-5 minutos).

**Para sair do log:** Pressione `Ctrl+C`

---

### **✅ SOLUÇÃO 3: Aguardar mais tempo**

A compilação do backend pode demorar:
- **VPS com 2GB RAM:** 2-3 minutos
- **VPS com 1GB RAM:** 5-8 minutos
- **VPS compartilhado:** até 10 minutos

**Aguarde pelo menos 10 minutos antes de considerar que travou.**

---

### **✅ SOLUÇÃO 4: Verificar se completou**

```bash
# Verificar se o build foi concluído
ls -lh /var/www/sispat/backend/dist/

# Deve mostrar arquivos .js
# Se a pasta está vazia ou não existe, o build não completou
```

---

## 🐛 **PROBLEMA: Erro durante instalação de dependências**

### **Sintoma:**
```
❌ Falha ao instalar dependências do frontend!
Ver: /tmp/build-frontend-deps.log
```

---

### **✅ SOLUÇÃO: Ver o log e reinstalar**

```bash
# 1. Ver o erro
cat /tmp/build-frontend-deps.log

# 2. Se for erro de rede, tente novamente
cd /var/www/sispat
pnpm install --frozen-lockfile

# 3. Se for erro de memória, adicione swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 4. Tente o build novamente
pnpm run build:prod
```

---

## 🐛 **PROBLEMA: Erro ao compilar backend**

### **Sintoma:**
```
❌ Falha ao compilar backend!
Últimas linhas do log:
error TS2307: Cannot find module...
```

---

### **✅ SOLUÇÃO: Reinstalar dependências**

```bash
cd /var/www/sispat/backend

# 1. Limpar node_modules
rm -rf node_modules package-lock.json

# 2. Reinstalar
npm install

# 3. Tentar build novamente
npm run build

# 4. Verificar se criou os arquivos
ls -lh dist/
```

---

## 🐛 **PROBLEMA: Falta de memória**

### **Sintoma:**
```
FATAL ERROR: Reached heap limit Allocation failed
JavaScript heap out of memory
```

---

### **✅ SOLUÇÃO: Adicionar memória swap**

```bash
# 1. Criar arquivo de swap de 2GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 2. Tornar permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 3. Verificar
free -h

# 4. Tentar instalação novamente
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash
```

---

## 🐛 **PROBLEMA: Script retorna ao prompt sem terminar**

### **Sintoma:**
```
  ⠸ Compilando backend (aguarde, pode demorar até 3 minutos)...
root@sispat:~#
```

---

### **✅ SOLUÇÃO: Completar instalação manualmente**

```bash
# 1. Ir para o diretório
cd /var/www/sispat/backend

# 2. Verificar se o build completou
ls -lh dist/

# Se a pasta dist/ existe e tem arquivos:

# 3. Gerar Prisma Client
npx prisma generate

# 4. Executar migrações
npx prisma migrate deploy

# 5. Popular banco
npm run prisma:seed

# 6. Iniciar aplicação
pm2 start dist/index.js --name sispat-backend
pm2 save
pm2 startup

# 7. Reiniciar Nginx
sudo systemctl restart nginx

# 8. Verificar
curl http://localhost:3000/health
```

---

## 🐛 **PROBLEMA: Erro ao clonar repositório**

### **Sintoma:**
```
fatal: unable to access 'https://github.com/...': 
Could not resolve host: github.com
```

---

### **✅ SOLUÇÃO: Verificar conexão**

```bash
# 1. Testar conexão com internet
ping -c 3 8.8.8.8

# 2. Testar DNS
ping -c 3 github.com

# 3. Se DNS não funciona, configurar
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf

# 4. Tentar novamente
git clone https://github.com/junielsonfarias/sispat.git /var/www/sispat
```

---

## 🐛 **PROBLEMA: PostgreSQL não inicia**

### **Sintoma:**
```
✗ ERRO: Banco de dados não está acessível
```

---

### **✅ SOLUÇÃO: Reiniciar PostgreSQL**

```bash
# 1. Verificar status
sudo systemctl status postgresql

# 2. Reiniciar
sudo systemctl restart postgresql

# 3. Verificar se está rodando
sudo systemctl is-active postgresql

# 4. Testar conexão
sudo -u postgres psql -c "SELECT 1"
```

---

## 🐛 **PROBLEMA: Permissões negadas**

### **Sintoma:**
```
EACCES: permission denied, mkdir '/var/www/sispat'
```

---

### **✅ SOLUÇÃO: Executar como root**

```bash
# Certifique-se de usar sudo
sudo bash install.sh

# Ou se já baixou o script:
sudo bash /caminho/para/install.sh
```

---

## 🔍 **VERIFICAR STATUS DA INSTALAÇÃO**

### **Script de verificação rápida:**

```bash
cat << 'EOF' > /tmp/check-install.sh
#!/bin/bash

echo "🔍 VERIFICANDO STATUS DA INSTALAÇÃO..."
echo ""

# Verificar diretórios
echo "📁 Diretórios:"
[ -d "/var/www/sispat" ] && echo "  ✅ /var/www/sispat existe" || echo "  ❌ /var/www/sispat NÃO existe"
[ -d "/var/www/sispat/dist" ] && echo "  ✅ Frontend compilado" || echo "  ❌ Frontend NÃO compilado"
[ -d "/var/www/sispat/backend/dist" ] && echo "  ✅ Backend compilado" || echo "  ❌ Backend NÃO compilado"

echo ""
echo "🗃️  Banco de Dados:"
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw sispat_prod; then
    echo "  ✅ Banco sispat_prod existe"
else
    echo "  ❌ Banco sispat_prod NÃO existe"
fi

echo ""
echo "🚀 Serviços:"
pm2 list | grep -q "sispat-backend" && echo "  ✅ PM2 configurado" || echo "  ❌ PM2 NÃO configurado"
sudo systemctl is-active nginx >/dev/null 2>&1 && echo "  ✅ Nginx ativo" || echo "  ❌ Nginx NÃO ativo"
sudo systemctl is-active postgresql >/dev/null 2>&1 && echo "  ✅ PostgreSQL ativo" || echo "  ❌ PostgreSQL NÃO ativo"

echo ""
echo "🌐 Conectividade:"
curl -f -s http://localhost:3000/health >/dev/null 2>&1 && echo "  ✅ API respondendo" || echo "  ❌ API NÃO responde"

echo ""
echo "📝 Logs disponíveis:"
[ -f "/var/log/sispat-install.log" ] && echo "  ✅ /var/log/sispat-install.log" || echo "  ❌ Log de instalação não encontrado"
[ -f "/tmp/build-backend.log" ] && echo "  ✅ /tmp/build-backend.log" || echo "  ❌ Log de build não encontrado"

EOF

bash /tmp/check-install.sh
```

---

## 🔄 **CONTINUAR INSTALAÇÃO MANUALMENTE**

Se o script parou, você pode continuar manualmente:

```bash
# 1. Verificar em qual etapa parou
cat /var/log/sispat-install.log | tail -20

# 2. Se parou no build do backend:
cd /var/www/sispat/backend
npm run build

# 3. Se parou no Prisma:
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed

# 4. Se parou ao iniciar:
pm2 start dist/index.js --name sispat-backend
pm2 save

# 5. Configurar Nginx (se não foi feito):
sudo cp /var/www/sispat/nginx/conf.d/sispat.conf /etc/nginx/sites-available/sispat
sudo ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 6. Configurar SSL (se necessário):
sudo certbot --nginx -d sispat.vps-kinghost.net
```

---

## 🆘 **REINSTALAÇÃO LIMPA**

Se tudo falhar, faça uma reinstalação limpa:

```bash
# 1. Parar tudo
pm2 delete all 2>/dev/null || true
sudo systemctl stop nginx

# 2. Remover instalação
sudo rm -rf /var/www/sispat
sudo rm -rf /tmp/build-*.log
sudo rm -rf /tmp/prisma-*.log

# 3. Remover banco (CUIDADO: Apaga dados!)
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS sispat_prod;
DROP USER IF EXISTS sispat_user;
EOF

# 4. Reinstalar
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash
```

---

## 📞 **OBTER AJUDA**

### **1. Coletar informações para suporte:**

```bash
# Criar arquivo com todas as informações
cat << 'EOF' > /tmp/sispat-debug.txt
=== INFORMAÇÕES DO SISTEMA ===
$(uname -a)
$(free -h)
$(df -h)

=== STATUS DOS SERVIÇOS ===
$(pm2 list)
$(sudo systemctl status nginx --no-pager)
$(sudo systemctl status postgresql --no-pager)

=== LOGS DE INSTALAÇÃO ===
$(tail -100 /var/log/sispat-install.log)

=== LOGS DE BUILD ===
$(cat /tmp/build-backend.log 2>/dev/null || echo "Log não encontrado")

=== ESTRUTURA DE ARQUIVOS ===
$(ls -lR /var/www/sispat/ 2>/dev/null | head -50)
EOF

# Ver o arquivo
cat /tmp/sispat-debug.txt

# Copiar e colar no GitHub Issues
```

### **2. Abrir issue no GitHub:**
https://github.com/junielsonfarias/sispat/issues/new

Cole as informações do arquivo `/tmp/sispat-debug.txt`

---

## ✅ **COMANDOS ÚTEIS**

### **Ver se algo está rodando:**
```bash
ps aux | grep -E "npm|pnpm|node|tsc" | grep -v grep
```

### **Matar processos travados:**
```bash
pkill -f "npm run build"
pkill -f "pnpm run build"
```

### **Ver uso de CPU/Memória:**
```bash
top
# Pressione 'q' para sair
```

### **Ver espaço em disco:**
```bash
df -h
```

### **Ver logs do sistema:**
```bash
journalctl -xe | tail -50
```

---

## 🎯 **CHECKLIST DE DIAGNÓSTICO**

Execute cada comando e anote os resultados:

- [ ] `pm2 status` → Sistema rodando?
- [ ] `curl localhost:3000/health` → API respondendo?
- [ ] `ls /var/www/sispat/dist/` → Frontend compilado?
- [ ] `ls /var/www/sispat/backend/dist/` → Backend compilado?
- [ ] `sudo systemctl status nginx` → Nginx ativo?
- [ ] `sudo systemctl status postgresql` → PostgreSQL ativo?
- [ ] `free -h` → Memória disponível?
- [ ] `df -h` → Espaço em disco?

---

**📞 Suporte:** https://github.com/junielsonfarias/sispat/issues
