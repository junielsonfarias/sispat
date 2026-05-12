# REGRAS DE NEGÓCIO — SISPAT 2.0

## Domínio: Gestão de Patrimônio Público Municipal

Sistema usado por prefeituras para controlar bens móveis e imóveis, com inventários, transferências, empréstimos, manutenções e relatórios.

---

## 1. Multi-tenancy (Municípios)

- Cada `Municipality` é um tenant isolado.
- Usuário pertence a UM município (exceto `superuser` que vê todos).
- **Toda query de dados precisa filtrar `municipalityId`.** Já existe middleware `checkMunicipality` mas a regra deve ser também aplicada na camada de query.
- `superuser` é o operador da plataforma (não pertence a município específico).

## 2. Papéis (RBAC)

| Role | Escopo | Capacidades-chave |
|------|--------|-------------------|
| `superuser` | Toda a plataforma | Gerencia municípios, customizações globais, todos os usuários |
| `admin` | Município | Gerencia usuários do município, configurações, todos os setores |
| `supervisor` | Setores responsáveis | Aprovar transferências, gerenciar bens dos seus setores |
| `usuario` | Setores responsáveis | Cadastrar/editar bens, fazer inventário, registrar manutenção |
| `visualizador` | Setores responsáveis | Somente leitura |

`responsibleSectors[]` no `User` define o escopo dentro do município para os 3 papéis intermediários.

## 3. Patrimônio (Bem Móvel)

- **Número de patrimônio** é gerado automaticamente baseado em prefixo do setor + sequencial.
- Campos obrigatórios: descrição, setor, local, valor de aquisição, data de aquisição.
- **Baixa:** requer justificativa + workflow de aprovação (supervisor/admin).
- **Fotos:** múltiplas, com compressão no frontend. URLs `blob-*` são bloqueadas no update (foram fonte de bug — ver `HISTORICO_CORRECOES.md`).
- **Depreciação:** calculada por `lib/depreciation-utils.ts` (frontend) — fórmula linear baseada em vida útil + valor residual.

### 3.1 `status` vs `situacao_bem` — semânticas distintas

Os dois campos existem por motivos diferentes — **não duplicam**, embora pareçam parecidos:

| Campo | Tipo | Valores | Quem controla | Para quê |
|-------|------|---------|---------------|----------|
| **`status`** | enum | `ativo`, `inativo`, `em_manutencao`, `baixado`, `emprestado`, `transferido` | **Sistema** (atualizado por fluxos: baixa, empréstimo, transferência) | **Estado operacional** — define o que se pode fazer com o bem (guards de mutação) |
| **`situacao_bem`** | enum | `OTIMO`, `BOM`, `REGULAR`, `RUIM`, `PESSIMO` | **Usuário** (preenche manualmente na inspeção/inventário) | **Condição física** — usado em relatórios de conservação |

**Regra:** UI de cadastro/edição mostra `situacao_bem` ao usuário (campo manual). `status` é alterado apenas pelos fluxos do sistema (baixa marca `baixado`, empréstimo marca `emprestado`, etc.) — **não deve ter dropdown manual de status** em formulários de bem.

**Exceção atual:** `BensCreate`/`BensEdit` permitem editar `status` direto. Isso é débito — ver M-pending no `PLANO_MELHORIAS_FLUXOS.md`.

## 4. Imóvel (Bem Imóvel)

- Estrutura paralela ao Patrimônio, mas com campos específicos: endereço, área terreno, área construída, matrícula.
- Templates de ficha customizáveis por município (`FichaTemplate`).

## 5. Setores e Locais

- `Sector` = unidade organizacional responsável (ex: "Secretaria de Educação").
- `Local` = endereço físico onde o bem está (ex: "Escola Municipal X").
- Um bem pertence a 1 setor (responsabilidade) e está em 1 local (localização física).

## 6. Transferência

Fluxo: `pendente` → `aprovada` ou `rejeitada`.
- Solicitante: `usuario`/`supervisor` do setor origem.
- Aprovador: `supervisor` do setor destino (ou `admin`).
- Ao aprovar, o `Patrimonio.sectorId` é atualizado e ActivityLog é gravado.

## 7. Empréstimo

- Saída temporária de bem para responsável (pessoa).
- Campos: `dataEmprestimo`, `dataPrevDevolucao`, `dataDevolucaoReal`.
- Bem em empréstimo não pode ser transferido nem baixado.

## 8. Inventário

- Conjunto de bens conferidos em uma data/escopo.
- Itens recebem status: `conferido`, `nao_localizado`, `divergente`.
- Geração de PDF de inventário com QR codes.

## 9. Manutenção

- Tarefas vinculadas ao bem com tipo (`preventiva` ou `corretiva`), data prevista, custo, fornecedor.
- Status: `aberta`, `em_andamento`, `concluida`, `cancelada`.

## 10. Auditoria (ActivityLog)

Toda ação sensível grava registro com: usuário, ação, entidade, payload-antes/depois, IP, user-agent.
Acessível apenas por `admin`/`superuser` em "Configurações → Auditoria".

## 11. Consulta Pública

- Endpoint sem autenticação (`/api/public/patrimonios`).
- Exibe apenas bens com status `ativo`.
- Acesso via QR code (gerado em etiquetas) ou consulta por número.
- **Não expor** valores monetários, dados de empréstimo, ou históricos detalhados.

## 12. Customização por Município

Cada município pode customizar:
- Logo + cores (primary)
- Templates de ficha de patrimônio/imóvel
- Templates de relatório (PDF/Excel)
- Modelos de etiqueta (QR + texto)
- Campos personalizados (`FormFieldManagement`)

Tabela: `customizations` (acessada via `customizationController.ts`).

## 13. Validações de input padrão

| Campo | Regra |
|-------|-------|
| Email | `isEmail()` + `normalizeEmail()` |
| Senha | mín 8 chars, com maiúscula, minúscula, número, símbolo |
| Nome | 2–100 chars, apenas letras (regex) |
| Número de patrimônio | string única por município |
| Valor | número positivo |
| Datas | ISO 8601 |

## 14. Política de retenção

- Backups diários do banco (cron `0 2 * * *`), retenção 30 dias (`BACKUP_RETENTION_DAYS`).
- Logs com rotação diária, max 10MB por arquivo, 5 arquivos.
- ActivityLog **sem expurgo automático** (manter histórico permanente).
