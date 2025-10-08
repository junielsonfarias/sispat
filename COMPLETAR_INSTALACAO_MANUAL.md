# 🔧 COMPLETAR INSTALAÇÃO MANUAL - SISPAT 2.0

**Guia para completar instalação quando o script para no "Iniciando aplicação..."**

---

## ❌ **PROBLEMA**

A instalação parou aqui:

```
[18:13:44] Iniciando aplicação...

[18:13:44] Restaurando uploads da instalação anterior...
✓ Uploads restaurados com sucesso!
root@sispat:~#
```

O script retornou ao prompt sem completar a inicialização do PM2.

---

## 🔍 **DIAGNÓSTICO RÁPIDO**

Execute estes comandos no seu servidor para entender o que aconteceu:

```bash
# 1. Verificar se o backend foi compilado
ls -lh /var/www/sispat/backend/dist/index.js

# 2. Verificar status do PM2
pm2 list

# 3. Ver logs se PM2 estiver rodando
pm2 logs sispat-backend --lines 50

# 4. Testar se a API responde
curl http://localhost:3000/health
```

---

## ✅ **SOLUÇÃO: COMPLETAR INSTALAÇÃO MANUALMENTE**

### **Passo 1: Ir para o diretório do backend**

```bash
cd /var/www/sispat/backend
```

### **Passo 2: Verificar se o backend foi compilado**

```bash
if [ -f "dist/index.js" ]; then
    echo "✅ Backend compilado"
else
    echo "❌ Backend NÃO compilado - precisa compilar primeiro!"
    npm run build
fi
```

### **Passo 3: Parar qualquer processo PM2 anterior**

```bash
pm2 delete all 2>/dev/null || true
pm2 kill
```

### **Passo 4: Iniciar a aplicação com PM2**

```bash
pm2 start dist/index.js --name sispat-backend
```

**Você deve ver:**
```
┌────┬───────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┐
│ id │ name              │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │
├────┼───────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┤
│ 0  │ sispat-backend    │ default     │ 1.0.0   │ fork    │ 12345    │ 0s     │ 0    │ online    │ 0%       │
└────┴───────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┘
```

**Se mostrar "errored" ou "stopped":**
```bash
# Ver o erro
pm2 logs sispat-backend --lines 50
```

### **Passo 5: Salvar configuração do PM2**

```bash
pm2 save
```

### **Passo 6: Configurar PM2 para iniciar automaticamente**

```bash
pm2 startup
```

**Execute o comando que ele sugerir (geralmente algo como):**
```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root
```

### **Passo 7: Aguardar a API iniciar (10-30 segundos)**

```bash
echo "Aguardando API iniciar..."
for i in {1..15}; do
    if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ API está respondendo!"
        break
    fi
    echo "Tentativa $i/15..."
    sleep 2
done
```

### **Passo 8: Verificar se está funcionando**

```bash
# Status do PM2
pm2 status

# Health check da API
curl http://localhost:3000/health

# Deve retornar:
# {"status":"ok","timestamp":"..."}
```

### **Passo 9: Ver logs em tempo real (opcional)**

```bash
pm2 logs sispat-backend
```

Pressione `Ctrl+C` para sair.

---

## 🚀 **CONTINUAR A INSTALAÇÃO**

Agora que o PM2 está rodando, você pode continuar manualmente:

### **1. Configurar Backup (opcional)**

```bash
# Criar diretório de logs
mkdir -p /var/log/sispat

# Configurar backup diário às 2h da manhã
(crontab -l 2>/dev/null; echo "0 2 * * * cd /var/www/sispat/backend && node dist/scripts/backup.js > /var/log/sispat/backup.log 2>&1") | crontab -
```

### **2. Configurar SSL (opcional)**

```bash
# Se você tem um domínio configurado
sudo certbot --nginx -d sispat.vps-kinghost.net

# Seguir instruções do certbot
```

### **3. Reiniciar Nginx**

```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

### **4. Testar acesso pelo navegador**

Abra seu navegador e acesse:
```
http://sispat.vps-kinghost.net
```

ou (se configurou SSL):
```
https://sispat.vps-kinghost.net
```

---

## 🔍 **TROUBLESHOOTING COMUM**

### **Problema 1: PM2 mostra "errored"**

```bash
# Ver erro específico
pm2 logs sispat-backend --lines 50 --err

