# 🧠 ANÁLISE COMPLETA DA LÓGICA - SISPAT 2.0.4

**Data:** 11 de Outubro de 2025  
**Versão:** 2.0.4  
**Status:** ✅ ANALISADO

---

## 📊 RESUMO EXECUTIVO

### **Nota Geral da Lógica: 92/100** ⭐⭐⭐⭐⭐

| Aspecto | Nota | Status |
|---------|------|--------|
| **Autenticação** | 95/100 | ✅ Excelente |
| **Autorização** | 92/100 | ✅ Muito Bom |
| **Fluxo de Dados** | 88/100 | ✅ Bom |
| **Regras de Negócio** | 90/100 | ✅ Muito Bom |
| **Validações** | 87/100 | ✅ Bom |
| **Consistência** | 85/100 | ⚠️ Bom (melhorias possíveis) |

---

## 🔐 AUTENTICAÇÃO (95/100)

### **Fluxo de Login:**

```typescript
1. User Input
   ├── Email
   └── Password
   
2. Frontend → POST /api/auth/login
   ├── Validação: Email e senha obrigatórios
   └── Request: { email, password }

3. Backend (authController.login)
   ├── Buscar user no DB (email lowercase)
   ├── Verificar se está ativo
   ├── Comparar senha (bcrypt)
   ├── Gerar JWT (24h) + Refresh Token (7d)
   └── Return: { user, token, refreshToken }

4. Frontend (AuthContext)
   ├── Salvar no SecureStorage (localStorage criptografado)
   ├── setUser(user)
   ├── navigate('/') → Dashboard baseado em role
   └── Buscar lista completa de users (se admin/supervisor)
```

**Pontos Fortes:**
- ✅ JWT + Refresh Token
- ✅ bcrypt (salt 10)
- ✅ Password lowercase normalização
- ✅ Validação de senha forte (12+ chars, maiúsc, minúsc, números, símbolos)
- ✅ Token expiration configurável
- ✅ Inactivity timeout (30min)

**Melhorias Possíveis:**
- 🟡 2FA (Two-Factor Authentication)
- 🟡 Limite de tentativas de login
- 🟡 Password reset via email

---

## 🛡️ AUTORIZAÇÃO - SISTEMA DE PERMISSÕES (92/100)

### **Hierarquia de Roles:**

```
superuser (Máximo poder)
  ├── Acesso: TUDO
  ├── Gerencia: Todos os municípios
  └── Pode: Tudo

admin (Administrador do município)
  ├── Acesso: Todos os setores do município
  ├── Cria: Usuários (exceto superuser)
  ├── Gerencia: Patrimônios, Imóveis, Setores
  └── Upload: Logo e customização

supervisor (Supervisor)
  ├── Acesso: Todos os setores do município  
  ├── Cria: Usuários (exceto superuser)
  ├── Gerencia: Patrimônios, Imóveis
  └── Upload: Logo e customização

usuario (Usuário padrão)
  ├── Acesso: Apenas setores atribuídos
  ├── Cria: Patrimônios e Imóveis (setores atribuídos)
  ├── Edita: Patrimônios e Imóveis (setores atribuídos)
  └── Visualiza: Apenas seus setores

visualizador (Apenas leitura)
  ├── Acesso: Apenas setores atribuídos
  ├── Visualiza: Patrimônios e Imóveis
  └── Não pode: Criar, Editar, Deletar
```

### **Implementação Backend:**

```typescript
// patrimonioController.ts (linha 119-155)

if (req.user?.role === 'usuario' || req.user?.role === 'visualizador') {
  // Buscar setores responsáveis do usuário
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { responsibleSectors: true }
  })
  
  if (user && user.responsibleSectors.length > 0) {
    // Buscar IDs dos setores pelos nomes
    const sectors = await prisma.sector.findMany({
      where: { 
        name: { in: user.responsibleSectors },
        municipalityId: req.user.municipalityId
      }
    })
    
    // Filtrar apenas pelos setores atribuídos
    where.sectorId = { in: sectors.map(s => s.id) }
  }
}

// ✅ Admin e Supervisor: Sem filtro (veem todos os setores)
```

**Pontos Fortes:**
- ✅ Separação clara de permissões
- ✅ Filtro automático por setor (backend)
- ✅ Middleware de autenticação robusto
- ✅ Validação de role em cada endpoint

