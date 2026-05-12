# HISTÓRICO DE CORREÇÕES — SISPAT 2.0

> Registro consolidado de erros encontrados e correções aplicadas.
> A partir de 2026-05-12, **toda nova correção não-trivial deve ser registrada aqui** — não criar `.md` na raiz nem em `Docs/`.

---

## Convenção de entrada

```
### YYYY-MM-DD — Título curto
- **Sintoma:** o que estava errado
- **Causa-raiz:** porque acontecia
- **Correção:** o que foi feito
- **Arquivos:** caminhos:linhas
- **Commit:** sha (se aplicável)
- **Lição:** para evitar repetir
```

---

## 2025

### 2025-11-19 — Permissões, PM2 e Nginx no install.sh
- **Sintoma:** Instalação fresh em VPS quebrava em vários pontos (uploads sem write, PM2 não iniciava no boot, Nginx servia 502).
- **Correção:** revisão completa do `install.sh`, agora com ordem correta de locations Nginx, permissões 755/775 para uploads, `pm2 startup` + `pm2 save`.
- **Commit:** `84d0e39`
- **Lição:** consolidar tudo em `install.sh` — pare de criar `CORRIGIR_*.sh` paralelos.

### 2025-11 — Fotos com URL `blob-*` no banco
- **Sintoma:** Após salvar patrimônio, fotos apareciam quebradas; o frontend gravava URL `blob:` (referência de memória do navegador) em vez do URL retornado pelo upload.
- **Causa:** lógica de update permitia que o array de fotos contivesse blob URLs não processadas.
- **Correção:** validação explícita no `updatePatrimonio` bloqueando URLs com `blob:` ou `blob-`. Script `limpar-fotos-invalidas.sh` para limpar banco.
- **Commits:** `953f7cd`, `55ca1f3`, `625f66f`
- **Lição:** validar formato de URL na entrada e na borda do banco.

### 2025-11 — Nginx ordem de locations e SSL
- **Sintoma:** Algumas rotas (uploads, /api) caíam em fallback errado.
- **Correção:** reorganização das diretivas `location` (mais específicas primeiro), bloco SSL corrigido.
- **Commit:** `c76c6d9`
- **Lição:** ordem de `location` no Nginx importa; sempre testar com `nginx -t` + curl direto.

### 2025-11 — Erro de `regclass` no Prisma
- **Sintoma:** Queries falhavam com erro de deserialização de `regclass`.
- **Causa:** uso de tipos Postgres-específicos não suportados pelo Prisma diretamente.
- **Correção:** ajuste do `schema.prisma` (cast explícito) — ver docs antigas (`CORRECAO_ERRO_REGCLASS.md`).
- **Lição:** evitar tipos PG não-padrão no Prisma; preferir `String`/`Bytes`.

### 2025-11 — Rate limit muito agressivo no login
- **Sintoma:** Usuários legítimos recebiam 429 ao tentar logar várias vezes em sequência.
- **Causa:** limite original era 5 tentativas / 15 min em rede compartilhada (IP único da prefeitura).
- **Correção:** mantido 5/15min para auth (proteção brute-force) e ajustada lógica de chave (usar `email` como adicional) — confirmar implementação atual.
- **Lição:** rate limit por IP é problemático em NAT corporativo; combinar com chave por usuário.

### 2025-11 — Métricas retornavam 404
- **Sintoma:** Página de métricas no admin quebrava (404).
- **Causa:** rotas não estavam registradas no `app.use` principal; cache do Nginx servia versão antiga.
- **Correção:** registro de rotas em `backend/src/index.ts` + recompile + restart PM2.
- **Lição:** após `git pull`, sempre rebuild + restart antes de testar.

### 2025-11 — Nginx resolvendo `localhost` como IPv6
- **Sintoma:** Backend respondia mas Nginx retornava 502 `connection refused`.
- **Causa:** `proxy_pass http://localhost:3000` resolvia para `[::1]:3000`, mas Node.js bindava apenas em IPv4.
- **Correção:** trocar `localhost` por `127.0.0.1` em todos os `proxy_pass`.
- **Lição:** SEMPRE usar `127.0.0.1` em upstreams Nginx para apps Node em VPS.

### 2025-11 — Multer types breaking build
- **Sintoma:** TypeScript não compilava após upgrade do `@types/multer`.
- **Correção:** ajustes nos type guards de `req.file`/`req.files`.
- **Lição:** travar versões de types em `package.json` ou validar antes de subir tipos novos.

