# AUDITORIA DE UI/UX — SISPAT 2.0 (2026-06-26)

> Varredura das ~88 páginas (`src/pages/**`) por 6 agentes `frontend-expert` em paralelo,
> cada um avaliando 4 eixos: elementos/estado, botões/ações, responsividade e acessibilidade.
> Severidade: 🔴 quebra/vaza dado · 🟠 bug de fluxo/UX · 🟡 melhoria · 🟢 polimento.
>
> **Status do lote 🔴 #1 (multi-tenant `municipalityId: '1'`):** ✅ corrigido em 2026-06-26 (ver seção própria + `HISTORICO_CORRECOES.md`).

---

## 🔴 Críticos

### 1. `municipalityId: '1'` hardcoded (vazamento multi-tenant) — ✅ CORRIGIDO
Sites que **persistiam/alimentavam** com tenant fixo:
- `SectorManagement.tsx:60` — criava setor sempre no município `'1'`.
- `ExcelCsvTemplateManagement.tsx:53` — salvava modelo Excel/CSV no município `'1'`.
- `LabelTemplateEditor.tsx:94` — fallback `'1'` ao criar modelo de etiqueta sem `municipalityId`.
- `ImoveisCreate.tsx:254` — `user.municipalityId || '1'` ao cadastrar imóvel.
- `BensCadastrados.tsx:1493` — objeto "Etiqueta Padrão" com `municipalityId: '1'`.

Mocks de **preview** (não persistem; risco baixo — apenas alinhados ou anotados):
- `LabelTemplateEditor.tsx:71` (`defaultPatrimonioData`), `FichaPreviewReal.tsx:47`, `LabelTemplateContext.tsx:60` (`defaultTemplate` em escopo de módulo — substituído pela busca da API).

**Correção:** ler `user.municipalityId` do `useAuth()` e **bloquear** a ação com toast quando ausente — nunca usar `'1'` como fallback.

### 2. Consulta pública quebrada para visitante anônimo — ✅ BENS CORRIGIDO (imóveis pendente)
- **Confirmado:** `PublicAssets` (rota pública) lia de `useAllPatrimonios` (`/patrimonios?all=true`, **autenticado**) → vazio para visitante. Regressão da migração para `useAllPatrimonios`.
- **Corrigido (bens):** novo hook `usePublicPatrimonios` → `GET /public/patrimonios` (sem auth), mapeando o shape público; timestamp/spinner via React Query (removida a dependência órfã do `SyncContext`).
- **Pendente (imóveis):** `PublicImovelDetalhe.tsx:45` usa `useImovel()` (autenticado) e **não existe endpoint `/public/imoveis`**. Não é regressão (imóveis nunca foram servidos publicamente). Mostrar exige backend novo + decisão de produto (F8: expor valor/localização de imóvel). Página degrada para "não encontrado" (não quebra).

### 3. Falsa persistência (toast de sucesso sem gravar) — ✅ UI HONESTA APLICADA
Confirmado que **não há backend** para 2FA, backup/restore nem system-info. Aplicada UI honesta (parar de fingir sucesso):
- `SecuritySettings.tsx` (2FA) — switch desabilitado + Alert "em desenvolvimento"; sem toast falso.
- `BackupSettings.tsx` — restauração desabilitada com Alert (citando o risco cross-tenant); criação de backup (download JSON) é real e mantida. Histórico segue efêmero (sessão).
- `SystemInformation.tsx` — Alert "armazenamento local" + toast honesto ("salvo apenas neste navegador").
- `LogoManagement.tsx` — "remover logo" agora **persiste** via `saveSettings` (correção real).
- `SyncClient.tsx` — status "Conectado" hardcoded removido; auto-sync desabilitado com Alert; sync manual mantido (real).

### 4. Spinner eterno / sem estado de erro — ✅ CORRIGIDO
- ✅ `BensView` — após falha de rede, `patrimonio` ficava null → spinner eterno. Adicionado `loadError` + botão "Tentar novamente".
- ✅ `InventarioSummary` — `getInventoryById(id)!` (non-null) → tela em branco com id inválido. Agora `?? null` + "Carregando" (via `isLoading` do context) vs "não encontrado" + Voltar.
- ✅ `ImoveisReportEditor` — `novo` sem `municipalityId` travava em "Carregando..." → toast + navega de volta; spinner decente no fallback.
- ℹ️ `BensEdit` — **não era spinner eterno**: já chama `setPatrimonio` no sucesso e `navigate` no erro. Só ajustado o `console.error` solto (→ guard DEV).