**Inconsistências Encontradas:**
- ⚠️ Alguns endpoints não verificam role
- ⚠️ Validador de visualizador não impede edição em alguns lugares

---

## 📊 FLUXO DE DADOS PRINCIPAL

### **1. CRUD de Patrimônio:**

```
┌─────────────────────────────────────────────────────────┐
│  CRIAR PATRIMÔNIO                                        │
└─────────────────────────────────────────────────────────┘

Frontend (BensCreate.tsx)
  ├── useForm() com patrimonioBaseSchema
  ├── Validações Zod (30+ validações)
  ├── Campos obrigatórios: 15
  └── Campos opcionais: 17

↓ onSubmit

PatrimonioContext.addPatrimonio()
  ├── Gera número patrimonial automático
  ├── Processa fotos (upload → URL)
  ├── Monta objeto Patrimonio
  └── POST /api/patrimonios

↓

Backend (patrimonioController.create)
  ├── Verifica autenticação (JWT)
  ├── Verifica permissões (role)
  ├── Valida campos obrigatórios
  ├── Cria no banco via Prisma
  ├── Registra log de auditoria
  └── Return: { message, patrimonio }

↓

Frontend (PatrimonioContext)
  ├── Adiciona à lista local
  ├── logActivity('PATRIMONIO_CREATE')
  ├── toast('Sucesso!')
  └── navigate('/bens-cadastrados')

┌─────────────────────────────────────────────────────────┐
│  TOTAL: 7 camadas de validação e processamento          │
└─────────────────────────────────────────────────────────┘
```

---

### **2. Sistema de Permissões por Setor:**

```
┌─────────────────────────────────────────────────────────┐
│  PERMISSÕES POR SETOR                                    │
└─────────────────────────────────────────────────────────┘

User (banco)
  └── responsibleSectors: String[] (array de nomes)

↓ Login

AuthContext
  └── user.responsibleSectors = ['TI', 'Patrimônio']

↓ Buscar Patrimônios

Backend (patrimonioController.listPatrimonios)
  ├── Verificar role
  │   ├── superuser/admin/supervisor → SEM FILTRO
  │   └── usuario/visualizador → FILTRAR
  │
  ├── Se filtrar:
  │   ├── Buscar IDs dos setores pelos nomes
  │   ├── sectors = prisma.sector.findMany({ 
  │   │     where: { name: { in: responsibleSectors } }
  │   │   })
  │   └── where.sectorId = { in: sectorIds }
  │
  └── Retornar apenas patrimônios permitidos

↓ Frontend

PatrimonioContext
  └── patrimonios (já filtrados pelo backend)

Componente
  └── Renderiza apenas o que o usuário pode ver
```

**Pontos Fortes:**
- ✅ Filtro no backend (seguro)
- ✅ Hierarquia clara de permissões
- ✅ Array de setores permite múltiplos

**Problema Identificado:**
- ⚠️ `responsibleSectors` é array de **nomes** (Strings)
- ⚠️ Deveria ser array de **IDs** (mais robusto)
- ⚠️ Se renomear setor, quebra a relação

---

## 🔄 FLUXO DE TRANSFERÊNCIA

```
Transferir Patrimônio
  ├── 1. Usuário seleciona patrimônio
  ├── 2. Abre modal de transferência
  ├── 3. Seleciona setor destino
  ├── 4. Preenche motivo
  └── 5. Confirma

↓

TransferContext.addTransferencia()
  ├── Cria objeto Transferencia
  ├── status: 'pendente'
  ├── Persiste em localStorage (⚠️ deveria ser API)
  └── Adiciona notificação

↓ (Deveria ter)

Backend /api/transferencias
  ├── Criar registro de transferência
  ├── Atualizar patrimônio.sectorId
  ├── Criar histórico de movimentação
  └── Notificar responsáveis

↓

Aprovação (supervisor)
  ├── Lista transferências pendentes
  ├── Aprovar ou Rejeitar
  └── Se aprovar: Atualizar patrimônio
```

**⚠️ PROBLEMA CRÍTICO:**
```
TransferContext usa apenas localStorage!
❌ Não persiste no banco de dados
❌ Não atualiza patrimônio.sectorId
❌ Transferências se perdem ao limpar cache

SOLUÇÃO: Implementar backend /api/transferencias
```

