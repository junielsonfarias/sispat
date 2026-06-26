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

### 2. Consulta pública pode estar quebrada para visitante anônimo
- `PublicAssets.tsx:95-96` usa hooks **autenticados** (`useAllPatrimonios` → `/patrimonios?all=true`, `useImovel()`).
- `PublicImovelDetalhe.tsx:45` idem (`useImovel()`).
- Para visitante deslogado retornam `[]` → lista/detalhe vazios. **Verificar em runtime** (há `SyncContext` via `/public/patrimonios`) e migrar para `publicApi`/endpoint `/public/*`.

### 3. Falsa persistência (toast de sucesso sem gravar)
- `SecuritySettings.tsx:26` (toggle 2FA não chama API)
- `BackupSettings.tsx:121` (restauração só seta Context; não valida tenant do backup → risco cross-tenant)
- `SystemInformation.tsx:24` (só `localStorage`)
- `LogoManagement.tsx:73` ("remover logo" não persiste)
- `SyncClient.tsx:41` (config de sync só em estado local)

### 4. Spinner eterno / sem estado de erro
- `BensView.tsx:397`, `BensEdit.tsx:286`, `ImoveisReportEditor.tsx:20`, `InventarioSummary.tsx:33` → adicionar `loadError` + "Tentar novamente".

### 5. Touch/mobile bloqueante
- `PublicBemDetalhes.tsx:258`, `ImageUpload.tsx:169` — botões só com `:hover` (invisíveis em celular).
- `DesafetacaoList.tsx:622` — exige digitar UUID manual do bem (sem dropdown).
- `ImportarRelatorio.tsx` etapa 2 — tabela de 8 colunas sem fallback mobile.

### 6. RBAC furado no cliente
- `BensCadastradosSimplificado.tsx:203,214` — Editar/Excluir para `visualizador`.
- `GerenciadorFichas/EditorTemplateFicha/NovoTemplateFicha` — sem guard de papel.
- `ImovelCustomFields.tsx:34`, `ImoveisManutencao.tsx:51` — sem RBAC.
- `supervisor` com ações destrutivas em `UserManagement`/`BackupSettings`.

### 7. Ações destrutivas sem confirmação
- `Locais.tsx:109`, `ExcelCsvTemplateManagement.tsx:98` (delete direto).
- `GerenciadorFichas.tsx:87` (`window.confirm` nativo).
- `Termos.tsx:295` (emite termo de carga — Art. 34 — sem confirmar).
- `DesafetacaoList.tsx:1071` (exclui desafetação concluída).

### 8. Bugs de lógica
- `PermissionManagement.tsx:58` — `useState` usado como efeito → permissões nunca carregam.
- `<ChartTooltipContent payload={[]} />` (tooltip vazio): `DepreciationDashboard:269`, `AnaliseTipo:175`, `AnaliseSetor:202`.
- `InventarioPrint.tsx:282` — divisão por zero → `NaN%`.
- `InventarioEdit.tsx:244` — escopo `specific_location` some na edição.
- `ImoveisEdit.tsx` — campos do Create ausentes no Edit → sobrescreve com `undefined`.

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
