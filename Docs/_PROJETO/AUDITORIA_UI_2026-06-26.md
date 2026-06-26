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

### 4. Spinner eterno / sem estado de erro
- `BensView.tsx:397`, `BensEdit.tsx:286`, `ImoveisReportEditor.tsx:20`, `InventarioSummary.tsx:33` → adicionar `loadError` + "Tentar novamente".

### 5. Touch/mobile bloqueante
- `PublicBemDetalhes.tsx:258`, `ImageUpload.tsx:169` — botões só com `:hover` (invisíveis em celular).
- `DesafetacaoList.tsx:622` — exige digitar UUID manual do bem (sem dropdown).
- `ImportarRelatorio.tsx` etapa 2 — tabela de 8 colunas sem fallback mobile.

### 6. RBAC no cliente — ✅ CORRIGIDO (com revisão dos falsos positivos)
Ao verificar o roteamento (`App.tsx`/`ProtectedRoute`), parte dos achados dos agentes era **falso positivo** — eles leram só o componente, não o roteamento:
- ✅ **Já protegidos na rota** (não eram bug): `GerenciadorFichas`/`NovoTemplateFicha`/`EditorTemplateFicha` e `ImovelCustomFields` já têm `allowedRoles={['admin','supervisor']}`. (Superuser é redirecionado a `/superuser/*` por design — por isso não está nos `allowedRoles`.)
- ✅ **Gap real corrigido:** `/imoveis/manutencao` não tinha `ProtectedRoute` → agora `allowedRoles={['admin','supervisor','usuario']}` (igual à rota irmã `/imoveis/novo`).
- ✅ **`UserManagement` (supervisor):** o modelo de papéis dá ao `supervisor` ZERO permissões `users:*`, mas o componente mostrava criar/editar/excluir/senha. `UserManagementUnified` agora gateia essas ações por `usePermissions` (`users:create/update/delete`) — supervisor vê a lista como "Somente leitura"; admin/superuser inalterados. (Aberto: avaliar se a *rota* `/configuracoes/usuarios` deve excluir `supervisor` de vez — decisão de produto.)
- ✅ **`BackupSettings` (supervisor):** restauração já foi desabilitada no item #3.
- 🗑️ **Código morto** (não é bug de RBAC — nunca roteado): `BensCadastradosSimplificado.tsx` (sem rota), além de `GerenciarTipos.tsx` e `ImovelMap.tsx` já listados. Candidatos a remoção.

### 7. Ações destrutivas sem confirmação
- `Locais.tsx:109`, `ExcelCsvTemplateManagement.tsx:98` (delete direto).
- `GerenciadorFichas.tsx:87` (`window.confirm` nativo).
- `Termos.tsx:295` (emite termo de carga — Art. 34 — sem confirmar).
- `DesafetacaoList.tsx:1071` (exclui desafetação concluída).

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
- **Responsividade:** dezenas de tabelas sem `overflow-x-auto`; grids fixos; touch targets <44px.
- **Dark mode:** cores hardcoded (`text-gray-900`, `bg-white`, `bg-green-50`…) em ~30 arquivos.
- **A11y:** ícone-botões sem `aria-label`; `<TableHead>` sem `scope="col"`; imagens sem `loading="lazy"`/`alt`; drag-and-drop sem teclado.
- **Código morto/duplicado:** `GerenciarTipos.tsx` (sem rota, duplica `TipoBemManagement`), `ImovelMap.tsx` (grid 5×5 fake), handlers de delete duplicados em `BensCadastrados`.

---

## Próximos passos sugeridos (ordem de risco)
1. ✅ Lote 🔴 #1 (multi-tenant) — feito.
2. #2 Consulta pública (verificar runtime + migrar para `/public/*`).
3. #3 Falsa persistência (enganoso para o usuário).
4. #6 RBAC no cliente.
5. Demais 🔴/🟠 por módulo; 🟡/🟢 como varredura mecânica (regex p/ dark mode, `aria-label`, `scope`).