---

## 📦 LÓGICA DE PATRIMÔNIO

### **Geração de Número Patrimonial:**

```typescript
// src/lib/asset-utils.ts
generatePatrimonialNumber(patrimonios, prefix?, year?)
  ├── Pega ano atual
  ├── Filtra patrimônios do mesmo ano
  ├── Encontra maior número
  ├── Incrementa +1
  └── Formata: PAT-2025-0001

Padrão: {PREFIX}-{ANO}-{SEQUENCIAL}
```

**Pontos Fortes:**
- ✅ Único por ano
- ✅ Sequencial
- ✅ Formato padronizado

**Problemas:**
- ⚠️ Gerado no frontend (pode ter conflito)
- ⚠️ Não verifica unicidade no banco antes de salvar
- ⚠️ Dois usuários podem gerar o mesmo número simultaneamente

**Solução:**
```typescript
// Backend deveria gerar
const ultimoNumero = await prisma.patrimonio.findFirst({
  where: { 
    numero_patrimonio: { startsWith: `PAT-${year}` }
  },
  orderBy: { numero_patrimonio: 'desc' }
})
```

---

### **Depreciação:**

```typescript
// src/lib/depreciation-utils.ts
calculateDepreciation(patrimonio)
  ├── Método: Linear, Acelerado, ou Soma dos Dígitos
  ├── Cálculo:
  │   ├── Anos decorridos desde aquisição
  │   ├── Valor depreciável = valor - residual
  │   ├── Taxa anual = 100 / vida_util
  │   └── Valor atual = valor - depreciado
  └── Return: {
        valorDepreciado,
        valorAtual,
        percentualDepreciado,
        taxaDepreciacaoAnual,
        remainingLifeMonths
      }
```

**Pontos Fortes:**
- ✅ 3 métodos de depreciação
- ✅ Cálculos precisos
- ✅ Considera valor residual

**Uso:**
- ✅ Dashboard de Depreciação
- ✅ Relatórios
- ⚠️ Não atualiza automaticamente (calculado on-demand)

---

## 🔍 VALIDAÇÕES

### **Frontend (Zod Schemas):**

```typescript
// patrimonioBaseSchema
✅ descricao_bem: min(3)
✅ tipo: min(1)  
✅ data_aquisicao: valid date
✅ valor_aquisicao: min(0.01)
✅ quantidade: min(1), integer
✅ setor_responsavel: min(1)
✅ local_objeto: min(1)
✅ forma_aquisicao: min(1)
✅ situacao_bem: enum

Total: 30+ validações Zod
```

### **Backend (Express Validator + Prisma):**

```typescript
// authController
✅ Email: formato válido, lowercase
✅ Password: min(12), regex complexo
✅ Role: enum válido

// patrimonioController
✅ Campos obrigatórios presentes
✅ Foreign keys existem
✅ MunicipalityId correto
⚠️ Número patrimonial único (não verifica antes)

// userController
✅ Email único
✅ Password complexo (12+ chars, maiúsc, minúsc, num, símb)
✅ Role válido
✅ ResponsibleSectors não vazio (se usuario)
```

**Gaps:**
- ⚠️ Validação de número patrimonial único (gerado no frontend)
- ⚠️ Validação de valores negativos (só no frontend)
- ⚠️ Validação de datas futuras

---

## 🔄 FLUXOS DE NEGÓCIO CRÍTICOS

### **1. CRIAÇÃO DE USUÁRIO:**

```
Admin/Supervisor → Criar Usuário
  ├── Validações:
  │   ├── Email único ✅
  │   ├── Password forte (12+ chars) ✅
  │   ├── Role válido ✅
  │   ├── ResponsibleSectors (se usuario) ✅
  │
  ├── Backend:
  │   ├── Hash password (bcrypt) ✅
  │   ├── Criar no banco ✅
  │   ├── Log de auditoria ✅
  │   └── Return user
  │
  └── Frontend:
      ├── Adiciona à lista
      ├── toast('Sucesso')
      └── Fecha modal
```

---

### **2. GERAÇÃO DE ETIQUETAS:**

