# SEGURANÇA — SISPAT 2.0

> Status da auditoria realizada em 2026-05-12.

## Resumo

| Categoria | Status |
|-----------|--------|
| JWT/Auth | ✅ OK (refresh sem rotation 🟡) |
| Hashing | ✅ bcrypt 12 rounds |
| CORS | ✅ Restritivo |
| Helmet/CSP/HSTS | ✅ Configurado |
| Rate limiting | ✅ Login 5/15min, global 2000/15min |
| Validação | 🟡 Boa cobertura mas não 100% das rotas |
| SQL Injection | 🟡 Raw queries em `customizationController.ts` (template literals — protegido por Prisma) |
| Upload | 🟡 Valida MIME mas não magic bytes |
| IDOR | 🔴 Delete de arquivos não valida `municipalityId` |
| Secrets em código | ✅ Nenhum hardcoded |
| Logs sensíveis | 🟡 Risco de PII em logs estruturados |
| HTTPS | ✅ Nginx + Let's Encrypt + HSTS |

## Achados detalhados

### 🔴 Crítico

#### 1. IDOR em delete de upload
**Arquivo:** `backend/src/controllers/uploadController.ts:135-176`
**Problema:** Endpoint `DELETE /api/upload/:filename` valida autenticação mas não checa se o arquivo pertence ao `municipalityId` do usuário. Usuário do município A pode deletar arquivo do município B se conhecer o nome.
**Correção sugerida:** armazenar metadata de upload (tabela `Upload` ou campo no `Patrimonio`/`Documento`) com `municipalityId`. Validar antes de deletar.

### 🟡 Médio

#### 2. Refresh token sem revogação
**Arquivo:** `backend/src/controllers/authController.ts:131-180`
**Problema:** Refresh emite novo access token mas o refresh anterior continua válido. Em comprometimento de token, não há como revogar.
**Correção:** lista de tokens revogados em Redis (TTL = expiração do refresh) ou versionamento (`tokenVersion` no User, incrementa no logout).

#### 3. Upload sem validação de magic bytes
**Arquivo:** `backend/src/middlewares/uploadMiddleware.ts:66-82`
**Problema:** Confia apenas em `mimetype` declarado, que vem do cliente. Arquivo `.exe` pode ser enviado como `image/png`.
**Correção:** validar magic bytes do conteúdo (libs como `file-type`).

#### 4. SVG passível de upload
**Arquivo:** mesmo middleware
**Problema:** `image/svg+xml` não está explicitamente bloqueado. SVG pode conter JS executado quando renderizado inline.
**Correção:** whitelist conservadora: só JPEG, PNG, WebP, PDF. Excluir SVG ou sanitizar com DOMPurify se necessário.

#### 5. ~~Tokens em localStorage (XSS exposure)~~ → ✅ Resolvido no Sprint 13
**Estado anterior:** Access + refresh em `localStorage` — recuperáveis por XSS.
**Mudança:** A partir do Sprint 13 (2026-05-12), JWT viaja em **cookies HttpOnly + Secure (em prod) + SameSite=Lax**:
- `sispat_access` (24h) e `sispat_refresh` (7d): HttpOnly, JS não acessa
- `csrf_token`: não HttpOnly, frontend lê e ecoa no header `X-CSRF-Token`
- CSRF protegido via **double-submit cookie**: backend valida `cookies.csrf_token === headers['x-csrf-token']` em métodos mutáveis com sessão por cookie

Compatibilidade: backend ainda aceita `Authorization: Bearer ...` (back-compat para clientes máquina e período de transição). `withCredentials: true` no axios envia cookies automaticamente.

#### 6. PII em logs estruturados
**Arquivo:** `backend/src/config/logger.ts:74-80`
**Problema:** Logger captura `context` completo, podendo incluir emails, payloads de patrimônio.
**Correção:** middleware de redação (remover/mascarar campos `password`, `token`, `email`).

### 🟢 Baixo

#### 7. `console.log` no backend
236 ocorrências no total. Em produção, podem vazar dados em stdout/PM2 logs. Migrar para `logger`.

#### 8. Auditoria de dependências
`npm audit` não foi rodado com sucesso em dev. Rodar antes de cada deploy:
```bash
cd backend && npm audit --production
pnpm audit --prod
```

## Controles em vigor (manter)

- `helmet` com CSP, HSTS, X-Frame-Options
- `express-rate-limit` + Redis store
- bcrypt rounds=12, validação de força de senha
- JWT_SECRET mínimo 32 chars (validado em startup)
- CORS restrito a `FRONTEND_URL`
- `path.resolve()` em uploads (path traversal protegido)
- Sanitização de filenames

## Checklist pré-produção

- [ ] `.env.production` com valores reais (não `CHANGE_THIS_*`)
- [ ] `JWT_SECRET` único gerado por `openssl rand -base64 32`
- [ ] `BCRYPT_ROUNDS >= 12`
- [ ] `NODE_ENV=production`
- [ ] HTTPS configurado e HSTS ativo
- [ ] `DATABASE_URL` com `sslmode=require` se DB remoto
- [ ] Backup automático testado (restore funcional)
- [ ] Logs sem dados sensíveis em sample
- [ ] Sentry ou equivalente para erros
- [ ] Senha de superuser inicial alterada após primeiro login
- [ ] `npm audit` sem high/critical sem mitigação

## Resposta a incidente

1. Isolar (modo manutenção via Nginx 503)
2. Snapshot de logs (Postgres + PM2 + Nginx) → preservar evidência
3. Rotacionar `JWT_SECRET` (invalida sessões), revogar refresh tokens
4. Rotacionar senha de DB, Redis, SMTP
5. Forçar logout (incrementar `tokenVersion` global se implementado)
6. Comunicar usuários afetados se PII vazou
7. Postmortem em `HISTORICO_CORRECOES.md`
