# 📚 EXEMPLOS DE USO - ALTA DISPONIBILIDADE

## 🎯 Como Usar as Novas Funcionalidades

### 1. Retry Logic

#### Operações de Database

```typescript
import { retryDatabaseConnection } from '../utils/retry'

export const createPatrimonio = async (req: Request, res: Response) => {
  try {
    // ✅ Operação crítica com retry automático (5 tentativas)
    const patrimonio = await retryDatabaseConnection(async () => {
      return await prisma.patrimonio.create({
        data: req.body
      })
    })
    
    res.json(patrimonio)
  } catch (error) {
    // Falhou após todas as tentativas
    res.status(500).json({ error: 'Erro ao criar patrimônio' })
  }
}
```

#### APIs Externas

```typescript
import { retryExternalAPI } from '../utils/retry'

export const consultarCEP = async (cep: string) => {
  try {
    // ✅ Retry para API externa (3 tentativas)
    const data = await retryExternalAPI(async () => {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      return response.json()
    })
    
    return data
  } catch (error) {
    console.error('Erro ao consultar CEP:', error)
    return null
  }
}
```

#### Operações de Arquivo

```typescript
import { retryFileOperation } from '../utils/retry'
import fs from 'fs/promises'

export const saveFile = async (path: string, data: string) => {
  return retryFileOperation(async () => {
    await fs.writeFile(path, data)
  })
}
```

---

### 2. Circuit Breaker

#### Proteger Database Operations

```typescript
import { databaseCircuit } from '../utils/circuit-breaker'

export const listPatrimonios = async (req: Request, res: Response) => {
  try {
    // ✅ Executar com proteção de circuit breaker
    const patrimonios = await databaseCircuit.execute(async () => {
      return await prisma.patrimonio.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' }
      })
    })
    
    res.json({ patrimonios })
  } catch (error) {
    // Circuit está OPEN ou operação falhou
    if (error.message.includes('Circuit breaker')) {
      res.status(503).json({ 
        error: 'Serviço temporariamente indisponível',
        message: 'Estamos com problemas técnicos. Tente novamente em alguns minutos.'
      })
    } else {
      res.status(500).json({ error: 'Erro ao listar patrimônios' })
    }
  }
}
```

#### Proteger Chamadas Externas

```typescript
import { externalAPICircuit } from '../utils/circuit-breaker'

export const validarCNPJ = async (cnpj: string) => {
  try {
    const result = await externalAPICircuit.execute(async () => {
      const response = await fetch(`https://api-cnpj.com/validate/${cnpj}`)
      return response.json()
    })
    
    return result
  } catch (error) {
    if (error.message.includes('Circuit breaker is OPEN')) {
      console.log('⚠️ Serviço de validação CNPJ indisponível')
      return { valid: null, message: 'Validação temporariamente indisponível' }
    }
    throw error
  }
}
```

#### Verificar Estado do Circuit

```typescript
import { databaseCircuit } from '../utils/circuit-breaker'

// Ver estado atual
const state = databaseCircuit.getState()
console.log('Circuit State:', state)
// {
//   name: 'database',
//   state: 'CLOSED',
//   failures: 0,
//   successes: 0,
//   ...
// }

// Resetar manualmente se necessário
if (state.state === 'OPEN') {
  databaseCircuit.reset()
  console.log('Circuit resetado manualmente')
}
```

---

### 3. Rate Limiting

#### Aplicar em Rotas Específicas

```typescript
import { 
  writeRateLimiter, 
  uploadRateLimiter, 
  reportRateLimiter 
} from '../middlewares/advanced-rate-limit'

// Proteção para operações de escrita
router.post('/patrimonios', writeRateLimiter, createPatrimonio)
router.put('/patrimonios/:id', writeRateLimiter, updatePatrimonio)
router.delete('/patrimonios/:id', writeRateLimiter, deletePatrimonio)

// Proteção para uploads
router.post('/upload', uploadRateLimiter, uploadFile)

// Proteção para geração de PDFs
router.post('/relatorios/pdf', reportRateLimiter, generatePDF)
```

#### Rate Limiter Customizado

```typescript
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

const customLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 requests
  standardHeaders: true,
  
  store: new RedisStore({
    // @ts-expect-error - tipos
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix: 'rl:custom:',
  }),
  
  message: 'Limite customizado excedido'
})

router.post('/operacao-custosa', customLimiter, handler)
```

---

### 4. Health Monitoring

#### Acessar Métricas

```typescript
import { healthMonitor } from '../utils/health-monitor'

// Métricas atuais
const current = healthMonitor.getCurrentMetrics()
console.log('Memória:', current?.memoryUsageMB, 'MB')
console.log('DB Response:', current?.dbResponseTimeMs, 'ms')

// Estatísticas agregadas (última hora)
const stats = healthMonitor.getStats(60)
console.log('Média de memória:', stats.avgMemoryMB, 'MB')
console.log('Pico de memória:', stats.maxMemoryMB, 'MB')
console.log('Média DB:', stats.avgDbResponseMs, 'ms')

// Histórico (últimos 15 minutos)
const history = healthMonitor.getMetricsHistory(15)
console.log(`${history.length} métricas coletadas`)
```

#### Endpoint de Métricas

```bash
# Via API
curl http://localhost:3000/api/health/metrics

# Resposta:
{
  "current": {
    "memoryUsageMB": 245.32,
    "dbResponseTimeMs": 45,
    "uptime": 3600,
    "errorRate": 0.5
  },
  "stats": {
    "avgMemoryMB": 230.5,
    "avgDbResponseMs": 50.2,
    "maxMemoryMB": 280.1
  },
  "circuits": {
    "database": { "state": "CLOSED", "failures": 0 },
    "externalAPI": { "state": "CLOSED", "failures": 0 }
  }
}
```

---

### 5. Backup e Restore

#### Fazer Backup Manual

**Linux/Mac:**
```bash
cd backend/scripts
./backup-database.sh

# Com variáveis customizadas
DB_NAME=sispat_prod \
DB_USER=sispat_user \
BACKUP_DIR=/custom/path \
./backup-database.sh
```

**Windows:**
```powershell
cd backend\scripts
.\backup-database.ps1

# Com parâmetros
.\backup-database.ps1 `
  -BackupDir "D:\Backups\SISPAT" `
  -DbName "sispat_prod" `
  -RetentionDays 60
```

#### Restaurar Backup

**Linux/Mac:**
```bash
# Listar backups e escolher
./restore-database.sh

# Ou especificar diretamente
./restore-database.sh /var/backups/sispat/sispat_backup_20251012.sql.gz
```

**Windows:**
```powershell
# Listar
Get-ChildItem D:\Backups\SISPAT\*.sql.gz

# Restaurar
gunzip -c backup.sql.gz | psql -U sispat_user -d sispat_prod
```

---

## 🔥 CENÁRIOS DE USO REAL

### Cenário 1: Database com Latência Alta

```typescript
// Sistema detecta e se adapta automaticamente

export const buscarPatrimonios = async (req, res) => {
  try {
    // 1. Circuit breaker verifica se DB está saudável
    // 2. Se lento mas funcionando, executa
    // 3. Se muito lento, alert no Sentry
    // 4. Se muitas falhas, circuit abre
    
    const patrimonios = await databaseCircuit.execute(async () => {
      return await retryDatabaseConnection(async () => {
        return await prisma.patrimonio.findMany()
      })
    })
    
    res.json({ patrimonios })
  } catch (error) {
    // Circuit OPEN = fail fast
    res.status(503).json({ 
      error: 'Database temporariamente indisponível' 
    })
  }
}

// Resultado:
// ✅ Usuário recebe resposta rápida (não fica esperando)
// ✅ Database não é sobrecarregado
// ✅ Alertas automáticos enviados
// ✅ Auto-recovery quando DB melhorar
```

### Cenário 2: Pico de Tráfego

```typescript
// Rate limiting protege automaticamente

// Request 1-100: ✅ Passam normalmente
// Request 101+:  ❌ Bloqueadas com 429

// Cliente recebe:
{
  "error": "Too Many Requests",
  "retryAfter": 900  // segundos até poder tentar novamente
}

// Sistema:
// ✅ Continua estável
// ✅ Não trava
// ✅ Logs de rate limit
// ✅ Usuários legítimos não afetados
```