```
Selecionar Patrimônios → Gerar Etiquetas
  ├── Template selecionado
  ├── Dados do patrimônio
  ├── QR Code gerado (URL pública)
  ├── PDF gerado (jsPDF)
  └── Download automático

Dados na Etiqueta:
  ├── Número patrimonial ✅
  ├── Descrição ✅
  ├── Setor ✅
  ├── Local ✅
  ├── QR Code (link consulta pública) ✅
  └── Logo do município ✅
```

---

### **3. INVENTÁRIO FÍSICO:**

```
Criar Inventário
  ├── Escopo: Setor / Local / Específico
  ├── Responsável
  ├── Data início
  └── Status: em_andamento

↓

Executar Inventário
  ├── Lista patrimônios do escopo
  ├── Marca: Encontrado / Não encontrado
  ├── Adiciona observações
  └── Verifica por (usuário + data)

↓

Finalizar Inventário
  ├── Gera relatório
  ├── Identifica divergências
  ├── Status: concluído
  └── Sugere ações (baixar, procurar)
```

**Problema:**
- ⚠️ Usa apenas localStorage (não persiste no banco)
- ⚠️ Perde dados ao limpar cache

---

### **4. BAIXA DE BEM:**

```
Dar Baixa em Patrimônio
  ├── Motivo: Obrigatório
  ├── Data da baixa: Obrigatório
  ├── Documentos comprobatórios: Opcional
  └── Observações: Opcional

↓

Backend (patrimonioController.baixa)
  ├── Verificar se patrimônio existe ✅
  ├── Verificar se já não foi baixado ✅
  ├── Atualizar:
  │   ├── status = 'baixado' ✅
  │   ├── data_baixa ✅
  │   ├── motivo_baixa ✅
  │   ├── documentos_baixa ✅
  │   └── updatedBy ✅
  ├── Criar histórico ✅
  ├── Log de auditoria ✅
  └── Return patrimônio atualizado

↓

Frontend
  ├── Atualiza lista
  ├── Remove dos ativos
  ├── toast('Baixa registrada')
  └── navigate('/bens')
```

**Pontos Fortes:**
- ✅ Não deleta (soft delete via status)
- ✅ Mantém histórico
- ✅ Documentos anexados
- ✅ Auditoria completa

---

## 🎯 REGRAS DE NEGÓCIO

### **Patrimônio:**

```typescript
1. Número Patrimonial:
   ✅ Único no sistema
   ✅ Formato: PAT-YYYY-NNNN
   ✅ Gerado automaticamente
   ⚠️ Gerado no frontend (deveria ser backend)

2. Valor de Aquisição:
   ✅ Deve ser > 0
   ✅ Formato: Float
   ⚠️ Sem validação de valor máximo

3. Quantidade:
   ✅ Deve ser >= 1
   ✅ Integer
   ✅ Se Kit (qtd > 1): Gera sub-patrimônios

4. Status:
   ✅ Enum: 'ativo', 'inativo', 'baixado', 'manutencao', 'extraviado'
   ✅ Default: 'ativo'
   ✅ Baixado: Irreversível (soft delete)

5. Depreciação:
   ✅ Métodos: Linear, Acelerado, Soma dos Dígitos
   ✅ Vida útil: Anos
   ✅ Valor residual: Opcional
   ⚠️ Não atualiza automaticamente

6. Fotos e Documentos:
   ✅ Array de URLs
   ✅ Upload via multer
   ✅ Limite: 10MB por arquivo
   ⚠️ Sem validação de tipo de arquivo no banco

7. Transferência:
   ⚠️ Usa localStorage (não persiste no banco)
   ⚠️ Não atualiza sectorId automaticamente
```

---

### **Imóvel:**

```typescript
1. Número Patrimonial:
   ✅ Único
   ✅ Formato: IM-YYYY-NNNN
   
2. Áreas:
   ✅ area_terreno: Float
   ✅ area_construida: Float
   ✅ Pode ser 0

3. Geolocalização:
   ✅ latitude/longitude: Float?
   ✅ Opcional
   ✅ Usado para mapas

4. Campos Customizados:
   ✅ Configuráveis por município
   ✅ Tabela: imovel_custom_fields
   ✅ Tipos: text, number, date, select, checkbox
```

---

### **Setor (Sector):**

