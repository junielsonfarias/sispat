# INFRAESTRUTURA — SISPAT 2.0

## Topologia de produção

```
Internet
   │  443/80
   ▼
┌─────────────────────────────────────┐
│ Nginx (TLS, gzip, proxy, static)    │
│ /etc/nginx/sites-enabled/sispat     │
└──┬───────────────────────────┬──────┘
   │ static files               │ /api → proxy
   ▼                            ▼
/var/www/sispat/dist/      127.0.0.1:3000
                                │
                                ▼
                          PM2 → Node.js
                          (sispat-backend)
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
       Postgres 15        Redis 7         uploads/
       (sispat_prod)      (cache)         (multer)
```

## Diretórios padrão (VPS)

- App: `/var/www/sispat/`
- Uploads: `/var/www/sispat/backend/uploads/`
- Logs aplicação: `/var/www/sispat/backend/logs/`
- Logs Nginx: `/var/log/nginx/`
- Backups: `/var/backups/sispat/`
- Certificados: `/etc/letsencrypt/live/<DOMAIN>/`

## Componentes

### Nginx
- Proxy reverso (TLS termination)
- Serve estáticos do build do Vite
- Proxy `/api` → `127.0.0.1:3000`
- Proxy `/uploads` → `127.0.0.1:3000` (servidor expõe pasta)
- **Cuidado conhecido:** `localhost` resolveu para IPv6 e quebrou o proxy. **Sempre usar `127.0.0.1` em upstream.** (ver `HISTORICO_CORRECOES.md`)

### PM2
- Processo: `sispat-backend`
- Configuração: `backend/ecosystem.config.js`
- Logs: `pm2 logs sispat-backend`
- Restart automático em falha
- Boot via `pm2 startup` + `pm2 save`

### PostgreSQL 15
- Database: `sispat_prod`
- Usuário: `sispat_user`
- Pool: 20 conexões (`DATABASE_POOL_SIZE`)
- SSL: `DATABASE_SSL=false` (localhost), `true` se DB remoto

### Redis 7
- Opcional, ativado por `ENABLE_REDIS=true`
- Usado para rate limit distribuído e cache de queries pesadas
- Sem password por default (instância local) — em produção definir `REDIS_PASSWORD`

## Variáveis de ambiente

### Backend (`backend/.env`)
| Variável | Obrigatório | Default | Notas |
|----------|------------|---------|-------|
| `NODE_ENV` | sim | — | `development\|production\|test` |
| `DATABASE_URL` | sim | — | Postgres URL completa |
| `JWT_SECRET` | sim | — | ≥32 chars em produção |
| `JWT_EXPIRES_IN` | não | `24h` | |
| `JWT_REFRESH_EXPIRES_IN` | não | `7d` | |
| `PORT` | não | `3000` | |
| `FRONTEND_URL` | sim | — | Origin para CORS |
| `BCRYPT_ROUNDS` | não | `12` | ≥12 em prod |
| `MAX_FILE_SIZE` | não | `10485760` | 10MB |
| `ALLOWED_FILE_TYPES` | não | jpeg,png,gif,pdf | |
| `UPLOAD_PATH` | não | `./uploads` | |
| `RATE_LIMIT_WINDOW` | não | `15` | minutos |
| `RATE_LIMIT_MAX` | não | `100` | req/janela |
| `ENABLE_REDIS` | não | `false` | |
| `REDIS_URL` | se Redis | — | `redis://host:port` |
| `REDIS_PASSWORD` | recomendado | — | |
| `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` | se email | — | |
| `LOG_LEVEL` | não | `info` | |
| `BACKUP_ENABLED` | não | `true` | |
| `BACKUP_SCHEDULE` | não | `0 2 * * *` | cron |
| `BACKUP_RETENTION_DAYS` | não | `30` | |

### Frontend (`.env`)
| Variável | Notas |
|----------|-------|
| `VITE_API_URL` | URL completa da API (com `/api`) |
| `VITE_USE_BACKEND` | `true` em prod |
| `VITE_ENV` | `development`/`production` |
| `VITE_SENTRY_DSN` | opcional |

## Deploy

### Caminho atual (manual VPS)
1. SSH no servidor
2. `cd /var/www/sispat && git pull`
3. Frontend: `pnpm install && pnpm run build`
4. Backend: `cd backend && npm install && npm run build && npx prisma migrate deploy`
5. `pm2 restart sispat-backend`
6. `sudo nginx -t && sudo systemctl reload nginx`

### Script atualizado (`install.sh`)
- 90KB, ~2500 linhas
- Idempotente em maior parte
- Faz: instala dependências do SO, Node 18, Postgres, Redis, Nginx, Certbot, clona repo, configura PM2, gera `.env`, roda seed
- **Cuidado:** assume Ubuntu 22/24 LTS

### CI/CD (GitHub Actions)
- `.github/workflows/ci.yml` — testes, lint, build em PR e push
- `.github/workflows/deploy.yml` — build Docker → push GHCR → SSH deploy no servidor
- Secrets necessários: `PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY`

## Docker (alternativa)

- `Dockerfile` (frontend) + `backend/Dockerfile.prod`
- `docker-compose.prod.yml` orquestra: postgres, redis, backend, nginx
- Imagens publicadas em `ghcr.io/junielsonfarias/sispat-*`

## Backup

- Script: `scripts/backup.sh` (cron diário 02:00)
- O que faz: `pg_dump` do `sispat_prod` + tar dos uploads → `/var/backups/sispat/`
- Retenção 30 dias (limpa arquivos antigos)
- **Falta:** sync para storage off-site (S3 ou similar) — débito técnico.

## Monitoramento

### Logs
- App: `/var/www/sispat/backend/logs/app-YYYY-MM-DD.log` (rotação diária via winston)
- Nginx access/error: `/var/log/nginx/`
- PM2: `pm2 logs sispat-backend`

### Health checks
- `GET /api/health` — status básico
- `GET /api/health/db` — checa Postgres
- `GET /api/health/redis` — checa Redis
- `GET /api/health/full` — tudo

### Métricas
- Endpoints `/api/performance/metrics` e `/api/performance/slow-queries` (apenas admin)
- Sentry: opcional, configurar `SENTRY_DSN`

### Faltam
- Prometheus + Grafana
- Alerta de uptime (UptimeRobot/StatusCake)
- Log centralizado (Loki, Datadog)

## SSL

- Let's Encrypt via certbot
- Renovação automática (`certbot --nginx`)
- HSTS ativo (max-age 1 ano, includeSubDomains, preload)

## Procedimentos operacionais

### Reset de senha de superuser
Ver `Docs/_PROJETO/HISTORICO_CORRECOES.md` § "Credenciais de superuser".

### Rollback de deploy
**Não há fluxo padronizado.** Hoje: `git revert` + redeploy. **Débito** — ver `PLANO_CORRECOES.md`.

### Recuperação de backup
Script `scripts/restore-sispat.sh` — testar em ambiente de staging antes.
