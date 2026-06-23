# CLAUDE.md — Guia do Projeto SISPAT 2.0

> Este arquivo orienta o Claude Code ao trabalhar neste repositório.
> Leia também os documentos em `Docs/_PROJETO/` antes de tarefas grandes.

---

## 1. Visão geral

**SISPAT 2.0** — Sistema Integrado de Patrimônio (gestão de bens públicos municipais).
Aplicação multi-tenant por `municipalityId` com 5 papéis: `superuser`, `admin`, `supervisor`, `usuario`, `visualizador`.

- **Frontend:** React 19 + Vite + TypeScript + Tailwind + Shadcn/UI (`src/`)
- **Backend:** Node.js + Express 5 + Prisma 6 + PostgreSQL 15 + Redis (`backend/`)
- **Auth:** JWT (access 24h + refresh 7d), bcrypt 12 rounds
- **Deploy:** VPS Linux com Nginx + PM2 (alt. Docker Compose). CI/CD em `.github/workflows/`
- **Repositório:** https://github.com/junielsonfarias/sispat

## 2. Comandos essenciais

### Frontend (raiz)
```bash
pnpm install
pnpm run dev              # vite dev server
pnpm run build            # build produção
pnpm run lint             # eslint --cache
pnpm run type-check       # tsc --noEmit
pnpm test                 # vitest
pnpm run test:e2e         # playwright
```

### Backend (`backend/`)
```bash
npm install
npm run dev               # nodemon + ts-node
npm run build             # tsc
npm start                 # node dist/index.js
npm run prisma:migrate    # migrations em dev
npm run prisma:studio     # GUI do banco
npm test                  # jest
```

## 3. Onde está cada coisa (essencial)

| Área | Caminho |
|------|---------|
| Rotas API | `backend/src/routes/` |
| Controllers | `backend/src/controllers/` |
| Middlewares (auth, validation, rate-limit) | `backend/src/middlewares/` |
| Schema do banco (CANÔNICO) | `backend/prisma/schema.prisma` — local padrão do Prisma, casa com as migrations e com o client gerado. O antigo `backend/src/prisma/schema.prisma` foi removido (estava dessincronizado: modelos fantasma e faltando models reais). |
| Migrations | `backend/prisma/migrations/` |
| Validação de env | `backend/src/config/validate-env.ts` |
| Páginas React | `src/pages/` |
| Componentes | `src/components/` |
| Contexts (estado global) | `src/contexts/` |
| HTTP client + interceptors | `src/services/http-api.ts` |
| Validações Zod | `src/lib/validations/` |
| Hooks | `src/hooks/` |
| Tipos globais | `src/types/index.ts` |
| Instalação VPS | `install.sh` (raiz) |
| Workflows CI/CD | `.github/workflows/` |
| Docs do projeto | `Docs/_PROJETO/` |

## 4. Convenções obrigatórias

### Código
- **NÃO criar `*.md`, scripts `.sh` ou arquivos de debug na raiz.** Já temos >60 scripts e >500 docs poluindo. Use `Docs/_PROJETO/` para docs de referência e `scripts/` para scripts versionados.
- **NÃO usar `console.log` em código de produção.** Use o `logger` do Winston no backend (`backend/src/config/logger.ts`) e remova logs ao entregar feature no frontend (ou condicione a `import.meta.env.DEV`).
- **Sem `any` novo no TypeScript.** Backend tem `strict: false`, mas o objetivo é reduzir os 222 `any`'s existentes — não adicionar mais.
- **Backend controllers:** lógica nova vai em `services/` (a criar), controllers só orquestram. NÃO engordar controllers existentes.
- **Multi-tenant:** TODA query Prisma com dados de usuário precisa filtrar por `municipalityId`. `superuser` pode bypassar (verificar em código existente como referência).
- **Validação de input:** rotas POST/PUT/PATCH devem ter `express-validator` aplicado + `handleValidationErrors`.

### Git
- Branch principal: `main`. Sem PRs por enquanto (commits direto).
- Mensagens em pt-BR (manter padrão existente): `feat:`, `fix:`, `chore:`, `docs:`.
- **Não rodar `git push --force` em `main`.** **Não usar `--no-verify`.**

### Skills do Claude (este projeto)
Quando executar tarefas substanciais:
1. **Antes de mudar código backend** — confira `Docs/_PROJETO/ARQUITETURA.md` e `REGRAS_NEGOCIO.md`.
2. **Antes de mudar infra (install.sh, Nginx, PM2)** — confira `Docs/_PROJETO/INFRAESTRUTURA.md` e `HISTORICO_CORRECOES.md` (vários problemas já resolvidos lá).
3. **Após resolver um bug não-trivial** — registre em `Docs/_PROJETO/HISTORICO_CORRECOES.md` (não criar novo `.md` na raiz).
4. **Mudança que afeta deploy** — atualize `CHECKLIST_DEPLOY.md` (raiz, já existe).

## 5. Pontos de atenção (débitos conhecidos)

> Atualizado 2026-06-23 após re-auditoria. **Resolvidos** (não são mais débitos): IDOR do `uploadController.deleteFile` (tem `isFileOwnedByMunicipality`); `$queryRaw` de `customizationController`/`auditLogController` (migrados p/ Prisma); `patrimonioController` (1320→361 linhas, lógica em `services/`); linter backend (`eslint src --ext .ts`); refresh token com rotação (`authService`); cobertura (36 suites Jest). Histórico em `HISTORICO_CORRECOES.md`.

Em aberto (deixados por decisão de produto/risco — ver memória `security-hardening-2026-06-23`):
- 🟡 Rotas públicas (`listPublicDocuments`, `listPublicPatrimonios`, customization public) não filtram `municipalityId` — latente em deploy mono-município; corrigir exige schema (`municipalityId` em `DocumentoGeral`) ou contrato com `municipalitySlug`.
- 🟡 `PUT /api/system-configuration` permite `admin` alterar config global da plataforma — restringir a `superuser` é hardening, mas afeta o toggle de busca pública (decisão de produto).
- 🟡 `cacheMiddleware` genérico (`config/redis.ts`) chaveia por URL sem `municipalityId` — risco de cache cross-tenant quando houver 2º município.
- 🟡 Bug pré-existente: `PublicSearchContext.tsx` faz `PUT /public/system-configuration`, rota que só tem GET → 404 silencioso no toggle de busca pública.

Plano detalhado em `Docs/_PROJETO/PLANO_CORRECOES.md`.

## 6. Skills disponíveis para Claude trabalhar neste projeto

- `update-config` — para mudar `settings.json`/permissões do Claude Code.
- `simplify` — revisar código alterado para qualidade e reuso.
- `claude-api` — se for tocar integração com SDK Anthropic.
- `review`, `security-review` — auditoria do branch atual.

Não invente outras. Não use Vercel/Next skills aqui (este projeto não é Vercel/Next).
