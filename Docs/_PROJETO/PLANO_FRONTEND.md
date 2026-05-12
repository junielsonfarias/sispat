# Plano de Melhorias do Frontend — análise consolidada

> Análise realizada em 2026-05-12 após Sprint 13. Cobre 4 frentes:
> vazamentos de dados, dados suprimidos, acessibilidade/UX/mobile e performance.

Severidades: 🔴 crítico, 🟠 importante, 🟡 médio, 🟢 baixo.

---

## 🔴 Críticos — corrigir agora

### F1. ErrorBoundary expõe stack trace completo em produção
- **Onde:** `src/components/ErrorBoundary.tsx:62-84`
- **Problema:** o `<details>` sempre renderiza `error.stack`, `componentStack` e `error.toString()` — mesmo em prod. Vaza caminhos internos, nomes de componentes, IDs.
- **Fix:** envolver o bloco `<details>` em `{import.meta.env.MODE !== 'production' && (...)}`. Em prod, mostrar mensagem amigável + "ID do erro" curto para suporte.

### F2. CustomizationContext loga `error.response.data` em produção
- **Onde:** `src/contexts/CustomizationContext.tsx:154-160`
- **Problema:** comentário `[DEV]` mas executa em prod. Pode vazar IDs, estrutura de schema, mensagens internas.
- **Fix:** envolver em `if (import.meta.env.DEV) {...}` ou substituir por `logger.error('...')` (já tem guard).

### F3. `window.confirm()` para ações destrutivas
- **Onde:** `src/pages/bens/BensCadastrados.tsx:270`, `src/pages/Profile.tsx:27`
- **Problema:** modal nativo do browser não é acessível (leitor de tela varia), foge do design do app, e em iOS Safari pode ser ignorado por bloqueio de popups.
- **Fix:** criar hook `useConfirm()` retornando `AlertDialog` (Shadcn já tem). Substituir todos os `window.confirm()` por ele.

### F4. PDFs e libs pesadas importados estaticamente
- **Onde:** `src/pages/PublicAssets.tsx:21-24` e `src/pages/ferramentas/ReportView.tsx:43-44`
- **Problema:** `jspdf` (385KB) + `xlsx` (~150KB) + `html2canvas` (~200KB) entram no bundle inicial mesmo quando o usuário nunca clica em "Exportar". `PublicAssets.tsx` é particularmente ruim porque é a primeira tela vista por visitantes públicos.
- **Fix:** `await import('jspdf')` dentro da função `handleDownloadPDF()`. Reduz o bundle inicial em ~150KB gzip.

---

## 🟠 Importantes

### F5. Tokens em localStorage (legado pré-Sprint 13)
- **Onde:** `src/contexts/AuthContext.tsx:133`, `src/services/http-api.ts:40-48`
- **Problema:** Sprint 13 introduziu cookies HttpOnly mas localStorage ainda guarda `sispat_token` + `sispat_refresh_token` para back-compat. Em PC compartilhado (cybercafé, prefeitura), próximo usuário lê pelo DevTools.
- **Fix:** após confirmação de que cookies funcionam em produção (~1 semana), remover `SecureStorage.setItem('sispat_token', token)` e `sispat_refresh_token`. Manter só o objeto `user`.

### F6. React Query keys sem `municipalityId`
- **Onde:** `src/hooks/queries/*.ts` típicas (ex: `use-imoveis`, `use-patrimonios`)
- **Problema:** se dois usuários de municípios diferentes logam no mesmo browser, o cache do React Query pode misturar — sem `municipalityId` na key, a segunda visita lê do cache da primeira.
- **Fix:** incluir `municipalityId` em todo `queryKey: ['imoveis', user.municipalityId, filters]`. Ou: chamar `queryClient.clear()` no logout.

### F7. Token de reset de senha em URL
- **Onde:** `src/pages/auth/ResetPassword.tsx:56` consome `?token=<jwt>`
- **Problema:** URL fica em histórico do navegador, logs de proxy, screenshots, referer headers. Token é single-use mas vaza antes do uso.
- **Fix:** dois caminhos possíveis:
  - **Curto-prazo:** após validar o token na chegada, fazer `window.history.replaceState({}, '', '/reset-password')` para limpar a URL.
  - **Longo-prazo:** trocar para fluxo de 2 etapas — link só com um identificador curto opaco; token real entregue via POST de validação.

### F8. Valor do bem público pode atrair criminosos
- **Onde:** `src/pages/PublicBemDetalhes.tsx:220, 407-408`
- **Problema:** consulta pública exibe `valor_aquisicao` + local exato. Bem caro + endereço público = lista de compras pra ladrão.
- **Fix:** o backend deveria omitir/mascarar `valor_aquisicao` em `/api/public/*`. Frontend pode também esconder se vier null. Discutir com stakeholders se é regra exigida (lei de transparência?) — se for, manter mas exibir "Faixa de valor" em vez do número exato.

### F9. Erros 400 vs 500 indistintos para o usuário
- **Onde:** vários — `BensCreate.tsx:286`, `BensView.tsx`, etc.
- **Problema:** catch genérico mostra "Erro ao processar". Usuário não sabe se foi dado inválido (recuperável) ou bug (reportar). Backend retorna `error.response.data.error/message` mas frontend não usa.
- **Fix:** wrapper `extractApiError(err)` que retorna `{ status, message, field? }`. Substituir os toasts genéricos por esse.

### F10. Refresh falha silenciosa → redirect sem aviso
- **Onde:** `src/services/http-api.ts:80-117`
- **Problema:** quando o refresh token expira, frontend faz `window.location.href = '/login'` sem dizer "sua sessão expirou".
- **Fix:** antes do redirect, `toast({ variant: 'destructive', title: 'Sessão expirada', description: 'Faça login novamente.' })` + delay de 500ms.