### Cenário 3: Falha no Disco (Backup Salva)

```
Dia 1: Sistema rodando normalmente
       └─ Backup automático às 2AM ✅

Dia 5: Disco corrompe 💥
       ├─ Sistema para
       ├─ Dados aparentemente perdidos
       └─ MAS: Temos 5 backups!

Dia 5 (30 min depois):
       ├─ Restore do backup mais recente
       ├─ Sistema volta ao ar
       └─ Perda ZERO de dados ✅

Conclusão: Backup salvou o dia! 🎉
```

---

## 🎯 BEST PRACTICES

### 1. Sempre Use Retry em Operações Críticas

```typescript
// ❌ MAU (sem retry):
const result = await prisma.patrimonio.create({ data })

// ✅ BOM (com retry):
const result = await retryDatabaseConnection(async () => {
  return await prisma.patrimonio.create({ data })
})
```

### 2. Use Circuit Breaker para Serviços Externos

```typescript
// ❌ MAU (pode travar se serviço lento):
const data = await fetch('https://external-api.com/slow-endpoint')

// ✅ BOM (fail fast se serviço com problemas):
const data = await externalAPICircuit.execute(async () => {
  return await fetch('https://external-api.com/slow-endpoint')
})
```

### 3. Rate Limiting em Operações Custosas

```typescript
// ✅ Sempre proteja:
router.post('/relatorios/pdf', reportRateLimiter, generatePDF)
router.post('/upload', uploadRateLimiter, uploadFile)
router.post('/exportacao/excel', reportRateLimiter, exportExcel)
```

### 4. Monitore Métricas Regularmente

```bash
# Verificar métricas diariamente
curl http://localhost:3000/api/health/metrics

# Ou visualizar no Sentry Dashboard
```

### 5. Teste Backups Mensalmente

```bash
# 1. Fazer backup
./backup-database.sh

# 2. Restaurar em ambiente de teste
./restore-database.sh backup.sql.gz

# 3. Verificar integridade dos dados
```

---

## 🚨 TROUBLESHOOTING

### Retry Não Está Funcionando

```typescript
// Verificar:
console.log('Tentando operação...')
await retryOperation(() => operacao(), 3, 1000, 2)
console.log('Operação concluída')

// Deve mostrar logs de retry no console
```

### Circuit Breaker Sempre OPEN

```typescript
// Ver estado
const state = databaseCircuit.getState()
console.log(state)

// Aumentar threshold se falsos positivos
const newCircuit = new CircuitBreaker('my-circuit', {
  failureThreshold: 10, // Aumentar
  timeout: 20000,       // Aumentar timeout
})

// Ou resetar manualmente
databaseCircuit.reset()
```

### Rate Limiting Muito Restritivo

```typescript
// Aumentar limites em advanced-rate-limit.ts
const globalRateLimiter = rateLimit({
  max: 200, // Aumentar de 100 para 200
  windowMs: 15 * 60 * 1000,
})
```

### Backup Falhando

```bash
# Verificar:
which pg_dump          # Instalado?
df -h                  # Espaço em disco?
ls -la /var/backups    # Permissões?

# Testar manualmente
pg_dump -U user -d database > test.sql
```

---

## 📊 MONITORAMENTO

### Dashboards Recomendados

**1. Sentry:**
- Erros em tempo real
- Performance metrics
- Session replay

**2. UptimeRobot:**
- Status de uptime
- Response times
- Histórico de downtime

**3. Health Metrics API:**
```bash
# Ver métricas
curl http://localhost:3000/api/health/metrics | jq

# Monitorar continuamente
watch -n 10 'curl -s http://localhost:3000/api/health/metrics | jq .current'
```

---

## ✅ CONCLUSÃO

Com as novas funcionalidades, você tem:

- ✅ **Retry automático** em falhas
- ✅ **Circuit breaker** proteção
- ✅ **Rate limiting** contra abuso
- ✅ **Backup diário** automático
- ✅ **Monitoring 24/7**
- ✅ **Alertas** automáticos

**Use-as para garantir 99.9% uptime!** 🚀