```typescript
1. Código:
   ✅ Único no município
   ✅ String (ex: "TI", "ADM")
   
2. Hierarquia:
   ✅ parentId: Permite sub-setores
   ⚠️ Não implementado na UI

3. Responsável:
   ✅ Nome do responsável
   ⚠️ Deveria ser FK para User

4. CNPJ:
   ✅ Opcional (para secretarias)
   ⚠️ Sem validação de formato
```

---

## 🔗 DEPENDÊNCIAS ENTRE CONTEXTOS

### **Árvore de Dependências:**

```
AuthContext (Raiz)
  ├── user → Usado por TODOS
  ├── isAuthenticated → Rotas protegidas
  └── logout → Limpa TUDO

↓ Depende de AuthContext

PermissionContext
  └── user.role → Permissões

ActivityLogContext
  └── user.id → Logs

CustomizationContext
  └── user.municipalityId → Configurações

SectorContext
  ├── user.municipalityId → Filtro
  └── user.responsibleSectors → Permissões

↓ Depende de SectorContext

LocalContext
  └── sectors → Filtrar locais por setor

PatrimonioContext
  ├── user → Permissões
  └── sectors → Validação de setor

↓ Depende de PatrimonioContext

TransferContext
  ├── patrimonios → Transferir
  └── updatePatrimonio → Atualizar após transferência

InventoryContext
  └── patrimonios → Itens do inventário
```

**Ciclos de Dependência:**
```
❌ NENHUM DETECTADO ✅
Hierarquia bem definida
```

---

## ⚠️ PROBLEMAS LÓGICOS IDENTIFICADOS

### **1. CRÍTICO: TransferContext Usa LocalStorage**

```typescript
// src/contexts/TransferContext.tsx

❌ const stored = localStorage.getItem('sispat_transferencias')
❌ const persist = (data) => localStorage.setItem(...)

Problema:
- Transferências não vão para o banco
- Dados se perdem ao limpar cache
- Não há auditoria
- Não atualiza patrimônio.sectorId
```

**Solução:**
```typescript
// Criar endpoint backend
POST /api/transferencias
  ├── Criar registro na tabela transferencias
  ├── Se aprovada: Atualizar patrimonio.sectorId
  ├── Criar histórico
  └── Notificar

// Context usar API
const addTransferencia = async (data) => {
  const response = await api.post('/transferencias', data)
  setAllTransferencias(prev => [...prev, response])
}
```

---

### **2. CRÍTICO: DocumentContext Usa LocalStorage**

```typescript
❌ localStorage.getItem('sispat_general_documents')

Problema:
- Documentos não persistem
- Sem backup
- Arquivos podem estar no servidor mas sem referência
```

---

### **3. MÉDIO: Número Patrimonial Gerado no Frontend**

```typescript
// generatePatrimonialNumber() roda no cliente

Risco:
⚠️ Dois usuários podem gerar o mesmo número simultaneamente
⚠️ Race condition

Solução:
✅ Backend gerar número (atomic increment)
✅ UNIQUE constraint garante unicidade
```

---

### **4. MÉDIO: ResponsibleSectors Usa Nomes (String)**

```typescript
user.responsibleSectors = ['TI', 'Patrimônio']

Problema:
⚠️ Se renomear setor, quebra relação
⚠️ Busca ineficiente (JOIN por string)

Solução:
✅ Usar IDs: ['uuid-1', 'uuid-2']
✅ Relacionamento M:N na tabela
```

---

### **5. BAIXO: Inventário Não Persiste**

```typescript
❌ localStorage.getItem('sispat_inventarios')

Impacto: Médio (feature secundária)
```

---

## 📊 SCORECARD POR MÓDULO

### **Autenticação e Autorização:**
```
Login/Logout: 95/100 ⭐⭐⭐⭐⭐
JWT: 95/100 ⭐⭐⭐⭐⭐
Permissões: 92/100 ⭐⭐⭐⭐⭐
Senha Forte: 95/100 ⭐⭐⭐⭐⭐
Inactivity Timeout: 90/100 ⭐⭐⭐⭐⭐
```

### **CRUD Patrimônio:**
```
Criar: 90/100 ⭐⭐⭐⭐⭐
Editar: 92/100 ⭐⭐⭐⭐⭐
Deletar: 95/100 ⭐⭐⭐⭐⭐ (soft delete)
Listar: 95/100 ⭐⭐⭐⭐⭐ (paginação + filtros)
Buscar: 95/100 ⭐⭐⭐⭐⭐
```

