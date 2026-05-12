# PLANO DE CORREÇÕES E MELHORIAS — SISPAT 2.0

> Baseado na auditoria de 2026-05-12. Prioridades em 4 níveis: 🔴 P0 crítico, 🟠 P1 importante, 🟡 P2 melhoria, 🟢 P3 débito técnico.

---

## 🔴 P0 — Correções Críticas (fazer em ≤ 1 semana)

> **Sprint 1 concluído em 2026-05-12.** Itens 1–4 ✅. Ver `HISTORICO_CORRECOES.md`.

### 1. ✅ Corrigir IDOR no delete de arquivos
- **Onde:** `backend/src/controllers/uploadController.ts:135-176`
- **Risco:** usuário de um município pode deletar arquivos de outro
- **Como:** criar tabela `Upload` (id, filename, mimeType, size, municipalityId, uploadedBy, createdAt). No delete, validar `municipalityId === req.user.municipalityId`. Para arquivos legados, fazer best-effort matching pelo `Patrimonio.fotos[]`.
- **Esforço:** 1 dia
- **Teste:** integration test com 2 municípios, garantir 403 cruzado.

### 2. ✅ Auditar e remover `$queryRaw` em customizationController
- **Onde:** `backend/src/controllers/customizationController.ts`
- **Risco:** mesmo sendo parametrizado, abre porta para mistakes futuros
- **Como:** substituir por `prisma.customization.findMany/upsert` com `where: { municipalityId }`. Se houver query agregada que justifique raw, isolar e comentar o porquê.
- **Esforço:** 4h

### 3. ✅ Habilitar linter no backend
- **Onde:** `backend/package.json:26`
- **Risco:** CI não detecta problemas; código novo entra sem revisão automática
- **Como:** adicionar ESLint + `@typescript-eslint`:
  ```bash
  cd backend
  npm i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
  ```
  Configurar `.eslintrc.cjs` herdando do frontend. Adicionar `"lint": "eslint src --ext .ts --cache"`.
- **Esforço:** 2h

### 4. ✅ Documentar fluxo de rollback
- **Onde:** `Docs/_PROJETO/INFRAESTRUTURA.md`
- **Risco:** sem rollback, deploys ruins ficam quebrados longamente
- **Como:** criar `scripts/rollback.sh` que:
  - Faz checkout do commit anterior em `/var/www/sispat`
  - Restaura backup mais recente do DB (opcional, com confirmação)
  - Restart PM2 + reload Nginx
- **Esforço:** 4h

---

## 🟠 P1 — Importantes (≤ 1 mês)

### 5. Refresh token rotation/revogação
- **Onde:** `backend/src/controllers/authController.ts`
- **Como:** tabela `RefreshToken` ou lista Redis com TTL. No refresh, invalidar antigo. No logout, invalidar todos do usuário.
- **Esforço:** 1 dia

### 6. Validação de magic bytes no upload
- **Onde:** `backend/src/middlewares/uploadMiddleware.ts`
- **Como:** `npm i file-type`, ler primeiros bytes do buffer e validar contra whitelist.
- **Bloquear SVG** explicitamente.
- **Esforço:** 4h

### 7. Refactor `patrimonioController.ts` (1320 linhas)
- **Onde:** `backend/src/controllers/patrimonioController.ts`
- **Como:** extrair para `services/patrimonioService.ts`. Controller só lida com HTTP. Não engordar mais; ao adicionar feature, criar service primeiro.
- **Esforço:** 2-3 dias
- **Sub-passos:**
  1. Criar `services/` e `repositories/` no backend
  2. Mover lógica de criação → `patrimonioService.create()`
  3. Lógica de baixa → `baixaPatrimonio()`
  4. Lógica de transferência → `transferenciaService`
  5. Testes integration para cada service

### 8. Reduzir `console.log` em produção
- **Onde:** todo o código
- **Como:** 
  - Backend: substituir todos os `console.log` por `logger.info/warn/error/debug`.
  - Frontend: remover ou condicionar a `import.meta.env.DEV`.
  - Adicionar regra ESLint `no-console: ["error", { allow: ["warn", "error"] }]`.
- **Esforço:** 1 dia

### 9. Aumentar cobertura de testes
- **Meta:** 60% nas rotas críticas de backend (auth, patrimonio, upload, transferencia).
- **Como:** 
  - Setup `supertest` + Postgres test container (jest)
  - 1 arquivo de teste por controller crítico
  - Mockar email/Redis se necessário
- **Esforço:** 1 semana (incremental)

### 10. Limpeza de `Docs/` e raiz
- **Onde:** raiz do projeto + `Docs/`
- **Como:**
  - Mover `.sh`, `.md`, `.txt` de raiz para `Docs/_LEGADO/` (não deletar — arquivar).
  - Em `Docs/`, deletar arquivos com sufixo ` copy`, ` copy 2`, `_FINAL_FINAL` quando duplicarem (verificar diff antes).
  - Consolidar 15+ `corrigir-nginx-*.sh` em **um** script `scripts/fix-nginx.sh`.
- **Esforço:** 1 dia
- **Cuidado:** commitar limpeza em PR/commit isolado, fácil de reverter.