### 2025-11 — Backend offline / conexão recusada
- **Sintoma:** vários relatos de "backend offline" após deploys.
- **Causa-raiz consolidada:** combinação de (1) IPv6/Nginx, (2) PM2 não persistido no boot, (3) ENV inválido fazia o processo crashar.
- **Correção:** validação de env na startup, PM2 startup script, healthcheck no install.
- **Lição:** falhar cedo (validar ENV) > falhar tarde (crash em runtime).

### 2025-11 — Credenciais inválidas após reset
- **Sintoma:** Login falhava com "credenciais inválidas" após rotação de senha.
- **Causa:** seed não atualizava registro existente.
- **Correção:** lógica de upsert no seed + script manual `atualizar-senha-superuser.sh`.
- **Lição:** seed sempre idempotente (upsert, não insert).

### 2025-11 — Report Templates retornando 500
- **Sintoma:** lista de templates de relatório dava 500.
- **Causa:** join faltante ou coluna nullable não tratada.
- **Correção:** ver `CORRIGIR_ERRO_500_REPORT_TEMPLATES.sh` (a consolidar).

---

## 2026

### 2026-05-12 — Auditoria geral do projeto (Claude)
- **Sintoma:** projeto cresceu sem governança — 553 docs (124 duplicados), 60+ scripts shell na raiz, controllers de 1300+ linhas, 222 `any`'s, 236 `console.log`s, backend sem linter, cobertura de teste ~10%.
- **Ação:** criada estrutura `Docs/_PROJETO/` com ARQUITETURA, REGRAS_NEGOCIO, CONVENCOES, INFRAESTRUTURA, SEGURANCA, HISTORICO, PLANO_CORRECOES. Criado `CLAUDE.md` na raiz para orientar IA.
- **Lição:** sem documentação canônica, qualquer nova feature gerava 2-3 `.md` paralelos. A partir de agora, atualizar **um** arquivo em `Docs/_PROJETO/` é o caminho.

### 2026-05-12 — `.claude/` adicionado ao `.gitignore`
- **Sintoma:** `.claude/` aparecia como untracked em todas as sessões.
- **Correção:** adicionada entrada `.claude/` no `.gitignore`.
- **Lição:** diretórios de ferramenta local (IDE, AI) devem ser ignorados sempre.

### 2026-05-12 — Sprint 1 P0: 4 correções críticas aplicadas

**1.1) IDOR no delete de upload (CRÍTICO)**
- **Sintoma:** `DELETE /api/upload/:filename` validava apenas autenticação, permitindo que usuário de um município deletasse arquivo de outro município se conhecesse o nome.
- **Correção:** adicionado helper `isFileOwnedByMunicipality()` em `uploadController.ts` que valida via referências em `Patrimonio.fotos[]`/`documentos[]`, `Imovel.fotos[]`/`documentos[]`, `Documento.url`, `Customization.*Url`, `Municipality.logoUrl`, `User.avatar` — tudo filtrado por `municipalityId` do usuário. Superuser bypassa. Também adicionada sanitização de filename contra path-traversal.
- **Arquivos:** `backend/src/controllers/uploadController.ts`
- **Lição:** todo endpoint que aceita identificador externo precisa validar ownership do tenant, não só autenticação.

**1.2) `$queryRaw` removido de customizationController**
- **Sintoma:** uso de `$queryRaw`/`$queryRawUnsafe`/`$executeRaw` para CRUD da tabela `customizations` — frágil, propenso a SQL injection se mal usado, e ignora API do Prisma já disponível.
- **Correção:** reescrito usando `prisma.customization.findUnique/upsert/deleteMany/create`. Implementado whitelist explícita de campos (`ALLOWED_FIELDS`) para evitar mass-assignment. Reset agora usa transação atômica.
- **Arquivos:** `backend/src/controllers/customizationController.ts`
- **Lição:** se o modelo Prisma existe, use a API tipada — não há motivo para raw SQL.

**1.3) ESLint habilitado no backend**
- **Sintoma:** `backend/package.json` tinha `"lint": "echo No linting configured"` — CI não detectava problemas, código novo entrava sem revisão automática.
- **Correção:** criado `backend/eslint.config.mjs` (flat config + typescript-eslint), regras pragmáticas (`no-console` warn, `no-debugger` error, `no-explicit-any` warn). Adicionados scripts `lint`, `lint:fix`, `type-check`. Deploy:check agora roda lint + type-check.
- **Arquivos:** `backend/eslint.config.mjs`, `backend/package.json`
- **Lição:** começar com regras como warn quando há legado; promover a error após limpeza.