### 5. Touch/mobile bloqueante — ✅ CORRIGIDO
- ✅ `PublicBemDetalhes` (setas do carrossel) e `ImageUpload` (botão remover) — eram `opacity-0 group-hover:opacity-100` (invisíveis no toque). Agora `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` (visível no mobile, hover-reveal no desktop). Botão de remover ganhou `aria-label` e touch target 32px.
- ✅ `DesafetacaoList` (form de criação) — exigia digitar o **UUID** do bem. Trocado por `SearchableSelect` (busca por número/descrição; value = id) para patrimônio e imóvel.
- ✅ `ImportarRelatorio` etapa 2 — tabela larga `table-fixed`: adicionado banner `lg:hidden` recomendando concluir em desktop (campos apertados no celular).

### 6. RBAC no cliente — ✅ CORRIGIDO (com revisão dos falsos positivos)
Ao verificar o roteamento (`App.tsx`/`ProtectedRoute`), parte dos achados dos agentes era **falso positivo** — eles leram só o componente, não o roteamento:
- ✅ **Já protegidos na rota** (não eram bug): `GerenciadorFichas`/`NovoTemplateFicha`/`EditorTemplateFicha` e `ImovelCustomFields` já têm `allowedRoles={['admin','supervisor']}`. (Superuser é redirecionado a `/superuser/*` por design — por isso não está nos `allowedRoles`.)
- ✅ **Gap real corrigido:** `/imoveis/manutencao` não tinha `ProtectedRoute` → agora `allowedRoles={['admin','supervisor','usuario']}` (igual à rota irmã `/imoveis/novo`).
- ✅ **`UserManagement` (supervisor):** o modelo de papéis dá ao `supervisor` ZERO permissões `users:*`, mas o componente mostrava criar/editar/excluir/senha. `UserManagementUnified` agora gateia essas ações por `usePermissions` (`users:create/update/delete`) — supervisor vê a lista como "Somente leitura"; admin/superuser inalterados. (Aberto: avaliar se a *rota* `/configuracoes/usuarios` deve excluir `supervisor` de vez — decisão de produto.)
- ✅ **`BackupSettings` (supervisor):** restauração já foi desabilitada no item #3.
- 🗑️ **Código morto** (não é bug de RBAC — nunca roteado): `BensCadastradosSimplificado.tsx` (sem rota), além de `GerenciarTipos.tsx` e `ImovelMap.tsx` já listados. Candidatos a remoção.

### 7. Ações destrutivas sem confirmação — ✅ CORRIGIDO
Usando o hook `useConfirm` (AlertDialog acessível, padrão do projeto):
- ✅ `Locais` — delete de local agora confirma (com nome + aviso de bens vinculados).
- ✅ `ExcelCsvTemplateManagement` — delete de modelo agora confirma (com nome).
- ✅ `GerenciadorFichas` — `window.confirm` nativo → `useConfirm`; também `console.error` → `logger.error`.
- ✅ `Termos` — emissão do termo de carga (Art. 14/34) agora confirma antes de registrar.
- ✅ `DesafetacaoList` — o delete já tinha AlertDialog; faltava **bloquear `status === 'concluida'`** (ato jurídico definitivo) → agora `canDelete && d.status !== 'concluida'`.
- De passagem: `aria-label` nos ícone-botões de exclusão tocados.

### 8. Bugs de lógica — ✅ PARCIAL (com revisão de falso positivo)
- ✅ **Tooltip de gráfico vazio:** `<ChartTooltipContent payload={[]} />` sobrescrevia o payload injetado pelo recharts → tooltip nunca mostrava valores. Corrigido em **6 ocorrências** (os agentes acharam 3; +3 em `ChartsSection.tsx`): removido o `payload={[]}`.
- ✅ **`InventarioPrint.tsx:282`** — divisão por zero → `NaN%`. Agora guarda `items.length > 0 ? ... : '0.0'`.
- ✅ **`InventarioEdit`** — escopo `specific_location` (e seu `specificLocationId`) sumia na edição (perda de dado real). Trazido à paridade com o Create: campo no schema/form/submit + opção no Select + campo condicional; Selects passaram de `defaultValue` para `value` (refletem o `form.reset`); removido `setTimeout(1000)` artificial.
- ❌ **`ImoveisEdit` "sobrescreve com undefined" — FALSO POSITIVO.** O backend `updateImovel` usa whitelist com `if (raw[field] !== undefined)` (`imovelService.ts:419-423`) → campos ausentes no body NÃO são tocados (preservados). Não há perda de dado; os campos (tipo_imovel, lat/long, descrição, etc.) apenas **não são editáveis** no form do Edit — **lacuna de feature**, não bug. Adicioná-los é melhoria, não correção.
- ✅ **`PermissionManagement.tsx:58`** — `useState(() => …)` usado como efeito (inicializador rodava 1x no mount com `roles` ainda vazio) → permissões nunca carregavam. Trocado por `useEffect([selectedRole, roles])`.