### 11. Forçar `strict: true` no backend tsconfig
- **Onde:** `backend/tsconfig.json`
- **Como:** ativar `strict` aos poucos:
  1. `noImplicitAny: true` primeiro → corrigir os 94 any's
  2. Depois `strictNullChecks: true`
  3. Por fim `strict: true`
- **Esforço:** 2-3 dias (em paralelo com outras tarefas)

---

## 🟡 P2 — Melhorias (próximos 3 meses)

### 12. Tokens em HttpOnly cookies
- Migrar de `localStorage` para cookies HttpOnly+Secure+SameSite=Strict.
- Adicionar CSRF protection (token em header `X-CSRF-Token`).
- Esforço: 3 dias.

### 13. Centralizar validação Zod (compartilhar cliente↔servidor)
- Criar `packages/shared/schemas/` (monorepo light) com schemas Zod usados pelos dois.
- Backend valida com mesmo schema do frontend.
- Esforço: 2 dias.

### 14. Camada de Repository
- Após services, introduzir repositories para isolar Prisma.
- Facilita troca de ORM ou mocking em testes.
- Esforço: paralelo ao refactor.

### 15. Observabilidade
- Sentry em backend + frontend (já tem `@sentry/*` em dependências, ativar).
- Métricas Prometheus em `/metrics` (lib `prom-client`).
- Dashboard Grafana com: requests/s, p95 latency, erros 5xx, query lenta.
- Alerta no Telegram/email para erro 5xx > X/min.
- Esforço: 2-3 dias.

### 16. CI/CD enriquecido
- Adicionar job de `npm audit` (high/critical falha o build).
- Job de bundle size check (alerta se >X MB).
- Job de e2e em ambiente staging antes do deploy.
- Esforço: 1 dia.

### 17. Backup off-site
- Sync diário de `/var/backups/sispat/` para S3 (ou compatível tipo Backblaze B2).
- Teste de restore mensal.
- Esforço: 4h.

### 18. Documentação Swagger completa
- Atualizar `backend/src/config/swagger.ts` para cobrir 100% das rotas com schemas Zod-derived.
- Servir `/api/docs` apenas em dev/staging (não em prod) por segurança.
- Esforço: 1 dia.

### 19. Internacionalização (i18n)
- Hoje tudo PT-BR hardcoded. Avaliar `react-i18next` se houver demanda de outros estados/línguas.
- Esforço: 3 dias.

### 20. Acessibilidade audit
- Rodar Lighthouse + axe em principais páginas.
- Score-alvo: WCAG AA.
- Esforço: 2 dias.

---

## 🟢 P3 — Débitos técnicos (back-burner)

- **30 contexts:** consolidar em ~10. Avaliar Zustand para casos onde Context causa rerender em árvore grande.
- **Versionamento de API:** rotas hoje em `/api/*` sem versão. Considerar `/api/v1/*` antes de breaking changes futuras.
- **Monorepo:** com `pnpm workspaces` para compartilhar tipos/schemas.
- **Docker para dev:** `docker-compose.dev.yml` que sobe Postgres + Redis para evitar setup manual.
- **Storybook:** documentar componentes Shadcn customizados.
- **Banco de teste isolado:** hoje testes podem afetar dev se mal configurados.
- **Healthcheck mais robusto:** `/health` retornar JSON com status de DB, Redis, disk space.

---

## Quick wins (faça hoje se possível)

1. Adicionar `.claude/` ao `.gitignore` — **JÁ FEITO**
2. Habilitar ESLint no backend (P0 #3)
3. Criar regra ESLint `no-console` no frontend
4. Mover `.sh` da raiz para `Docs/_LEGADO/` (limpa visualmente; sem impacto)
5. Atualizar README com link para `Docs/_PROJETO/`

---

## Como priorizar próxima sprint

Sugestão de ordem de execução considerando risco × esforço:

| Sprint | Foco |
|--------|------|
| Sprint 1 (1 sem) | P0 #1, #2, #3, #4 — quick wins de segurança e DX |
| Sprint 2 (1 sem) | P1 #5, #6, #8 — fechar superfície de ataque + limpeza |
| Sprint 3 (2 sem) | P1 #7, #9 — refactor service layer + testes |
| Sprint 4 (1 sem) | P1 #10, #11 — limpeza + tighten TS |
| Backlog | P2 e P3 conforme oportunidade |

---

## Métricas de sucesso

Definir baseline e medir após cada sprint:

| Métrica | Hoje | Meta 3 meses |
|---------|------|--------------|
| `any` no código | 222 | < 50 |
| `console.log` em prod code | 236 | 0 |
| Cobertura testes backend | ~5% | ≥ 60% (rotas críticas) |
| Linhas no maior controller | 1320 | < 300 |
| Vulnerabilidades npm audit (high+) | ? | 0 |
| Tempo médio de deploy | manual | < 5 min automatizado |
| MTTR (mean time to recover) | ? | < 30 min |
| Docs duplicados em `Docs/` | 124 | 0 |
| Scripts `.sh` na raiz | 50+ | 0 |
