# ARQUITETURA — SISPAT 2.0

## Stack

### Backend (`backend/`)
- **Runtime:** Node.js 18/20 (CommonJS)
- **Framework:** Express 5.1
- **ORM:** Prisma 6.17 (PostgreSQL 15)
- **Cache:** Redis 7 (ioredis 5) — opcional, controlado por `ENABLE_REDIS`
- **Auth:** `jsonwebtoken` + `bcryptjs` (12 rounds)
- **Upload:** `multer` 2 (diskStorage em `./uploads`)
- **Email:** `nodemailer` 7
- **Logs:** `winston` + `winston-daily-rotate-file`
- **Validação:** `express-validator` 7 + `zod` 3
- **Segurança:** `helmet` 8, `express-rate-limit` 8, `rate-limit-redis`
- **Realtime:** `socket.io` 4
- **Observabilidade:** `@sentry/node`, swagger-ui-express
- **Testes:** `jest` 30 + `supertest`

### Frontend (raiz)
- **Build:** Vite 5 + React 19 + TypeScript 5
- **UI:** Tailwind 3 + Shadcn/UI (Radix UI) + Lucide icons
- **Estado:** Context API (~30 contexts) + React Query 5
- **Forms:** react-hook-form 7 + zodResolver
- **Router:** react-router-dom 6 (lazy-loaded routes)
- **HTTP:** axios 1 com interceptors (refresh token automático)
- **Tabelas/Listas:** @dnd-kit (drag-and-drop), recharts (gráficos)
- **Export:** jsPDF + jspdf-autotable + xlsx + html2canvas + qrcode
- **Realtime:** socket.io-client
- **Testes:** vitest + @testing-library/react + happy-dom + playwright (e2e)

## Modelo de dados (entidades principais)

| Entidade | Função |
|----------|--------|
| `Municipality` | Tenant raiz — todo o sistema é multi-tenant por `municipalityId` |
| `User` | Usuário com `role` e `responsibleSectors[]` |
| `Sector` | Setor responsável pelos bens |
| `Local` | Local físico de armazenagem |
| `Patrimonio` | Bem móvel (núcleo do sistema) — número, descrição, valor, fotos, documentos |
| `Imovel` | Bem imóvel (terreno + construção) |
| `Transferencia` | Movimentação entre setores (fluxo de aprovação) |
| `Emprestimo` | Empréstimo de bem com data prevista de devolução |
| `Inventory` | Inventário periódico |
| `ManutencaoTask` | Manutenção preventiva/corretiva |
| `Documento` | Arquivos anexos |
| `FichaTemplate` | Templates customizáveis por município |
| `ActivityLog` | Auditoria de ações |
| `PasswordResetToken` | Reset de senha por email |

**Multi-tenancy:** TODA tabela de domínio carrega `municipalityId` (FK para `Municipality`). Queries devem filtrar por isso, exceto para `superuser`.

## Camadas

### Backend (atual)
```
Routes  →  Controllers (gordos, com lógica + Prisma)  →  Prisma  →  Postgres
            ↑
       Middlewares: auth, authorize, checkMunicipality, validation, rate-limit, cache
```

### Backend (alvo após refactor)
```
Routes  →  Controllers (finos)  →  Services  →  Repositories  →  Prisma  →  Postgres
```

### Frontend
```
Page (lazy)
  └─ Component
      └─ Hook (useXxxQuery → React Query)
          └─ Service (http-api.ts axios instance)
              └─ Backend
```

## Fluxos críticos

### Autenticação
1. `POST /api/auth/login` → valida bcrypt → emite access (24h) + refresh (7d)
2. Frontend salva ambos em `localStorage` (via `SecureStorage` wrapper)
3. Interceptor axios injeta `Bearer <access>` em toda request
4. Em 401, interceptor tenta `POST /api/auth/refresh` automaticamente
5. Se refresh falha, redireciona para `/login`
6. Inatividade (30/45 min) força logout via `useInactivityTimeout`

### Upload de fotos
1. Frontend pré-processa com `browser-image-compression`
2. Envia `multipart/form-data` para `POST /api/upload`
3. Backend valida MIME (whitelist), tamanho (10MB), sanitiza nome
4. Salva em `uploads/` (servido por Nginx em produção)
5. Retorna URL pública — frontend bloqueia explicitamente URLs `blob-*` no `updatePatrimonio` (correção do commit `953f7cd`)

### Patrimônio (CRUD)
1. Gerado número automaticamente baseado em setor (`BensCreate.tsx`)
2. Validação Zod (`patrimonioCreateSchema`) antes do submit
3. POST `/api/patrimonios` com fotos referenciadas por URL
4. ActivityLog é gravado para auditoria

## Decisões arquiteturais

- **Context API em vez de Zustand/Redux:** decisão histórica; funciona mas espalha ~30 providers. Manter por ora; consolidar quando refatorar.
- **Controllers gordos:** débito técnico. Plano: introduzir camada `services/` antes de novos módulos.
- **localStorage para JWT:** vulnerável a XSS. Considerar HttpOnly cookies em refactor futuro (`Docs/_PROJETO/SEGURANCA.md`).
- **Redis opcional:** o sistema funciona sem Redis (fallback in-memory para rate limit). Em produção, ativar.

## Diagrama lógico (texto)

```
                ┌──────────────┐
                │   Nginx 443  │  TLS, gzip, static, proxy
                └──────┬───────┘
                       │
       ┌───────────────┼───────────────┐
       ▼                               ▼
 [Frontend SPA]                  [/api proxied]
  Vite build em /var/www/...     PM2 → Node.js :3000
                                       │
                          ┌────────────┼────────────┐
                          ▼            ▼            ▼
                     Postgres 15    Redis 7     uploads/
                     (Prisma)       (cache)     (multer)
```

## Pontos de extensão

- Novas entidades: adicionar em `schema.prisma` → migration → controller + route + service.
- Novos roles: adicionar em enum no `schema.prisma` + ajustar `authorize()` calls.
- Novos templates de ficha: tabela `FichaTemplate` (campo `definition` em JSON).
