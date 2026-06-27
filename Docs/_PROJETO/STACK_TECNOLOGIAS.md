# STACK_TECNOLOGIAS — SISPAT 2.0

> Catálogo das tecnologias do projeto, com a **versão em uso**, os **pontos de
> atenção da versão** (gotchas de major recentes) e o **estado da verificação**
> contra a documentação oficial. Atualizado em 2026-06-27.
>
> Escopo desta auditoria: focada nos **majors de risco** (libs com mudança de
> major recente, onde uso de API obsoleta/quebrada é provável). Demais
> dependências não foram auditadas linha a linha.

---

## Backend

### Express 5.1 ⚠️ (major 4→5)
- **Gotcha crítico — `req.query` virou getter re-parseado.** Em Express 5,
  `req.query` é um getter que re-parseia a querystring **a cada acesso** e devolve
  um objeto novo. Consequência: `req.query[k] = ...` e `Object.assign(req.query, x)`
  **não persistem** (no-op silencioso). `req.query = x` **lança** (sem setter).
  - **Correção aplicada (2026-06-27):** middleware em `index.ts` logo após o body
    parser que "congela" `req.query` num property normal/mutável
    (`Object.defineProperty`), restaurando o comportamento Express 4 para todo o
    pipeline. Com isso, `zodValidate` (coerção/defaults de query) e qualquer
    sanitização de query voltam a funcionar.
- **`req.params`** é property normal (mutável) — `Object.assign(req.params, x)` OK.
- **Rotas:** path-to-regexp 8 — `*`, `:p?` e regex em string quebram. ✅ Verificado:
  não há padrões perigosos nas rotas (`backend/src/routes/`).
- **`app.del()` / `req.param()`** removidos. ✅ Não usados.
- Promises rejeitadas em handlers são encaminhadas ao error handler (melhoria do v5).

### Prisma 6.19 ✅
- `process.on('beforeExit')` (Node) usado em `config/database.ts` — OK (o que é
  desaconselhado é `prisma.$on('beforeExit')` no engine library; **não** usado).
- `rejectOnNotFound` (removido no v5) — não usado. `$queryRaw` com tagged templates.

### express-rate-limit 8.1 ✅ (major 7→8)
- `standardHeaders: true` + `legacyHeaders: false` — válidos no v8.
- `RedisStore({ sendCommand: (...args) => redis.call(...args) })` — compatível
  (rate-limit-redis 4.x). **Sem** `keyGenerator` custom → sem risco de bypass IPv6
  (o default já normaliza IPv6). `onLimitReached` (removido) — não usado.

### helmet 8.1 ✅
- `contentSecurityPolicy`/`crossOriginResourcePolicy` configurados; sem `expectCt`
  (removido no helmet 7).

### multer 2.0 ✅
- `diskStorage`/`memoryStorage` + `fileFilter` + `limits` — API estável no v2.

### Outros backend
- express-validator 7, jsonwebtoken 9, bcryptjs 3, nodemailer 8, ioredis 5,
  socket.io 4, winston 3, swagger 6/5 — sem achados nesta passada.

---

## Frontend

### React 19.1 ✅ (major 18→19)
- Entry usa `createRoot` (`src/main.tsx`) — correto (`ReactDOM.render` foi removido).
- Recharts × React 19: shim em `src/lib/recharts-compat.tsx` (já existente).

### React Router DOM 6.30 ⚠️ (preparação 6→7)
- `App.tsx` já opta pelas future flags `v7_startTransition` e `v7_relativeSplatPath`.
- **Correção aplicada:** `src/test/test-utils.tsx` ganhou as mesmas flags — elimina
  os warnings v7 que apareciam na suíte vitest e alinha testes ao runtime.

### Zod 3.25 ✅
- 3.25 (não 4.x). `z.coerce.*`, `.email()`, `.strict()` etc. em uso normal.
  Atenção futura: migração para zod 4 muda imports (`zod/v4`) e alguns erros.

