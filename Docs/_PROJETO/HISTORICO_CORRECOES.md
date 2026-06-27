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

## 2026

### 2026-06-27 — Auditoria geral (4 frentes) + remediação em 5 lotes
- **Contexto:** varredura completa por 4 auditores (segurança backend, multi-tenant, frontend, regras de negócio). Veredito: 0 IDOR/SQLi/mass-assignment críticos novos; 5 gaps legais de 2026-06-24 íntegros; isolamento multi-tenant consistente. Achados pontuais remediados em lotes A–E.
- **Lote A (commit e645025):** (1) endpoint público de patrimônios vazava PII do setor (cnpj/responsavel/codigo) via `include` sem `select` → reduzido a `sector { select: { name } }`; (2) `updateUser` não persistia `email` (no-op no UserEditForm) → persiste com checagem de unicidade; (3) reset tokens de senha em texto plano → hash SHA-256 (`hashToken`).
- **Lote B (commit 1dd9234):** jsPDF (~2MB) importado estaticamente em 5 módulos → `await import('jspdf')` dinâmico (tira do bundle inicial).
- **Lote C (commit 357001d):** rate-limiter em `/refresh`, `/change-password`, `/validate-reset-token`; `maskEmail` no log de brute-force; Cache-Control `private` em tiposBens/formasAquisicao; `fileFilter` no multer da importação; `getUserById` restringe leitura de outros perfis a gestores; `deletePatrimonio` faz check de tenant antes dos guards (oracle de estado); `reportTemplateService` 404 (não 403) cross-tenant.
- **Lote D (commit c3aadfb):** `approveTransfer` exige supervisor responsável pelo setor destino (REGRAS §6); `registrarBaixa` não sobrescreve `situacao_bem` com 'baixado'; badge de condição no BensView normaliza case; BensEdit remove 'baixado'/'extraviado' do dropdown de status.
- **Lote E (commit fd11685):** 91 `console.error/warn` → `logger` (DEV-gated) em 46 arquivos; remove polling de 60s em Sector/LocalContext; `level:'info'` no combined transport do Winston.
- **Decisões/Deferidos (precisam de produto ou são refactor amplo):** exibição de `valor_aquisicao` na página pública (§11 vs feature construída); descompasso sistêmico `avatar`↔`avatarUrl` (toda a app); migrar ImoveisList/Emprestimos p/ usePermissions + permissões `settings:*` do supervisor (faltam chaves no modelo; backend já reforça); 159 `any`; ~173 cores hardcoded (dark mode); empréstimo 'atrasado' (cron); race de numeração em import concorrente.
- **Verificação:** backend tsc 0, frontend tsc 0, 577 testes Jest verdes (+8 nesta auditoria).
- **Lição:** auditor pode errar (ex.: "arquivos mortos" eram falso-positivo — MobileNavigation/ErrorBoundary usados); sempre verificar antes de deletar/remediar.

### 2026-06-27 — Contract bugs da entidade Usuário (re-auditoria final)
- **Sintoma / Causa-raiz:** `updateUserSchema` (`@sispat/shared`) é `.strict()` e o `updateUser` controller só lê `name/role/responsibleSectors/isActive`. O front enviava para `PUT /users/:id` campos que o schema rejeitava (400 silencioso) ou o controller ignorava (no-op).
  1. **Reset de senha de outro usuário (admin) quebrado** — `AuthContext.updateUserPassword` mandava `{ password }` → 400 "Unrecognized key"; e mesmo passando, o controller ignorava `password`. Não existia endpoint de "gestor redefine senha de terceiro".
  2. **Desbloqueio de usuário** — `unlockUser` mandava `lockoutUntil`/`failedLoginAttempts`, campos que **não existem no `schema.prisma`** e sem lógica de lockout no backend. UI 100% morta.
  3. **`UserCreateForm`/`UserEditForm`** — campo "Setor Principal" (`sector`) e upload de avatar (`avatarUrl`) coletados na UI mas nunca persistidos (não estão no model/controller).
- **Correção:**
  - **#1 (implementado):** novo `POST /users/:id/reset-password` (`resetUserPasswordSchema` em `@sispat/shared`, `.strict()`), controller `resetUserPassword` com escopo por `municipalityId` + anti-escalada (`canAssignRole`) + hash bcrypt + `RESET_USER_PASSWORD` no activityLog. `updateUserPassword` do front passa a chamar o endpoint novo. +4 testes em `userRoleEscalation.test.ts`.
  - **#2 (removido):** `unlockUser` (AuthContext + interface + provider) e toda a UI de desbloqueio em `UserManagementUnified` (botão, `handleUnlockUser`, `isUserLocked`, import `Unlock`). Coluna de status passou a refletir `isActive` (Ativo/Inativo) em vez do lockout fantasma.
  - **#3/#4 (removidos):** campo "Setor Principal" e upload de avatar dos forms de criar/editar usuário (schema, defaults, reset, JSX e imports órfãos). Adicionado `isActive?: boolean` ao tipo `User` (`src/types/index.ts`).
- **Arquivos:** `shared/src/schemas/user.ts`, `backend/src/controllers/userController.ts`, `backend/src/routes/userRoutes.ts`, `src/contexts/AuthContext.tsx`, `src/components/admin/UserManagementUnified.tsx`, `src/components/admin/UserCreateForm.tsx`, `src/components/admin/UserEditForm.tsx`, `src/types/index.ts`, `backend/src/__tests__/controllers/userRoleEscalation.test.ts`.
- **Verificação:** backend tsc 0, frontend tsc 0, 573 testes Jest verdes (569 + 4 novos).
- **Lição:** schemas `update*` `.strict()` rejeitam campos extras (400 silencioso); features de UI sem coluna/endpoint no backend são "dead UI" — confirmar o backend antes de confiar num form.

### 2026-06-26 — Polimento de cauda: remoção de código morto + lazy images
- **Código morto removido** (verificado: só auto-referência, zero imports): `src/pages/bens/BensCadastradosSimplificado.tsx` (não roteado), `src/pages/admin/GerenciarTipos.tsx` (não roteado, duplicava `TipoBemManagement`), `src/components/imoveis/ImovelMap.tsx` (mapa fake grid 5×5, ignorava lat/long). `tsc` → 0 erros após remoção.
- **`loading="lazy"`** adicionado às galerias de fotos: `BensView`, `ImoveisView`, `PublicConsultation`, `PublicBemDetalhes` (miniaturas), `PublicImovelDetalhe`. Mantidos SEM lazy: logos (above-the-fold, lazy atrasaria LCP), impressão/PDF e a imagem principal do carrossel.
- **`overflow-x-auto`:** confirmado que NÃO era problema — o `Table` base (`ui/table.tsx`) já envolve em `<div className="overflow-auto">`, então toda tabela Shadcn já rola horizontalmente.
- **Lição:** antes de "adicionar overflow em N tabelas", confira o primitivo — o wrapper já existia. E verifique imports (zero) antes de deletar suposto código morto.

### 2026-06-26 — Polimento: acessibilidade (scope de tabela + aria-label)
- **`scope="col"` app-wide:** em vez de editar cada `<TableHead>`, adicionado `scope="col"` (sobrescrevível via prop) ao **componente base** `TableHead` em `src/components/ui/table.tsx` → todas as tabelas do app ganham cabeçalho de coluna acessível de uma vez.
- **`aria-label` em ícone-botões:** 2 agentes adicionaram 16 labels em PT-BR a botões só-ícone (Edit/Trash/Check/X) em `SectorManagement`, `TipoBemManagement`, `NumberingSettings`, `LogoManagement`, `FormFieldManagement`, `ImoveisList`, `ImovelCustomFields`, `Transferencias`. Vários arquivos já estavam OK (ComissoesList, RegularizacaoList, DesfazimentoList, MunicipalityManagement) — não tocados.
- **Verificação:** `tsc` → 0 erros. Sem mudança de lógica/estrutura.
- **Lição:** a11y de tabela é melhor resolvida no primitivo (`TableHead`) que em cada uso — 1 linha conserta o app todo.

### 2026-06-26 — Polimento: dark mode (1ª onda) + setTimeout artificial
- **Dark mode (cores hardcoded → tokens):** 4 agentes `frontend-expert` em paralelo trocaram, em **26 arquivos de UI**, `text-gray-900/800/700`→`text-foreground`, `text-gray-{600,500,400,300}`→`text-muted-foreground`, `bg-white`→`bg-card`, `bg-gray-{50,100}`→`bg-muted`/`bg-muted/50`, `border-gray-{200,300}`→`border-border`. Diff 1:1 (~297 linhas), `tsc` → 0 erros.
  - **Guardrails (preservado de propósito):** componentes de IMPRESSÃO/PDF (`BensPrintForm`, `ImovelPrintForm`, `*PDFGenerator`, `FichaPreview*`, `InventarioPrint`, `TermoDocumento`, previews de etiqueta/ficha — papel é branco), **badges de status** (`bg-{green,red,yellow,blue,amber,emerald,orange,slate}-NNN`), cores de gráfico (`hsl(var(--chart-*))`) e variantes com **opacity** (`bg-white/95`, `dark:bg-gray-800/90`). Cada agente reportou skips.
  - Arquivos: bens (Create/Edit/BulkCreate/Cadastrados/View), imóveis (Create/Edit/List), inventário (Edit), dashboard (StatsCards/AlertsSection/RecentPatrimonios), layout (Header/Sidebar/MobileNavigation/UnifiedDashboard), auth (Login/DemoCredentials), fichas (Editor/Novo/Gerenciador), AcquisitionFormManagement, AnaliseTemporal, PublicBemDetalhes, ReportComponentProperties.
  - **2ª onda pendente:** telas menos centrais (resto de admin/superuser/ferramentas) e os que os agentes pularam por contexto ambíguo.
- **setTimeout artificial:** removido o de `Exportacao.tsx` (1,5s antes de um export real). Mantidos os de `*PDFGenerator` (espera de render do html2canvas) e `export-utils` (500ms/lote espaça downloads — evita bloqueio do browser).
- **Lição:** swap de cores para dark mode é seguro em LIGHT mode (tokens ≈ as cores antigas) e corrige o DARK — MAS exclua impressão/PDF (token resolveria para cor escura no papel), badges de status e opacity variants. Delegar a agentes paralelos por conjunto disjunto de arquivos funciona; rode UM `tsc` no fim (eles não rodam).

### 2026-06-26 — Touch/mobile bloqueante (#5)
- **Botões hover-only** (invisíveis em telas de toque): `PublicBemDetalhes` (setas do carrossel) e `ImageUpload` (botão remover foto) usavam `opacity-0 group-hover:opacity-100` → agora `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` (visível no mobile, hover-reveal no desktop). Remover ganhou `aria-label` + touch target 32px; `console.error` do onError virou guard DEV.
- **Seleção de bem por UUID:** `CreateDesafetacaoForm` exigia digitar o UUID do patrimônio/imóvel (inutilizável). Trocado por `SearchableSelect` (busca por número/descrição, value = id), alimentado por `useAllPatrimonios`/`useImovel` dentro do form.
- **Tabela de revisão da importação:** `ImportarRelatorio` etapa 2 é `table-fixed` com muitas colunas → banner `lg:hidden` recomendando concluir em desktop.
- **Arquivos:** `src/pages/PublicBemDetalhes.tsx`, `src/components/bens/ImageUpload.tsx`, `src/pages/desafetacao/DesafetacaoList.tsx`, `src/pages/bens/ImportarRelatorio.tsx`. **Verificação:** `tsc` → 0 erros.
- **Lição:** `group-hover` não existe em toque — para ações em hover-reveal, sempre `opacity-100` no mobile e `sm:group-hover` só no desktop. E nunca pedir UUID ao usuário: dropdown buscável com label legível.

### 2026-06-26 — Estados de erro (#4) + confirmações destrutivas (#7)
- **#4 Spinner eterno / tela em branco:**
  - `BensView` — após falha de rede, `patrimonio` ficava null → spinner eterno. Adicionado `loadError` (set no catch, reset no início) + botão "Tentar novamente".
  - `InventarioSummary` — `getInventoryById(id)!` → tela em branco com id inválido. Agora `?? null` + distingue "Carregando" (via `isLoading` do `InventoryContext`) de "não encontrado" (mensagem + Voltar).
  - `ImoveisReportEditor` — `templateId === 'novo'` sem `municipalityId` travava em "Carregando..." eterno → toast + `navigate` de volta; fallback vira spinner.
  - `BensEdit` — **falso positivo** (já fazia `setPatrimonio` no sucesso e `navigate` no erro); só o `console.error` solto virou guard DEV.
- **#7 Ações destrutivas sem confirmação** (via hook `useConfirm`):
  - `Locais` e `ExcelCsvTemplateManagement` — delete direto → confirmação com nome do item.
  - `GerenciadorFichas` — `window.confirm` nativo → `useConfirm`; `console.error` → `logger.error`.
  - `Termos` — emissão do termo de carga (Art. 14/34) agora confirma antes de registrar no histórico.
  - `DesafetacaoList` — o delete já tinha AlertDialog; faltava bloquear `status === 'concluida'` (ato jurídico) → `canDelete && d.status !== 'concluida'`.
  - De passagem: `aria-label` nos ícone-botões de exclusão tocados.
- **Arquivos:** `src/pages/bens/{BensView,BensEdit}.tsx`, `src/pages/inventarios/InventarioSummary.tsx`, `src/pages/imoveis/ImoveisReportEditor.tsx`, `src/pages/locais/Locais.tsx`, `src/pages/superuser/ExcelCsvTemplateManagement.tsx`, `src/pages/GerenciadorFichas.tsx`, `src/pages/termos/Termos.tsx`, `src/pages/desafetacao/DesafetacaoList.tsx`. **Verificação:** `tsc` → 0 erros.
- **Lição:** "spinner eterno" só existe quando a página NÃO redireciona nem registra erro — várias telas já redirecionavam (falso positivo). Para distinguir carregando×não-encontrado, prefira o `isLoading` do context a um redirect prematuro (os contexts carregam async).

### 2026-06-26 — Bugs de lógica (#8): tooltips de gráfico, divisão por zero, escopo de inventário, permissões
- **Tooltip de gráfico vazio:** `<ChartTooltipContent payload={[]} />` sobrescrevia o payload que o recharts injeta → o tooltip nunca mostrava valores ao passar o mouse. Removido o `payload={[]}` em **6 ocorrências** (`ChartsSection.tsx` ×3, `DepreciationDashboard`, `AnaliseTipo`, `AnaliseSetor`).
- **`InventarioPrint.tsx`:** `(foundCount / items.length) * 100` dava `NaN%` com 0 itens → guarda `items.length > 0 ? … : '0.0'`.
- **`InventarioEdit`:** o escopo `specific_location` (e o `specificLocationId`) era perdido ao editar — o schema/form/submit não tinham o campo e o Select não tinha a opção. Trazido à paridade com o `InventarioCreate` (campo + opção + condicional). Selects trocados de `defaultValue` para `value` (refletiam o `form.reset` async). Removido `setTimeout(1000)` artificial.
- **`PermissionManagement`:** `useState(() => { setCurrentPermissions(...) })` (inicializador rodava 1x no mount, com `roles` ainda vazio) → a tela nunca populava permissões. Trocado por `useEffect([selectedRole, roles])`; `handleRoleChange` simplificado.
- **Falso positivo descartado — `ImoveisEdit` "sobrescreve com undefined":** o backend `updateImovel` usa whitelist `if (raw[field] !== undefined)` (`imovelService.ts:419-423`) — campos ausentes no body são preservados. Não há perda de dado; os campos só não são editáveis no form (lacuna de feature). Não tocado para não introduzir risco.
- **Arquivos:** `src/components/dashboard/ChartsSection.tsx`, `src/pages/analise/{AnaliseTipo,AnaliseSetor}.tsx`, `src/pages/dashboards/DepreciationDashboard.tsx`, `src/pages/inventarios/{InventarioPrint,InventarioEdit}.tsx`, `src/pages/superuser/PermissionManagement.tsx`. **Verificação:** `tsc` → 0 erros.
- **Lição:** `useState(fn)` é inicializador (roda 1x, valor descartado se você não o usa) — para "rodar quando deps mudam" é `useEffect`. E sempre cruzar "perda de dado" alegada com a semântica real de update do backend (whitelist de campos ≠ replace) antes de expandir formulários.

### 2026-06-26 — RBAC no cliente (#6): guard de rota + gating de ações por permissão
- **Revisão dos achados:** ao conferir `App.tsx`/`ProtectedRoute`, vários "sem RBAC" apontados pelos agentes eram **falsos positivos** — fichas (`GerenciadorFichas`/`NovoTemplateFicha`/`EditorTemplateFicha`) e `ImovelCustomFields` já tinham `allowedRoles={['admin','supervisor']}` na rota (superuser é redirecionado a `/superuser/*` por design).
- **Gaps reais corrigidos:**
  1. `/imoveis/manutencao` não tinha `ProtectedRoute` (qualquer papel, inclusive `visualizador`, acessava/criava tarefas) → adicionado `allowedRoles={['admin','supervisor','usuario']}` (igual à rota irmã `/imoveis/novo`).
  2. `UserManagementUnified` mostrava criar/editar/excluir/alterar-senha mesmo para `supervisor`, que tem ZERO permissões `users:*` no modelo de papéis (`PermissionContext`). Agora gateia por `usePermissions` (`users:create/update/delete`): supervisor vê "Somente leitura"; admin/superuser inalterados (superuser faz bypass). De passagem: `aria-label` no menu de ações e nome do usuário no diálogo de exclusão.
- **Código morto identificado** (não roteado, candidato a remoção): `BensCadastradosSimplificado.tsx` (Editar/Excluir p/ todos, mas a página nunca é renderizada), além de `GerenciarTipos.tsx` e `ImovelMap.tsx`.
- **Arquivos:** `src/App.tsx`, `src/components/admin/UserManagementUnified.tsx`. **Verificação:** `tsc --noEmit -p tsconfig.app.json` → 0 erros.
- **Lição:** RBAC no cliente vive em DOIS lugares — `ProtectedRoute allowedRoles` (acesso à página) e gating de ações por `usePermissions` (botões). Auditar componente isolado gera falso positivo; sempre cruzar com `App.tsx`. E alinhar o gating ao `PermissionContext` (fonte da verdade) em vez de checar papel na mão.

