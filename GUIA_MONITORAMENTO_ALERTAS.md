# 📊 GUIA DE MONITORAMENTO E ALERTAS - SISPAT 2.0

**Data:** 09/10/2025  
**Versão:** 2.0.0

---

## 📋 ÍNDICE

1. [Backup Automático](#backup-automático)
2. [Monitoramento Local](#monitoramento-local)
3. [UptimeRobot](#uptimerobot)
4. [Alertas por Email](#alertas-por-email)
5. [Alertas no Slack](#alertas-no-slack)
6. [Cron Jobs](#cron-jobs)

---

## 💾 BACKUP AUTOMÁTICO

### **1. Instalar Script de Backup**

```bash
# Copiar scripts
sudo cp scripts/backup-sispat.sh /usr/local/bin/
sudo cp scripts/restore-sispat.sh /usr/local/bin/

# Dar permissão de execução
sudo chmod +x /usr/local/bin/backup-sispat.sh
sudo chmod +x /usr/local/bin/restore-sispat.sh
```

### **2. Configurar Variáveis (Opcional)**

Criar arquivo de configuração:

```bash
sudo nano /etc/sispat/backup.conf
```

Conteúdo:

```bash
# Diretório de backup
BACKUP_DIR=/var/backups/sispat

# Diretório da aplicação
APP_DIR=/var/www/sispat

# Dias de retenção
RETENTION_DAYS=30

# Container do banco
DB_CONTAINER=sispat-postgres
DB_NAME=sispat_prod
DB_USER=postgres

# Email para notificações (opcional)
ADMIN_EMAIL=admin@seu-dominio.com
```

### **3. Agendar Backup Diário**

```bash
sudo crontab -e
```

Adicionar linha:

```bash
# Backup diário às 3h da manhã
0 3 * * * /usr/local/bin/backup-sispat.sh >> /var/log/sispat-backup.log 2>&1
```

### **4. Testar Backup Manual**

```bash
sudo /usr/local/bin/backup-sispat.sh
```

### **5. Restaurar um Backup**

```bash
sudo /usr/local/bin/restore-sispat.sh
```

O script vai listar os backups disponíveis e permitir escolher qual restaurar.

---

## 🔍 MONITORAMENTO LOCAL

### **1. Instalar Script de Monitoramento**

```bash
sudo cp scripts/monitor-sispat.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/monitor-sispat.sh
```

### **2. Configurar Variáveis**

Editar o script ou criar arquivo de configuração:

```bash
sudo nano /etc/sispat/monitor.conf
```

```bash
# URL da API
API_URL=http://localhost:3000

# Email para alertas
ALERT_EMAIL=admin@seu-dominio.com

# Webhook do Slack (opcional)
SLACK_WEBHOOK=https://hooks.slack.com/services/SEU/WEBHOOK/AQUI

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=85
RESPONSE_TIME_THRESHOLD=2000  # ms
```

### **3. Agendar Monitoramento**

```bash
sudo crontab -e
```

Adicionar linha:

```bash
# Monitoramento a cada 5 minutos
*/5 * * * * /usr/local/bin/monitor-sispat.sh
```

### **4. Testar Monitoramento**

```bash
sudo /usr/local/bin/monitor-sispat.sh
```

---

## 🌐 UPTIMEROBOT

### **Configuração (Gratuita)**

#### **1. Criar Conta**

1. Acesse: https://uptimerobot.com
2. Crie conta gratuita (50 monitores)
3. Confirme email

#### **2. Criar Monitor HTTP(S)**

1. Click em "Add New Monitor"
2. **Monitor Type:** HTTP(S)
3. **Friendly Name:** SISPAT - Backend
4. **URL:** `https://seu-dominio.com/api/health`
5. **Monitoring Interval:** 5 minutes (free tier)
6. Click "Create Monitor"

#### **3. Criar Monitor para Frontend**

1. Repetir processo acima
2. **Friendly Name:** SISPAT - Frontend
3. **URL:** `https://seu-dominio.com`

#### **4. Configurar Alertas**

1. Vá em "My Settings"
2. "Alert Contacts"
3. Adicionar:
   - Email
   - Slack (integração)
   - Telegram (opcional)

#### **5. Configurar Notificações**

Para cada monitor:
1. Edit Monitor
2. "Alert Contacts to Notify"
3. Selecionar contatos
4. Save

### **Alertas Recomendados**

- ✅ Email: Imediato
- ✅ Slack: Para equipe
- ✅ SMS: Para críticos (pago)

---

## 📧 ALERTAS POR EMAIL

### **1. Configurar Postfix (Linux)**

```bash
# Instalar Postfix
sudo apt install -y postfix mailutils

# Configurar (escolher: Internet Site)
sudo dpkg-reconfigure postfix
```

### **2. Testar Email**

```bash
echo "Teste de email do SISPAT" | mail -s "Teste" seu@email.com
```

### **3. Configurar Email no Script**

Editar `/usr/local/bin/monitor-sispat.sh`:

```bash
ALERT_EMAIL="admin@seu-dominio.com"
```

### **4. Usar Gmail (Alternativa)**

Instalar ssmtp:

```bash
sudo apt install -y ssmtp
```

Configurar `/etc/ssmtp/ssmtp.conf`:

```conf
root=seu-email@gmail.com
mailhub=smtp.gmail.com:587
AuthUser=seu-email@gmail.com
AuthPass=sua-senha-app
UseSTARTTLS=YES
```

**Nota:** Use senha de app do Gmail, não a senha normal.

---

## 💬 ALERTAS NO SLACK

### **1. Criar Incoming Webhook**

1. Acesse: https://api.slack.com/apps
2. "Create New App"
3. "From scratch"
4. Nome: "SISPAT Monitor"
5. Workspace: Seu workspace
6. "Incoming Webhooks"
7. Ativar "Activate Incoming Webhooks"
8. "Add New Webhook to Workspace"
9. Escolher canal
10. Copiar Webhook URL

### **2. Configurar no Script**

Editar `/usr/local/bin/monitor-sispat.sh`:

```bash
SLACK_WEBHOOK="https://hooks.slack.com/services/SEU/WEBHOOK/AQUI"
```

### **3. Testar Slack**

```bash
curl -X POST https://hooks.slack.com/services/SEU/WEBHOOK/AQUI \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Teste do SISPAT Monitor",
    "username": "SISPAT Bot",
    "icon_emoji": ":robot_face:"
  }'
```

---

## ⏰ CRON JOBS

### **Resumo de Todos os Cron Jobs**

```bash
sudo crontab -e
```

Adicionar:

```bash
# ============================================
# SISPAT 2.0 - CRON JOBS
# ============================================

# Backup diário às 3h da manhã
0 3 * * * /usr/local/bin/backup-sispat.sh >> /var/log/sispat-backup.log 2>&1

# Monitoramento a cada 5 minutos
*/5 * * * * /usr/local/bin/monitor-sispat.sh

# Limpeza de logs antigos (semanal, domingo 2h)
0 2 * * 0 find /var/www/sispat/backend/logs -name "*.log" -mtime +30 -delete

# Reiniciar PM2 (semanal, domingo 4h)
0 4 * * 0 pm2 restart sispat-backend

# Health check (a cada 1 minuto, restart se falhar)
* * * * * curl -f http://localhost:3000/api/health || pm2 restart sispat-backend

# Verificar certificado SSL (diário)
0 6 * * * certbot renew --quiet

# Atualizar sistema (semanal, domingo 5h)
0 5 * * 0 apt update && apt upgrade -y >> /var/log/apt-upgrade.log 2>&1
```

### **Verificar Cron Jobs Ativos**

```bash
sudo crontab -l
```

### **Ver Logs dos Cron Jobs**

```bash
# Log geral
sudo tail -f /var/log/syslog | grep CRON

# Log específico de backup
sudo tail -f /var/log/sispat-backup.log

# Log do monitor
sudo tail -f /var/log/sispat-monitor.log
```

---

## 🧪 TESTES

### **Teste Completo de Monitoramento**

```bash
#!/bin/bash

echo "========================================="
echo "TESTE DE MONITORAMENTO DO SISPAT"
echo "========================================="

# 1. Testar backup
echo ""
echo "[1/5] Testando backup..."
sudo /usr/local/bin/backup-sispat.sh
if [ $? -eq 0 ]; then
    echo "✅ Backup OK"
else
    echo "❌ Backup FALHOU"
fi

# 2. Testar monitoramento
echo ""
echo "[2/5] Testando monitoramento..."
sudo /usr/local/bin/monitor-sispat.sh
if [ $? -eq 0 ]; then
    echo "✅ Monitoramento OK"
else
    echo "⚠️  Monitoramento com warnings/errors"
fi

# 3. Testar health check
echo ""
echo "[3/5] Testando health check..."
RESPONSE=$(curl -s http://localhost:3000/api/health)
if echo "$RESPONSE" | grep -q "ok"; then
    echo "✅ Health check OK"
else
    echo "❌ Health check FALHOU"
fi

# 4. Verificar cron jobs
echo ""
echo "[4/5] Verificando cron jobs..."
if crontab -l | grep -q "backup-sispat"; then
    echo "✅ Cron jobs configurados"
else
    echo "❌ Cron jobs NÃO configurados"
fi

# 5. Testar email (se configurado)
echo ""
echo "[5/5] Testando email..."
if command -v mail &> /dev/null; then
    echo "Teste de email do SISPAT" | mail -s "SISPAT Test" root
    echo "✅ Email enviado (verificar inbox)"
else
    echo "⚠️  Mail não configurado"
fi

echo ""
echo "========================================="
echo "TESTE CONCLUÍDO"
echo "========================================="
```

---

## 📊 DASHBOARD DE MONITORAMENTO

### **PM2 Dashboard**

```bash
pm2 monit
```

### **Criar Dashboard Simples (HTML)**

```bash
sudo nano /var/www/html/status.html
```

```html
<!DOCTYPE html>
<html>
<head>
    <title>SISPAT Status</title>
    <meta http-equiv="refresh" content="30">
    <style>
        body { font-family: Arial; margin: 40px; }
        .status { padding: 20px; margin: 10px; border-radius: 8px; }
        .ok { background: #d4edda; color: #155724; }
        .warning { background: #fff3cd; color: #856404; }
        .error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <h1>SISPAT System Status</h1>
    <div id="status"></div>
    
    <script>
        async function checkStatus() {
            try {
                const response = await fetch('http://localhost:3000/api/health');
                const data = await response.json();
                
                document.getElementById('status').innerHTML = `
                    <div class="status ok">
                        <h2>✅ Sistema Online</h2>
                        <p>Uptime: ${data.uptime}s</p>
                        <p>Última verificação: ${new Date().toLocaleString()}</p>
                    </div>
                `;
            } catch (error) {
                document.getElementById('status').innerHTML = `
                    <div class="status error">
                        <h2>❌ Sistema Offline</h2>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        }
        
        checkStatus();
        setInterval(checkStatus, 30000);
    </script>
</body>
</html>
```

Acesse: `https://seu-dominio.com/status.html`

---

## 📋 CHECKLIST DE CONFIGURAÇÃO

### **Backup**
- [ ] Script de backup instalado
- [ ] Cron job de backup configurado
- [ ] Backup testado manualmente
- [ ] Restauração testada
- [ ] Retenção configurada (30 dias)

### **Monitoramento**
- [ ] Script de monitoramento instalado
- [ ] Cron job de monitoramento configurado
- [ ] Thresholds ajustados
- [ ] Logs funcionando

### **Alertas**
- [ ] UptimeRobot configurado
- [ ] Email configurado
- [ ] Slack configurado (opcional)
- [ ] Alertas testados

### **Manutenção**
- [ ] Limpeza de logs agendada
- [ ] Renovação SSL automática
- [ ] Health check configurado
- [ ] Dashboard de status criado

---

## 🆘 TROUBLESHOOTING

### **Backup não funciona**

```bash
# Verificar permissões
ls -la /usr/local/bin/backup-sispat.sh

# Verificar logs
tail -f /var/log/sispat-backup.log

# Testar manualmente
sudo bash -x /usr/local/bin/backup-sispat.sh
```

### **Monitoramento não envia alertas**

```bash
# Testar email
echo "Test" | mail -s "Test" seu@email.com

# Testar Slack
curl -X POST SEU_WEBHOOK -d '{"text":"Test"}'

# Verificar logs
tail -f /var/log/sispat-monitor.log
```

### **Cron jobs não executam**

```bash
# Verificar se cron está rodando
systemctl status cron

# Ver logs do cron
grep CRON /var/log/syslog

# Verificar sintaxe
crontab -l
```

---

## 📞 SUPORTE

- 📧 Email: suporte@sispat.com
- 📚 Documentação: Ver `/docs`
- 🐛 Issues: GitHub

---

**Última Atualização:** 09/10/2025  
**Versão:** 2.0.0

