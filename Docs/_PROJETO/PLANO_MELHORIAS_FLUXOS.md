# Plano de Melhorias por Fluxo — análise completa do Sispat

> Análise realizada em 2026-05-12 após Sprint 1–5. Cobre Auth, Bens Móveis,
> Imóveis, Inventário, Manutenção, Transferência, Relatórios, Etiquetas,
> Exportação, Customização, Dashboards, Métricas e Consulta Pública.
> Achados são organizados por **gravidade** (🔴 bloqueador, 🟠 importante,
> 🟡 melhoria, 🟢 polimento) e **módulo**.

---

## 🔴 Bloqueadores — funcionalidades quebradas em produção

### B1. Recuperação de senha completamente desabilitada
- **Onde:** `backend/src/controllers/authController.ts:441-528, 534-556, 562-592`
- **Sintoma:** `forgotPassword`, `validateResetToken` e `resetPassword` têm comentários "TEMPORARIAMENTE DESABILITADO - Problema com Prisma Client" e forçam `resetToken = null`. Frontend tem rotas `/forgot-password` e `/reset-password` que **levam para tela quebrada**.
- **Impacto:** Usuário que esqueceu a senha precisa contato administrativo manual.
- **Solução:** Ativar `prisma.passwordResetToken.create/findUnique/update`. O modelo já existe (`schema.prisma:620-637`). Deve ser 1h de trabalho.
- **Risco:** Baixo, escopo cirúrgico.

### B2. Sub-patrimônios (kits) não implementados
- **Onde:** `src/components/bens/SubPatrimoniosManagerRefactored.tsx:34` — comentário `TODO: Integrar com API real`.
- **Sintoma:** Campos `eh_kit` e `quantidade_unidades` existem mas não persistem. Kits cadastrados ficam órfãos.
- **Impacto:** Recurso "ativo" na UI que não funciona — usuários se confundem.
- **Solução:** Implementar endpoint + UI ou esconder a feature até estar pronta.

### B3. Devolução de empréstimo sem fluxo
- **Onde:** `src/pages/bens/Emprestimos.tsx` — sem `handleDevolucao`. Campo `dataDevolucao` no schema nunca populado.
- **Sintoma:** Empréstimos atrasados ficam pendurados sem forma de fechar.
- **Solução:** Endpoint `POST /api/emprestimos/:id/devolver` + botão na UI.

### B4. Campos customizados de Imóveis não persistem
- **Onde:** `backend/src/controllers/imovelController.ts:228-247` recebe `customFields` mas não salva.
- **Sintoma:** Admin cria campos custom em `ImovelCustomFields.tsx`, o form em `ImoveisCreate` mostra os campos, usuário preenche, mas o **valor é descartado** ao salvar.
- **Impacto:** Funcionalidade completamente quebrada.
- **Solução:** Adicionar coluna `customFields Json?` em `Imovel` OU tabela `ImovelCustomFieldValue` (FK para imóvel + FK para campo + valor texto).

### B5. Upload de documentos de baixa não persiste arquivos
- **Onde:** `src/components/BaixaBemModal.tsx:84` — só salva `selectedFiles.map(f => f.name)`. Não faz upload real.
- **Sintoma:** Baixas sem documentação anexada.
- **Solução:** Usar mesmo fluxo de upload do `ImageUpload` antes de submit.

### B6. Rotas de transferência duplicadas
- **Onde:** `backend/src/routes/transferRoutes.ts` (v2.0.6) e `transferenciaRoutes.ts` (v2.0.5) — ambos registrados.
- **Sintoma:** Há dois controllers paralelos com comportamentos divergentes:
  - `transferenciaController`: atualiza `Patrimonio.sectorId` (FK)
  - `transferController`: atualiza só `setor_responsavel` (string) — **deixa FK desatualizada**
- **Risco:** Estado corrompido — bem aparece num setor pela FK e em outro pela string.
- **Solução:** Escolher um (recomendo `transferRoutes` por estar mais novo) e remover o outro. Migrar consumidores frontend (`Transferencias.tsx` e `TransferenciasPage.v2.tsx`).

---

## 🟠 Importantes — bugs/inconsistências de fluxo

> **Sprint 7 concluído em 2026-05-12.** Todos os 10 itens (I1-I10) ✅.

### I1. ✅ Frontend não revoga refresh token no logout
- **Onde:** `src/contexts/AuthContext.tsx:46-56` — só limpa localStorage.
- **Sintoma:** Refresh token continua válido no banco por 7 dias após logout. Se roubado, atacante usa.
- **Solução:** No logout do frontend: `POST /api/auth/logout` com `{ refreshToken: <token> }` no body **antes** de limpar storage. Backend já suporta isso (implementamos no Sprint 2).