### 2026-05-12 — Sprint 9: completar fluxos e polimento

**Frontend Empréstimos conectado ao backend**
Sprint 6 (B3) criou o backend completo de empréstimos mas o frontend continuava usando `patrimonio.emprestimo_ativo` (estado derivado sem sync). `Emprestimos.tsx` reescrito: GET `/api/emprestimos`, botão "Devolver" por linha, diálogo com dataDevolucao + observacoes, POST `/:id/devolver`. Devolução agora funciona end-to-end.

**M12 — Histórico granular por campo**
`updatePatrimonio` busca registro completo antes do update e gera diff via novo `diffPatrimonioFields(before, after)`. `HistoricoEntry.details` agora diz "Atualizou N campo(s): campo1, campo2..." em vez de "Patrimônio atualizado" genérico. Auditoria ganha rastreabilidade real.

**M14 — Métricas reais**
`config/metrics.ts > getDatabaseMetrics` substituiu `Math.random()` por queries reais a `pg_stat_activity` (connections), `pg_stat_database` (xact_commit/rollback), `pg_stat_statements` (slow queries — opcional, sem extension retorna 0).

**M8 — Já estava implementado**
Análise inicial errada. `generateImovelPDF` em `components/imoveis/ImovelPDFGenerator.tsx` tem 417 linhas, está funcional (compressão de fotos, QR code, layout completo). Sem alteração.

**P1 — Documentação de status vs situacao_bem**
Adicionada seção 3.1 em `REGRAS_NEGOCIO.md` esclarecendo que os dois campos não duplicam: `status` é operacional (alterado pelo sistema via fluxos, define guards), `situacao_bem` é condição física (manual, usado em relatórios). Convenção: UI mostra `situacao_bem` em forms; `status` muda só por fluxos.

### 2026-05-12 — Sprint 8: qualidade e polimento

**M1 — Cleanup de código morto**
Após auditoria de imports/rotas, removidos:
- `SubPatrimoniosManagerOptimized.tsx` (variante nunca importada)
- `TestDashboard.tsx` (import em App.tsx mas sem rota)
- `TransferenciasPage.v2.tsx` (v2 paralela órfã)
- pasta `src/pages/transferencias/` (vazia após delete)

**M7 — Removido fallback externo de QR**
`LabelPreview` tinha fallback para `api.qrserver.com` que: (1) criava dependência externa em produção, (2) enviava número de patrimônio em URL para terceiro. Agora se geração local falhar, exibe placeholder com log. Adicionado cleanup do useEffect contra race conditions.

**M13 — Logout de todos os dispositivos**
Card de Segurança no perfil com botão que chama `logout({ allDevices: true })`. Backend já suportava (Sprint 2 + I1).

**M2 — Filtro dupla-aplicação eliminado**
`BensCadastrados` fazia `.filter()` em cima do array já filtrado pelo backend, causando inconsistências durante paginação. Frontend agora só renderiza o que recebe.

**M11 — QR codes no PDF de inventário**
`InventarioPrint` pre-gera QR codes (Promise.all) para todos os itens. Nova coluna na tabela com QR data URL. Funciona em print e html2canvas/PDF. Cleanup do useEffect contra trocas rápidas.

**P2 — `/api/health/metrics` redireciona**
Endpoint tinha bloco inteiro comentado. Substituído por redirect 308 para `/api/metrics/summary` (endpoint dedicado vive em `metricsRoutes.ts`).

**P3 — CHECK constraints em Patrimônio**
Nova migration `add_patrimonio_check_constraints` aplica:
- `CHECK (valor_aquisicao >= 0)`
- `CHECK (quantidade > 0)`
Schema atualizado com docstring (Prisma não suporta `@check` ainda).

### 2026-05-12 — Sprint 7: 9 importantes resolvidos (I1-I10)

**I1 — Logout server-side**
AuthContext.logout agora chama `POST /api/auth/logout` com refreshToken antes de limpar storage. Suporta opção `allDevices: true` para revogar todos. Fire-and-forget para não bloquear UX.

**I2 — Política de senha unificada** (já feita no Sprint 6 B1)