### F11. Context values sem `useMemo` causam re-render em cascata
- **Onde:** 30 contexts em `src/contexts/*.tsx` — ex: `PatrimonioContext:176-188`, `SectorContext:157-171`
- **Problema:** o `value={{ patrimonios, isLoading, addPatrimonio, ... }}` é objeto novo a cada render do provider. Todos os componentes que consomem o context re-renderizam mesmo sem precisar.
- **Fix:** `const value = useMemo(() => ({ ... }), [deps])`. Esforço: 30 arquivos, ~3-4h, alto ganho.

---

## 🟡 Médios

### F12. Estados de loading silenciosos
- `BensView.tsx`, `UnifiedDashboard.tsx` mostram "Carregando..." sem skeleton.
- Shadcn já tem `<Skeleton />` — substituir por cards-skeleton.

### F13. Fallback snake_case vs camelCase em todo lugar
- Padrão `patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio` aparece em ~15 lugares.
- Sintoma de schema inconsistente. Definir uma convenção: backend sempre snake_case (já é), frontend recebe assim, normaliza UMA VEZ no service layer.

### F14. Cores hardcoded quebram dark mode
- `text-gray-900` em 184 ocorrências (audit do agent).
- Fix incremental: rodar regex replace `text-gray-900` → `text-foreground`, `bg-white` → `bg-card`, etc. Verificar visual.

### F15. `0` falsy escondendo valores reais
- `formatCurrency(p.valor_aquisicao || p.valorAquisicao)` — se valor for 0, fallback entra. Hoje cosmético (mostra "R$ 0,00"), mas se algum caso retornar 0 quando dado existe, esconde.
- Fix: trocar `||` por `??` em todos os números que podem legitimamente ser zero.

### F16. Empty states sem CTA
- `<CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>` — sem ação proposta.
- Em listas vazias: "Nenhum bem cadastrado. → Cadastrar primeiro bem"

### F17. Filtros não persistem em F5
- `BensCadastrados.tsx:551+` — filtros em useState, somem em reload.
- Fix: usar `useSearchParams` para sincronizar com URL. Bonus: filtros viram link compartilhável.

### F18. Imagens sem `loading="lazy"`
- `<img>` em `BensView`, `ImoveisView`, galerias.
- `LazyImage` component existe mas usado em 1 só lugar (`ImoveisView`).
- Fix: substituir em todas as galerias.

---

## 🟢 Baixos

### F19. `aria-describedby` em inputs com erro
- FormField/FormMessage do Shadcn já cobrem maior parte. Verificar inputs sem React Hook Form.

### F20. Tabelas sem `<th scope="col">`
- Shadcn `TableHead` não adiciona scope. Wrapper customizado seria útil.

### F21. Plurais ("1 bem" vs "2 bens")
- Hoje "registro(s)" feio. Pequeno utility `pluralize(count, sing, plur)`.

### F22. Skip-to-content link ausente
- Para usuários de leitor de tela / teclado.

### F23. Auto-focus em primeiro input de modal
- Adicionar `autoFocus` em primeiro `<Input>` dentro de `<Dialog>`.

### F24. Sentry replay em dispositivos limitados
- 10% sampling já está OK. Considerar `replaysOnErrorSampleRate: 0.5` (não capturar 100% por padrão em mobile lento).

---

## 🎯 Sprint 14 sugerido (priorizado)

### Bloco crítico (~4h)
- ✅ F1 — ErrorBoundary só mostra stack em dev
- ✅ F2 — CustomizationContext usa logger
- ✅ F4 — Lazy load jspdf/xlsx/html2canvas
- ✅ F3 — useConfirm() hook + substituir window.confirm

### Bloco importante (~6h)
- ✅ F11 — useMemo em context values (top 5 mais consumidos)
- ✅ F6 — municipalityId em query keys
- ✅ F10 — Toast antes do redirect de sessão expirada
- ✅ F9 — extractApiError() helper

### Bloco médio (em sprint dedicado)
- F13 — normalizar snake_case (refactor schema)
- F14 — dark mode (regex replace)
- F17 — filtros em URL
- F18 — LazyImage em galerias

---

## 📊 Resumo numérico

| Categoria | Críticos | Importantes | Médios | Baixos | Total |
|-----------|----------|-------------|--------|--------|-------|
| Vazamentos | 2 | 4 | 1 | 0 | 7 |
| Suprimidos | 0 | 2 | 4 | 0 | 6 |
| UX/a11y/mobile | 1 | 1 | 2 | 5 | 9 |
| Performance | 1 | 1 | 1 | 0 | 3 |
| **Total** | **4** | **8** | **8** | **5** | **25** |

## ⚖️ Avaliação geral do frontend

**Pontos fortes:**
- Bundle inteligente: rotas lazy, manualChunks separando vendor/router/ui/charts
- Components Shadcn com a11y boa por padrão
- Mobile: touch targets >44px, drawer/bottom navigation, debounce em search
- `LazyImage` component bem feito (Intersection Observer + skeleton + blur-up)
- Magic bytes no upload, cookies HttpOnly, CSRF, refresh rotation
- Profile com botão "Sair de todos os dispositivos"
- formatDate/formatCurrency consistentes em pt-BR
- React Query com cache (mas falta tenant isolation)
- `terserOptions.drop_console` strip console.log em prod
- Source maps off em prod

**O que mais merece atenção:**
1. **F1, F2, F3, F4** — fixáveis em poucas horas, com alto impacto
2. **F11 (useMemo em contexts)** — 30 arquivos mas fácil, melhora muito a percepção de fluidez
3. **F6 (queryKey + municipalityId)** — pequeno mas crítico em PCs compartilhados

Resolver F1-F11 mata 70% das dores; o resto é polimento.
