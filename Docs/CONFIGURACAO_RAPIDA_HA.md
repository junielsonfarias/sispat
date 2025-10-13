# ⚡ CONFIGURAÇÃO RÁPIDA - ALTA DISPONIBILIDADE

**Tempo Total:** ~1 hora  
**Resultado:** Sistema com 99.9% uptime

---

## 🎯 3 PASSOS ESSENCIAIS

### 1️⃣ BACKUP AUTOMÁTICO (30 minutos - URGENTE)

#### Linux/Mac

```bash
# Tornar executável
cd backend/scripts
chmod +x backup-database.sh
chmod +x restore-database.sh

# Testar
./backup-database.sh

# Deve mostrar:
# ✅ Backup criado: /var/backups/sispat/sispat_backup_XXXXXX.sql.gz

# Agendar (cron)
crontab -e

# Adicionar linha (backup diário às 2AM):
0 2 * * * /caminho/completo/backend/scripts/backup-database.sh >> /var/log/sispat-backup.log 2>&1

# Salvar e sair
```

#### Windows

```powershell
# Testar
cd backend\scripts
.\backup-database.ps1

# Agendar (Task Scheduler)
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-File "D:\caminho\backend\scripts\backup-database.ps1"'
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
Register-ScheduledTask -TaskName "SISPAT Backup" -Action $action -Trigger $trigger
```

✅ **Pronto! Backup automático ativado.**

---

### 2️⃣ MONITORAMENTO EXTERNO (10 minutos)

#### UptimeRobot (Gratuito)

```
1. Acessar: https://uptimerobot.com/
2. Sign Up (gratuito)
3. Dashboard → Add New Monitor
4. Configurar:
   - Monitor Type: HTTP(s)
   - Friendly Name: SISPAT Produção
   - URL: https://seu-dominio.com/api/health
   - Monitoring Interval: 5 minutos
5. Alert Contacts → Add Alert Contact
   - Email: seu@email.com
   - SMS: seu telefone (opcional)
6. Create Monitor
```

✅ **Pronto! Receberá alerta se sistema cair.**

---

### 3️⃣ INTEGRAR MELHORIAS NO CÓDIGO (20 minutos)

#### Arquivo: `backend/src/index.ts`

Adicionar após os imports:

```typescript
// ⭐ NOVAS IMPORTAÇÕES
import { healthMonitor, healthMonitorMiddleware } from './utils/health-monitor'
import { globalRateLimiter } from './middlewares/advanced-rate-limit'
```

Adicionar após `app.use(requestLogger)`:

```typescript
// ⭐ NOVOS MIDDLEWARES
app.use(healthMonitorMiddleware) // Tracking de requests
app.use(globalRateLimiter)        // Rate limiting global
```

Adicionar no final da função `startServer()`:

```typescript
// ⭐ INICIAR MONITORING
if (process.env.ENABLE_HEALTH_MONITOR !== 'false') {
  healthMonitor.start()
  console.log('📊 Health monitoring ativado')
}
```

#### Arquivo: `backend/src/routes/authRoutes.ts`

Substituir:

```typescript
// ANTES:
import rateLimit from 'express-rate-limit'
const authLimiter = rateLimit({ ... })
router.post('/login', authLimiter, login)

// DEPOIS:
import { authRateLimiter } from '../middlewares/advanced-rate-limit'
router.post('/login', authRateLimiter, login)
```

#### Reiniciar Backend

```bash
# Parar
pm2 stop sispat-backend

# Rebuild
cd backend
npm run build

# Iniciar
pm2 start ecosystem.config.js --env production
pm2 save
```

✅ **Pronto! Todas as melhorias ativas.**

---

## ✅ VERIFICAÇÃO

### Testar se Tudo Está Funcionando

```bash
# 1. Health Check
curl http://localhost:3000/api/health
# Deve retornar: {"status":"ok", ...}

# 2. Verificar Backups
ls -lh /var/backups/sispat/
# Deve mostrar backups criados

# 3. Verificar PM2
pm2 status
# Deve mostrar: sispat-backend online

# 4. Verificar Logs
pm2 logs sispat-backend --lines 50
# Deve mostrar: "Health monitoring ativado"
```

---

## 🎉 PRONTO!

Seu sistema agora tem:

- ✅ **Backup diário** automático
- ✅ **Monitoramento externo** 24/7
- ✅ **Auto-retry** em falhas
- ✅ **Circuit breaker** ativo
- ✅ **Rate limiting** melhorado
- ✅ **Health monitoring** em tempo real

**Uptime Esperado:** 99.9% (8.8 horas de downtime por ano)

---

## 🚨 IMPORTANTE

### Configure AGORA:

1. ✅ Backup automático (sem isso, risco de perda de dados)
2. ✅ UptimeRobot (saberá se sistema cair)
3. ✅ Integrar middlewares (proteções ativas)

**Tempo:** 1 hora  
**Benefício:** Tranquilidade total 🛡️

---

**Próximo:** Ver `GUIA_ALTA_DISPONIBILIDADE.md` para configurações avançadas.