**I3 — checkMunicipality endurecido**
Middleware agora injeta `req.user.municipalityId` em `req.body` quando ausente. Garante que controllers usem fonte de verdade do JWT. Superuser que envia valor explícito mantém override (operação cross-tenant intencional).

**I4 — Guards de estado em Patrimônio**
- `updatePatrimonio`: rejeita 409 se status='baixado' (exceto superuser).
- `deletePatrimonio`: rejeita 409 se há empréstimo ativo OU transferência pendente.

**I5 — Manutenção exige patrimonio XOR imovel**
- Valida que exatamente um dos dois foi informado.
- Valida que o bem existe e pertence ao município (superuser bypassa).
- Valida campos obrigatórios antes do create.

**I6 — Unicidade de licitação**
`createPatrimonio` valida que (numero_licitacao + ano_licitacao + municipalityId) é único. Mesmo número OK em anos diferentes.

**I7 — Rate limit em rotas públicas**
Novo `publicRateLimiter`: 120 req/min por IP em `/api/public/*`. Antes estava skipped do limiter global (vulnerável a scraping/DDoS).

**I8 — Script de cleanup de uploads órfãos**
`backend/scripts/cleanup-orphan-uploads.ts` varre uploads/ e cruza com TODAS as entidades que referenciam URLs. Flags `--delete` e `--older=N`. Scripts npm: `cleanup:uploads` (dry-run) e `cleanup:uploads:apply` (remove >30 dias). Sugestão de cron semanal documentada.

**I9 — Refresh token tolerante + rotação no frontend**
http-api interceptor: aceita refreshToken JSON-encoded ou cru (try/catch). Persiste o NOVO refresh token retornado pelo backend (rotação Sprint 2 não estava sendo aproveitada pelo frontend).

**I10 — Mensagens de erro de login diferenciadas**
AuthContext.login mapeia status → mensagem:
- 401 → "Email ou senha incorretos"
- 403 → "Conta desativada. Entre em contato com o administrador"
- 429 → "Muitas tentativas. Aguarde 15 minutos"
- Lê backendMsg quando presente.

### 2026-05-12 — Sprint 6: 6 bloqueadores resolvidos

**B1) Recuperação de senha reativada**
- `PasswordResetToken` model adicionado ao schema canônico (estava só no antigo) + migration `add_password_reset_tokens`.
- `forgotPassword/validateResetToken/resetPassword` reescritos com persistência real.
- Reset agora: invalida tokens antigos do usuário, persiste novo, valida used+expiresAt+isActive, força re-login global ao trocar senha.
- **Bônus I2:** `changePassword` agora exige senha forte (12+ chars com símbolos), igualando `resetPassword`.

**B6) Rotas duplicadas de transferência consolidadas**
- Deletado `transferenciaController.ts` + `transferenciaRoutes.ts` (dead code).
- `transferController.approveTransfer` agora atualiza `sectorId` FK (antes só atualizava string `setor_responsavel`, deixando FK desatualizada → estado corrompido), cria `HistoricoEntry`, valida tenant isolation, resolve setor destino pelo nome dentro do município, resolve local destino opcional.
- `rejectTransfer` cria `HistoricoEntry` simétrico para auditoria.

**B4) CustomFields de imóveis persistem**
- Nova coluna `Imovel.customFields Json?` + migration `add_imovel_custom_fields_column`.
- `createImovel` e `updateImovel` aceitam o campo.
- `updateImovel` trocou spread permissivo (`...updateData`) por whitelist explícita `UPDATABLE_FIELDS` — fecha vetor de mass-assignment (id/createdBy/etc).

**B5) Upload real de docs de baixa**
- `BaixaBemModal` agora chama `uploadMultipleFiles` antes do submit, passa pelo magic-bytes validator, coleta `file_url` reais e envia em `documentos_baixa[]`.

**B3) Backend de empréstimos**
- Criados `emprestimoController.ts`, `emprestimoRoutes.ts`, registrado `/api/emprestimos`.
- Endpoints: `GET /` (paginado, filtrável, tenant-isolated), `POST /` (valida bem ativo, bloqueia duplicado, marca status=emprestado), `POST /:id/devolver` (marca dataDevolucao, restaura status, cria HistoricoEntry), `GET /:id`.
- Frontend pendente: `Emprestimos.tsx` ainda usa estado derivado — conectar ao novo endpoint em sprint futuro.