### 2026-06-26 — Consulta pública (bens) + UI honesta nas telas de falsa persistência
- **Consulta pública (🔴 #2):** `PublicAssets` (rota pública `/consulta-publica`) lia de `useAllPatrimonios` (`GET /patrimonios?all=true`, autenticado) → visitante anônimo via lista vazia (regressão da migração para `useAllPatrimonios`). O `startSync` buscava `/public/patrimonios` mas gravava no `PatrimonioContext`, que a página não lê. **Correção:** novo hook `usePublicPatrimonios` (`src/hooks/queries/use-public-patrimonios.ts`) → `GET /public/patrimonios` (sem auth), mapeando o shape público camelCase (sem valor) para os campos snake_case da página; `listPatrimonios()` adicionado ao `public-api.ts` (e `console.error` → `logger.error`). Timestamp/spinner via React Query (`dataUpdatedAt`/`isFetching`), removida a dependência órfã do `SyncContext`. **Imóveis públicos** seguem pendentes (sem endpoint `/public/imoveis` — decisão de produto, F8).
- **Falsa persistência (🔴 #3) — UI honesta:** confirmado que NÃO há backend para 2FA, backup/restore nem system-info. Em vez de simular sucesso: `SecuritySettings` (2FA desabilitado + Alert), `BackupSettings` (restauração desabilitada com Alert citando risco cross-tenant; criação de backup real mantida), `SystemInformation` (Alert "armazenamento local" + toast honesto), `SyncClient` (status "Conectado" hardcoded removido, auto-sync desabilitado, sync manual mantido). `LogoManagement` "remover logo" passou a **persistir** via `saveSettings` (correção real).
- **Arquivos:** `src/pages/{PublicAssets,admin/SecuritySettings,admin/BackupSettings,admin/LogoManagement,superuser/SystemInformation,ferramentas/SyncClient}.tsx`, `src/hooks/queries/use-public-patrimonios.ts`, `src/services/public-api.ts`.
- **Verificação:** frontend `tsc --noEmit -p tsconfig.app.json` → 0 erros.
- **Lição:** ao migrar consumidores para um hook autenticado em massa, conferir páginas PÚBLICAS — elas precisam de endpoint sem auth. E "feature stub que dá toast de sucesso" é pior que feature ausente: ou liga no backend, ou para de afirmar sucesso (UI honesta).

### 2026-06-26 — Varredura de UI/UX (88 páginas) + correção do lote multi-tenant `municipalityId: '1'`
- **Contexto:** varredura das ~88 páginas (`src/pages/**`) por 6 agentes `frontend-expert` em paralelo (eixos: elementos/estado, botões, responsividade, a11y). Relatório completo em `Docs/_PROJETO/AUDITORIA_UI_2026-06-26.md`.
- **Sintoma (🔴 #1):** `municipalityId: '1'` hardcoded em telas que persistem/alimentam dados — risco de vazamento multi-tenant (o risco nº 1 declarado do projeto).
- **Correção:**
  - `SectorManagement.tsx` — passa a usar `user.municipalityId` (via `useAuth`) com guard/toast quando ausente, em vez de `'1'`.
  - `ImoveisCreate.tsx` — removido o fallback `user.municipalityId || '1'`; adicionado guard no início do submit.
  - `ExcelCsvTemplateManagement.tsx` + `ExcelCsvTemplateContext.tsx` — **não envia mais `municipalityId` do cliente**; o backend (`excelCsvTemplateService.createExcelCsvTemplate`) já deriva `municipalityId: actor.municipalityId` do usuário autenticado (o valor do body era dado morto e enganoso). Tipo do `saveTemplate` ajustado para `Omit<..., 'id' | 'municipalityId'> & { id? }`.
  - `LabelTemplateEditor.tsx` — ao criar modelo sem `municipalityId`, agora avisa e volta para a lista em vez de criar template com tenant `'1'`; mock de preview alinhado a `user?.municipalityId`.
  - `BensCadastrados.tsx` — objeto "Etiqueta Padrão" usa `user?.municipalityId`.
- **Não tocados (por decisão):** `FichaPreviewReal.tsx:47` e `LabelTemplateContext.tsx:60` (`defaultTemplate`) — mocks de preview/escopo de módulo, nunca persistem; documentados no relatório.
- **Arquivos:** ver acima. **Verificação:** frontend `tsc --noEmit -p tsconfig.app.json` (ver resultado na sessão).
- **Lição:** quando o backend deriva o tenant do usuário autenticado, o cliente NÃO deve enviar `municipalityId` — enviar um valor fixo é dado morto que mascara a intenção e vira armadilha de cópia/cola. Padrão correto: omitir no payload ou usar `user.municipalityId` com guard, nunca `'1'`.

### 2026-06-26 — Sincronização de docs com o estado real do código (bloqueadores B1–B6)
- **Sintoma:** `PLANO_MELHORIAS_FLUXOS.md` mantinha os cabeçalhos de B1, B3, B4, B5 **sem** ✅, sugerindo bloqueadores em aberto, enquanto a lista de execução do Sprint 6 (mesma doc) os marcava concluídos — inconsistência interna que dava falsa impressão de pendência crítica.
- **Causa-raiz:** docs ficaram defasados em relação ao código (já era um padrão conhecido — ver memória `security-hardening-2026-06-23`). As correções foram aplicadas mas só a checklist de execução foi marcada, não as definições.
- **Correção:** verificado no código que os 6 bloqueadores estão resolvidos e marcados os cabeçalhos: B1 (recuperação de senha reativada, sem o comentário "TEMPORARIAMENTE DESABILITADO"), B3 (`POST /emprestimos/:id/devolver` + UI), B4 (`imovelService` persiste `customFields`), B5 (`BaixaBemModal` faz upload real → `documentos_baixa`/`url_documentos`), B6 (`index.ts` registra só `transferRoutes`). "Observações finais" da doc atualizadas.
- **Arquivos:** `Docs/_PROJETO/PLANO_MELHORIAS_FLUXOS.md`.
- **Verificação:** backend `jest --coverage` → **43 suítes / 566 testes** verdes; frontend `tsc --noEmit -p tsconfig.app.json` → **0 erros**.
- **Lição:** ao concluir um item, marcar a **definição** do item (não só a checklist de sprint) — caso contrário a doc passa a contradizer a si mesma e gera retrabalho de auditoria.

### 2026-06-24 — Importação de bens móveis do relatório de liquidação SIAFIC (PDF)
- **Pedido:** importar para o patrimônio o relatório da contabilidade ("Movimentos de Liquidação", classificação 4.4.90.52.00 — material permanente pago) que vem em PDF, mapeando os campos para o cadastro de bens móveis. Decisões de produto (confirmadas): 1 patrimônio por unidade física (explode a quantidade); campos contábeis dedicados (fornecedor/empenho/liquidação); tela de revisão editável; mapear cada UG do relatório para um setor.
- **Análise do documento:** relatório de texto de largura fixa, hierárquico — UG (fundo/secretaria) › Dotação › Subelemento 4.4.90.52.XX (= tipo do bem) › Nota Fiscal (data, fornecedor, empenho, NF nº/série, liquidação) › Itens (qtd · unidade · especificação · vl. unit · vl. total) + Fonte de Recursos por UG (→ origem_recurso). Mapeamento: especificação→descricao_bem; subelemento→tipo; qtd→nº de unidades; vl. unitário→valor_aquisicao; data NF→data_aquisicao; NF nº/série→numero_nota_fiscal; prefixo do empenho (LC/CD)→forma_aquisicao; fonte→origem_recurso. Não há marca/modelo/série no relatório (ficam vazios).
- **Parser (`importacaoMaterialService`):** `pdf-parse@1.1.1` preserva o layout de largura fixa. Máquina de estado com **normalização** que remove o cabeçalho/rodapé de página e marca troca de UG — assim a NF e os itens não perdem contexto na quebra de página, e descrições que quebram em várias linhas (inclusive entre páginas) são juntadas. Validado contra o relatório real: 5 UGs, 72 linhas, **488 unidades**, soma R$ 892.848,49 (casa exatamente com os totais por UG), 0 avisos, todos os itens com qtd×unit=total.
- **Backend:** migration `add_campos_contabeis_patrimonio` (fornecedor/numero_empenho/numero_liquidacao). `importarPatrimonios` cria 1 patrimônio por unidade em transação atômica, numeração via `proximoNumeroPatrimonialTx` (sem race), defaults de bem novo (situação OTIMO, destinação uso_especial revisada, tipo_posse próprio), valida tenant do setor e trava de 2000 unidades/lote. Endpoints `POST /importacao/material-permanente/preview` (upload em memória, parse, sem gravar) e `/confirmar` (admin/superuser).
- **Frontend:** página `/bens/importar` (admin/superuser) em 3 etapas — upload → mapeamento UG→setor + tabela editável (descrição/qtd/valor/tipo/forma/origem) com totais e trava até mapear todas as UGs → confirmar. Botão na lista de bens.
- **Commits:** `d211d66` (parser), `685af4f` (schema + endpoints), `5aca44f` (frontend).
- **Verificação:** backend `tsc` + **40+ suites / 546 testes Jest** (15 novos: parser com fixtures + importarPatrimonios); frontend `tsc` + `vite build` OK.
- **Lição:** extrair PDF de texto de largura fixa é viável com `pdf-parse@1.1.1` (preserva colunas; a v2 é uma reescrita class-based incompatível com os types). A chave foi a normalização que colapsa o ruído de página repetido e só marca troca de UG — sem isso, a NF "reseta" a cada página e itens que cruzam a quebra se perdem. Validar a soma contra os totais do próprio relatório dá confiança de cobertura total.

### 2026-06-24 — Modo LOTE: desafetação, desfazimento e incorporação (Art. 22/24)
- **Pedido:** para o acervo antigo, permitir os atos em lote (1 processo/parecer/decreto para N bens) e dar agilidade. Fundamentado em análise legal pelo `sispat-domain-expert`: **PERMITE LOTE COM RESSALVAS** — a lei usa o singular por redação, mas a prática consolidada é um único decreto/parecer relacionando N bens (Anexo); a ressalva é manter a **rastreabilidade por bem** (cada bem é um registro próprio compartilhando o mesmo nº/data de base legal).
- **Implementação — Opção A (endpoints transacionais, tudo-ou-nada):**
  - `desafetacaoService.createDesafetacaoLote` → `POST /desafetacoes/lote`: N bens (patrimônio/imóvel) compartilham a MESMA base legal e comissão.
  - `desfazimentoService.createDesfazimentoLote` → `POST /desfazimentos/lote`: N bens, mesma classificação/modalidade; `valorAvaliacao` é **por bem** (alienação exige avaliação individual, Art. 23).
  - `regularizacaoService.incorporarRegularizacaoLote` → `POST /regularizacoes/incorporar-lote`: incorpora N regularizações ao mesmo setor/local/tipo. **Pegadinha de numeração:** chamar `gerarNumeroPatrimonial` em loop colide (transação aninhada não enxerga linhas não commitadas da transação externa) — solução: gerar o 1º número e **incrementar o sequencial em memória** (`prefixoSeq + padStart(seq)`), itens com número explícito usam o seu.
  - **Padrão comum:** valida TODOS os bens antes da transação (tenant, destinação, comissão, avaliação, duplicata em andamento) + dedup do lote; depois cria tudo numa única `$transaction`. Rota `/lote` declarada antes de `/:id` onde necessário.
  - Schemas zod (`createDesafetacaoLoteSchema`, `createDesfazimentoLoteSchema`, `incorporarRegularizacaoLoteSchema`) em `@sispat/shared`, com `max(200)` bens por lote.
- **Frontend:** botão "em lote" + dialog de seleção múltipla (checkboxes + busca + contador) nas 3 telas (`DesafetacaoList`, `DesfazimentoList`, `RegularizacaoList`); desfazimento mostra valor de avaliação por bem quando a modalidade é alienação. Implementado por 3 `frontend-expert` em paralelo (arquivos disjuntos), cada um verificando `tsc`.
- **Commits:** `846e2f5` (backend), `099608b` (frontend).
- **Verificação:** backend `tsc` + **40 suites / 522 testes Jest** (12 novos de lote); frontend `tsc` limpo; `vite build` OK.
- **Lição:** geração de número sequencial em lote não pode reusar a função single em loop (cada chamada lê o mesmo "último número" pré-commit) — gere a base uma vez e incremente em memória dentro da transação. E delegar UI repetitiva a subagents paralelos funciona com arquivos disjuntos, mas o `tsc` de um agente pode ver erros transitórios dos outros — rode um `tsc` limpo no fim.

### 2026-06-24 — Conformidade (2ª onda): follow-ups exigidos pela lei
- **Contexto:** após os 5 gaps 🔴 críticos, os follow-ups maiores foram avaliados pelo `sispat-domain-expert` contra a Lei/Decreto (`Docs/analise/`), com veredito EXIGIDO / RECOMENDÁVEL / JÁ ATENDIDO por item — para não construir entidade que a lei não exige.
- **Implementados (EXIGIDO/RECOMENDÁVEL):**
  1. **Comissão obrigatória na incorporação da regularização (Art. 19 / Cap. XIII):** `regularizacaoService.incorporarRegularizacao` exige comissão designada, tipo `regularizacao` e ativa. A constatação ainda pode ficar em rascunho sem comissão.
  2. **Comissão obrigatória na conclusão do desfazimento (Art. 14 Decreto / Art. 19, IV):** `desfazimentoService.concluirDesfazimento` exige comissão `desfazimento_desafetacao` ativa (laudo de classificação). **Desafetação** (Art. 22) mantém comissão OPCIONAL por decisão fundamentada — a base legal (lei/decreto/ato) é o elemento constitutivo; documentado no código.
  3. **Alienação exige avaliação prévia (Art. 23 / Art. 14 Decreto):** `createDesfazimento` exige `valorAvaliacao` (>0) para modalidades de alienação; inutilização dispensa. A lei NÃO exige entidade "Alienação" separada — o desfazimento é o fluxo de alienação de móveis (Art. 5 VIII).
  4. **origem_recurso + cláusulas de reversão (Art. 4 Decreto / Art. 13 §2):** campos opcionais em `Patrimonio` (migration `add_origem_recurso_reversao`); setáveis no create/update; form pede a reversão quando a origem implica repasse (convênio/emenda/transferência). Corrigido de passagem: `BensEdit` não enviava `tipo_posse` no payload de edição.
  5. **Inventário cobre imóveis (Art. 16):** `InventoryItem.patrimonioId` nullable + `imovelId` (migration `inventario_cobre_imoveis`); `createInventario` inclui imóveis do setor no escopo `sector` (inventário anual); conferência casa por patrimônio OU imóvel; finalize não marca imóveis "extraviado"; frontend renderiza imóveis com badge.
  6. **Termo de carga formalizado (Art. 14/34):** `termosService.emitirTermoCarga` gera número sequencial por município/ano (`TC-AAAA-NNNN`), persiste a emissão em `HistoricoEntry` (+ `ActivityLog`) e retorna o termo numerado. Rota `POST /termos/:patrimonioId/carga/emitir`; botão no frontend. Antes os termos eram só gerados read-only, sem registro de emissão — impossível comprovar a transferência de responsabilidade do Art. 34.
- **JÁ ATENDIDO (não implementado):** **escrituração mensal da depreciação** — a lei (Art. 21 Lei / Art. 12 Decreto) exige o "reflexo mensal no Balanço Patrimonial", que é responsabilidade do SIAFIC; o SISPAT já cumpre seu papel (parâmetros no cadastro + cálculo on-the-fly em `depreciation.ts` para a conciliação). Persistir lançamentos mensais duplicaria o SIAFIC. Único resíduo opcional: validar/alertar bens sem `vida_util_anos`/`valor_residual` (cálculo retorna zero) — deixado como melhoria de cadastro, não bloqueante.
- **Commits:** `23a8c16` (comissões regularização+desfazimento), `5d0f2eb` (origem/reversão), `afb26e8` (avaliação na alienação), `25429ed` (inventário imóveis), `8217b0d` (termo de carga).
- **Verificação:** backend `tsc` limpo + **40 suites / 506 testes Jest**; frontend `tsc` limpo; 3 migrations aplicadas.
- **Lição:** antes de construir features grandes de conformidade, pedir veredito EXIGIDO/RECOMENDÁVEL/JÁ ATENDIDO ao domínio com citação de artigo evita over-engineering — 2 dos 6 follow-ups (alienação como entidade, escrituração mensal) NÃO eram exigências da lei; o que parecia falta era escopo de outro sistema (SIAFIC) ou já coberto pelo fluxo existente (desfazimento).

### 2026-06-24 — Conformidade com a Lei de Gestão Patrimonial: enforcement das modalidades
- **Contexto:** auditoria de fluxo de cada modalidade do patrimônio contra a Lei/Decreto de Gestão Patrimonial (docs em `Docs/analise/`). Diagnóstico: o sistema implementa TODAS as modalidades estruturalmente; as lacunas eram de **enforcement** (faltavam travas que impedissem operações fora da lei), não de modelagem. 5 gaps 🔴 críticos corrigidos com test-gating.
- **Correções:**
  1. **Art. 22/23 — alienação exige desafetação:** `desfazimentoService` bloqueia desfazimento por doacao/leilao/permuta/cessao/transferencia de bem não-dominical (uso comum/especial/não-classificado) sem desafetação prévia. Guard em `createDesfazimento` e `concluirDesfazimento`.
  2. **Conciliação SIAFIC a valor LÍQUIDO:** `conciliacaoService.calcularSaldoFisico` deixou de somar custo histórico bruto e passou a usar valor contábil líquido (custo − depreciação acumulada linear, piso no residual) na data-base. Novo `backend/src/utils/depreciation.ts` (espelha `src/lib/depreciation-utils.ts`, sem date-fns).
  3. **Art. 22 — reclassificação não vira dominical:** `desafetacaoService.reclassificarDestinacao` rejeita destino 'dominical' direto (lança antes de qualquer query) — tornar um bem dominical é desafetação formal com base legal, não reclassificação.
  4. **Art. 19 — mínimo de 3 membros:** `comissaoService.removeMembro` impede reduzir comissão constituída de 3→2 membros; remoção durante a montagem (<3) segue liberada (sinalizada por alerta).
  5. **Art. 13 §3 — tipo_posse:** enum `TipoPosse` (proprio/cessao/comodato) em `patrimonios` e `imoveis` (migration `20260624193545_add_tipo_posse`). Bens em cessão/comodato NÃO somam ao ativo na conciliação (filtro `tipo_posse: 'proprio'` em móveis e imóveis). Setável no create/update (validado contra o enum, valor inválido cai em 'proprio') e no formulário (BensCreate/BensEdit + campo no schema `@sispat/shared`).
  6. **Art. 25/26 — BO no extravio:** `patrimonioService.registrarBaixa` exige documento anexado (Boletim de Ocorrência/comunicação) quando o `motivo_baixa` casa `/extravi|furto|roubo|desaparec|sumic|subtra/` (normalizado sem acento, case-insensitive). Baixa comum (obsoleto etc.) não exige.
- **Arquivos:** `backend/src/services/{desfazimento,conciliacao,desafetacao,comissao,patrimonio}Service.ts`, `backend/src/utils/depreciation.ts` (novo), `backend/prisma/schema.prisma` + migration `add_tipo_posse`, `shared/src/schemas/patrimonio.ts`, `src/pages/bens/{BensCreate,BensEdit}.tsx`, `src/types/index.ts`, e testes Jest (`conciliacaoService`/`patrimonioService.baixa`/`patrimonioService.update`/`comissaoService`/`desafetacaoService`/`desfazimentoService` + `utils/depreciation`).
- **Commits:** `c918a51` (desafetação no desfazimento), Task #7 (depreciação na conciliação), `fb102ca` (reclassificar + mín. 3 membros), `145b62d` (tipo_posse + BO backend), `ab92236` (seletor de posse no frontend).
- **Verificação:** backend `tsc` limpo + **40 suites / 493 testes Jest** verdes; frontend `tsc` limpo (após rebuild de `@sispat/shared` + `corepack pnpm install`).
- **Follow-ups não-críticos (deixados):** origem_recurso/cláusulas de reversão em doações, termos persistidos como entidades, inventário cobrindo imóveis, comissão obrigatória na regularização, entidade de alienação, escrituração mensal da depreciação.
- **Lição:** conformidade legal num sistema que já modela tudo é, na prática, questão de **guards** — onde o código deixa uma operação acontecer fora da ordem que a lei exige (alienar sem desafetar, reduzir comissão abaixo do quórum, baixar extravio sem BO, somar bem de terceiro ao ativo). Cada trava é barata e fica travada por teste; o caro é mapear qual artigo cada fluxo viola.

### 2026-06-24 — Zerar erros de TypeScript do frontend (768 → 0)
- **Sintoma:** `npx tsc --noEmit -p tsconfig.app.json` acusava **768 erros** no frontend (o build via Vite/esbuild não type-checa, então a dívida acumulou). Categorias: 205 `TS6133` (não usados), 132 `TS2551` (camelCase vs snake_case), 116 `TS2339`, 69 recharts×React19 (`TS2786/2607`), 35 `TS2307` (módulos), etc.
- **Correção (faseada, ~10 commits `fix(types)`):**
  1. **Causas-raiz sistêmicas:** removido dead code (`lazy-routes.tsx`, `LazyComponents.tsx`, `use-data.ts`, `VirtualizedList.tsx`, `ThemeManagement.tsx` — não roteados/usados, −≈70 erros); `src/lib/recharts-compat.tsx` (shim re-exportando componentes recharts contornando a incompatibilidade JSX do React 19, −69); `chart.tsx` (props do Tooltip/LegendPayload tipados à mão).
  2. **Ondas paralelas de subagents** (`frontend-expert`) por cluster de arquivos disjuntos, com prompt anti-regressão (⛔ NÃO deletar UI/lógica para silenciar tipo) e **revisão de cada diff** (diff de assinatura de erro, scan de `any`, scan de deleção de JSX). Dominante: corrigir acessos camelCase→snake_case alinhados aos tipos canônicos (`Patrimonio`/`Imovel` são snake_case; `PublicPatrimonio` camelCase), remover imports/vars não usados, tipar params implicit-any, narrowing de union, type guards em catch.
  3. **Fixes centrais (em `src/types`):** `Patrimonio.observacoes?`, `Imovel.createdAt?/updatedAt?`, `Transferencia` (localOrigem/localDestino/dataTransferencia/responsavel*/observacoes), `TipoBem.vidaUtilPadrao?/taxaDepreciacao?`, `ActivityLogAction` (+ACQUISITION_FORM_*) — espelhando o Prisma.
  4. **Deps:** `@sentry/react` instalado (frontend importava sem dep); `@testing-library/jest-dom` instalado, `expect` estendido via `/matchers` (o subpath `/vitest` não resolve sob pnpm estrito) + `src/test/vitest.d.ts` para os tipos.
  5. **Testes:** `depreciation-utils.test` reescrito para a API atual de `DepreciationInfo` (EN); fixtures de `Sector` ganham `sigla`/`parentId`. 35 testes desses arquivos passam.
- **Bugs reais revelados pelos tipos (corrigidos sem deletar UI):** `document` local sombreava o `document` do DOM (DocumentContext, crash na TDZ); `updatePatrimonio(id, {...})` chamado com 2 args numa função de 1 (TransferContext); `logActivity` malformado (AcquisitionFormContext); `.btn-responsive` duplicado no tailwind.config.
- **Verificação:** `tsc -p tsconfig.app.json` = **0** (de 768). Backend `tsc` + 460 testes Jest seguem passando. Diff de assinatura de erro vs cada commit anterior = zero regressão; sem `any` novo (exceto shims isolados e documentados: recharts, socket.io). As falhas pré-existentes do `vitest` (39 arquivos com erro de infra: `process.exit`/IPC/localStorage; `utils.test:formatCurrency`) NÃO foram introduzidas por este trabalho (arquivos/alvos não tocados) — ficam como dívida separada.
- **Lição:** dívida de tipos acumula quando o build não type-checa. Limpeza em massa funciona com subagents paralelos SE houver guard-rail explícito (não deletar UI/lógica) e revisão por diff de assinatura — a primeira tentativa não-supervisionada deletou um FormField real e foi revertida. Tipos frequentemente escondem bugs reais (shadowing, arg count, dead/broken pages).

### 2026-06-24 — Ajustes finais: runner de testes, comando único de dev e hardening de auditoria
- **Runner de testes (vitest) estabilizado:** `vitest.config.ts` não tinha `include`/`exclude`, então o vitest escaneava o repo inteiro e tentava rodar os ~40 testes Jest do **backend** (e os e2e Playwright). Módulos do backend chamam `process.exit(1)` na validação de env e instalam handlers Winston de `unhandledRejection` → crash dos workers do vitest (`ERR_IPC_CHANNEL_CLOSED`/`write after end` em cascata; 39 arquivos "failed" por load). Correção: `include: ['src/**/*.{test,spec}.{ts,tsx}']` + `exclude` de `backend/`/`shared/`/`e2e/`/`tests/`. Aflorou uma falha pré-existente real em `utils.test:formatCurrency` (o `Intl.NumberFormat` usa espaço não-quebrável U+00A0/U+202F entre símbolo e número; teste esperava espaço normal) — normalizado com `/\s/g`. Resultado: **frontend 7 arquivos / 62 testes 100%**; backend Jest segue na sua suíte (`npm test` em `backend/`). Backend NÃO é rodado pelo vitest (Jest é a suíte dele).
- **Comando único de dev (`npm run dev`):** `concurrently` sobe backend (nodemon :3000) + frontend (vite :8080) com prefixos `[backend]`/`[frontend]`; Ctrl+C para os dois. `dev:frontend`/`dev:backend` sobem um só (e o Playwright e2e usa `dev:frontend`). [Inicialmente adicionado como `dev:all`; promovido a `dev` padrão a pedido.] `.npmrc` `verify-deps-before-run=false` evita que o gate de build-scripts não aprovados (core-js/esbuild) aborte `pnpm run <script>` com `ERR_PNPM_IGNORED_BUILDS` (era a causa do `pnpm-workspace.yaml` ficar sujo com bloco `allowBuilds:` placeholder no sandbox).
- **Verificação pós-limpeza + hardening de auditoria:** build de produção do frontend (`vite build`) OK em ~19s (a limpeza de tipos não quebrou o bundle). Rodados os auditores read-only (`security-auditor` + `multitenancy-guard`) — 0 críticos, sem regressões. Achados latentes corrigidos em 2 rodadas:
  1. `locaisController`: `listLocais` resolvia setores por NOME (`responsibleSectors`) sem `municipalityId` (defesa em profundidade — a query principal já filtrava município); `updateLocal` aceitava `sectorId` do body sem validar pertencimento (o `createLocal` já validava).
  2. `imovelService.gerarNumeroImovel`: `sector.findUnique({ id: sectorId })` com `sectorId` da query string sem checar município → `findFirst({ id: sectorId, municipalityId })`.
  3. PII: `maskEmail` no `details` do `ActivityLog` (`emailConfigController`/`userController`) e em `logDebug` com email em claro (`emailConfigController`/`sectorsController`/`locaisController`) — o transport de arquivo do Winston não restringe nível, então `debug` persiste em disco em produção.
- **Regra formalizada** em `REGRAS_NEGOCIO.md` §1: lookup por campo HUMANO (`name`/`nome`/`codigo`/`numero_patrimonio`/`setor` — qualquer coisa não-`id`) exige `municipalityId` no MESMO `where` (inclui resolução nome→id, checagem de unicidade e `getByNumero`); nunca confiar em `municipalityId`/ids vindos do `req.body`.
- **Verificação:** backend `tsc` limpo + **473 testes Jest** (após os fixes). Re-auditoria final convergiu: nenhum achado vermelho/amarelo em aberto (só os 2 estruturais conhecidos por decisão de produto: `SystemConfiguration` global e `PUT /system-configuration` p/ `admin`).
- **Lição:** vitest sem `include`/`exclude` num monorepo roda testes de outras ferramentas (Jest do backend) e crasha por `process.exit`. E "controller filtra tenant na query principal" não basta — sub-lookups por nome (não-id) também precisam do filtro (defesa em profundidade); ver `REGRAS_NEGOCIO.md` §1.

### 2026-06-24 — Sprint 22: centralização Zod de patrimônio e imóvel
- **Sintoma:** patrimônio e imóvel ainda validavam via `express-validator` no backend (`patrimonioValidations`/`imovelValidations` em `validation.ts`) e tinham schemas Zod locais redundantes no frontend (`src/lib/validations/{patrimonio,imovel}Schema.ts`) — regras duplicadas e passíveis de divergir.
- **Correção:** criados `shared/src/schemas/patrimonio.ts` e `imovel.ts` em `@sispat/shared`. Rotas `patrimonioRoutes`/`imovelRoutes` passaram a usar `zodValidate({ body, params, query })` com `paginationQuerySchema`/`uuidParamSchema` do common. `patrimonioValidations`/`imovelValidations`/`queryValidations` removidos. Os arquivos de validação do frontend viraram reexports finos de `@sispat/shared` (nomes de export preservados → nenhum import de página alterado).
- **Causa-raiz / armadilhas tratadas:**
  1. **Perda de dados por stripping:** `zodValidate` faz `req.body = schema.parse(req.body)` e o Zod descarta chaves não declaradas. Os services leem campos que o schema "oficial" não lista (`sectorId`/`localId`/`tipoId`/`acquisitionFormId` no patrimônio; `sectorId`/`customFields`/`url_documentos` no imóvel). Solução: `.passthrough()` nos schemas de **body** do backend. Travado por teste.
  2. **Imóvel não unificável:** nomes divergem entre front (`area_total`, `cep`, `cpf_responsavel`, `escritura_*`) e back (`area_terreno`, `setor`, `latitude`, `longitude`, `tipo_imovel`, `situacao`, `customFields`). Mantidos schemas separados no mesmo arquivo: `imovelFrontendSchema` (UI) + `createImovelBodySchema`/`updateImovelBodySchema` (API).
  3. **Regressão de validação do frontend:** a primeira versão (subagente) afrouxou regras do front ao alinhar com o backend — `valor_aquisicao` 0.01→0, `quantidade_unidades` 2→1, imóvel `endereco` 5→1/`max` 200→300, áreas `positive()`→`min(0)`. Como migração Zod é refactor (neutro em comportamento), as regras estritas do front foram restauradas via override só no lado frontend (`patrimonioFrontendBaseSchema`), sem afetar o backend. `documentos_pdf` voltou a `z.array(z.any())` (era `z.unknown()`, que quebrava `<Input {...field}>` com `unknown[]`).
- **Arquivos:** `shared/src/schemas/{patrimonio,imovel}.ts`, `shared/src/index.ts`, `backend/src/routes/{patrimonio,imovel}Routes.ts`, `backend/src/middlewares/validation.ts`, `src/lib/validations/{patrimonio,imovel}Schema.ts`, `backend/src/__tests__/shared/patrimonioImovelSchemas.test.ts` (novo, 10 testes).
- **Verificação:** `shared` build OK; backend `tsc` limpo + **470 testes Jest** (38→39 suites); frontend `tsc` no baseline (843 erros pré-existentes, **zero erro líquido novo** — confirmado por diff stash vs working tree).
- **Lição:** ao trocar `express-validator` (valida e deixa passar) por `zodValidate` (valida e SUBSTITUI o body), todo campo lido pelo service precisa estar no schema OU sob `.passthrough()` — senão some silenciosamente. E refactor de validação não deve mudar regras de negócio: confira diferenças front/back e preserve cada lado.
- **Complemento (mesma data):** rotas `POST /:id/notes` e `POST /:id/baixa` do patrimônio também migradas (`addNoteSchema`/`registrarBaixaSchema` em `@sispat/shared`). `patrimonioRoutes` deixou de importar `express-validator`. Detalhe preservado: `data_baixa`/`motivo_baixa` ficam OPCIONAIS no Zod porque o controller faz a checagem própria e retorna a mensagem específica 'Data e motivo da baixa são obrigatórios'; `observacoes` declarado no schema (o service lê, o express-validator antigo não validava). +3 testes (473 Jest no total).

### 2026-06-24 — Sprint 23: schemas Zod locais do admin → @sispat/shared
- **Sintoma:** `TipoBemManagement` e `AcquisitionFormManagement` (`src/pages/admin/`) definiam schemas Zod locais (`tipoBemSchema`/`acquisitionFormSchema`) que divergiam do canônico do backend — nome `min(2)/max(50)` sem regex vs shared `min(1)/max(100)` (+regex no tipoBem), descrição `≤200` vs `≤500`. Drift clássico: o front aceitava nomes que o backend rejeitaria (faltava o regex) e bloqueava nomes que o backend aceita.
- **Correção:** ambas as páginas passaram a derivar de `createTipoBemSchema`/`createFormaAquisicaoSchema` do `@sispat/shared`, estendendo só com `ativo: z.boolean().default(true)` (campo de formulário — o status real é gerenciado pelo endpoint de toggle, separado do create/update). `createTipoBemSchema` não tem `ativo` (e `updateTipoBemSchema` é `.strict()`), então o front nunca precisou enviar `ativo` no payload de create/update.
- **Arquivos:** `src/pages/admin/{TipoBemManagement,AcquisitionFormManagement}.tsx`.
- **Verificação:** frontend `tsc` no baseline (843); diff stash por arquivo confirmou **zero erro líquido novo** (os 10 erros nas 2 páginas são pré-existentes: `@/types`→`TipoBem` sem `vidaUtilPadrao`/`taxaDepreciacao`, imports não usados). Backend inalterado (já usava os schemas do shared desde a Sprint 20). Fecha o item #13 do PLANO (centralização Zod).
- **Lição:** schemas de validação duplicados derivam silenciosamente. Quando o backend é o canônico, o front deve consumir o MESMO schema (estendendo só campos de UI) — divergência de regras é bug latente, não feature.

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

### 2026-06-23 — Rotas públicas tenant-aware (sem mudança de schema)
- **Achado (multitenancy-guard):** as rotas públicas (sem auth) retornavam dados sem filtrar por município — `listPublicPatrimonios`/`getPublicPatrimonioByNumero` (Patrimonio tem municipalityId), `listPublicDocuments` (DocumentoGeral NÃO tem municipalityId), `getPublicCustomization` (findFirst sem ordenação). Latente em deploy mono-município, vazamento assim que houver um 2º. Agravado por `numero_patrimonio` ser único POR município (busca por número era ambígua).
- **Solução:** helper `backend/src/utils/public-tenant.ts` → `resolvePublicMunicipalityId(requested?)`: usa o id informado na query (`?municipalityId=`) se existir; senão, se houver **exatamente um** município no sistema, usa-o (mantém o deploy mono funcionando **sem mudança de contrato**); se houver vários e nada for informado, lança `MunicipalityRequiredError` (400) em vez de vazar. **Sem migration**: documentos públicos escopam via `uploadedBy.municipalityId` (DocumentoGeral → User).
- **Aplicado em:** `patrimonioService.listPublicPatrimonios/getPublicPatrimonioByNumero` (param municipalityId no where), `patrimonioController` (2 rotas públicas), `documentController.listPublicDocuments` (`uploadedBy: { municipalityId }`), `customizationController.getPublicCustomization` (determinístico por município). Cada um responde 400 em `MunicipalityRequiredError`.
- **Frontend:** sem alteração — as chamadas públicas não enviam municipalityId e, em deploy mono, o helper resolve para o único município (comportamento idêntico ao anterior).
- **Verificação:** tsc backend limpo; **460/460 testes Jest** (+5 em `public-tenant.test.ts`); smoke test das 3 rotas públicas → 200 com resolução default (município único). Restam os itens de produto: `PUT /api/system-configuration` (admin vs superuser).

### 2026-06-23 — Cache tenant-aware + fix do toggle de busca pública
- **Cache cross-tenant (🟡 latente):** auditoria mapeou 3 definições de middleware de cache. Os **ativos** (`patrimoniosCacheMiddleware`, `imoveis`, `transferencias`, `documents`, `dashboard` em `middlewares/cache.ts`) já chaveavam por `municipalityId` via `CacheUtils.get*Key(...)` — seguros. Os genéricos `cacheMiddleware` (`config/redis.ts`) e `cacheResponse` (`middlewares/cacheMiddleware.ts`) chaveavam só por URL/path+query (sem município) — **footguns** (hoje não montados em nenhuma rota, mas vazariam se usados). Endurecidos os 3 geradores genéricos (incluindo o `defaultKeyGenerator` de `cache.ts`) para SEMPRE incluir `:mun:<municipalityId|public>` na chave. Defesa em profundidade.
- **Bug do toggle de busca pública:** `PublicSearchContext.togglePublicSearch` fazia `PUT /public/system-configuration` — rota que só tem GET (404 silencioso, toggle não persistia). Corrigido para `PUT /system-configuration` (rota autenticada admin/superuser, que aceita `allowPublicSearch` no `updateSystemConfigSchema`). Leitura continua no GET público.
- **Verificação:** `tsc` backend+frontend limpo; 455/455 testes Jest.

### 2026-06-23 — Feature B2: Sub-patrimônios (kits) — backend + frontend
- **Origem:** último bloqueador do `PLANO_MELHORIAS_FLUXOS.md`. O `SubPatrimoniosManager` era mock (estado local, `TODO: Integrar com API real`) e estava escondido atrás da flag `FEATURES.subPatrimonios=false`. O model `SubPatrimonio` do schema era vestigial (descricao/quantidade/valor) e divergia do conceito do frontend (unidades com número/localização); a tabela nunca foi gravada.
- **Schema (migration `add_sub_patrimonios_kit`):** `Patrimonio` ganhou `eh_kit Boolean @default(false)` + `quantidade_unidades Int?`. `SubPatrimonio` reestruturado: `numero`, `status`, `localizacao_especifica`, `observacoes`, `@@unique([patrimonioId, numero])`. Migration gerada via `migrate diff` + aplicada com `migrate deploy` (o `migrate dev` é interativo e barra drop de coluna em ambiente não-interativo). Tabela estava vazia → drop seguro.
- **Backend:** `subPatrimonioService` (list/create/update/delete/bulkUpdateStatus + `generateSubPatrimonioNumber`), `subPatrimonioController`, rotas aninhadas `/api/patrimonios/:patrimonioId/sub-patrimonios` (mergeParams) montadas antes do mount geral e fora do cache de patrimônio. **Isolamento multi-tenant via patrimônio pai** (sub não tem municipalityId); 404 mascara cross-tenant. RBAC: leitura autenticados; escrita superuser/admin/supervisor/usuario; delete superuser/admin/supervisor. `patrimonioService.create` gera N sub-patrimônios na transação quando `eh_kit`. Validações `eh_kit`/`quantidade_unidades` em `validation.ts` (create+update).
- **Shared:** `shared/src/schemas/subPatrimonio.ts` (create/update/bulkStatus + status enum).
- **Frontend:** `SubPatrimoniosManagerRefactored` ligado à API real (fetch/create/update/delete/bulk + export CSV via `downloadCsv`); `BensCreate` agora só envia `eh_kit`/`quantidade_unidades` (backend gera, removido o mock `generateSubPatrimonios`); flag `subPatrimonios` ligada. O tipo `SubPatrimonio` do frontend já casava com o DTO do service.
- **Verificação:** tsc backend+frontend limpo; **455/455 testes Jest** (+8 em `subPatrimonioService.test.ts`: número, tenant, bulk); `vite build` OK; **smoke test end-to-end** contra o banco dev (criar kit com 3 unidades → auto-geradas -001/-002/-003; criar avulso -004; bulk-status; update; delete; cascata) — todos OK. Dados de teste limpos.
- **Lição:** quando um model do schema diverge do conceito que o frontend inteiro assume e a tabela está vazia, alinhar o schema ao frontend é mais barato que reescrever 6 arquivos de UI. Fecha a classe de bug "feature que funciona na UI mas só mexe em Context" (era o último caso pendente — ver entrada de 2026-06-23 sobre persistência de inventário).

### 2026-06-23 — Hardening de segurança: magic bytes em documentos + XSS de URL + PII em logs
- **Origem:** re-auditoria com os agentes `multitenancy-guard` e `security-auditor`. Confirmou que o IDOR do `uploadController.deleteFile` e os `$queryRaw` do `customization`/`auditLog` (ainda listados como 🔴 no `CLAUDE.md`) **já estavam corrigidos** — o CLAUDE.md está desatualizado nesse ponto. Também confirmou que os vazamentos multi-tenant "cohort config" (tiposBens/formasAquisicao/sectors/manutencao/auditLog) **estão OK** hoje.
- **🟠 Magic bytes no upload de documentos:** `POST /api/documents` aceitava `.docx/.xlsx/.doc/.xls/.txt/pdf/imagem` validando só extensão+mimetype declarado — sem checar o conteúdo real. Novo validador em `utils/file-validation.ts` (`isOle2Container`, `isZipContainer`, `looksLikeText`, `documentContentMatches`, `validateDocumentOnDisk`) cobre OLE2 (Office legado), ZIP/OOXML (docx/xlsx) e heurística de texto (txt não tem assinatura), reaproveitando o detector estrito de imagem/PDF. Middleware `verifyDocumentMagicBytes` (`middlewares/uploadMiddleware.ts`) plugado na rota após `upload.single`. Deleta o arquivo do disco e responde 400 se o conteúdo não bater. **Por que não reusar `verifyMagicBytes`:** ele só conhece imagem/PDF e bloquearia todo docx/xlsx/txt legítimo.
- **🟡 XSS via URL persistida:** `sanitizeIncomingUrls` (`utils/photo-urls.ts`) bloqueava só `blob:`; agora também rejeita `javascript:`/`data:`/`vbscript:` em fotos/documentos. Novo helper `sanitizeSingleUrl` para campos string únicos, aplicado a `imovelService.url_documentos` (create + update) — antes persistia sem validação de protocolo.
- **🟡 PII em logs (LGPD):** `maskEmail` aplicado em `authRoutes` (handler do rate limiter de login), `emailConfigController` (envio de teste, sucesso/erro), `userController` (erro ao criar) e `requestLogger.auditLogger`.
- **Decisões (não alterado, por risco/produto):** (a) `GET /config/role-permissions` segue aberto a qualquer autenticado — o `PermissionContext` do frontend o consome para TODO papel; restringir cairia em `defaultRoles` silenciosamente. (b) `PUT /api/system-configuration` segue `admin`+`superuser` — restringir a superuser é hardening, mas envolve o toggle de busca pública (cujo PUT no frontend aponta hoje para rota inexistente); decisão de produto. (c) Rotas públicas (`listPublicDocuments`/`listPublicPatrimonios`/customization public) misturam tenants por design mono-município — corrigir exige schema (`municipalityId` em `DocumentoGeral`) ou contrato com `municipalitySlug`.
- **Verificação:** `tsc --noEmit` backend limpo; **447/447 testes Jest** (+15 no `file-validation.test.ts`, cobrindo OLE2/ZIP/texto/docx-falso).

### 2026-06-23 — Feature Fase 5: Desfazimento de inservíveis + Termos — backend
- **Schema (migration `20260623135903_add_desfazimento`):** enums `ClassificacaoInservivel` (ocioso/recuperavel/antieconomico/irrecuperavel), `ModalidadeDesfazimento` (doacao/leilao/permuta/transferencia/cessao/inutilizacao), `StatusDesfazimento`; model `Desfazimento` (FK a Patrimonio e Comissao).
- **Desfazimento (Art. 24 / Art. 13-14):** `desfazimentoService` — classifica o inservível + modalidade + laudo/justificativa; ao **concluir**, numa transação dá **baixa** no patrimônio (status=baixado, data_baixa, motivo_baixa) + HistoricoEntry (Art. 25). Bloqueia bem já baixado, duplicado em andamento, e baixar bem emprestado/em transferência (REGRAS §7). CRUD + cancelar. RBAC: leitura autenticados; escrita admin/supervisor/superuser; delete admin/superuser.
- **Termos (read-only):** `termosService.getTermo(tipo, patrimonioId)` monta os dados estruturados de **carga** (Art. 14), **incorporação** (Art. 11) e **baixa** (Art. 25) — município, bem, setor, responsável, datas, valores e texto legal — para o frontend renderizar/imprimir. `GET /api/termos/:tipo/:patrimonioId`. Termo de baixa exige bem baixado.
- **Arquivos:** `backend/prisma/schema.prisma` (+migration), `shared/src/schemas/desfazimento.ts`, `backend/src/services/{desfazimento,termos}Service.ts`, `backend/src/controllers/{desfazimento,termos}Controller.ts`, `backend/src/routes/{desfazimento,termos}Routes.ts`, `backend/src/index.ts` (mount `/api/desfazimentos`, `/api/termos`).
- **Verificação:** `tsc --noEmit` backend limpo; 432/432 testes Jest (+9). Migration aplicada no dev.
- **Frontend (concluído 2026-06-23):** `src/pages/desfazimento/DesfazimentoList.tsx` (CRUD + concluir [baixa definitiva, com AlertDialog de confirmação] + cancelar/excluir, filtros por status/classificação, RBAC: leitura todos / escrita admin·supervisor·superuser / delete admin·superuser; atalho "Termo de baixa" navega para `/termos?patrimonioId=…&tipo=baixa`); `src/pages/termos/Termos.tsx` (gera e imprime carga/incorporação/baixa via `GET /api/termos/:tipo/:id`, com CSS `@media print` que isola o documento). Rotas `/desfazimentos` e `/termos` em `App.tsx` + links em `NavContent.tsx` (admin/supervisor e usuario). **Conclui o roadmap das 5 fases** da análise das leis municipais.
- **Gotcha (build):** editar `shared/` exige `npm run build` em `shared/` **E** `corepack pnpm install` na raiz — a dep `@sispat/shared` é `file:` e o pnpm a **copia** para `.pnpm/@sispat+shared@file+…`; sem o reinstall a cópia resolvida fica velha e o `vite build` falha com "Could not resolve ./schemas/<novo>". Verificado: `tsc --noEmit` frontend limpo; `vite build` OK (chunks `DesfazimentoList`/`Termos` gerados).

### 2026-06-23 — Feature Fase 4: Inventário por tipo + Regularização — backend
- **Schema (migration `20260623133251_add_inventario_tipo_e_regularizacao`):**
  - Enums `TipoInventario` (anual/transferencia/extraordinario/inicial), `TipoOrigemBem` (origem_desconhecida/pre_existente), `StatusRegularizacao` (em_andamento/incorporado/cancelado).
  - `Inventory` ganhou `tipo` (default extraordinario), `dataBase`, `exercicio`, `agenteAnterior`, `agenteNovo`.
  - Novo model `Regularizacao` (FK opcional a Comissao e ao Patrimonio criado).
- **Inventário (Cap VII):** `inventarioService` create/update aceitam tipo/dataBase/exercício/agentes. Schema compartilhado valida que inventário **anual** exige exercício e, se houver data-base, ela deve ser **31/12** (Art. 16). Conformidade passou a checar "inventário anual de verificação concluído" (`nao_conforme` se nunca houve; `atencao` se o último é de exercício anterior ao esperado).
- **Regularização (Cap XIII / Cap IX):** `regularizacaoService` — constatação (descrição, características, estado, localização, **valor justo**, comissão, termo, fotos) + `incorporar`, que numa transação cria o Patrimônio (forma_aquisicao "Regularização", observação "regularização — bem pré-existente", valor = valorJusto, número gerado por `gerarNumeroPatrimonial` se ausente, destinacaoRevisada=true), grava HistoricoEntry e marca a regularização como `incorporado`. Bloqueia exclusão após incorporar. CRUD + cancelar. RBAC: leitura admin/supervisor/usuario; escrita admin/supervisor/superuser; delete admin/superuser.
- **Arquivos:** `backend/prisma/schema.prisma` (+migration), `shared/src/schemas/{inventario,regularizacao}.ts`, `backend/src/services/{inventario,conformidade,regularizacao}Service.ts`, `backend/src/controllers/regularizacaoController.ts`, `backend/src/routes/regularizacaoRoutes.ts`, `backend/src/index.ts` (mount `/api/regularizacoes`).
- **Verificação:** `tsc --noEmit` backend limpo; 423/423 testes Jest (+7). Migration aplicada no dev.
- **Frontend (concluído):** `src/pages/regularizacao/RegularizacaoList.tsx` (constatação + incorporar [cria patrimônio] + cancelar/excluir, RBAC); `InventoryContext.createInventory` e `InventarioCreate.tsx` estendidos com tipo de inventário + campos condicionais (anual: exercício/data-base 31/12; transferência: agentes). Rota `/regularizacoes` + link em NavContent. Build Vite OK; zero erro tsc novo.

### 2026-06-23 — Feature Fase 3: Conformidade + Conciliação contábil (SIAFI) — backend
- **Origem:** continuação da análise das leis municipais. Atende "alertas de acordo com a lei e SIAFI".
- **Schema (migration `20260623131135_add_conciliacao_contabil`):** enums `CategoriaConciliacao` (bens_moveis/bens_imoveis) e `StatusConciliacao` (conciliada/divergente); model `Conciliacao` (competencia YYYY-MM, dataBase, categoria, valorContabil informado, valorFisico calculado, divergencia, status; unique por município+competência+categoria).
- **Conciliação físico-contábil (Art. 3 II / Art. 8 V — SIAFIC):** `conciliacaoService` calcula o saldo FÍSICO (custo histórico = soma de `valor_aquisicao`; móveis excluem baixados; imóveis somam todos), compara com o saldo CONTÁBIL informado do SIAFIC e marca `divergente` se |diferença| ≥ R$0,01. Endpoints: list/get/create/`:id/recalcular`/delete. RBAC: leitura admin/supervisor/superuser, escrita admin/superuser.
- **Checklist de conformidade (read-only, computado):** `conformidadeService.getChecklist` avalia o estado atual contra a lei e devolve itens com status conforme/atenção/não-conforme + referência legal: 4 comissões instituídas/ativas com mandato vigente e ≥3 membros (Art. 19); bens com destinação revisada (Art. 6); conciliação por categoria (Art. 8 V); bens dominicais (Art. 22). `getAlertas` filtra os itens que exigem ação. Rotas `GET /api/conformidade/checklist` e `/alertas`.
- **Arquivos:** `backend/prisma/schema.prisma` (+migration), `shared/src/schemas/conciliacao.ts`, `backend/src/services/{conciliacao,conformidade}Service.ts`, `backend/src/controllers/{conciliacao,conformidade}Controller.ts`, `backend/src/routes/{conciliacao,conformidade}Routes.ts`, `backend/src/index.ts` (mount `/api/conciliacoes`, `/api/conformidade`).
- **Verificação:** `tsc --noEmit` backend limpo; 416/416 testes Jest (+13). Migration aplicada no dev.
- **Decisão de modelagem:** saldo físico usa custo histórico (valor_aquisicao), não valor líquido depreciado — documentar/ajustar quando a depreciação contábil mensal (MCASP) for refletida no backend.
- **Frontend (concluído):** `src/pages/conformidade/Conformidade.tsx` com 2 abas — Checklist (cards de resumo conforme/atenção/não-conforme + lista por categoria com referência legal + painel de alertas) e Conciliação SIAFI (tabela com divergência em destaque, criar/recalcular/excluir, valores em BRL). Rota `/conformidade` (admin/supervisor) em `App.tsx` + link em `NavContent.tsx`. Build Vite OK; zero erro tsc novo.

### 2026-06-23 — Feature: Comissões + Desafetação (Lei de Gestão Patrimonial) — backend
- **Origem:** análise da Lei e do Decreto Municipais de Gestão Patrimonial de São Sebastião da Boa Vista/PA (`Docs/analise/*.docx`). Fase 1+2 de ~6 módulos planejados.
- **Schema (migration `20260623123259_add_comissoes_e_desafetacao`):**
  - Enums: `DestinacaoBem` (uso_comum/uso_especial/dominical/nao_classificado), `TipoComissao` (inventario/avaliacao/regularizacao/desfazimento_desafetacao), `StatusComissao`, `PapelMembro`, `BaseLegalTipo`, `StatusDesafetacao`.
  - Models: `Comissao`, `ComissaoMembro` (cascade), `Desafetacao`.
  - Patrimonio/Imovel ganharam `destinacao DestinacaoBem @default(uso_especial)` + `destinacaoRevisada Boolean` (acervo existente entra como uso_especial p/ revisão — Art. 6).
- **Comissões (Art. 19 lei / Art. 8 decreto):** 4 tipos, portaria, mandato, membros (papel presidente/secretario/membro, vínculo opcional a User). CRUD multi-tenant + `GET /api/comissoes/alertas` (mandato vencido/vencendo ≤30d e < 3 membros). RBAC: leitura admin/supervisor/superuser, escrita admin/superuser.
- **Desafetação (Art. 22 lei):** fluxo bem uso_comum/especial → dominical por lei/decreto/ato. Regra central em `concluirDesafetacao`: transação que seta `destinacao=dominical` + `HistoricoEntry` (action DESAFETACAO) + invalida cache. Valida XOR patrimônio/imóvel, bloqueia bem já dominical e duplicada em andamento. Também `reclassificarDestinacao` (saneamento do acervo). RBAC escrita admin/supervisor/superuser.
- **Arquivos:** `backend/prisma/schema.prisma` (+migration), `shared/src/schemas/{comissao,desafetacao}.ts`, `backend/src/services/{comissao,desafetacao}Service.ts`, `backend/src/controllers/{comissao,desafetacao}Controller.ts`, `backend/src/routes/{comissao,desafetacao}Routes.ts`, `backend/src/index.ts` (mount `/api/comissoes`, `/api/desafetacoes`).
- **Verificação:** `tsc --noEmit` backend limpo; 403/403 testes Jest (+13 cobrindo tenant, alertas, XOR, conclusão→dominical). Migration aplicada no dev.
- **Frontend (concluído):** `src/pages/comissoes/ComissoesList.tsx` (tabela + filtros + painel de alertas de mandato/membros + dialogs de criar/editar/membros, RBAC) e `src/pages/desafetacao/DesafetacaoList.tsx` (lista + criar + concluir/cancelar/excluir, deixando claro que concluir torna o bem dominical). Rotas em `src/App.tsx` (`/comissoes` admin/supervisor; `/desafetacoes` leitura geral) e links em `src/components/NavContent.tsx`. Build Vite OK; zero erro de tsc nas telas novas.
- **Pendente (fases seguintes):** conformidade/SIAFI (conciliação físico-contábil + checklist da lei), inventário por tipo/data-base (anual 31/12, transferência, extraordinário, inicial), regularização de origem desconhecida, termos (carga/incorporação/constatação/baixa), desfazimento de inservíveis (ocioso/recuperável/antieconômico/irrecuperável).
- **Nota deploy:** rodar `prisma migrate deploy` no release. `prisma generate` no Windows pode dar EPERM (lock da DLL) — fechar processos node que seguram o engine antes de gerar.

### 2026-06-23 — Validação da CSP contra o build real do Vite (2 quebras corrigidas)
- **Contexto:** após endurecer a CSP do Nginx (commit anterior), validei contra o build de produção real (`vite build`) inspecionando `dist/index.html`, CSS e JS gerados. A CSP estrita (`default-src 'self'; script-src 'self' 'unsafe-inline'; ...`) quebraria 2 coisas:
  1. **`<link rel="preload" href="/src/main.tsx" as="script">` no `index.html`** (raiz): o Vite não reconhece esse preload manual como o entry e o converte num **`data:` URI com o código-fonte** — bloqueado por `script-src` (sem `data:`) e ainda vaza o source TS no HTML. **Correção:** removido o preload manual (o Vite já injeta `modulepreload` do entry+deps automaticamente). Build passou a ter só `<script src="/assets/...">` (self), zero `data:`, zero origens externas.
  2. **`browser-image-compression` com `useWebWorker:true`** (`src/lib/image-utils.ts`): o worker faz `importScripts('https://cdn.jsdelivr.net/...')`, bloqueado pela CSP → compressão caía no catch e subia a imagem sem comprimir. **Correção:** `useWebWorker:false` (roda o código já empacotado na main thread, sem rede externa).
- **Falso alarme verificado:** o bundle contém `https://cdnjs.cloudflare.com/.../pdfobject.min.js` — vem do **jsPDF** (modo de saída `output('pdfobjectnewwindow')`). O app só usa `doc.save()`, nunca `.output(...)`, então é dead code: a CSP não quebra nada. Não foi preciso liberar a cloudflare.
- **Resultado:** o `index.html` e os assets do build são 100% compatíveis com a CSP (tudo `self`; sem inline script; sem CDN executável). CSS sem `url()` externa; sem fontes externas. `connect-src 'self' https: wss:` cobre API same-origin, Sentry (https) e WebSocket.
- **Arquivos:** `index.html` (raiz), `src/lib/image-utils.ts`
- **Verificação:** `vite build` OK; `dist/index.html` sem `data:`/inline/externos; sem erros novos de tsc nos arquivos tocados.
- **Atenção deploy:** garantir `VITE_API_URL` same-origin (ex.: `/api`) no build de produção — o default de dev é `http://localhost:3000/api`, que além de errado em prod não passaria no `connect-src`. Validar no browser real em staging (console sem violações de CSP) ao subir.

### 2026-06-23 — Lote 🟡: cache por tenant, XSS em notificação, CSP, env fatal, logger
- **Cache cross-tenant (latente):** `CacheUtils.getPatrimoniosKey/getImoveisKey/getTransferenciasKey/getDocumentosKey` (`config/redis.ts`) faziam hash só dos filtros, SEM `municipalityId` — dois municípios com os mesmos filtros compartilhariam a entrada de cache. Agora a chave inclui o `municipalityId` (`<prefixo><mun>:<hash>`), passado pelo `middlewares/cache.ts` (`req.user.municipalityId`, superuser='all'). Invalidação por prefixo (`patrimonios:*`) continua válida. As listagens são escopadas só por município (scoping por setor é no acesso individual), então o hit rate entre usuários do mesmo município é preservado. O `defaultKeyGenerator` já era por-usuário (seguro).
- **XSS estocado via `link` de notificação:** `notificationController.createNotification` persistia `link` sem validar protocolo. Agora só aceita caminho relativo (`/x`) ou `http(s)://`; bloqueia `javascript:`/`data:`/`vbscript:`/protocol-relative (`//evil`).
- **CSP do Nginx permissiva + Referrer-Policy:** `nginx.conf` e `conf.d/sispat.conf` tinham `default-src 'self' http: https: ...` (sem `script-src` explícito → scripts de QUALQUER origem). Substituído por CSP com `default-src 'self'`, `script-src`/`style-src 'self' 'unsafe-inline'` (o `'unsafe-inline'` fica por causa do polyfill inline do build Vite; remover exige nonce), `object-src 'none'`, `frame-ancestors 'self'`, `connect-src 'self' https: wss:`. `Referrer-Policy` mudou de `no-referrer-when-downgrade` para `strict-origin-when-cross-origin`.
- **Validações de env fatais em produção (`validate-env.ts`):** `BCRYPT_ROUNDS < 12` agora é fatal (default alinhado de 10→12, igual ao hashing real); `DATABASE_URL` com senha padrão (`CHANGE_THIS`/`password`/`postgres`/`123456`) é fatal; SSL ausente é fatal só para host **remoto** (banco local/interno em docker/loopback segue como aviso, para não quebrar o stack). Corrigida a heurística bugada `dbUrl.includes('postgres') && dbUrl.includes('postgres')`.
- **`console.*` em produção nos Contexts:** 27 chamadas `console.error/warn/log` em 11 contexts (`Auth, Document, Inventory, Manutencao, Transfer, Customization, ImovelField, Patrimonio, ReportTemplate, Sector, Sync`) trocadas por `logger.*` (`src/lib/logger.ts`, que silencia fora de DEV).
- **Arquivos:** `backend/src/config/redis.ts`, `backend/src/middlewares/cache.ts`, `backend/src/controllers/notificationController.ts`, `backend/src/config/validate-env.ts`, `nginx/nginx.conf`, `nginx/conf.d/sispat.conf`, 11× `src/contexts/*.tsx`
- **Verificação:** `tsc --noEmit` backend limpo; 390/390 testes Jest. Frontend: sem erros novos de tsc nos arquivos tocados (os listados — `response: unknown`, `code` em `{}`, `updatePatrimonio` com 2 args/INC-04 — são pré-existentes).
- **Não feito (baixo valor/risco):** `$queryRawUnsafe`/`$executeRawUnsafe` em `config/metrics.ts` e `database-optimization.ts` — strings 100% estáticas, não exploráveis; o DDL dinâmico de índices não vira tagged template limpo. Backend ainda aceita Bearer (back-compat necessário ao dev cross-origin).
- **Atenção deploy:** a CSP mais estrita precisa ser validada contra o build real do frontend (Vite) em staging — se o `index.html` tiver script inline sem `'unsafe-inline'`/nonce, ajustar. Mantivemos `'unsafe-inline'` em `script-src` justamente para reduzir esse risco.

### 2026-06-23 — Auth 🟠: tokens fora do body em prod + email mascarado nos logs
- **Sintoma:** (A) `/auth/login` e `/auth/refresh` devolviam `token`/`refreshToken` no corpo JSON (back-compat) — expostos a roubo via XSS/logs de rede mesmo com cookie HttpOnly. (B) email em claro em logs: `ActivityLog` de reset (`authController`), `logDebug`/`logInfo` do fluxo de reset (`authService`) e em todo request HTTP (`requestLogger` logava `user.email`).
- **Causa-raiz:** o sistema usa cookie HttpOnly **e** fallback Bearer (localStorage). Em dev o frontend é cross-origin (`:8080`→`:3000`) e o cookie `SameSite=Lax` não é enviado, então o Bearer é necessário; em prod é mesma origem (Nginx) e o cookie funciona. Os tokens no body existiam para o caminho Bearer; faltava distinguir os ambientes.
- **Correção:**
  - Backend: `login`/`refresh` só incluem `token`/`refreshToken` no body **fora de produção** (`NODE_ENV !== 'production'`). Em prod, sessão exclusivamente por cookie HttpOnly.
  - Frontend cookie-first: `AuthContext.login` guarda tokens só se vierem; restauração de sessão não exige mais token no storage (valida via API/cookie); `logout` sempre chama `/auth/logout` (backend revoga pelo cookie em prod). `http-api`: o refresh no 401 usa `withCredentials` e não depende de token no storage; **rotas `/auth/*` são excluídas do auto-refresh** (um 401 de login deve propagar "senha incorreta", não disparar refresh+redirect).
  - PII: novo `backend/src/utils/mask.ts` (`maskEmail`: `jo***@x.gov`), aplicado no `authController` (reset), `authService` (debug/info) e `requestLogger` (`user.email`); `email` adicionado às `SENSITIVE_KEYS` do redact.
- **Arquivos:** `backend/src/controllers/authController.ts`, `backend/src/services/authService.ts`, `backend/src/middlewares/requestLogger.ts`, `backend/src/utils/mask.ts` (+ teste), `src/contexts/AuthContext.tsx`, `src/services/http-api.ts`
- **Verificação:** `tsc --noEmit` backend limpo; 390/390 testes Jest (+5 de `maskEmail`). Frontend: sem erros novos nos arquivos tocados (o `useWebSocket.ts:115` que acessa `auth.token` é erro PRÉ-EXISTENTE — a interface nunca expôs `token`).
- **Atenção para deploy:** em produção, login/refresh dependem do cookie funcionar (mesma origem via Nginx, `secure`+`SameSite`). Validar o fluxo de login/refresh/logout em staging antes do release. O backend ainda **aceita** Bearer (back-compat) — remoção é item 🟡 separado.

### 2026-06-23 — Persistência da conferência de inventário (módulo estava efêmero)
- **Sintoma:** O fluxo de inventário não gravava nada no banco. Marcar item como "encontrado/não encontrado" (`InventarioDetail.tsx`) só mexia em estado React via `InventoryContext.updateInventoryItemStatus` — não havia endpoint. `finalizeInventory` iterava o estado local e chamava `updatePatrimonio` direto (gravação dupla), e **nunca** marcava o `Inventory` como `concluido`. Ao recarregar a página, todo o progresso da conferência sumia; o inventário ficava eternamente `em_andamento`. Módulo inútil para auditoria. (INC-03 da auditoria de 2026-06-23.)
- **Causa-raiz:** os endpoints de conferência por item e de finalização nunca existiram; o frontend simulava tudo em memória.
- **Correção (backend):**
  - `PATCH /api/inventarios/:id/items/:patrimonioId` → `updateInventarioItem` persiste `InventoryItem.encontrado` + `verificadoEm`/`verificadoPor`. Exige inventário `em_andamento`; reusa guard de tenant/responsável (`loadEditableInventario`).
  - `POST /api/inventarios/:id/finalizar` → `finalizeInventario` numa transação: marca como `extraviado` os itens `encontrado=false` (pulando `baixado`/já `extraviado`), grava `HistoricoEntry` de EXTRAVIO por bem, conclui o inventário (`status='concluido'`, `dataFim`), registra `FINALIZE_INVENTORY` e invalida caches `inventarios:*` **e** `patrimonios:*`.
  - Ambas as rotas com `authorize('superuser','admin','supervisor','usuario')` (bloqueia visualizador) e zodValidate.
- **Correção (shared):** novos `updateInventarioItemSchema` e `inventarioItemParamsSchema` em `@sispat/shared` (rebuild do `dist`).
- **Correção (frontend):** `InventoryContext.updateInventoryItemStatus` agora é async — atualização otimista + `api.patch`, com revert+refetch em erro. `finalizeInventory` chama `api.post('/finalizar')`, ressincroniza os status de patrimônio localmente via `setPatrimonios` (sem chamada extra) e retorna os extraviados. `InventarioDetail.handleStatusChange` ficou async com update otimista. Removida a gravação dupla (`updatePatrimonio`) e o import morto `generateId`.
- **Arquivos:** `backend/src/services/inventarioService.ts`, `backend/src/controllers/inventarioController.ts`, `backend/src/routes/inventarioRoutes.ts`, `shared/src/schemas/inventario.ts`, `src/contexts/InventoryContext.tsx`, `src/pages/inventarios/InventarioDetail.tsx`
- **Verificação:** `tsc --noEmit` (backend) limpo; 385/385 testes Jest (+7 novos cobrindo item-update e finalização). Frontend: erros de tsc nos arquivos tocados são pré-existentes e não relacionados (o `||item.numeroPatrimonio` legado etc.).
- **Lição:** features que "funcionam na UI" mas só mexem em estado de Context são uma classe de bug recorrente neste projeto (SubPatrimonio era o último caso — **resolvido em 2026-06-23**, ver feature B2 acima) — checar sempre se há endpoint persistindo de verdade.

### 2026-06-23 — Hardening do Docker de produção + dump SQL fora do git
- **Sintoma:** A stack Docker de produção (`docker-compose.prod.yml` + `Dockerfile`) tinha vários "explode na primeira execução real": secrets default públicos, backend exposto à internet, build quebrado, Redis efetivamente desligado e healthchecks que nunca passariam. Além disso, um dump SQL real estava versionado no git.
- **Causa-raiz / correções:**
  1. **Secrets default** (`DB_PASSWORD:-CHANGE_THIS_PASSWORD`, `JWT_SECRET:-CHANGE_THIS...`, `REDIS_PASSWORD:-` vazio): trocados por `${VAR:?msg}` — a stack agora **falha ao subir** se `DB_PASSWORD`/`REDIS_PASSWORD`/`JWT_SECRET`/`FRONTEND_URL` não forem fornecidos.
  2. **Backend exposto** (`"3000:3000"` em `0.0.0.0`): alterado para `"127.0.0.1:3000:3000"` — só o Nginx (rede interna) acessa; Swagger/`/health/detailed` deixam de ser alcançáveis direto da internet.
  3. **Build do Dockerfile quebrado:** `npm ci --only=production` rodava antes de `build:prod` (`tsc && prisma generate`, ambos devDeps). Trocado por `npm ci` completo + `npm prune --production` após o build. Imagem final continua só com deps de produção (+ client Prisma gerado).
  4. **Redis ignorado/colidindo:** o compose passava só `REDIS_URL`, mas a app lê `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`/`ENABLE_REDIS` (`config/redis.ts`) → Redis ficava **desabilitado** e ainda colidiria com `--requirepass`. Agora passa as 4 vars corretas; healthcheck do Redis usa `redis-cli -a` (senão NOAUTH falharia).
  5. **Healthchecks errados:** Dockerfile/compose batiam em `/health`, mas o backend serve `/api/health`. Também o `location /health` do Nginx fazia `proxy_pass .../health` (404). Todos apontam para `/api/health` agora.
  6. **Higiene:** removido `version: '3.8'` (obsoleto no Compose v2) e Node 18→20 (alinha com o CI; Node 18 perto do EOL).
  7. **Dump SQL no git:** `backend/backups/sispat_backup_20251012_210803.sql.zip` removido do índice (`git rm --cached`, arquivo mantido em disco) e `.gitignore` passa a bloquear `backend/backups/`, `/backup/`, `*.sql.zip`, `*.dump`.
- **Arquivos:** `Dockerfile`, `docker-compose.prod.yml`, `nginx/conf.d/sispat.conf`, `.gitignore`
- **Verificação:** `docker compose -f docker-compose.prod.yml config` falha sem segredos e valida com eles; interpolação de Redis/porta/healthcheck conferida no config resolvido.
- **Pendente (não feito aqui):** purgar o dump do **histórico** do git exige reescrita + force-push em `main` (proibido por convenção) — fazer só com decisão explícita e rotação dos segredos que possam estar no dump. Deploy ainda faz `git pull && build` no servidor (sem registry/rollback). CSP do Nginx ainda permissiva.
- **Lição:** validar a stack Docker ponta-a-ponta (`compose config` + subir) a cada mudança; o deploy real vinha dependendo do `install.sh` nativo, então o compose acumulou drift.

### 2026-06-23 — Dois vazamentos multi-tenant residuais fechados
- **Sintoma:** Auditoria multi-tenant encontrou 2 vazamentos reais ainda abertos após as correções de 2026-06-22:
  1. `auditLogController.cleanupOldLogs` fazia `activityLog.deleteMany({ where: { createdAt: { lt: cutoff } } })` SEM filtro de município — um `admin` (autorizado na rota `DELETE /api/audit-logs/cleanup`) apagava logs de auditoria de TODOS os municípios.
  2. `imovelFieldController.createImovelField` gravava `municipalityId: '1'` hardcoded, ignorando `req.user.municipalityId` — campos personalizados de imóveis de qualquer tenant iam para o município `'1'`.
- **Causa-raiz:** funções escritas no modo "município único" (`MUNICIPALITY_ID='1'`) que escaparam da varredura anterior; `cleanupOldLogs` nunca recebeu o guard de tenant aplicado às outras funções do mesmo controller (`listAuditLogs`/`getAuditLogStats` já filtravam).
- **Correção:** `cleanupOldLogs` agora monta `where` com `user: { municipalityId }` para não-superuser (superuser segue limpando tudo). `createImovelField` deriva o `municipalityId` do token (superuser pode informar no body; a rota só permite `supervisor`/`admin`, que sempre têm município). As demais funções de `imovelFieldController` (list/update/delete/reorder) já estavam corretas.
- **Arquivos:** `backend/src/controllers/auditLogController.ts` (cleanupOldLogs), `backend/src/controllers/imovelFieldController.ts` (createImovelField)
- **Verificação:** `tsc --noEmit` limpo; 378/378 testes Jest passam.
- **Lição:** buscar `'1'` hardcoded e `deleteMany`/`updateMany` sem `where` de tenant ao auditar multi-tenancy — esses dois padrões são os pontos cegos mais comuns. Resta latente: `cacheMiddleware` genérico em `redis.ts` chaveia por URL sem `municipalityId`.

### 2026-06-23 — RBAC nas rotas: `admin` bloqueado e `visualizador` com escrita
- **Sintoma:** Auditoria de todas as rotas por papel revelou duas falhas de RBAC no backend:
  1. O papel `admin` (gestor do município) **não estava** nos `authorize()` das operações de escrita de patrimônio, imóvel, usuários, setores, locais, tipos de bens e formas de aquisição. O frontend exibia os botões (via `PermissionContext`), mas toda chamada retornava 403 — papel mais administrativo praticamente inoperante.
  2. As rotas de **inventário** (`POST`/`PUT`) e **manutenção** (`POST`/`PUT`/`DELETE`) não tinham nenhum `authorize()`. Qualquer autenticado, incluindo `visualizador` (somente leitura), podia criar/editar/excluir via API direta (a UI escondia os botões, mas a barreira real faltava).
  3. Adjacente: `superuser` estava fora da leitura de audit-logs (`GET /` e `/stats`).
- **Causa-raiz:** `authorize()` não tem bypass implícito para `admin`/`superuser` — valida `allowedRoles.includes(req.user.role)` estritamente. As listas de papéis foram montadas sem `admin` e algumas rotas novas (inventário/manutenção em zodValidate) nasceram sem guard de papel.
- **Correção:** alinhado o `authorize()` de todas as rotas ao modelo de `REGRAS_NEGOCIO.md §2`. `admin` incluído em todas as escritas de seu escopo; inventário/manutenção passam a exigir `superuser/admin/supervisor/usuario` (create/update) e `superuser/admin/supervisor` (delete), bloqueando `visualizador`; `superuser` incluído na leitura de audit-logs.
- **Arquivos:** `backend/src/routes/{patrimonioRoutes,imovelRoutes,userRoutes,sectorsRoutes,locaisRoutes,tiposBensRoutes,formasAquisicaoRoutes,inventarioRoutes,manutencaoRoutes,auditLogRoutes}.ts`
- **Verificação:** `tsc --noEmit` limpo; 378/378 testes Jest passam.
- **Lição:** toda rota de escrita precisa de `authorize()` explícito; gerar uma matriz rota×papel e confrontar com `REGRAS_NEGOCIO.md` ao adicionar rotas. Pendências relacionadas ainda abertas: vazamento multi-tenant em `auditLogController.cleanupOldLogs` e `imovelFieldController` (`municipalityId:'1'` hardcoded), e o módulo de inventário que não persiste a conferência.

### 2026-06-22 — Ambiente dev: subir banco + credenciais de demonstração
- **Sintoma:** `npm run dev` (backend) crashava em `Can't reach database server at localhost:5432`; depois o frontend (Vite) quebrava com `Failed to resolve import "@sentry/react"` e o `node_modules` do front estava incompleto (`node_modules/vite` vazio).
- **Causa-raiz:**
  1. Não havia PostgreSQL na máquina (sem Docker/Postgres nativo). Além disso, o `backend/docker-compose.yml` criava o banco `sispat_db` enquanto o `.env` aponta para `sispat_dev` (mismatch).
  2. `@sentry/react` é dep opcional; o `/* @vite-ignore */` com **string literal** não é confiável (o transform TS→JS reposiciona o comentário e o `vite:import-analysis` volta a tentar resolver o literal).
  3. Lockfile do front (`pnpm-lock.yaml`) desatualizado (faltava `@sispat/shared@file:./shared`); `node_modules` quebrado.
- **Correção:**
  - Docker Desktop + `docker compose up -d` (postgres:15-alpine), `prisma migrate deploy` + `prisma generate` + `prisma:seed`. Alinhado `POSTGRES_DB: sispat_dev` no `backend/docker-compose.yml`.
  - `pnpm install` (via corepack) recriou o `node_modules` e atualizou o `pnpm-lock.yaml`.
  - `src/lib/sentry.ts`: especificador do dynamic import movido para **variável** (`const sentryPkg = '@sentry/react'`) → não-analisável estaticamente, Vite/Rollup não tentam resolver. Reforço: `optimizeDeps.exclude: ['@sentry/react']` no `vite.config.ts`.
  - **Credenciais de demonstração:** novo `backend/src/prisma/seed-demo.ts` (script `prisma:seed:demo`) cria 1 usuário por papel (`superuser/admin/supervisor/usuario/visualizador @sispat.demo`, senha `Demo@2025`). Card de 1 clique em `src/components/auth/DemoCredentials.tsx` ligado no `Login.tsx`, **gated** por `import.meta.env.DEV || VITE_DEMO_MODE === 'true'` (nunca em produção real).
  - Removido `package-lock.json` residual da raiz (projeto usa pnpm).
- **Arquivos:** `backend/docker-compose.yml`, `vite.config.ts`, `src/lib/sentry.ts`, `backend/src/prisma/seed-demo.ts`, `backend/package.json`, `src/components/auth/DemoCredentials.tsx`, `src/pages/auth/Login.tsx`, `package-lock.json` (removido).
- **Lição:** import dinâmico opcional no Vite deve usar especificador em variável, não `@vite-ignore` em literal. Credenciais de demo sempre atrás de flag de ambiente. Manter um único gerenciador de pacotes (pnpm) — nada de `package-lock.json` paralelo.

### 2026-06-22 — Médio prazo: começa a quebra do god-controller configController
- **Contexto:** `configController.ts` (~975 linhas, 9 domínios) é um god-controller (0% de teste). Abordagem segura: testes de caracterização PRIMEIRO, depois extrair domínio por domínio para `services/`, verificando que os testes seguem verdes.
- **1º domínio extraído — Excel/CSV Templates:** lógica/queries dos 4 endpoints (list/create/update/delete) movidas para `services/excelCsvTemplateService.ts` (padrão Actor + erro de domínio `ExcelCsvTemplateNotFoundError` mapeado a 404 no controller). Controller ficou fino (guard 401 + delegação + mapeamento de erro). `prisma` importado de `'../index'` (mesma instância — preservar comportamento; unificar p/ config/database é tarefa à parte).
- **Rede de proteção:** os testes existentes de `tenantIsolation` (que exercem `getExcelCsvTemplates`/`deleteExcelCsvTemplate` no controller) **continuaram verdes** após a extração — prova de que o comportamento foi preservado. +7 testes de caracterização do service. Suíte: 347 verdes, tsc 0, lint 0.
- **CONCLUÍDO (9/9 domínios):** ExcelCsv, FormFieldConfig, CloudStorage, UserReportConfig, RolePermission, NumberingPattern, UserDashboard, ReportTemplate (complexo: layout/isDefault/erros 404-403-400-409), ImovelReportTemplate — todos em `services/`. `configController` foi de ~975 para **622 linhas** com **ZERO chamadas Prisma diretas** (orquestração pura). +30 testes de caracterização. `tenantIsolation` seguiu verde em cada batch. 378 testes, tsc 0, lint 0. Padrão replicável aos demais controllers legados.

### 2026-06-22 — Médio prazo: numero_patrimonio único POR MUNICÍPIO (multi-tenant)
- **Sintoma:** `numero_patrimonio` era `@unique` GLOBAL (linhas 180/246 do schema) — contradiz a regra "único por município" e bloqueia o 2º município de reusar numeração. Pior: a GERAÇÃO de número era sequencial GLOBAL — o 1º bem do município B continuaria a sequência do A. Bug latente de multi-tenant.
- **Correção (schema + migration):** `@@unique([municipalityId, numero_patrimonio])` em Patrimonio e Imovel (mantido o `@@index([numero_patrimonio])` de busca). Migration `20260622000000_numero_patrimonio_unique_per_municipality` (DROP do unique global + CREATE do composto, em ambas as tabelas).
- **Correção (código):** `gerarNumeroPatrimonial`/`gerarNumeroImovel` agora recebem `municipalityId` e escopam a sequência (startsWith) E a checagem de colisão por município. `getByNumero`/`getImovelByNumero` e os dup-checks de `createPatrimonio`/`createImovel` migrados de `findUnique({ numero })` para `findFirst` escopado por município (tsc apontou os 5 pontos). Controllers passam `req.user.municipalityId`.
- **Testes:** `gerarNumero` e `getByNumero` reescritos (collision/lookup agora via findFirst escopado). 340 testes verdes, tsc 0, lint 0.
- **⚠️ Migration NÃO aplicada aqui (sem banco):** aplicar com `prisma migrate deploy`. Pré-requisito: nenhum `numero_patrimonio` duplicado ENTRE municípios (seguro em modo município único).
- **Pendência (follow-up):** lookup público por número (consulta pública) fica ambíguo em multi-município (mesmo número em 2 municípios) — é design da rota pública, fora deste escopo.

### 2026-06-22 — Frente "PRÓXIMAS SEMANAS": ops, infra e guardrail multi-tenant
- **Graceful shutdown real** (`index.ts`): SIGINT/SIGTERM agora param de aceitar conexões (`httpServer.close`), drenam as em voo, fecham websocket, param o health-monitor (novo `stop()`), fecham Redis (`closeRedis`) e Prisma, com timeout de segurança de 15s. Antes só `prisma.$disconnect()` → cortava requisições em voo no rollout.
- **Retenção de logs agendada:** `logRetention.archiveOldLogs` agora roda via `setInterval` 24h em produção (antes existia mas nunca era agendado → `activityLog` crescia indefinidamente).
- **Infra:** Postgres/Redis no `docker-compose.prod.yml` passaram a bindar em `127.0.0.1` (antes `0.0.0.0` expunha banco/cache à rede do servidor); a app acessa via rede interna.
- **Guardrail multi-tenant:** `authenticateToken` ganhou uma checagem não-mutante que bloqueia (403) qualquer não-superuser que tente operar em município diferente do JWT via `body`/`params.municipalityId` — defesa-em-profundidade para controllers futuros, sem injetar nada no body (não interfere com schemas Zod strict). Coberto por `authGuardrail.test.ts` (5 casos).
- **Verificação:** 340 testes verdes, tsc 0, lint 0 errors.
- **Pendência (não feita — script não-testável):** `scripts/backup-sispat.sh` ainda inclui `.env` (com segredos) em tarball não-criptografado. Encriptar o backup ou excluir o `.env` exige testar o ciclo backup/restore — recomendado fazer com acesso ao servidor.

### 2026-06-22 — Frente "AGORA" da avaliação E2E: CI lint, deploy.yml e schema único
- **Sintoma:** (1) `npm run lint` do backend saía com exit 1 (9 errors → CI vermelho); (2) `deploy.yml` referenciava `Dockerfile.prod`/`Dockerfile.frontend.prod` inexistentes e fazia `docker-compose pull` de imagens que o compose monta via `build:` → deploy automatizado quebrado e sem gate de backend; (3) dois `schema.prisma` divergentes.
- **Correção CI lint:** os 9 errors eram 7× `@ts-ignore` (convertidos para `@ts-expect-error` com descrição — as linhas erram de verdade por causa do modelo fantasma `emailConfig`) e 2× `no-namespace` na augmentação idiomática do Express (`declare global { namespace Express }` — habilitado `allowDeclarations: true` no eslint.config). Resultado: **0 errors** (152 warnings não falham o CI), tsc 0.
- **Correção deploy.yml:** removido o job `build-and-push` (Dockerfiles inexistentes; o compose builda local). O gate `test` agora roda lint+type-check+test+build do **backend** (333 testes verdes) além do frontend, node 20 + `npm ci`. O deploy passou a buildar no servidor (`docker-compose up -d --build`), alinhado ao `build:` do compose.
- **Schema único:** o canônico é `backend/prisma/schema.prisma` (36 models — local padrão do Prisma, casa com as migrations e o client gerado, tem campos de licitação). O `backend/src/prisma/schema.prisma` (26 models) era **stale e ativamente errado** (modelo fantasma `EmailConfig` que NÃO existe no client nem em migration, e faltando 11 models reais). Removido (git preserva o histórico). CLAUDE.md atualizado. `src/prisma/seed.ts` preservado.
- **⚠️ Pendência de reconciliação:** `emailConfigController`/`config/email.ts` usam `prisma.emailConfig`, que NÃO existe no client gerado (suprimido por `@ts-expect-error`) — feature de e-mail provavelmente quebrada. Resolver com `prisma db pull` contra o banco real para verificar se há tabela órfã e regenerar o client. **Lição:** nunca manter dois `schema.prisma`; o Prisma usa só o do local padrão (`prisma/`).

### 2026-06-22 — Auditoria automatizada (workflow multi-agente): 61 achados corrigidos
- **Contexto:** workflow `sispat-audit-fix` (auditores multi-tenant/segurança/higiene em paralelo + fixer em série, com test-gating) rodou 2 rodadas, 69 agentes. Derrubou a premissa de que os services migrados eram seguros.
- **Críticos (segurança):**
  - **IDOR cross-tenant no núcleo** — `patrimonioService` (`getById`, `getByNumero`, `update`, `delete`, `registrarBaixa`, `addNote`): `ensureSectorAccess` NÃO comparava `municipalityId`, então admin/supervisor de um município liam/editavam/deletavam/baixavam bens de outro. Guard de tenant adicionado (404, não vaza existência; superuser bypassa).
  - **Mass-assignment → fuga de tenant** — `patrimonioService.parseUpdateData` usava deny-list sem `municipalityId`/`sectorId`; trocado por allow-list `UPDATABLE_FIELDS`.
  - **Escalada de privilégio** — `userController`: supervisor podia criar/promover para superuser/admin. Corrigido com hierarquia `ROLE_RANK`.
  - **IDOR** em `labelTemplateController` (getById/update/delete), `imovelFieldController` (list/update/delete/reorder + mass-assignment) e `documentController` (listDocuments + getById/download/update/delete).
  - **Bypass de upload** em `documentController`: regex não-ancorada aceitava `x.php.pdf`; endurecido (extensão ancorada + MIME exato).
- **Higiene:** 22× `console.*` → logger Winston; 6× `any` → tipos `Prisma.*` nos controllers.
- **Validação:** `zodValidate` em 5 rotas (config, emailConfig, fichaTemplates, imovelField, systemConfig) + 5 schemas em `@sispat/shared`.
- **Infra:** `backend/node_modules/zod` e `cookie-parser` estavam VAZIOS (install quebrado) — causa raiz dos erros "Cannot find module" no tsc/ts-jest. Reparado com `npm install` (cookie-parser ^1.4.6→1.4.7). Resultado: tsc 0 erros, jest 332 testes passando (só `health/ready` e `patrimonio.test.ts` falham, ambos precisam de DB/Redis).
- **Bug do próprio workflow corrigido na revisão:** teste `fichaTemplatesValidation` quebrava por dependência circular (importava schema de dentro do controller, que puxava `../index`); resolvido mockando `../index`.
- **Commits:** 3 (fix segurança / chore higiene / feat validação). **Lição:** rodar a automação NÃO dispensa revisão humana — os achados críticos foram verificados adversarialmente e um bug do fixer foi pego antes do commit.

### 2026-06-22 — Hardening: mass-assignment, PII em logs e unicidade por município
- **Sintoma:** (1) `updateManutencaoTask` e `updateSystemConfiguration` passavam `req.body` inteiro ao Prisma (mass-assignment — permitia injetar/alterar campos arbitrários, inclusive reatribuir `patrimonioId` cruzando tenant). (2) `requestLogger`/`auditLogger` gravavam `req.body` e `req.query` sem redação (senha/token iam para `logs/`). (3) `seed.ts` imprimia senhas em texto puro no stdout (visível em logs de PM2/CI). (4) Checagem de nome duplicado em `create` de tipoBem/forma/setor era global, não por município.
- **Correção:** (1) Whitelists explícitas de campos atualizáveis em ambos os controllers. (2) Helper `redactSensitive` (recursivo, chaves password/senha/token/secret/etc → `[REDACTED]`) aplicado a `body`/`query` nos logs. (3) `maskPassword` no seed: nunca ecoa senha de env nem nada em produção; em dev mostra só a senha PADRÃO. (4) Unicidade escopada por `municipalityId`.
- **Testes:** suíte de hardening (3 casos) somada à de tenant — 21 casos, todos passando. Backend: 99 passam, 0 regressões.
- **Arquivos:** `backend/src/controllers/{manutencaoController,systemConfigController,tiposBensController,formasAquisicaoController,sectorsController}.ts`; `backend/src/middlewares/requestLogger.ts`; `backend/src/prisma/seed.ts`; `backend/src/__tests__/controllers/tenantIsolation.test.ts`
- **Lição:** Reutilizar o padrão de whitelist do `customizationController` (`ALLOWED_FIELDS`) em todo handler que aceita `req.body`. Rodar o agente `security-auditor` antes de declarar pronto.

### 2026-06-22 — Vazamento multi-tenant em controllers "estilo config"
- **Sintoma:** Endpoints de listagem retornavam dados de TODOS os municípios, sem filtro por `municipalityId`. Latente porque a app roda hoje em modo município único, mas expõe dados entre prefeituras assim que um 2º município for cadastrado.
- **Causa-raiz:** Controllers não migrados para o padrão `Actor`/service (tiposBens, formasAquisicao, sectors, locais, manutencao, auditLog) faziam `findMany` sem `where: { municipalityId }`. O `configController` usava `const MUNICIPALITY_ID = '1'` hardcoded em 15 pontos (templates, numbering, cloud storage), ignorando o usuário autenticado.
- **Correção (listagens):** Filtro por `municipalityId` adicionado com bypass de `superuser` em cada listagem (relação `patrimonio`/`imovel` na manutenção; relação `user` no audit log). `MUNICIPALITY_ID` removido — todos os handlers do `configController` agora derivam `req.user.municipalityId` + guard 401.
- **Correção (IDOR por id):** `getById`/`update`/`delete` de `tipoBem`, `acquisitionForm`, `sector`, `local` migrados de `findUnique({ id })` para `findFirst({ id, municipalityId })` (superuser bypassa); acesso cruzado retorna 404 sem vazar existência. `manutencaoTask` (sem `municipalityId` direto) usa pré-checagem por relação antes de update/delete. `excelCsvTemplate`/`formFieldConfig`/`imovelReportTemplate` ganham pré-checagem de propriedade. `createLocal` passou a validar que o setor pertence ao município.
- **Testes:** Nova suíte de "tenant negativo" — 18 casos (listagens + IDOR por id), todos passando. Suíte do backend: 96 passam, 0 regressões.
- **Arquivos:** `backend/src/controllers/{configController,tiposBensController,formasAquisicaoController,sectorsController,locaisController,manutencaoController,auditLogController}.ts`; `backend/src/__tests__/controllers/tenantIsolation.test.ts`
- **Lição:** A garantia "TODA query filtra municipalityId" do CLAUDE.md valia só nos controllers migrados. Rodar o agente `multitenancy-guard` (`.claude/agents/`) antes de declarar isolamento completo. Ver memória `tenant-isolation-two-cohorts`.

### 2026-05-12 — Sprint 21: shared schemas para 9 domínios operacionais

Continuação da Sprint 20. Mais 9 domínios migrados para `@sispat/shared`: inventario, transfer, manutencao, notification, customization, document, labelTemplate, formaAquisicao, emprestimo. `validation.ts` agora só tem patrimonio + imovel + queryValidations.

**Schemas novos em `shared/src/schemas/`**

- `inventario.ts`: `inventarioScopeSchema` (sector/location/specific_location), `inventarioStatusSchema` (em_andamento/concluido/cancelado), `createInventarioSchema`, `updateInventarioSchema` (strict).
- `transfer.ts`: `createTransferSchema` (patrimonioId UUID + setores + motivo + dataTransferencia ISO), `approveTransferSchema` e `rejectTransferSchema` strict.
- `manutencao.ts`: 3 enums tipados (`manutencaoTipoSchema`: preventiva/corretiva/preditiva; `manutencaoPrioridadeSchema`: baixa/media/alta/urgente; `manutencaoStatusSchema`: pendente/em_andamento/concluida/cancelada), create/update com `z.coerce.number()` no custo. XOR patrimonioId/imovelId fica no controller (mais semântico que refine).
- `notification.ts`: `createNotificationSchema` (userId opcional UUID, link opcional). Controller força `userId = req.user.userId` para não-admin (anti-spoof).
- `customization.ts`: `saveCustomizationSchema` cobrindo os 22 campos visuais. NÃO usa `.strict()` (controller já tem ALLOWED_FIELDS + isSafeUrl para descartar extras silenciosamente).
- `document.ts`: `createDocumentSchema` (campos textuais do multipart), `updateDocumentSchema` strict. `publico` usa `z.coerce.boolean()` para aceitar 'true'/'false' do multipart.
- `labelTemplate.ts`: `labelUnitSchema` (mm/cm/in), `elementos: z.array(z.unknown())` (JSON livre, validar profundamente amarraria backend a formato de UI).
- `formaAquisicao.ts`: create/update simples com ativo opcional.
- `emprestimo.ts`: `createEmprestimoSchema` (com setor/motivo opcionais que o express-validator antigo não tinha), `devolverEmprestimoSchema` strict.

**Rotas migradas (9 arquivos, ~30 endpoints)**

inventarioRoutes, transferRoutes, manutencaoRoutes, notificationRoutes, customizationRoutes, documentRoutes, labelTemplateRoutes, formasAquisicaoRoutes, emprestimoRoutes.

Padrão consistente do Sprint 20 mantido:
```ts
router.get('/', zodValidate({ query: paginationQuerySchema }), ctrl);
router.get('/:id', zodValidate({ params: uuidParamSchema }), ctrl);
router.post('/', authorize(...), zodValidate({ body: createXSchema }), ctrl);
router.put('/:id', authorize(...), zodValidate({ params: uuidParamSchema, body: updateXSchema }), ctrl);
router.delete('/:id', authorize(...), zodValidate({ params: uuidParamSchema }), ctrl);
```

`customizationRoutes` mantém só PUT (sem CRUD completo). `transferRoutes` tem 2 ações PATCH (`/approve`, `/reject`) com schemas dedicados. `emprestimoRoutes` tem `POST /:id/devolver`. `manutencaoRoutes` deixou `GET /` sem validação (controller faz seu próprio paginate — pendência menor).

**Limpeza de `validation.ts`**

Removidos 9 blocos de validação. `validation.ts` reduziu de **814 → 383 linhas** (-431 linhas, -53%). Total acumulado desde Sprint 19: **1066 → 383** (-683, -64%). Restam só:
- `handleValidationErrors` (compat com patrimonio/imovel ainda usando express-validator)
- `patrimonioValidations` (152 linhas — Sprint 22)
- `imovelValidations` (158 linhas — Sprint 22)
- `queryValidations.pagination` (idem)

**Bug pré-existente encontrado em manutencaoRoutes**

`GET /api/manutencoes` não tinha validação de query e o controller também não validava — qualquer query passava. Mantido como está nesta sprint (escopo: só migração, não adicionar regras). Pode ser endereçado em Sprint 22+ junto com paginação consistente.

**Testes**

34 novos em `backend/src/__tests__/shared/operationalSchemas.test.ts` cobrindo todos os 9 domínios. Foco em pontos onde Zod adiciona valor real: enums tipados, coerce numérico (custo, largura), coerce boolean ('true'/'false' do multipart), strict mode.

Resultado: **151/151 testes backend passam** (117 anteriores + 34 novos).

**Métrica acumulada**

| | Sprint 18 (antes) | Sprint 19 | Sprint 20 | Sprint 21 |
|---|--:|--:|--:|--:|
| `validation.ts` (linhas) | 1066 | 1066 | 814 | 383 |
| Schemas em `@sispat/shared` | 0 | 8 (auth) | 21 | 50+ |
| Domínios usando Zod no backend | 0 | 1 (auth) | 5 (+user+sector+local+tipoBem) | 14 (+9) |
| Testes de schemas/zod | 0 | 10 | 38 | 72 |
| Testes backend totais | ~75 | 89 | 117 | 151 |

**Frontend (deferido)**

Mesmas pendências do Sprint 20 (TipoBemManagement, etc.). Sprint 22 deve atacar patrimonio/imovel — esses TÊM Zod schemas no frontend e a migração inclui as 2 lâminas (backend route + frontend forms `BensCreate`/`BensEdit`/`ImoveisCreate`/`ImoveisEdit`).

- **Lição:** Zod ganha quando há enums e tipos numéricos/booleanos chegando como string (query, multipart). O `z.coerce` elimina o boilerplate de `parseInt(req.query.page as string)` espalhado pelos controllers — agora o middleware já entrega valores tipados.

### 2026-05-12 — Sprint 20: shared schemas para user + sector + local + tipoBem

Expansão do padrão `@sispat/shared` (Sprint 19) para 4 domínios de configuração: usuários, setores, locais e tipos de bens. Quatro rotas backend migradas do `express-validator + handleValidationErrors` para `zodValidate + schema do @sispat/shared`.

**Mesma divergência da Sprint 19, agora em users**

`userValidations.create` exigia min 8 chars + símbolo. `userController.createUser:141-149` exigia min 12 chars + símbolo. Mesmo problema do auth: o middleware aceitava o que o controller depois rejeitava. Consolidado no shared via `createUserSchema` que reusa `STRONG_PASSWORD_REGEX` do `@sispat/shared`. Removidas as 16 linhas de validação hardcoded em `userController.createUser` — agora redundante.

**Novos schemas em `shared/src/schemas/`**

- `common.ts`:
  - `uuidParamSchema` — valida `{ id }` UUID. Reutilizável em qualquer rota com path param `:id`.
  - `paginationQuerySchema` — `page`/`limit`/`search`/`sortBy`/`sortOrder` opcionais, com `z.coerce.number()` (query string vira inteiro).
- `user.ts`:
  - `userRoleSchema` — `z.enum(['superuser', 'admin', 'supervisor', 'usuario', 'visualizador'])`. Fonte única do enum de papéis (antes vivia hardcoded em 4+ lugares).
  - `createUserSchema` — name + email + senha forte + role + responsibleSectors opcional.
  - `updateUserSchema` — strict (rejeita campos extras), todos opcionais, **não aceita password** (fluxo dedicado existe em /auth/change-password).
- `sector.ts`: create/update com nome+codigo (regex uppercase) + campos descritivos opcionais (sigla, endereco, cnpj, responsavel, parentId UUID).
- `local.ts`: create/update com nome + descricao + sectorId UUID obrigatório no create, opcional no update.
- `tipoBem.ts`: create/update com nome + descricao + vidaUtilPadrao (1-100) + taxaDepreciacao (0-100) com `z.coerce` para aceitar strings da query.

**Rotas migradas**

`userRoutes`, `sectorsRoutes`, `locaisRoutes`, `tiposBensRoutes` — 5 endpoints cada (list/getById/create/update/delete). Total: 20 endpoints. Padrão consistente:
```ts
router.get('/', zodValidate({ query: paginationQuerySchema }), ctrl);
router.get('/:id', zodValidate({ params: uuidParamSchema }), ctrl);
router.post('/', authorize(...), zodValidate({ body: createXSchema }), ctrl);
router.put('/:id', authorize(...), zodValidate({ params: uuidParamSchema, body: updateXSchema }), ctrl);
router.delete('/:id', authorize(...), zodValidate({ params: uuidParamSchema }), ctrl);
```

**Limpeza de `validation.ts`**

Removidos blocos `userValidations`, `sectorValidations`, `localValidations`, `tipoBemValidations` (~245 linhas). `validation.ts` reduziu de **1066 → 814** linhas (-252). Restam: patrimonio, imovel, inventario, transfer, manutencao, notification, customization, document, labelTemplate, formaAquisicao, emprestimo, queryValidations.

**Testes**

28 testes novos em `backend/src/__tests__/shared/sharedSchemas.test.ts`:
- common: UUID válido/inválido, paginação com coerce + clamps.
- user: 5 papéis válidos, senha 8 chars rejeitada, senha forte aceita, update strict rejeitando campos extras.
- sector: codigo uppercase obrigatório, parentId UUID, strict update.
- local: sectorId UUID obrigatório no create.
- tipoBem: vidaUtilPadrao inteiro 1-100, taxaDepreciacao 0-100, coerce de strings.

Resultado: **117/117 testes backend passam** (89 do Sprint 19 + 28 novos).

**Frontend (deferido)**

`src/pages/Admin/TipoBemManagement.tsx` tem schema Zod próprio com limites mais restritivos (nome max 50 vs 100 do backend, descricao max 200 vs 500) e campo `ativo` que não vai para o backend. Reconciliação dessas divergências fica para Sprint 21 (junto com migração de patrimonio/imovel que têm schemas mais complexos).

**Métrica**

| | Antes | Depois |
|---|------:|------:|
| Lugares com enum de role | 4+ | 1 (`userRoleSchema`) |
| `validation.ts` (linhas) | 1066 | 814 |
| Schemas Zod compartilhados | 8 (auth) | 21 (auth + common + user + sector + local + tipoBem) |
| Testes shared | 10 | 38 |

- **Lição:** quando um middleware aceita o que o controller depois rejeita, a culpa é da divergência de regra — não do controller. Centralizar primeiro, depois pode-se até remover validações hardcoded duplicadas.

### 2026-05-12 — Sprint 19: schemas Zod compartilhados frontend↔backend (PoC auth)

Endereçando o item **P2 #13** do PLANO_CORRECOES (e pendência reconhecida desde o Sprint 16). Frontend usava Zod nas páginas, backend usava `express-validator` em `middlewares/validation.ts` — duas árvores de regras em paralelo, com divergências reais.

**Divergência crítica encontrada na auditoria**

Regra de senha forte vivia em 4 lugares com 3 versões diferentes:
- `backend/src/middlewares/validation.ts:566` exigia min 8 chars + lower/upper/digit (sem símbolo).
- `backend/src/services/authService.ts:44` exigia min 12 + lower/upper/digit/símbolo.
- `backend/src/controllers/userController.ts:141-149` idem (12 + símbolo).
- `src/pages/auth/ResetPassword.tsx:34` idem (12 + símbolo).

Resultado: usuário podia digitar `Abcd1234` e passar pela validação do middleware, mas depois receber 400 do service. UX confusa, e mais grave: prova de que a regra de segurança não tinha fonte única — qualquer um dos 4 lugares podia drift sem ninguém notar.

**Arquitetura nova: pacote `@sispat/shared`**

Criado `shared/` na raiz do repo como pacote `file:` (não-publicado), com TypeScript próprio compilado para `shared/dist/`. Backend e frontend consomem via:
```jsonc
// backend/package.json + package.json (frontend)
"dependencies": {
  "@sispat/shared": "file:../shared"   // backend
  "@sispat/shared": "file:./shared"    // frontend
}
```

Estrutura:
```
shared/
  package.json        # name: @sispat/shared, build: tsc → dist/
  tsconfig.json       # types: [], typeRoots: [] para isolamento
  src/
    index.ts          # re-export central
    rules/
      password.ts     # STRONG_PASSWORD_REGEX + constants + isStrongPassword()
    schemas/
      auth.ts         # login, refresh, changePassword, forgotPassword,
                      # resetPassword, resetPasswordForm (com confirmação),
                      # validateResetTokenParams
```

**Backend: middleware `zodValidate`**

Novo `backend/src/middlewares/zodValidate.ts` aceita `{ body, params, query }` schemas e responde no mesmo formato legado:
```json
{ "error": "Dados inválidos", "details": [{ "field": "email", "message": "..." }] }
```

Em sucesso, **substitui `req.body`/`params`/`query` pela versão parseada** — defaults e coerções do Zod são aplicados antes do controller ver o payload. Mantém `express-validator` válido em rotas ainda não migradas (migração incremental).

**Migração de auth — backend**

`backend/src/routes/authRoutes.ts`: 6 rotas migradas de `authValidations.X + handleValidationErrors` para `zodValidate({ body|params: X })`. `authValidations` removido de `validation.ts` (única referência).

**Migração de auth — frontend**

3 páginas migradas para importar de `@sispat/shared`:
- `src/pages/auth/Login.tsx` — usa `loginSchema` + tipo `LoginInput`.
- `src/pages/auth/ForgotPassword.tsx` — usa `forgotPasswordSchema` + tipo `ForgotPasswordInput`.
- `src/pages/auth/ResetPassword.tsx` — usa `resetPasswordFormSchema` (versão com `confirmPassword` + refine de igualdade) + tipo `ResetPasswordFormValues`.

Schema local foi deletado em cada uma. Type-check feito via leitura porque o `node_modules/` do frontend estava incompleto neste ambiente (pre-existente, não causado pelo Sprint 19).

**Testes**

10 testes novos em `backend/src/__tests__/middlewares/zodValidate.test.ts`:
- Validação de body/params/query.
- Formato de erro legado preservado.
- `req.body` substituído pelo parseado (defaults aplicados).
- Erros de body+params+query agregados num único response.
- Schemas reais do `@sispat/shared` espelham regra forte (rejeitam Abcd1234, aceitam Abcd1234!XyZ).
- `STRONG_PASSWORD_REGEX` testado direto (rejeita <12 chars, rejeita sem símbolo).

Resultado: **89/89 testes passam** (61 existentes + 10 zodValidate + 18 de health/services etc).

**Setup do dev env (linking manual)**

Como o user está num ambiente sem acesso à `registry.npmjs.org` (SSL cert issues), o `npm install` no backend e `pnpm install` no frontend não rodaram localmente. As deps de `@sispat/shared` foram linkadas manualmente via junction do Windows:
```powershell
New-Item -ItemType Junction -Path backend/node_modules/@sispat/shared -Target shared
New-Item -ItemType Junction -Path node_modules/@sispat/shared -Target shared
New-Item -ItemType Junction -Path backend/node_modules/zod -Target shared/node_modules/zod
```

Em ambientes com acesso à registry, basta rodar `pnpm install` (root) e `npm install` (backend) — `file:../shared` resolve automaticamente. **Pre-build do shared é necessário**: `cd shared && npm install && npm run build` antes do install dos consumers.

**Próximos passos (Sprint 20+)**

PoC completo. Para expandir o padrão:
- Migrar `imovelValidations`, `userValidations`, `patrimonioValidations` para Zod compartilhado (cada um tem ~80-150 linhas em `validation.ts`).
- Mover o `patrimonioSchema.ts` do frontend para `shared/schemas/patrimonio.ts` (já é Zod, só precisa relocar + alinhar com o backend).
- Eventualmente esvaziar `middlewares/validation.ts` e deletar `express-validator` da dependência.

- **Lição:** quando 2 lados (cliente/servidor) precisam concordar sobre forma de dado, **escreva a regra uma vez** num pacote shared. A divergência da regra de senha (8 vs 12 chars) era um bug latente — middleware aceitava, service rejeitava, usuário ficava confuso. Single source of truth elimina essa classe inteira de bugs.

### 2026-05-12 — Sprint 18: service layer (inventario + transfer) + 3 migrations + sync de schema

Fechamento das pendências listadas no Sprint 17: extrair `inventarioController` (552) e `transferController` (513) para o padrão service, e aplicar as 3 migrações de schema (Inventory.municipalityId, Transferencia.previousStatus, enum Patrimonio.status).

**M1 — `Inventory.municipalityId` (migration `20260512130000`)**

Sprint 15 forçou tenant isolation no `inventarioController` via subquery `responsavel ∈ users do município`. Funcional, mas ineficiente (extra join) e indireto. Adicionada coluna `municipalityId` direto em `inventarios`:
1. `ADD COLUMN ... TEXT` nullable.
2. Backfill: `i.municipalityId = users.municipalityId WHERE i.responsavel = u.id`.
3. Inventários órfãos (responsável não-existente) pegam o município mais antigo; resto deleta.
4. `NOT NULL` + FK `RESTRICT/CASCADE` + index.

**M2 — `Transferencia.previousStatus` (migration `20260512140000`)**

Sprint 15 gravava o status anterior do patrimônio como marker textual `[__prev_status__:X]` em `observacoes` para poder restaurar em rejeições/cancelamentos. Hacky. Trocado por coluna dedicada:
1. `ADD COLUMN previousStatus TEXT NOT NULL DEFAULT 'ativo'`.
2. Backfill via regex extraindo `[__prev_status__:X]` das observações existentes (`COALESCE(regexp_match, 'ativo')`).
3. Limpa o marker de `observacoes` (remove o trecho + eventual `\n` antes; `NULLIF(TRIM, '')` se ficar vazio).

**M3 — `Patrimonio.status` enum tipado (migration `20260512150000`)**

`status TEXT @default('ativo')` aceitava qualquer string em runtime. Agora é enum nativo do Postgres:
1. `CREATE TYPE PatrimonioStatus AS ENUM (...7 valores...)`.
2. Normaliza linhas órfãs com valor fora do conjunto para `'ativo'` (defesa contra legado).
3. `DROP DEFAULT` antes do cast (PG exige).
4. `ALTER COLUMN ... TYPE PatrimonioStatus USING status::PatrimonioStatus`.
5. `SET DEFAULT 'ativo'` com o tipo novo.

**S1 — `inventarioService` (552 → 120 linhas no controller)**

Mesmo padrão de `patrimonioService`/`imovelService`: `Actor` tipado, erros `InventarioNotFoundError`/`InventarioForbiddenError`/`InventarioValidationError`. Permissões explícitas:
- `superuser` vê todos os inventários.
- `admin` vê todos do município.
- `supervisor`/`usuario` veem apenas inventários em que são responsáveis.

`createInventario` agora é transacional (`prisma.$transaction`) — cria o inventário + cria os `inventoryItems` baseados nos patrimônios no escopo + grava `ActivityLog`. Antes, falha na criação dos items deixava inventário órfão sem items. Cache invalidação via `redisCache.deletePattern('inventarios:*')`.

Tenant isolation em `getInventarioById`/`updateInventario`/`deleteInventario`: cross-tenant retorna `NotFoundError` (404), não vaza existência via 403.

**S2 — `transferService` (513 → 140 linhas no controller)**

Erros tipados: `TransferNotFoundError`/`TransferForbiddenError`/`TransferConflictError`/`TransferValidationError`. Estados que bloqueiam transferência:
- `baixado` → 400 (não pode transferir baixado).
- `em_transferencia` → 409 (conflito, já em outro processo).
- `emprestado` → 409.

Snapshot do status anterior do patrimônio agora é gravado em `transferencia.previousStatus` (não mais no marker textual). Em `approveTransfer`/`rejectTransfer`/`deleteTransfer` (quando pendente), o status do patrimônio é restaurado a partir desse campo. Quando `deleteTransfer` é chamado sobre uma transferência já `rejeitada`, **não toca** no patrimônio (já foi restaurado no reject).

**B1 — Bug do commit: schema Prisma desincronizado das migrations**

Sprint 18 foi commitado (`8c4173c`) com as 3 migrations e os 2 services, mas **o `schema.prisma` não foi atualizado** para refletir as mudanças. Consequência: `prisma generate` não gerava `PatrimonioStatus` (compile error em `services/patrimonioService.ts:10`), e os tipos do client não conheciam `Inventory.municipalityId`, `Transferencia.previousStatus`, `Patrimonio.numero_licitacao/ano_licitacao` etc.

Corrigido na sessão de continuidade:
- `enum PatrimonioStatus { ativo, inativo, manutencao, baixado, extraviado, em_transferencia, emprestado }` adicionado.
- `Patrimonio.status` mudou de `String @default("ativo")` para `PatrimonioStatus @default(ativo)`.
- `Inventory.municipalityId String` + relação inversa em `Municipality.inventarios` + `@@index([municipalityId])`.
- `Transferencia.previousStatus String @default("ativo")`.
- `prisma generate` para refrescar client.

**T1 — Testes**

44 testes novos cobrindo os 2 services:
- `inventarioService.test.ts` (22): list/get/create/update/delete, cobertura de permissões por papel, cache hit, escopo de items (sector/location/specific_location), mascaramento cross-tenant como 404.
- `transferService.test.ts` (22): list com filtro tenant via `patrimonio.is`, estados que bloqueiam (baixado/em_transferencia/emprestado), snapshot/restauração do previousStatus em approve/reject/delete.

**Validação:** 61/61 testes de service passam (44 novos + 17 do patrimonioService existentes). Há 1 test suite pré-existente (`src/tests/patrimonio.test.ts`) com erro TS de variável usada antes da atribuição — anterior ao Sprint 18, fora do escopo.

**Redução agregada:**
```
inventarioController: 552 → 120  (-432, -78%)
transferController:   513 → 140  (-373, -73%)
─────────────────────────────────────
Controllers:         1065 → 260  (-805)
inventarioService:         ~340 (novo)
transferService:           ~430 (novo)
```

- **Lição:** ao criar migration que altera colunas, **sempre atualizar o `schema.prisma`** correspondente no mesmo commit, ou o client Prisma gerado fica fora de sincronia e o código que depende dos novos campos quebra em type-check (e em runtime se o build for skipado).

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

### 2026-05-12 — Sprint 17: validação completa + service layer (auth + imovel)

Sprint focado em fechar dois débitos do Sprint 16:
1. Aplicar `express-validator` em todas as rotas restantes (eram ~18 sem validação).
2. Migrar `authController` e `imovelController` para o padrão service (como `patrimonioService`).

**V1 — Validação em 13 rotas adicionais**

Após Sprint 16, 5 rotas tinham validação (inventário/transferência/manutenção/notificação/imóvel). Agora também têm:

- **`patrimonioRoutes`** — usa `patrimonioValidations.create/update` que já existia. Adicionado UUID em `:id`, validação inline para `addNote` (text 1-2000 chars) e `registrarBaixa` (data, motivo, documentos).
- **`userRoutes`** — `userValidations.create/update` (já existia).
- **`sectorsRoutes`** — `sectorValidations.create/update`.
- **`locaisRoutes`** — `localValidations.create/update`.
- **`tiposBensRoutes`** — `tipoBemValidations.create/update`.
- **`authRoutes`** — schemas novos (`authValidations.login/refresh/changePassword/forgotPassword/resetPassword/validateResetToken`). Email validado com `isEmail() + normalizeEmail()`; nova senha exige 8+ chars com upper/lower/digit (controller ainda aplica regra mais forte de 12 chars + símbolo).
- **`customizationRoutes`** — schema novo (`customizationValidations.save`) que rejeita payloads grossos cedo. Validação crítica de URL continua no controller (`isSafeUrl`, Sprint 15).
- **`documentRoutes`** — schema novo. Inclui validação de `patrimonioId`/`imovelId` UUID.
- **`labelTemplateRoutes`** — schema novo.
- **`formasAquisicaoRoutes`** — schema novo.
- **`emprestimoRoutes`** — schema novo.

**Total: 18 rotas validadas (5 do Sprint 16 + 13 agora).** Cobertura quase completa de POST/PUT/PATCH/DELETE com payload.

**V2 — Migração `imovelController` → `imovelService` (662 → 188, -72%)**

Mesmo padrão de `patrimonioService` (Sprint 3): regras de negócio no service, controller fino. Service exporta `Actor`/`AuditContext`/`ListImoveisQuery`, erros tipados (`ImovelNotFoundError`, `ImovelConflictError`, `ImovelForbiddenError`, `ImovelValidationError`), e funções `listImoveis`, `getImovelById`, `getImovelByNumero`, `createImovel`, `updateImovel`, `deleteImovel`, `gerarNumeroImovel`. Controller faz só `requireActor()`, chama service, mapeia erros (`handleServiceError`).

Tenant isolation reforçado: `getImovelById` agora retorna `ImovelNotFoundError` (404) quando o imóvel pertence a outro município — antes vazava existência via 403. Mesmo padrão em `updateImovel`/`deleteImovel`.

**V3 — Migração `authController` → `authService` (708 → 354, -50%)**

Service exporta: `loginUser`, `rotateRefreshToken`, `revokeRefreshToken`, `changeUserPassword`, `requestPasswordReset`, `validatePasswordResetToken`, `resetUserPassword`. Helpers internos (`hashToken`, `generateAccessJwt`, `generateRefreshJwt`, `issueRefreshToken`) ficam isolados.

Erros tipados (`AuthInvalidCredentialsError`, `AuthAccountDisabledError`, `AuthTokenInvalidError`, `AuthTokenExpiredError`, `AuthWeakPasswordError`, `AuthEmailServiceUnavailableError`) — controller mapeia para 401/403/400/503.

**Cookies HttpOnly continuam no controller** (camada HTTP, não regra de negócio). `setAuthCookies`/`clearAuthCookies` são chamados após o service retornar.

Reuse-detection do refresh token preservada: JWT válido mas hash não persistido → revoga TODOS os refresh do usuário. Idem se hash já está revogado.

**Validação:** 17/17 testes existentes do `patrimonioService` continuam passando. Typecheck: só os 2 erros pré-existentes (`zod`, `cookie-parser`).

**Redução agregada:**
```
authController:   708 → 354  (-354, -50%)
imovelController: 662 → 188  (-474, -72%)
─────────────────────────────────────
Controllers:     1370 → 542  (-828)
authService:           463 (novo)
imovelService:         553 (novo)
```

**Pendências para sprint 18:**
- `configController` (818 linhas) — pode ser splitado em `reportConfigController` + `excelConfigController` + `cssConfigController`.
- `inventarioController` (552) e `transferController` (513) também merecem `services/`.
- Schemas Zod compartilhados frontend↔backend.
- Schema migrations: `municipalityId` em `Inventory`, `previousStatus` em `Transferencia`, enum tipado em `Patrimonio.status`.

### 2026-05-12 — Sprint 16: validação Zod/express-validator + extração de campos compartilhados

Sprint focado em saúde do código: aplicar a infraestrutura de validação que já existia em `middlewares/validation.ts` mas **não estava sendo usada por nenhuma rota** (grep zero matches), e reduzir a duplicação entre páginas Create/Edit de bens e imóveis.

**V1 — Validação `express-validator` em 5 rotas críticas**

Auditoria revelou que `validation.ts` (517 linhas) tem schemas para user/patrimonio/sector/local/tipoBem/imovel/pagination mas **nenhuma rota o importava**. Toda infraestrutura sentada lá sem efeito.

Adicionados schemas novos: `inventarioValidations.create/update`, `transferValidations.create/approve/reject/byId`, `manutencaoValidations.create/update/byId`, `notificationValidations.create/byId`. Schemas existentes (`imovelValidations`) ajustados: `tipo_imovel` e `situacao` agora opcionais (controller já tratava como tal), e adicionados `latitude`/`longitude` com range.

Aplicados em `inventarioRoutes.ts`, `transferRoutes.ts`, `manutencaoRoutes.ts`, `notificationRoutes.ts`, `imovelRoutes.ts`. Padrão: `router.METHOD(path, [auth, ...validations], handleValidationErrors, controller)`. Inclui também validação de `:id` UUID em todas as rotas com path param.

Bug pré-existente corrigido no schema: `body('fotos.*').isURL()` rejeitava caminhos relativos como `/uploads/x.jpg` (que é exatamente o que o backend gera) e também rejeitava o formato `{id, file_url, file_name}` vindo do ImageUpload do frontend. Substituído por `custom((v) => string || objeto-com-file_url)`. O serviço já normaliza (`sanitizeIncomingUrls`), então a validação só rejeita formatos completamente inválidos.

**V2 — Extração de campos compartilhados (R3 + R4 com escopo reduzido)**

Plano original era unificar `BensCreate` (996 linhas) e `BensEdit` (761) num único `BensForm.tsx`. Mapeamento detalhado revelou divergências legítimas que não devem ser unificadas: Create gera número automaticamente, Edit mostra disabled; Create tem CurrencyInput em `valor_aquisicao`, Edit tem Input number; opções de `situacao_bem`/`status` diferem (Create tem `otimo`; Edit tem `baixado`/`extraviado`); Create tem card de depreciação preview e sub-patrimônios, Edit não; locais filtrados por setor só no Create.

Optei por extração cirúrgica via subcomponentes em `BensSharedFields.tsx` (281 linhas): `BensIdentificacaoFields` (tipo+marca+modelo+cor+numero_serie+quantidade), `BensAquisicaoFields` (data+forma), `BensLicitacaoFields` (numero+ano), `BensNotaFiscalField`. Apenas campos 100% idênticos foram extraídos — mantém divergências como divergências.

Mesma estratégia em `ImoveisSharedFields.tsx` (139 linhas): `ImoveisBasicoFields` (denominacao+endereco), `ImoveisDataAquisicaoField`, `ImoveisValorField`, `ImoveisAreaFields`. Em `ImoveisCreate` mantive os Inputs de área inline porque têm texto descritivo abaixo (`<p>Área total do terreno...</p>`) que `ImoveisEdit` não tem — extrair quebraria a UI.

**Redução de linhas:**

```
BensCreate:    996 → 805   (-191, -19%)
BensEdit:      761 → 569   (-192, -25%)
ImoveisCreate: 758 → 709   ( -49,  -6%)
ImoveisEdit:   452 → 368   ( -84, -19%)
─────────────────────────────────────
Pages:        2967 → 2451  (-516, -17%)
Shared:                420 (novos, fonte única)
```

516 linhas de duplicação eliminadas. Quando alguém precisar adicionar/mudar um campo compartilhado (ex: trocar Select de "marca" por SearchableSelect), edita em um único lugar.

**Validação:** 17/17 testes do `patrimonioService` continuam passando. Typecheck do backend: só os 2 erros pré-existentes (`zod`, `cookie-parser`) — resolvem no `npm install` da VPS. Padrão visual e validação dos campos extraídos mantidos byte-a-byte (exceto melhoria: `area_terreno`/`area_construida` no shared agora usam `value={field.value ?? ''}` que evita warning de uncontrolled input).

**Pendências para sprints futuros:**
- 18 rotas POST/PUT/PATCH ainda sem validação (entre elas: auth, customization, sectors, locais, tiposBens, patrimônio, documentos, labels, emails). Aplicar em Sprint 17.
- Schemas Zod compartilhados frontend↔backend (não foi feito hoje porque exigiria mais coordenação).

### 2026-05-12 — Sprint 15: tenant isolation + guards de estado (críticos)

Fechamento de 5 vetores reais de vazamento entre tenants e 3 brechas operacionais. Riscos eram concretos: usuário do município X enxergava/criava transferências sobre patrimônios do município Y; admin do município X listava inventários do município Y; qualquer usuário criava notificação spoofando o `userId` alvo; admin podia gravar `javascript:alert(1)` em URLs de logo/favicon (XSS estocado); bem em transferência ou empréstimo continuava editável durante o ciclo.

**T1 — Tenant isolation em `transferController`**
`listTransfers` antes tinha `where = {}` com um comentário "será aplicado através da relação" mas nada filtrava — qualquer usuário autenticado via todas as transferências do sistema. Adicionado helper `tenantWhere(req)` que aplica `patrimonio: { is: { municipalityId } }` para não-superuser. `getTransfer/rejectTransfer/deleteTransfer` também não checavam tenant — agora cada um valida via `transfer.patrimonio.municipalityId`. `createTransfer` antes aceitava qualquer `patrimonioId` — agora rejeita se o patrimônio não pertence ao município do criador. `approveTransfer` já tinha o check (foi feito num sprint anterior); mantido.

**T2 — Status do patrimônio durante transferência pendente**
Bem em transferência pendente continuava com `status: 'ativo'` — podia ser editado, baixado ou transferido de novo. `createTransfer` agora muda status para `em_transferencia`; `approveTransfer/rejectTransfer/deleteTransfer` (este último só se ainda estava pendente) restauram o status original. Como o schema Prisma não tem campo `previousStatus`, guardamos o estado anterior num marker `[__prev_status__:X]` dentro de `observacoes` — feio mas evita migration. TODO: trocar por coluna dedicada em sprint de schema.

**T3 — Tenant isolation em `inventarioController`**
Inventory não tem `municipalityId` direto no schema (TODO: sprint de schema). Solução por subquery: `tenantResponsavelFilter(req)` busca os ids de usuários do município e filtra `responsavel ∈ {esses ids}`. `getInventarios` agora aplica isso para `admin` (antes ele via tudo). `getInventarioById/updateInventario/deleteInventario` ganharam helper `findInventarioOfTenant` que retorna 404 se o inventário não pertence ao tenant (não vaza ID). `createInventario` antes buscava `patrimoniosInScope` apenas por `setor_responsavel: setor` — podia trazer bens de município diferente se houvesse setor de mesmo nome em outro tenant. Adicionado filtro por `municipalityId` na query.

**T4 — `notificationController.createNotification` aceita `userId` arbitrário**
Antes qualquer usuário autenticado podia criar notificação para qualquer outro (`userId` vinha do body sem validação). Agora: usuário comum força `userId = req.user.userId` (body ignorado); admin/superuser pode criar para terceiros, mas admin é restrito a usuários do mesmo município. Também adicionada validação de campos obrigatórios (tipo, titulo, mensagem).

**T5 — `customizationController` valida URLs**
Campos `activeLogoUrl/secondaryLogoUrl/backgroundImageUrl/backgroundVideoUrl/faviconUrl` aceitavam qualquer string — incluindo `javascript:alert(1)`. Frontend renderiza esses campos como `src`/`href`/CSS-`url()`, então um admin malicioso (ou um admin comprometido) poderia injetar XSS estocado. Adicionado `isSafeUrl()` que aceita só `http://`, `https://`, caminhos `/uploads/` e string vazia. URLs rejeitadas voltam em 400 com lista dos campos inválidos.

**T6 — Guards de estado adicionais em `patrimonioService.updatePatrimonio`**
Já bloqueava `baixado`; agora também bloqueia `em_transferencia` e `emprestado` (superuser bypassa). Sem isso, um usuário podia editar campos de um bem com transferência pendente ou empréstimo aberto e invalidar o ciclo.

**Não-fix:** o middleware `authorize(...roles)` que o relatório sugeria criar (R1) **já existia** em `auth.ts:105`. Verificado uso nas rotas — está aplicado onde necessário. Removido da lista.

**Validação:** 17 testes existentes (`patrimonioService.normalize.test.ts` + `patrimonioService.gerarNumero.test.ts`) continuam passando. Typecheck do backend: só os 2 erros pré-existentes (`zod`, `cookie-parser`) que se resolvem no `npm install` da VPS.

**Pendências para sprint de schema (futuro):**
- Adicionar coluna `municipalityId` em `Inventory` (eliminaria a subquery).
- Adicionar coluna `previousStatus` em `Transferencia` (eliminaria o marker em `observacoes`).
- Adicionar enum tipado para `Patrimonio.status` (hoje é string livre).

### 2026-05-12 — Sprint 14: hardening do frontend (F1-F11)

Implementação do bloco crítico + importante do `PLANO_FRONTEND.md`.

**F1 — ErrorBoundary só mostra stack em dev**
Antes vazava `error.stack`, `componentStack`, `error.toString()` ao usuário em prod. Agora exibe apenas "ID do erro" curto (base36 do timestamp); detalhes só em dev. `componentDidCatch` loga `error.message` em prod (não objeto completo).

**F2 — CustomizationContext usa logger**
Bloco `console.error('[DEV]...', error.response?.data)` rodava em prod e vazava IDs/schema. Substituído por `logger.warn` (curto) + `logger.debug` (detalhes só em dev).

**F4 — Lazy load de jspdf/xlsx/html2canvas**
Libs pesadas (~150KB gzip) saíram do bundle inicial. `PublicAssets` (primeira tela vista pelo público) e `ReportView` agora fazem `await import()` dentro dos handlers de exportação. Fallback de `ReportView` re-importa (libs já em cache do browser).

**F3 — useConfirm hook substitui window.confirm**
`window.confirm()` (nativo) era inconsistente visualmente, a11y irregular, alguns iOS bloqueiam por anti-popup. Novo `useConfirm()` + `ConfirmProvider` (Shadcn AlertDialog). Plugado em AppProviders. Substituído em Profile (logout-all) e BensCadastrados (delete, 2 lugares).

**F9 — extractApiError() helper**
Novo `src/lib/api-error.ts` com `extractApiError(err) → { message, status, kind, original }`. Kinds: validation/auth/forbidden/notFound/conflict/rateLimit/server/network/unknown. Defaults amigáveis em pt-BR. Lê `backendMsg` de `err.response.data.error/message`. Adoção incremental nos próximos sprints.

**F10 — Toast antes do redirect de sessão expirada**
http-api refresh interceptor agora exibe toast destructive "Sessão expirada — faça login novamente" antes do `window.location.href = '/login'`. Delay 600ms para o toast aparecer. Import dinâmico de `use-toast` evita acoplar axios.

**F6 — Logout limpa React Query cache**
`AuthContext.logout` chama `queryClient.clear()` antes do redirect. Evita vazamento de cache em PC compartilhado (mais robusto que reescrever todas as queryKeys com `municipalityId`).

**F11 — useMemo em context values**
`PatrimonioContext` e `SectorContext` (consumidos em ~20+ componentes cada) agora montam `value` via useMemo. Reduz re-renders em cascata. ImovelContext já estava memoizado.

### 2026-05-12 — Sprint 13: HttpOnly cookies + CSRF (defesa contra XSS)

**Backend**
- Nova dep: `cookie-parser` + `@types/cookie-parser`
- `utils/auth-cookies.ts`: helpers `setAuthCookies` / `clearAuthCookies` / `issueCsrfToken`. Cookies emitidos com `Secure` em prod, `SameSite=Lax`, `HttpOnly` para access/refresh; CSRF token em cookie não-HttpOnly para o frontend ler.
- `middlewares/csrf.ts`: double-submit cookie. Métodos seguros (GET/HEAD/OPTIONS) e endpoints de auth iniciais (login, refresh, forgot/reset password, csrf) isentos. Requests com header `Authorization: Bearer` (sem cookie de sessão) também pulam — back-compat para clientes máquina.
- `middlewares/auth.ts`: aceita JWT do cookie `sispat_access` (prioridade) OU header `Authorization: Bearer` (fallback).
- `controllers/authController.ts`:
  - `login`: emite cookies + retorna `csrfToken` no body
  - `refreshToken`: aceita cookie `sispat_refresh` ou body; reemite cookies com rotação
  - `logout`: aceita cookie OU body; chama `clearAuthCookies` antes de responder
  - Novo endpoint `GET /api/auth/csrf` para frontend renovar cookie CSRF quando necessário
- `index.ts`: `app.use(cookieParser())` + `app.use('/api', csrfProtection)`

**Frontend**
- `services/http-api.ts`: `withCredentials: true` no axios — envia/recebe cookies automaticamente
- Helper `readCsrfCookie()` lê `csrf_token` de `document.cookie`
- Interceptor de request injeta `X-CSRF-Token` em POST/PUT/PATCH/DELETE quando o cookie está presente
- `Authorization: Bearer` continua sendo enviado se houver token em localStorage (back-compat); backend prefere o cookie
- Interceptor de refresh prioriza cookie via `withCredentials`

**Segurança ganhada**
- XSS não consegue mais roubar o JWT — cookies HttpOnly não são acessíveis por JS
- CSRF mitigado via double-submit pattern (atacante de outro domínio não lê o csrf_token cookie)
- Period de transição: login antigo (Bearer + localStorage) continua funcionando

**Pendências/futuro**
- Migrar AuthContext.tsx para parar de salvar token/refresh em localStorage (manter só user obj). Após verificar que cookies funcionam em produção.

### 2026-05-12 — Sprint 12: cleanup + observabilidade + ops

**Cleanup — dashboards mortos**
Após M15 unificar todas as rotas em `UnifiedDashboard`, os componentes `AdminDashboard`, `UserDashboard` e `ViewerDashboard` ficaram dead. Deletados (3 arquivos + imports lazy).

**Frontend Sentry ativado**
`src/lib/sentry.ts` antes era stub com bloco `/* */` inteiro comentado. Reescrito com dynamic import condicional:
- Prod + `@sentry/react` instalado + `VITE_SENTRY_DSN`: ativa com browserTracing + replay + filtros de erros esperados (401, Network Error)
- Sem pacote ou DSN: no-op silencioso
- Em dev: sempre no-op
Para ativar: `pnpm add @sentry/react` + setar DSN.

**Backup off-site (rclone)**
`scripts/backup-offsite.sh` sincroniza `/var/backups/sispat` com bucket remoto (S3/B2/MinIO/R2 — qualquer um suportado por rclone). Idempotente: sem rclone ou sem `OFFSITE_REMOTE`/`OFFSITE_BUCKET`, é no-op. Usa `rclone copy` (não sync) para nunca deletar no remoto. Retenção configurável (default 180 dias).

**Healthcheck com Redis**
`GET /api/health/detailed` agora reporta `services.redis.status: 'ready' | 'disabled' | 'unavailable'`. Novo método `RedisCache.getStatus()`.

**Docs**
DEPLOY_NOVO.md atualizado com seções de Sentry frontend e backup off-site.

### 2026-05-12 — Sprint 11: UX coerente

**P4 — Customização superuser vs admin**
Mantida a separação (telas têm campos distintos) mas adicionado Alert informativo em cada uma com link cruzado:
- `/configuracoes/personalizacao` é do município (logos, info, tela login)
- `/superuser/customization` é da plataforma (browserTitle, favicon, footers)

**M15 — Dashboards unificados**
Existiam 7 dashboards diferentes (Admin/User/Viewer/Supervisor/Depreciation/Unified). `UnifiedDashboard` já contém todo o conteúdo necessário. Rotas `/dashboard/admin`, `/supervisor`, `/usuario`, `/visualizador` agora renderizam o mesmo componente (back-compat). `ProtectedRoute` e `DashboardRedirect` simplificados — superuser → `/superuser`, resto → `/dashboard`. `DepreciationDashboard` mantido (escopo distinto).

**M5 — PDF não-bloqueante**
`html2canvas` exige DOM, então não pode rodar em Web Worker. Solução: `yieldToBrowser()` via `requestIdleCallback` entre etapas do PDF (carregamento de imagens, render do canvas, cada página, save). Botão "Baixar PDF" mostra estágio atual ("Gerando página 3 de 7...") e fica desabilitado. `alert()` de erro substituído por toast. `finally` garante reset de estado.

### 2026-05-12 — Sprint 10: UX e refinamento

**M4 — Auto-save em formulários longos**
Novo hook `useFormAutosave` persiste `form.watch()` em localStorage com debounce de 1s. Restaura ao montar se o form estiver pristine. `clearDraft()` limpa quando submit foi bem-sucedido. Aplicado em `BensCreate` e `ImoveisCreate`. Exclui automaticamente Files e campos opt-out. BensEdit ficou de fora (auto-save em edição é arriscado — pode sobrescrever dados do servidor).

**M6 — Paginação correta no PDF de relatório**
`ReportView.handleDownloadPDF` fazia `pdf.addImage()` único. Relatórios maiores que 1 página A4 eram truncados. Agora calcula quantas páginas a imagem precisa e adiciona páginas com `pdf.addPage()` deslocando Y negativamente. Hardlimit de 50 páginas.

**M3 — Paginação interna do histórico em BensView**
Antes mostrava todas as 50 entradas de uma vez. Agora 10 por vez com botão "Mostrar mais (+10)". Performance melhora em bens com muita movimentação.

**M9 — Templates de relatório no banco**
Análise inicial errada: modelo `ReportTemplate` já existe no schema, endpoints `/api/config/report-templates` (GET/POST/PUT/DELETE) já implementados em `configController`, frontend já usa via `ReportTemplateContext`. Nada a fazer.

**M8 — generateImovelPDF**
Análise inicial errada: implementação completa de 417 linhas existe em `components/imoveis/ImovelPDFGenerator.tsx`. Sem alteração.

**M10 — Mapa de imóveis**
`Imovel` tinha lat/lng sem visualização. Adicionados em `ImoveisView`:
- Link "🗺️ Ver no mapa" (OpenStreetMap)
- Link "Google Maps"
- Card com `<iframe>` do OpenStreetMap embed (preview inline)
Zero dependências adicionais — não precisou de Leaflet.

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