### I2. ✅ changePassword aceita senha fraca
- **Onde:** `backend/src/controllers/authController.ts:369-435` — valida só `newPassword.length < 6`. Reset usa regex forte (12+ chars com símbolos).
- **Sintoma:** Inconsistência: usuário troca senha pelo perfil e pode usar `123456`.
- **Solução:** Aplicar mesmo regex de `resetPassword` em `changePassword`.

### I3. ✅ `checkMunicipality` pode ser bypassado
- **Onde:** `backend/src/middlewares/auth.ts:129` — busca `municipalityId` em `req.params` OU `req.body`, **não em `req.user`**.
- **Sintoma:** Usuário pode passar `municipalityId` no body apontando para outro município. Hoje os controllers re-filtram, mas se um novo controller esquecer, fica vulnerável.
- **Solução:** Sempre validar `req.params.municipalityId === req.user.municipalityId` (exceto superuser).

### I4. ✅ Estados inconsistentes em Patrimônio
- **Cenários:**
  - Bem em **transferência pendente** ainda pode ser editado, baixado ou transferido de novo (sem check)
  - Bem **baixado** com empréstimo ativo (sem validação de status durante baixa)
  - Bem **em manutenção** sem bloqueio em outras operações
- **Solução:** Adicionar guards no service: `if (patrimonio.status === 'baixado') throw new ConflictError(...)`. Centralizado em `patrimonioService.ts`.

### I5. ✅ Manutenção sem garantia patrimonio XOR imovel
- **Onde:** `controllers/manutencaoController.ts` — cria com `patrimonioId: patrimonioId || null` sem validar que pelo menos um foi passado.
- **Sintoma:** Tarefas de manutenção órfãs (sem bem associado).
- **Solução:** Zod schema com `.refine(data => data.patrimonioId || data.imovelId, "informe patrimônio ou imóvel")`.

### I6. ✅ Numero_licitacao sem unicidade
- **Onde:** schema `Patrimonio.numero_licitacao` — sem `@unique`.
- **Sintoma:** Múltiplos bens podem ter mesmo número de licitação sem aviso. Auditoria difícil.
- **Solução:** Adicionar `@@index` se unicidade não é desejada, ou validar no service que a combinação `numero_licitacao + ano_licitacao` é única dentro do município.

### I7. ✅ PublicAssets sem rate limit específico
- **Onde:** `backend/src/middlewares/advanced-rate-limit.ts:46` — rotas `/api/public` são **skipped** no rate limiter global.
- **Sintoma:** Endpoint público sem cap → potencial DDoS ou scraping massivo.
- **Solução:** Rate limit específico: 60-100 req/min por IP em `/api/public/*`.

### I8. ✅ Fotos órfãs em upload abortado
- **Onde:** `src/components/bens/ImageUpload.tsx` — se upload de 5 fotos falha na 3ª, as 2 que subiram ficam órfãs no `uploads/` sem referência no banco.
- **Solução:** Endpoint de cleanup que roda semanal (cron) e deleta arquivos sem referência. Já temos `isFileOwnedByMunicipality()` que pode listar órfãos.

### I9. ✅ JSON.parse em refresh token frágil
- **Onde:** `src/services/http-api.ts:68` — faz `JSON.parse(refreshToken)` mas o `AuthContext.tsx:121` salva como string simples.
- **Sintoma:** Pode dar erro silencioso ao tentar refresh.
- **Solução:** Padronizar: salvar e ler como string crua, ou ambos como JSON wrapper consistente.

### I10. ✅ Mensagens de erro de login não diferenciadas
- **Onde:** `AuthContext.tsx:133` — sempre "Credenciais inválidas" sem distinguir email errado, senha errada, ou conta desativada (que dá 403 no backend).
- **Sintoma:** Usuário desativado fica achando que esqueceu a senha.
- **Solução:** Backend já retorna 403 com mensagem específica para conta desativada. Frontend deve exibir.

---

## 🟡 Melhorias — qualidade e UX

### M1. ✅ Cleanup de código morto
- **Duplicações:**
  - `Transferencias.tsx` + `TransferenciasPage.v2.tsx` — uma é morta
  - `SubPatrimoniosManager`, `SubPatrimoniosManagerRefactored`, `SubPatrimoniosManagerOptimized` — só 1 deve sobreviver
  - Múltiplos dashboards: `AdminDashboard`, `SuperuserDashboard`, `UserDashboard`, `ViewerDashboard`, `DepreciationDashboard`, `UnifiedDashboard`, `TestDashboard` — `DashboardRedirect.tsx` deve rotear, mas sem lógica clara