**B2) Sub-patrimônios escondidos via feature flag**
- Criado `src/lib/features.ts` com `FEATURES.subPatrimonios = false`.
- UI de `eh_kit`/`quantidade_unidades` em BensCreate e `SubPatrimoniosManager` em BensView envolvidos pela flag. Quando backend implementar persistência, basta virar para `true`.

### 2026-05-12 — Sprint 5 P2: preparação para deploy novo

**5.1) Auditar install.sh + env vars**
- **Sintoma:** install.sh gerava `backend/.env` com `RATE_LIMIT_MAX=5` (volta o bug que corrigimos em 2025-11), sem variáveis para Redis/SMTP/Sentry/healthcheck, sem `image/webp` na whitelist (mas magic bytes aceita). Healthchecks devolviam shapes incompatíveis com testes pré-existentes.
- **Correção:**
  - `install.sh` gera `.env` completo e bem comentado (categorias: Database, JWT, CORS, Segurança, Rate limit, Upload, Logs, Redis opcional, SMTP, Observabilidade, Backup).
  - `RATE_LIMIT_MAX=100`, `BACKUP_PATH=/var/backups/sispat`.
  - `env.production` (frontend e backend) reescritos como templates limpos.
  - `env.example` (dev) enxuto.
  - `healthController.ts` adiciona campos `ready: true/false`, `alive: true`, `version` e status `'healthy'` (em vez de `'ok'`).
- **Lição:** templates de env precisam evoluir com o código. Healthchecks devem ter shape estável (versionados).

**5.2) CI enriquecido (lint + type-check + audit + bundle)**
- **Sintoma:** `.github/workflows/ci.yml` tinha `npm test || echo "Testes não configurados"` — qualquer falha era mascarada. Sem audit de deps, sem type-check, sem bundle check.
- **Correção:** CI reescrito com:
  - Backend: `npm ci` → prisma → `npm run lint` → `npm run type-check` → `npm test` → `npm audit --omit=dev --audit-level=high` (high/critical bloqueiam)
  - Frontend: `pnpm install --frozen-lockfile` → lint → type-check → vitest → build → bundle size check (>5MB alerta) → artifact upload (7 dias) → `pnpm audit --prod --audit-level high`
  - `build-validation` depende de ambos
- **Lição:** CI sem audit + lint + type-check é apenas "build verde", não "qualidade verde".

**5.3) Sentry backend ativado (no-op sem DSN)**
- **Sintoma:** `@sentry/node` e `@sentry/profiling-node` instalados, mas `config/sentry.ts` excluído do tsconfig e `initSentry()` comentado em `index.ts`.
- **Correção:**
  - `config/sentry.ts` reescrito com tipos estritos (sem `any`), `isEnabled()` check em todos os exports — silencioso sem DSN.
  - `beforeSend` sanitiza cookies, Authorization, password, token, refreshToken.
  - `index.ts` chama `initSentry()` antes dos middlewares e registra `sentryErrorHandler` antes do errorHandler global.
  - Para ativar em produção: criar projeto sentry.io → setar `SENTRY_DSN` no `.env` → `pm2 restart`.
- **Lição:** observabilidade tem que ser plug-and-play — se a flag está vazia, ZERO custo (não custo de log/init/sampling).

### 2026-05-12 — Sprint 4 P1/P2: limpeza e tighten TS

**4.1) Limpeza de raiz e Docs/**
- **Sintoma:** raiz com 88 arquivos `.sh`/`.md`/`.txt` (scripts CORRIGIR_*/DIAGNOSTICAR_*/VERIFICAR_*) e Docs/ com 553 arquivos sendo 124 duplicados (` copy`, `_FINAL_ATUALIZADA`).
- **Correção:** `git mv` para `Docs/_LEGADO/raiz/` (78 arquivos) e `Docs/_LEGADO/docs-dup/` (56 arquivos). Raiz fica com 10 essenciais. README na quarentena explica política. Histórico git preservado.
- **Arquivos:** `Docs/_LEGADO/**`
- **Lição:** mover é mais seguro que deletar — git já mantém histórico, mas a presença local ajuda em incidentes.