# Erros comuns:
```

**Erro: "Cannot find module"**
```bash
# Reinstalar dependências
cd /var/www/sispat/backend
npm install
pm2 restart sispat-backend
```

**Erro: "Error: connect ECONNREFUSED"**
```bash
# Banco de dados não está rodando
sudo systemctl status postgresql
sudo systemctl start postgresql

# Testar conexão
sudo -u postgres psql -l | grep sispat_prod
```

**Erro: "Prisma Client not found"**
```bash
# Gerar Prisma Client
cd /var/www/sispat/backend
npx prisma generate
pm2 restart sispat-backend
```

---

### **Problema 2: API não responde (timeout)**

```bash
# Verificar se a porta 3000 está em uso
netstat -tulpn | grep 3000

# Verificar logs
pm2 logs sispat-backend --lines 100

# Tentar iniciar manualmente para ver erro
cd /var/www/sispat/backend
node dist/index.js
```

---

### **Problema 3: Nginx mostra 502 Bad Gateway**

```bash
# Verificar se PM2 está rodando
pm2 status

# Verificar configuração do Nginx
sudo nginx -t

# Verificar logs do Nginx
sudo tail -50 /var/log/nginx/error.log
```

---

### **Problema 4: Página em branco / 404**

```bash
# Verificar se frontend foi compilado
ls -lh /var/www/sispat/dist/index.html

# Verificar configuração do Nginx
cat /etc/nginx/sites-enabled/sispat

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 📋 **CHECKLIST FINAL**

Execute este script para verificar tudo:

```bash
#!/bin/bash

echo "🔍 VERIFICAÇÃO FINAL DO SISPAT 2.0"
echo ""

# 1. Backend compilado?
if [ -f "/var/www/sispat/backend/dist/index.js" ]; then
    echo "✅ Backend compilado"
else
    echo "❌ Backend NÃO compilado"
fi

# 2. PM2 rodando?
if pm2 list | grep -q "sispat-backend.*online"; then
    echo "✅ PM2 online"
else
    echo "❌ PM2 NÃO está online"
fi

# 3. API respondendo?
if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ API respondendo"
else
    echo "❌ API NÃO responde"
fi

# 4. Nginx ativo?
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx ativo"
else
    echo "❌ Nginx NÃO ativo"
fi

# 5. Frontend acessível?
if curl -f -s http://localhost > /dev/null 2>&1; then
    echo "✅ Frontend acessível"
else
    echo "❌ Frontend NÃO acessível"
fi

# 6. Banco de dados?
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw sispat_prod; then
    echo "✅ Banco de dados existe"
else
    echo "❌ Banco de dados NÃO existe"
fi

echo ""
echo "Verificação concluída!"
```

Salve como `check.sh` e execute:
```bash
chmod +x check.sh
./check.sh
```

---

## 🎯 **CREDENCIAIS DE ACESSO**

Após tudo funcionando, acesse o sistema:

**URL:** `http://sispat.vps-kinghost.net`

**Credenciais padrão:**

```
Superusuário:
  Email: admin@prefeitura.gov.br
  Senha: [sua senha configurada]

Admin:
  Email: admin@ssbv.com
  Senha: password123

Supervisor:
  Email: supervisor@ssbv.com
  Senha: password123

Usuário:
  Email: usuario@ssbv.com
  Senha: password123

Visualizador:
  Email: visualizador@ssbv.com
  Senha: password123
```

**⚠️ ALTERE TODAS AS SENHAS NO PRIMEIRO ACESSO!**

---

## 🔄 **REINICIAR DO ZERO (SE NECESSÁRIO)**

Se nada funcionar, você pode reinstalar:

```bash
# Baixar e executar script corrigido
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash
```

Quando perguntar sobre instalação limpa, pressione **ENTER** (sim).

---

## 📞 **SUPORTE**

**Não conseguiu resolver?**

1. Colete os logs:
```bash
pm2 logs sispat-backend --lines 100 > /tmp/pm2-logs.txt
cat /var/log/sispat-install.log > /tmp/install-logs.txt
sudo tail -100 /var/log/nginx/error.log > /tmp/nginx-logs.txt
```

2. Abra uma issue no GitHub:
   https://github.com/junielsonfarias/sispat/issues

3. Anexe os arquivos de log

---

**🎉 Boa sorte! Qualquer dúvida, estamos aqui para ajudar!**