- **Solução:** Auditar cada um, marcar morto, deletar.

### M2. ✅ Filtro dupla-aplicação em listas
- **Onde:** `BensCadastrados.tsx` — filtra localmente E manda filtro pro backend.
- **Sintoma:** Se backend atrasa, UX mostra inconsistência (alguns itens filtrados local, outros vindo do servidor).
- **Solução:** Confiar no backend. Frontend só mostra loading enquanto espera.

### M3. ✅ Paginação interna no histórico de BensView
- **Onde:** `BensView.tsx` carrega 50 históricos + 20 notas + sub-patrimônios sem virtualização. `BensCadastrados.tsx` paginado (OK).
- **Solução:** `react-window` ou paginação interna para histórico/notas.

### M4. ✅ Auto-save em formulários longos
- **Onde:** `BensCreate.tsx`, `BensEdit.tsx`, `ImoveisCreate.tsx` — perdem dados ao recarregar.
- **Solução:** localStorage com chave por formulário, restore ao montar, limpar ao submit.

### M5. ✅ PDF e Excel síncronos (bloqueantes)
- **Onde:** `ReportView.tsx` → `html2canvas` + `jsPDF` no main thread. `Exportacao.tsx` com mock `setTimeout(1500)`.
- **Sintoma:** UI trava em datasets grandes.
- **Solução:** Web Workers para geração de PDF. Alternativa simples: gerar no backend (Puppeteer ou similar).

### M6. ✅ PDF de relatório com paginação quebrada
- **Onde:** `ReportView.tsx:321` — `jsPDF.addImage()` único; uma imagem virou várias páginas seria via `addPage()` loop.
- **Sintoma:** Relatórios grandes ficam truncados ou esticados.
- **Solução:** Calcular altura total, dividir em páginas com `addPage()`.

### M7. ✅ QR code com fallback externo (api.qrserver.com)
- **Onde:** `LabelPreview.tsx:37` — se geração local falha, usa serviço externo.
- **Risco:** Dependência externa em produção; URL contém o número do patrimônio (pode vazar info).
- **Solução:** Remover fallback. Se `qrcode` local falhar, mostrar erro.

### M8. ✅ PDF de Imóveis (já estava implementado)
- **Onde:** `generateImovelPDF()` referenciado em vários lugares mas implementação ausente.
- **Solução:** Implementar análogo ao `PatrimonioPDFGenerator`.

### M9. ✅ Templates de relatório (já estavam no banco)
- **Onde:** `ReportTemplate` é `type` TypeScript, não modelo Prisma. Salvos só em `localStorage`.
- **Sintoma:** Admin perde templates ao trocar de máquina. Não compartilhável.
- **Solução:** Já existe `imovel_report_templates` no banco; criar análogo para bens móveis OU usar `FichaTemplate` que serve ambos.

### M10. ✅ Coordenadas de imóveis sem mapa
- **Onde:** schema `Imovel` tem `latitude`/`longitude`, mas nenhuma visualização em mapa.
- **Solução:** Componente `<MapView lat lng />` usando Leaflet (já dep `react-leaflet`?). Verificar se vale o esforço.

### M11. ✅ Sem QR codes no PDF de inventário
- **Onde:** `InventarioPrint.tsx` — PDF tem stats mas sem QR codes.
- **Solução:** Adicionar QR code por item via lib `qrcode` (já dep).

### M12. ✅ Histórico sem granularidade
- **Onde:** `HistoricoEntry.details` é texto livre. Update massa de bens só registra "Atualização".
- **Solução:** JSON com `{ field, before, after }[]` no `details`. Permite diff visual.

### M13. ✅ Logout não invalida tokens entre dispositivos
- **Onde:** `logout` no backend só revoga refresh do dispositivo (ou todos se `allDevices: true`).
- **Sintoma:** Frontend não expõe "Logout de todos os dispositivos" para o usuário.
- **Solução:** Adicionar botão no perfil — `POST /api/auth/logout` com body `{ allDevices: true }`.

### M14. ✅ Métricas de DB e API mockadas
- **Onde:** `config/metrics.ts` — valores random para alguns KPIs.
- **Solução:** Trocar por queries reais via Prisma (counts) e middleware de performance real.

### M15. ✅ Dashboards inconsistentes
- **Onde:** 7 dashboards diferentes, com UX divergente. SuperuserDashboard minimalista, AdminDashboard rico.
- **Solução:** Unificar em `UnifiedDashboard` com seções por role visíveis condicionalmente.

---

## 🟢 Polimento — débito menor