### Demais frontend
- Vite 5, Vitest 3, TanStack Query 5, React Hook Form 7 + resolvers 3, Tailwind 3.4
  (v4 é major à parte), Radix/Shadcn, Axios 1.12, jsPDF 3 (carregado dinamicamente —
  ver lote de perf), date-fns 4 — sem achados nesta passada.

---

## Resumo dos erros encontrados e corrigidos (2026-06-27)
1. 🔴 **Express 5 `req.query` no-op** — coerção/sanitização de query silenciosamente
   não aplicada. Corrigido com o middleware de "freeze" em `index.ts`.
2. 🟡 **React Router** — warnings de future flag v7 na suíte de testes. Corrigido em
   `test-utils.tsx`.

---

## Avaliação de execução por tecnologia (2026-06-27)

Cruzamento de cada tecnologia × uso real × documentação. Legenda: 👍 bem
executado · ⚠️ funciona mas desvia de boa prática · 🔴 erro/risco.

### Backend
- **Express 5** 👍 — ordem de middleware correta; sem padrões de rota quebrados
  (path-to-regexp 8); `req.query` corrigido (ver acima).
- **Prisma 6** 👍 — client singleton; ~227 `select` vs ~86 `include` (prefere
  projeção, evita over-fetch/N+1); ~49 transações; tenant scoping consistente.
- **Zod (@sispat/shared)** 👍 — fonte única front+back; `.strict()` nos updates.
- **JWT / bcrypt / rate-limit 8 / helmet 8 / multer 2 / winston** 👍 — refresh com
  rotação+hash; bcrypt 12; rate-limit cobre rotas sensíveis; upload com magic bytes.
- **socket.io 4** 🔴→👍 — **corrigido** leak de `connectedClients` (cleanup estava
  em `io.on('disconnect')`, que nunca dispara; movido p/ `socket.on`). ⚠️ pendente:
  auth via `io.use()` e room `admin` por município.
- **express-validator / security.ts** ⚠️→👍 — `security.ts` era quase todo dead code
  (rate-limiters/helmet/sanitizeInput/validateInput/commonValidations/secureUpload/
  secureCors duplicavam o que `zodValidate`/`advanced-rate-limit`/`index.ts` já fazem).
  **Removidos**; mantido só `auditLog`.
- **ioredis 5** 👍 — opcional com degradação graciosa; removida a opção inválida
  `retryDelayOnFailover`.

### Frontend
- **React 19 / Router 6 / RHF 7 + Zod** 👍 — `createRoot`; future flags v7; forms
  com `zodResolver`.
- **Axios 1.12** 👍 — interceptors + CSRF + erros amigáveis; **melhorado**: fila
  única de refresh p/ 401 concorrentes; removido `no-cache` forçado em todo GET
  (cache fica com React Query + headers do backend).
- **Vite 5** 👍 — `manualChunks`, terser, `import()` dinâmico; `target` subido para
  `es2020` (era es2015 → bundle/transpile a mais).
- **TanStack Query 5 × Context** ⚠️ — coexistem fetchs para a mesma entidade
  (Context + hook de query). Maior smell arquitetural; unificação fica como tarefa
  isolada (mais invasiva).
- **Tailwind/Shadcn** ⚠️ — dark mode com pass focado; cores fixas remanescentes
  fora das telas principais.
- **Vitest** ⚠️ — cobertura unit baixa no frontend (62) vs backend (577 Jest).

## Follow-ups (pós grupo seguro)
- **Unificar Context × React Query** por entidade (escolher uma fonte) — invasivo.
- **socket.io**: mover auth p/ `io.use()`; escopar room `admin` por município.
- **Tailwind**: completar dark mode nas demais telas.
- **Cobertura** de testes do frontend.
- Migrações de major futuras (não urgentes): Tailwind 3→4, Zod 3→4.