**4.2) Tighten TypeScript no backend**
- **Sintoma:** `backend/tsconfig.json` tinha `noImplicitAny: false` permitindo 94 `any`'s implícitos. Sem `useUnknownInCatchVariables`, blocos `catch (err: any)` perdiam segurança.
- **Correção:** ativadas flags strict no backend (tsconfig.json):
  - `noImplicitAny: true`
  - `noImplicitThis: true`
  - `alwaysStrict: true`
  - `useUnknownInCatchVariables: true`
  - `noImplicitReturns: true`
  - (já existiam: `strictNullChecks`, `strictFunctionTypes`, `noFallthroughCasesInSwitch`)
- **Correções colaterais:** padrão `return res.status(...)` corrigido em `metricsRoutes.ts` (4x) e `FichaTemplateController.ts` (8x) — Express handlers agora retornam `void` consistentemente. Erros `catch` tipados como `unknown` com cast explícito onde necessário.
- **Arquivos:** `backend/tsconfig.json`, `backend/src/routes/metricsRoutes.ts`, `backend/src/controllers/FichaTemplateController.ts`
- **Lição:** `noImplicitAny` na verdade já passava — o `false` era cargo cult. Ativar progressivamente expõe bugs reais (handlers Express com retorno inconsistente).

### 2026-05-12 — Sprint 3 P1: refactor e testes

**3.1) Extrair patrimonioService (refactor 1320 → 347 linhas no controller)**
- **Sintoma:** `patrimonioController.ts` tinha 1320 linhas com lógica de domínio, queries Prisma, normalização e RBAC misturados. Difícil de testar e manter.
- **Correção:** criada camada `backend/src/services/patrimonioService.ts` (786 linhas) com regras puras (sem Request/Response). Controller reduzido a 347 linhas, só lida com HTTP → service → mapping de exceções para status codes. Erros tipados (`PatrimonioNotFoundError`, `PatrimonioConflictError`, `PatrimonioForbiddenError`). DRY consolidou 8 repetições de normalização de fotos em `normalizeUrlArray`/`sanitizeIncomingUrls`. RBAC consolidado em `ensureSectorAccess`. **Bug fix incluso:** `gerarNumeroPatrimonial` substituiu `setTimeout` recursivo (risco de double-response + race condition) por retry síncrono em loop.
- **Arquivos:** `backend/src/services/patrimonioService.ts`, `backend/src/controllers/patrimonioController.ts`
- **Lição:** controllers gordos disfarçam bugs sutis. Extração para service revela duplicação e permite teste sem mocks de HTTP.

**3.2) Testes unit do patrimonioService e file-validation (31 testes novos)**
- **Sintoma:** Cobertura de testes do backend era ~5% — código novo do Sprint 2 e refactor do 3.1 estavam sem teste.
- **Correção:** 31 testes em 3 arquivos:
  - `__tests__/utils/file-validation.test.ts` (10) — magic bytes para JPEG/PNG/GIF/WebP/PDF, rejeição de SVG/ELF/MZ, alias `image/jpg`
  - `__tests__/services/patrimonioService.normalize.test.ts` (16) — `normalizeUrlArray` e `sanitizeIncomingUrls`
  - `__tests__/services/patrimonioService.gerarNumero.test.ts` (5) — geração atômica + retry
  - Infra: `tsconfig.test.json` (adiciona `jest` aos types só nos testes, sem afetar build), `jest.config.js` aponta para essa config no ts-jest transform.
  - **Bug encontrado e corrigido pelos próprios testes:** `extractUrlFromAny()` retornava `"[object Object]"` quando objeto não tinha nenhum campo string conhecido — agora retorna `null` corretamente, permitindo que o `filter()` de vazios funcione.
- **Lição:** escrever testes pequenos revela bugs sutis em funções "óbvias". Vale a pena.

### 2026-05-12 — Sprint 2 P1: 3 correções aplicadas

**2.1) Refresh token rotation/revogação**
- **Sintoma:** Refresh tokens viviam apenas como JWTs assinados — em comprometimento, não havia como revogar.
- **Correção:** novo modelo Prisma `RefreshToken` (sha256 hash, expiresAt, revokedAt, ipAddress, userAgent) + relação no User. Migration `20260512000000_add_refresh_tokens`. authController reescrito:
  - `login` persiste hash do refresh (token cru nunca no banco)
  - `refreshToken` rejeita revogado/expirado; se receber JWT válido mas sem registro (reuso após revogação) → revoga todos do usuário
  - `logout` revoga refresh do dispositivo ou de todos (body.allDevices)
  - `changePassword` revoga todos os refresh tokens (force re-login)
