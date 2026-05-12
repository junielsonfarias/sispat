# Guia rápido — instalação nova em VPS

> Sprint 1–5 aplicados. Esta é a sequência testada para subir o sistema do zero
> numa VPS Ubuntu 22.04/24.04 LTS. Tempo estimado: 15–25 min.

## Pré-requisitos

- VPS Ubuntu 22.04 ou 24.04 LTS com acesso root via SSH
- Domínio com DNS apontando para o IP da VPS (registro A)
- Email válido para Let's Encrypt
- 2 GB RAM, 2 vCPU, 20 GB disk (mínimo)

## Passo a passo

### 1) Acessar a VPS e baixar o script

```bash
ssh root@<IP_DA_VPS>
wget https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh
chmod +x install.sh
```

### 2) Rodar o instalador

```bash
./install.sh
```

O script vai pedir interativamente:
- Domínio (ex: `sispat.minhaprefeitura.gov.br`)
- Email para Let's Encrypt
- Confirmação para Postgres/Nginx/PM2

Tudo o mais é automático:
- Instala Node 18, Postgres 15, Nginx
- Gera `JWT_SECRET` forte (`openssl rand -hex 64`)
- Gera senha aleatória do Postgres
- Cria banco `sispat_prod` + usuário `sispat_user`
- Roda `prisma migrate deploy` (inclui a migration `add_refresh_tokens`)
- Build do backend (`tsc`) e frontend (`pnpm build`)
- Sobe PM2 (`sispat-backend`) e configura `pm2 startup` + `pm2 save`
- Configura Nginx com proxy para `127.0.0.1:3000` (não `localhost` — IPv6 quebrava)
- Roda `certbot --nginx` para SSL automático

### 3) Após o script terminar

**Login inicial:** `superuser@sistema.com` / `SenhaInicial123!` (mostrado no final do script).
**Trocar a senha** imediatamente em `Conta → Alterar senha`.

### 4) Configurações opcionais

#### Email (necessário para reset de senha)
Edite `/var/www/sispat/backend/.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seuemail@gmail.com
SMTP_PASS=sua-app-password
SMTP_FROM="SISPAT <noreply@seudominio.gov.br>"
```
Reinicie: `pm2 restart sispat-backend`

#### Sentry (error tracking)
1. Criar projeto em https://sentry.io (Node.js)
2. Copiar o DSN
3. Em `/var/www/sispat/backend/.env`: `SENTRY_DSN=https://...@sentry.io/...`
4. Em `/var/www/sispat/.env.production` (frontend): `VITE_SENTRY_DSN=https://...` (requer `pnpm add @sentry/react` antes — pendente)
5. `pm2 restart sispat-backend`

#### Redis (cache + rate limit distribuído)
```bash
apt install -y redis-server
systemctl enable --now redis-server
```
Em `/var/www/sispat/backend/.env`:
```env
ENABLE_REDIS=true
REDIS_URL=redis://localhost:6379
```
`pm2 restart sispat-backend`

#### Backup off-site (opcional mas recomendado)
Cron diário (`0 2 * * *`) gera dumps em `/var/backups/sispat`. Para enviar a um bucket remoto (S3, Backblaze B2, MinIO, R2 — qualquer um suportado por rclone):

```bash
apt install -y rclone
rclone config            # interativo — criar remote "sispat-offsite"
```

Em `/var/www/sispat/backend/.env`:
```env
OFFSITE_REMOTE=sispat-offsite
OFFSITE_BUCKET=meu-bucket-sispat
OFFSITE_RETENTION_DAYS=180
```

Agendar cron 1h após o backup local:
```bash
crontab -e
# 0 3 * * * /var/www/sispat/scripts/backup-offsite.sh >> /var/log/sispat-backup-offsite.log 2>&1
```

Sem rclone instalado ou env vars setadas, o script é no-op (não falha).

#### Frontend Sentry (opcional)
1. Criar projeto React em https://sentry.io e copiar o DSN
2. `cd /var/www/sispat && pnpm add @sentry/react`
3. Em `/var/www/sispat/.env.production`: `VITE_SENTRY_DSN=https://...`
4. `pnpm run build && pm2 restart sispat-backend`

Sem o pacote instalado ou DSN ausente, `initSentry()` é no-op silencioso.

## Verificação pós-deploy

```bash
# Backend respondendo?
curl -s http://127.0.0.1:3000/api/health | jq

# HTTPS funcional?
curl -sI https://seudominio.gov.br/api/health

# PM2 rodando?
pm2 list

# Logs sem erros?
pm2 logs sispat-backend --lines 50 --nostream

# Migrations aplicadas (procurar refresh_tokens)?
sudo -u postgres psql sispat_prod -c "\d refresh_tokens"
```

Saída esperada do `/api/health`:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-12T...",
  "uptime": 123.45,
  "environment": "production",
  "version": "2.1.0"
}
```

## Rollback (se algo der errado após update)

```bash
cd /var/www/sispat
sudo bash scripts/rollback.sh --list           # listar opções
sudo bash scripts/rollback.sh                   # rollback para HEAD~1
sudo bash scripts/rollback.sh <sha>             # para sha específico
sudo bash scripts/rollback.sh --with-db         # também restaura backup do DB
```

## Atualização contínua (após primeiro deploy)

```bash
cd /var/www/sispat
git pull
cd backend && npm ci && npx prisma migrate deploy && npm run build
cd .. && pnpm install --frozen-lockfile && pnpm run build
pm2 restart sispat-backend
sudo nginx -t && sudo systemctl reload nginx
```

Ou use os scripts em `scripts/`:
- `scripts/atualizar-producao.sh`
- `scripts/atualizar-backend-producao.sh`

## Troubleshooting rápido

| Sintoma | Verificar |
|---------|-----------|
| 502 Bad Gateway | `pm2 logs sispat-backend` — backend crashou? |
| 502 + backend rodando | `nginx -t` — confere `proxy_pass http://127.0.0.1:3000` (não `localhost`) |
| 429 no login | `RATE_LIMIT_MAX` no `.env` — agora padrão 100, era 5 |
| Reset de senha não envia | `SMTP_*` no `.env`, `pm2 logs` para erro |
| Upload retorna 400 "conteúdo inválido" | Magic bytes ativos — só JPEG/PNG/GIF/WebP/PDF (SVG bloqueado) |
| Login funciona, refresh falha | Migration `add_refresh_tokens` rodou? `\d refresh_tokens` no psql |
| Sistema lento | Ativar Redis (`ENABLE_REDIS=true` + instalar `redis-server`) |

## Pastas e arquivos chave após instalação

```
/var/www/sispat/                    # raiz da aplicação
├── backend/
│   ├── .env                        # configurações de produção (gerado)
│   ├── dist/                       # build TypeScript
│   ├── uploads/                    # arquivos enviados (755)
│   └── logs/                       # logs Winston rotacionados
├── dist/                           # build do frontend (servido pelo Nginx)
└── scripts/                        # rollback, backup, monitor, etc.

/etc/nginx/sites-enabled/sispat     # config Nginx
/etc/letsencrypt/live/<dominio>/    # certificados SSL
/var/backups/sispat/                # backups diários (cron 02:00, retenção 30d)
/var/log/nginx/                     # logs Nginx
```