- **P1.** ✅ `situacao_bem` vs `status` — documentado em `REGRAS_NEGOCIO.md §3.1`.
- **P2.** ✅ Endpoint `/api/health/metrics` agora redireciona para `/api/metrics/summary`.
- **P3.** ✅ CHECK constraints aplicadas via migration `add_patrimonio_check_constraints`.
- **P4.** ✅ Customização em **dois lugares** — separação mantida com avisos cruzados e docs.
- **P5.** `ReportView.tsx` filtra campo `descricao` duplicado (linhas 221, 471) — limpar.
- **P6.** `PatrimonioPDFGenerator` tem código de detecção de transparência (linhas 21-100) que pode ser extraído para utility.
- **P7.** Frontend Sentry desabilitado (`src/lib/sentry.ts` em bloco `/* */`) — ativar via `pnpm add @sentry/react`.
- **P8.** Endpoint `/api/auth/me` busca usuário com todos os campos toda vez — cachear em Redis com TTL curto.
- **P9.** Sem botão "Cancelar inventário em andamento" — só pode concluir.
- **P10.** Sem histórico de mudanças em customização (quem mudou o logo, quando) — adicionar `ActivityLog` action `UPDATE_CUSTOMIZATION`.

---

## 🎯 Recomendação de ordem de execução

### Sprint 6 (1 semana) — **bloqueadores de UX**

1. ✅ B1 — Reativar recuperação de senha (1h, baixo risco)
2. ✅ B6 — Consolidar rotas de transferência (escolher uma, deletar outra, ajustar frontend) — 1 dia, médio risco
3. ✅ B4 — Persistir customFields de imóveis (migration + service) — 1 dia
4. ✅ B5 — Upload real em documentos de baixa — 4h
5. ✅ B3 — Devolução de empréstimo (endpoint + UI) — 1 dia

### Sprint 7 (1 semana) — **inconsistências de fluxo**

6. ✅ I1 — Logout revoga refresh no servidor — 30min
7. ✅ I2 — Política de senha unificada em changePassword — 30min
8. ✅ I3 — checkMunicipality usar req.user, não body — 1h
9. ✅ I4 — Guards de estado em patrimônio (não editar se baixado/em transferência) — 4h
10. ✅ I7 — Rate limit em rotas públicas — 30min
11. ✅ I5 — Validação patrimonio XOR imovel em Manutenção — 1h
12. ✅ B2 — Sub-patrimônios: decidir entre implementar ou esconder UI — 1 dia se implementar, 1h se esconder

### Sprint 8 (2 semanas) — **qualidade**

13. M1 — Cleanup de código morto (transferências v1/v2, sub-patrimônios x3, dashboards) — 1 dia
14. M9 — Templates de relatório em banco — 1 dia
15. M5 — PDF/Excel via Web Worker — 1 dia
16. M15 — Unificar dashboards — 2 dias
17. P3 — CHECK constraints em valores/quantidades — 2h
18. M13 — UI "Logout de todos os dispositivos" — 1h
19. M7 — Remover fallback externo de QR — 30min

### Backlog (P2/P3 do plano geral)

- HttpOnly cookies para JWT
- Schemas Zod compartilhados
- Frontend Sentry
- Backup off-site (S3)
- Mapa de imóveis (Leaflet)
- React Window em listas grandes
- Auto-save de formulários

---

## 📊 Resumo numérico

| Categoria | Quantidade |
|-----------|------------|
| 🔴 Bloqueadores (B1-B6) | **6** |
| 🟠 Importantes (I1-I10) | **10** |
| 🟡 Melhorias (M1-M15) | **15** |
| 🟢 Polimento (P1-P10) | **10** |
| **Total** | **41** |

**Esforço estimado total:** ~30 dias úteis para 100%. Sprints 6+7 (P0/P1) cobrem 80% do valor em 2 semanas.

---

## 📝 Observações finais

**O que está bem:**
- Auth core (login, refresh com rotação, RBAC, multi-tenant) é sólido
- Refactor patrimonioService funcional, com testes
- Magic bytes no upload, console.log limpos, helmet/CSP/HSTS configurados
- Backup automático, healthcheck, rollback script
- CI com lint + type-check + audit + bundle check
- Sentry backend pronto (esperando DSN)

**O que mais merece atenção:**
- **Recuperação de senha** (B1) — quebrada há tempo, prioridade absoluta
- **Imóveis customFields** (B4) — feature anunciada mas inerte
- **Rotas duplicadas de transferência** (B6) — risco de corrupção de dados
- **Múltiplos arquivos com variantes** (dashboards, sub-patrimônios, transferências) — sinal de débito de governança; um cleanup grande ajuda a manutenção a longo prazo

Estes 4 pontos resolvem ~70% do impacto percebido pelo usuário final.