---

## 🟠 Importantes (padrões recorrentes)
- **`setTimeout` artificial** (latência falsa): `InventarioEdit:100` (1s), `Exportacao:132` (1,5s), `PublicImovelDetalhe:52` (500ms), `export-utils:192` (500ms/lote).
- **`console.error`/`console.warn` sem guard DEV** em ~20 páginas.
- **Empty states ausentes** em ~15 tabelas.
- **Export XLSX falso** — `export-utils.ts:88` gera HTML com MIME `.xls`.
- **`<a href>`/`href="#"`** em SPA causando reload/scroll: `NotFound:17`, paginações.
- **Submit sem `disabled`/spinner** → duplo-clique: AssetTransferForm, NumberingSettings, InventarioPrint, SystemCustomization.

## 🟡 Melhorias / 🟢 Polimento (volume alto, baixo risco)
- **Dark mode:** ✅ **1ª onda concluída** — cores hardcoded (`text-gray-900`→`text-foreground`, `bg-white`→`bg-card`, `text-gray-{600,500,400}`→`text-muted-foreground`, `bg-gray-{50,100}`→`bg-muted`, `border-gray-{200,300}`→`border-border`) trocadas por tokens semânticos em **26 arquivos de UI** (bens, imóveis, inventário, dashboard, layout, auth, fichas, públicas). **Preservados de propósito:** componentes de impressão/PDF (`*PrintForm`, `*PDFGenerator`, `FichaPreview*`, `InventarioPrint`, `TermoDocumento`, previews de etiqueta/ficha — papel = branco), badges de status (`bg-{green,red,…}-NNN`), cores de gráfico e variantes com opacity (`bg-white/95`, `dark:bg-gray-800/90`). Restam telas menos centrais (admin/superuser/ferramentas) para uma 2ª onda.
- **`setTimeout` artificial:** ✅ removido o de `Exportacao` (1,5s antes de export real). Os de PDF (`*PDFGenerator`) são **esperas de render necessárias** (html2canvas) e o de `export-utils` (500ms/lote) **espaça downloads** (evita bloqueio do browser) — mantidos.
- **Responsividade:** dezenas de tabelas sem `overflow-x-auto`; grids fixos; touch targets <44px. (pendente)
- **A11y:** ✅ `<TableHead>` sem `scope="col"` — resolvido **app-wide** no componente base `TableHead` (`ui/table.tsx`); ✅ `aria-label` em 16 ícone-botões (além dos de #6/#7); ✅ `loading="lazy"` nas galerias de fotos (BensView, ImoveisView, PublicConsultation, PublicBemDetalhes, PublicImovelDetalhe) — logos/impressão/PDF e a imagem principal do carrossel mantidos sem lazy (LCP). Pendente: drag-and-drop por teclado.
- **`overflow-x-auto` em tabelas:** ✅ **não era problema** — o componente base `Table` (`ui/table.tsx:10`) já envolve em `<div className="overflow-auto">`; toda tabela Shadcn já rola na horizontal.
- **Código morto:** ✅ removidos `BensCadastradosSimplificado.tsx`, `GerenciarTipos.tsx`, `ImovelMap.tsx` (verificado: zero imports).
- **`console.error`/`console.warn` sem guard DEV** em páginas (alguns já corrigidos; varredura completa pendente).
- **Código morto/duplicado:** `BensCadastradosSimplificado.tsx` (sem rota), `GerenciarTipos.tsx` (sem rota, duplica `TipoBemManagement`), `ImovelMap.tsx` (grid 5×5 fake). Candidatos a remoção.

---

## Próximos passos sugeridos (ordem de risco)
1. ✅ Lote 🔴 #1 (multi-tenant) — feito.
2. #2 Consulta pública (verificar runtime + migrar para `/public/*`).
3. #3 Falsa persistência (enganoso para o usuário).
4. #6 RBAC no cliente.
5. Demais 🔴/🟠 por módulo; 🟡/🟢 como varredura mecânica (regex p/ dark mode, `aria-label`, `scope`).
