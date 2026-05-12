# CONVENÇÕES DE CÓDIGO — SISPAT 2.0

> Padrões a seguir ao editar este projeto. Inspirados em práticas usadas em projetos anteriores e adaptados a esta base.

---

## 1. Estrutura de pastas (não criar fora destes lugares)

### Backend
```
backend/src/
├── routes/              # apenas montagem de rotas
├── controllers/         # finos: parse req → chama service → response
├── services/            # (a criar) regras de negócio
├── repositories/        # (a criar) acesso a Prisma
├── middlewares/         # auth, validation, rate-limit, etc.
├── config/              # env, logger, redis, swagger
├── utils/               # helpers puros
├── lib/                 # singletons (ex: prismaClient)
├── prisma/              # schema, seed
└── __tests__/           # testes
```

### Frontend
```
src/
├── pages/               # 1 arquivo por rota (lazy-loaded)
├── components/
│   ├── ui/              # Shadcn — não editar exceto sob necessidade
│   └── <feature>/       # componentes por feature (bens/, imoveis/, etc.)
├── hooks/               # use<NomeDoHook>.ts
├── contexts/            # <Nome>Context.tsx
├── services/            # http-api.ts, fileService.ts, etc.
├── lib/
│   ├── validations/     # schemas Zod
│   └── *.ts             # utils puros
└── types/               # tipos compartilhados
```

## 2. Nomenclatura

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componente React | PascalCase | `BensCadastrados.tsx` |
| Hook | `use` + camelCase | `usePatrimonio.ts` |
| Context | `<Nome>Context.tsx` | `AuthContext.tsx` |
| Controller | `<entidade>Controller.ts` | `patrimonioController.ts` |
| Route | `<entidade>Routes.ts` | `patrimonioRoutes.ts` |
| Service (futuro) | `<entidade>Service.ts` | `patrimonioService.ts` |
| Tabela Prisma | PascalCase singular | `Patrimonio` |
| Tabela SQL | snake_case plural | `patrimonios` |
| Variável | camelCase | `municipalityId` |
| Constante | UPPER_SNAKE | `MAX_FILE_SIZE` |

## 3. TypeScript

- **Não adicionar `any`.** Se inevitável, comente o porquê e use `unknown` quando puder.
- Evitar `as` casting; preferir type guards.
- Tipos de Prisma vêm do client gerado — use `Prisma.PatrimonioCreateInput` etc.
- DTOs de API: definir em `backend/src/types/` (a criar) ou ao lado do controller.
- Frontend: tipos compartilhados em `src/types/index.ts`.

## 4. Padrões de controller (backend)

```ts
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1) lê e tipa req (com validação já feita no middleware)
    const data = req.body as CreatePatrimonioDTO;
    const municipalityId = req.user!.municipalityId;

    // 2) delega ao service
    const result = await patrimonioService.create(data, municipalityId);

    // 3) responde
    res.status(201).json(result);
  } catch (err) {
    next(err);  // errorHandler centraliza
  }
};
```

**Regras:**
- Controller NÃO chama Prisma diretamente (depois do refactor).
- Sempre `next(err)` — não `res.status(500).json(...)` manual exceto em casos de erro de domínio.
- Sempre filtrar por `municipalityId` (em service, em queries).

## 5. Validação de entrada

```ts
// routes/patrimonioRoutes.ts
router.post(
  '/',
  authenticateToken,
  authorize('admin', 'supervisor', 'usuario'),
  [
    body('descricaoBem').isString().isLength({ min: 3, max: 500 }),
    body('valorAquisicao').isFloat({ gt: 0 }),
    body('sectorId').isUUID(),
  ],
  handleValidationErrors,
  patrimonioController.create
);
```

## 6. Frontend — formulários

```tsx
const form = useForm<PatrimonioInput>({
  resolver: zodResolver(patrimonioCreateSchema),
  mode: 'onTouched',
  defaultValues: { ... },
});
```

- Toda lógica de submit em `onSubmit` async com try/catch + toast.
- Validação cliente sempre via Zod schema (em `lib/validations/`).
- Não duplicar validação cliente↔servidor — schemas Zod podem ser compartilhados (futuro).

## 7. Chamadas HTTP

- **Sempre** via `services/http-api.ts` (instância axios configurada).
- **Nunca** axios direto em componentes.
- Tratamento de erro: `apiHelpers.handleError(err)` + toast.

## 8. Estado: quando usar o quê

| Caso | Ferramenta |
|------|------------|
| Dados do servidor (lista, detalhe) | React Query |
| Auth do usuário, customização do tenant | Context API |
| Estado local de form | react-hook-form |
| Estado UI volátil (modal aberto, tab) | useState |
| Setting global do usuário (tema, preferências) | Context + localStorage |

**Não criar novo Context sem necessidade.** Já temos ~30.

## 9. Logging

### Backend
```ts
import { logger } from '../config/logger';
logger.info('patrimonio criado', { patrimonioId, userId, municipalityId });
logger.error('falha ao criar patrimonio', { error: err.message, stack: err.stack });
```
**Não logar:** senhas, tokens, payload completo de PII.

### Frontend
```ts
if (import.meta.env.DEV) {
  console.log('debug:', value);
}
```
Em código novo, **não deixar `console.log` sem guard**.

## 10. Tratamento de erro

### Backend
- Throw `AppError` (existe em `errorHandler.ts`) com statusCode e mensagem.
- `errorHandler` central trata e formata resposta.
- **Não vazar stack trace** em produção (já há guard).

### Frontend
- `ErrorBoundary` por rota (já implementado).
- Toast para erros de usuário; redirect para `/error` para crashes.

## 11. Testes

### Padrão de nome
- Unit: `*.test.ts` (junto ao arquivo testado ou em `__tests__/`)
- E2E: `e2e/*.spec.ts` (playwright)

### Estrutura mínima
- Toda rota nova deve ter ao menos 1 integration test (supertest).
- Componente com lógica não-trivial: 1 test (vitest + testing-library).

## 12. Commits

```
<tipo>: <descrição imperativa em pt-BR>

<corpo opcional>
```

Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `style`.

## 13. O que NÃO fazer

- ❌ Criar `.md`, `.sh`, `.bat` na raiz do projeto.
- ❌ Criar scripts de "correção" pontual (`CORRIGIR_*.sh`) — corrija no código.
- ❌ Duplicar arquivo com sufixo "copy", "FINAL", "v2" — use git.
- ❌ Commitar `.env*`, secrets, ou arquivos gerados (`dist/`, `node_modules/`).
- ❌ `console.log` sem `import.meta.env.DEV` guard.
- ❌ `any` novo no TS sem justificativa em comentário.
- ❌ Engordar controllers — extrair para service.
- ❌ Bypass de RBAC ou de `municipalityId` filter.