### **Movimentação:**
```
Transferência: 60/100 ⭐⭐⭐ (localStorage)
Empréstimo: 60/100 ⭐⭐⭐ (localStorage)
Baixa: 95/100 ⭐⭐⭐⭐⭐ (completo)
Histórico: 90/100 ⭐⭐⭐⭐⭐
```

### **Features:**
```
Inventário: 65/100 ⭐⭐⭐ (localStorage)
Manutenção: 85/100 ⭐⭐⭐⭐ (API + fallback)
Relatórios: 90/100 ⭐⭐⭐⭐⭐
Etiquetas: 92/100 ⭐⭐⭐⭐⭐
Depreciação: 88/100 ⭐⭐⭐⭐
```

### **Auditoria:**
```
Activity Log: 95/100 ⭐⭐⭐⭐⭐
Histórico: 90/100 ⭐⭐⭐⭐⭐
Rastreamento: 92/100 ⭐⭐⭐⭐⭐
```

---

## 🎯 PRIORIDADES DE CORREÇÃO

### **🔴 ALTA (Implementar em 1-2 meses):**

1. **Migrar TransferContext para API**
   - Impacto: Alto
   - Dados críticos se perdem

2. **Migrar DocumentContext para API**
   - Impacto: Alto
   - Arquivos sem rastreamento

3. **Número Patrimonial no Backend**
   - Impacto: Médio
   - Previne race conditions

---

### **🟡 MÉDIA (2-4 meses):**

4. **ResponsibleSectors usar IDs**
   - Impacto: Médio
   - Performance + integridade

5. **Migrar InventoryContext para API**
   - Impacto: Médio
   - Feature importante

6. **Adicionar validações backend**
   - Valores negativos
   - Datas futuras
   - Número patrimonial único

---

### **🟢 BAIXA (Futuro):**

7. **2FA para roles críticos**
8. **Workflow de aprovação (transferências)**
9. **Notificações em tempo real (WebSocket)**
10. **Hierarquia de setores (parentId)**

---

## ✅ PONTOS FORTES DA LÓGICA

1. ✅ **Separação clara de responsabilidades**
2. ✅ **Validações robustas no frontend**
3. ✅ **Sistema de permissões bem implementado**
4. ✅ **Auditoria completa (ActivityLog)**
5. ✅ **Soft delete (preserva histórico)**
6. ✅ **Paginação em listagens**
7. ✅ **Filtros por setor automáticos**
8. ✅ **Upload de arquivos seguro**
9. ✅ **Geração de relatórios PDF**
10. ✅ **QR Codes para consulta pública**

---

## ⚠️ INCONSISTÊNCIAS LÓGICAS

### **1. Transferência vs Histórico:**
```
Transferência:
❌ localStorage only
❌ Não atualiza patrimônio

Histórico:
✅ Salvo no banco
✅ Rastreável

Inconsistente!
```

### **2. API vs LocalStorage:**
```
API (Correto):
✅ Patrimônios
✅ Imóveis
✅ Setores
✅ Usuários
✅ Manutenção (com fallback)

LocalStorage Only (Problemático):
❌ Transferências
❌ Documentos
❌ Inventários (parcial)
❌ Permissões

Misturado:
⚠️ Customization (API + localStorage cache)
⚠️ Theme (localStorage)
```

---

## 📋 RECOMENDAÇÕES

### **Corrigir Agora:**
1. Migrar TransferContext para API
2. Migrar DocumentContext para API
3. Número patrimonial no backend

### **Melhorar Depois:**
4. ResponsibleSectors usar IDs
5. Validações adicionais backend
6. Inventário persistir no banco

---

## 🏆 NOTA FINAL DA LÓGICA

```
LÓGICA SISPAT 2.0.4: 92/100 ⭐⭐⭐⭐⭐

✅ Autenticação: Excelente
✅ Autorização: Muito Bom
✅ CRUD: Completo e robusto
✅ Auditoria: Profissional
⚠️ Persistência: Inconsistente (API vs localStorage)

Recomendação: Migrar features de localStorage para API
```

---

**Equipe SISPAT - 11/10/2025**