- **Arquivos:** `backend/prisma/schema.prisma`, `backend/src/prisma/schema.prisma`, `backend/prisma/migrations/20260512000000_add_refresh_tokens/migration.sql`, `backend/src/controllers/authController.ts`
- **Lição:** stateless JWT é conveniente, mas refresh tokens precisam estado por causa de revogação — guarda apenas o hash.

**2.2) Validação de magic bytes no upload + bloqueio de SVG**
- **Sintoma:** multer confiava no `mimetype` declarado pelo cliente — qualquer arquivo podia se passar por `image/png` alterando o header.
- **Correção:** `utils/file-validation.ts` com `detectAllowedFile()` (inspeciona 16 bytes, JPEG/PNG/GIF/WebP/PDF). Novo middleware `verifyMagicBytes` roda APÓS o multer e valida arquivo no disco — bate mimetype vs conteúdo, deleta arquivos inválidos. SVG explicitamente bloqueado no `fileFilter` (pode conter `<script>`). Plugado em `uploadRoutes` antes do controller.
- **Arquivos:** `backend/src/utils/file-validation.ts`, `backend/src/middlewares/uploadMiddleware.ts`, `backend/src/routes/uploadRoutes.ts`
- **Lição:** validação de input no perímetro nunca confia no cliente — inspecione o conteúdo real.

**2.3) Substituir console.log por logger (backend e frontend)**
- **Sintoma:** 240 `console.log/.debug` em código de produção vazavam dados em stdout/PM2 logs e DevTools.
- **Correção:** 
  - Backend: 45 substituições em 15 arquivos → `logInfo`/`logDebug` do Winston. `seed.ts` e `src/scripts/**` isentos no ESLint (output CLI legítimo).
  - Frontend: 149 substituições em 34 arquivos → `logger.debug` (já existia em `src/lib/logger.ts` com guard `import.meta.env.DEV`). Removidos `if (DEV)` redundantes.
  - `console.warn/error` mantidos em ambos os lados.
- **Arquivos:** 50+ arquivos (ver commits `16b84f2`, `2df05be`).
- **Lição:** quando há logger estruturado disponível, sempre o use — uniformiza formato, permite níveis e plug futuro de Sentry/observabilidade.

**1.4) Script de rollback (`scripts/rollback.sh`)**
- **Sintoma:** Sem fluxo padronizado para reverter deploys ruins. Recovery dependia de operador escrever comandos manualmente.
- **Correção:** criado `scripts/rollback.sh` com:
  - Detecção do commit anterior (`HEAD~1`) por default ou sha específico via argumento
  - Tag local `rollback-pre-<timestamp>` antes de mover HEAD (forward-recovery)
  - Rebuild backend (npm ci + prisma generate + tsc) e frontend (pnpm build)
  - PM2 restart + nginx reload
  - Health check pós-rollback (curl com retry)
  - Flag `--with-db` para restaurar último backup do banco (com confirmação dupla)
  - Flags `--list`, `--dry-run`, `--help`
- **Arquivos:** `scripts/rollback.sh`
- **Lição:** rollback deve ser tão fácil quanto deploy. Snapshot do estado atual em tag antes de qualquer movimento, para forward-recovery.

---

## Padrões recorrentes identificados

1. **Múltiplos scripts para o mesmo problema** — toda nova falha gerou um `.sh` novo, levando a 15 variações de `corrigir-nginx-*`. Consolidar em um único script idempotente.
2. **`.md` paralelos com sufixo "copy", "FINAL", "v2"** — não usar; confiar em git.
3. **`localhost` vs `127.0.0.1`** — fonte recorrente de bug Nginx → Node.
4. **Permissões de arquivos em uploads** — toda fresh-install esquecia algo. Agora coberto em `install.sh`.
5. **Cache do Nginx servia versão antiga** após deploys — adicionar etapa de purge no script de deploy.

---

## Bugs conhecidos em aberto (mover para issues quando GitHub Issues for ativado)

- `customizationController.ts` usa `$queryRaw` — auditar e migrar para `findMany`.
- `uploadController.ts` permite deletar arquivos de outros municípios (IDOR).
- Refresh token não pode ser revogado.
- Pasta `Docs/` com 124 arquivos duplicados (sufixo `copy`, `FINAL`, etc.).
- 60+ scripts `.sh` redundantes na raiz e em `scripts/`.
- 236 `console.log` em código de produção.
