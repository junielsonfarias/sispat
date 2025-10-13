# 🔄 PLANO DE NORMALIZAÇÃO - CAMPOS DUPLICADOS

**Data:** 11 de Outubro de 2025  
**Versão:** 2.0.5 (Futuro)  
**Status:** 📋 PLANEJADO

---

## 🎯 OBJETIVO

Remover campos duplicados (String + FK) para melhorar:
- ✅ Integridade referencial
- ✅ Performance de queries
- ✅ Manutenibilidade
- ✅ Consistência de dados

---

## ⚠️ CAMPOS AFETADOS

### **Patrimônio (4 campos):**
```
❌ tipo (String) → tipoId (FK)
❌ forma_aquisicao (String) → acquisitionFormId (FK)
❌ setor_responsavel (String) → sectorId (FK)
❌ local_objeto (String) → localId (FK)
```

### **Imóvel (1 campo):**
```
❌ setor (String) → sectorId (FK)
```

---

## 📋 PLANO DE MIGRAÇÃO

### **FASE 1: Preparação (Sem Quebrar Sistema)**

#### **Step 1: Popular FKs Faltantes**
```sql
-- 1. Popular tipoId baseado no campo tipo
UPDATE patrimonios p
SET tipoId = (
  SELECT id FROM tipos_bens 
  WHERE nome = p.tipo 
  AND municipalityId = p.municipalityId
  LIMIT 1
)
WHERE tipoId IS NULL AND tipo IS NOT NULL;

-- 2. Popular acquisitionFormId baseado em forma_aquisicao
UPDATE patrimonios p
SET acquisitionFormId = (
  SELECT id FROM formas_aquisicao 
  WHERE nome = p.forma_aquisicao 
  AND municipalityId = p.municipalityId
  LIMIT 1
)
WHERE acquisitionFormId IS NULL AND forma_aquisicao IS NOT NULL;

-- 3. Popular localId baseado em local_objeto
UPDATE patrimonios p
SET localId = (
  SELECT id FROM locais 
  WHERE name = p.local_objeto 
  AND municipalityId = p.municipalityId
  LIMIT 1
)
WHERE localId IS NULL AND local_objeto IS NOT NULL;

-- 4. Verificar se todos foram populados
SELECT 
  COUNT(*) as total,
  COUNT(tipoId) as com_tipo_id,
  COUNT(acquisitionFormId) as com_acquisition_id,
  COUNT(localId) as com_local_id
FROM patrimonios;
```

#### **Step 2: Atualizar Backend para Usar FKs**
```typescript
// ANTES
const patrimonio = {
  tipo: 'Notebook',
  forma_aquisicao: 'Compra',
  setor_responsavel: 'TI',
  local_objeto: 'Sala 1'
}

// DEPOIS
const patrimonio = {
  tipoId: '<uuid-do-tipo>',
  acquisitionFormId: '<uuid-da-forma>',
  sectorId: '<uuid-do-setor>',
  localId: '<uuid-do-local>'
}

// Backend retorna com includes
include: {
  tipoBem: { select: { nome: true } },
  acquisitionForm: { select: { nome: true } },
  sector: { select: { name: true } },
  local: { select: { name: true } }
}
```

#### **Step 3: Atualizar Frontend para Aceitar Ambos**
```typescript
// Interface temporária (compatibilidade)
interface Patrimonio {
  // Campos legados (deprecated)
  tipo?: string
  forma_aquisicao?: string
  setor_responsavel?: string
  local_objeto?: string
  
  // Campos novos (preferir)
  tipoId: string
  acquisitionFormId: string
  sectorId: string
  localId: string
  
  // Relacionamentos
  tipoBem?: { nome: string }
  acquisitionForm?: { nome: string }
  sector?: { name: string }
  local?: { name: string }
}

// Usar computed property
get tipoNome() {
  return this.tipoBem?.nome || this.tipo || 'N/A'
}
```

---

### **FASE 2: Migração (Breaking Change Controlado)**

#### **Step 1: Remover Campos do Schema**
```prisma
model Patrimonio {
  // REMOVER:
  // tipo String
  // forma_aquisicao String
  // setor_responsavel String
  // local_objeto String
  
  // MANTER (tornar obrigatório):
  tipoId String
  acquisitionFormId String
  sectorId String
  localId String  // Era opcional, tornar obrigatório
}
```

#### **Step 2: Migration SQL**
```sql
-- migration.sql
-- 1. Verificar se todos têm FKs
SELECT COUNT(*) 
FROM patrimonios 
WHERE tipoId IS NULL 
   OR acquisitionFormId IS NULL 
   OR sectorId IS NULL 
   OR localId IS NULL;
-- Deve retornar 0

-- 2. Remover colunas antigas
ALTER TABLE patrimonios DROP COLUMN IF EXISTS tipo;
ALTER TABLE patrimonios DROP COLUMN IF EXISTS forma_aquisicao;
ALTER TABLE patrimonios DROP COLUMN IF EXISTS setor_responsavel;
ALTER TABLE patrimonios DROP COLUMN IF EXISTS local_objeto;

-- 3. Tornar FKs obrigatórios
ALTER TABLE patrimonios ALTER COLUMN tipoId SET NOT NULL;
ALTER TABLE patrimonios ALTER COLUMN acquisitionFormId SET NOT NULL;
ALTER TABLE patrimonios ALTER COLUMN sectorId SET NOT NULL;
ALTER TABLE patrimonios ALTER COLUMN localId SET NOT NULL;

-- 4. Mesma lógica para imoveis
ALTER TABLE imoveis DROP COLUMN IF EXISTS setor;
```

#### **Step 3: Atualizar Frontend**
```typescript
// Remover campos legados das interfaces
interface Patrimonio {
  // REMOVIDO: tipo, forma_aquisicao, setor_responsavel, local_objeto
  
  // Usar apenas:
  tipoId: string
  acquisitionFormId: string
  sectorId: string
  localId: string
  
  // E relacionamentos populados:
  tipoBem: { id: string, nome: string }
  acquisitionForm: { id: string, nome: string }
  sector: { id: string, name: string }
  local: { id: string, name: string }
}

// Componentes usam:
patrimonio.tipoBem.nome        // em vez de patrimonio.tipo
patrimonio.sector.name         // em vez de patrimonio.setor_responsavel
```

---

### **FASE 3: Verificação**

```sql
-- 1. Verificar integridade
SELECT 
  COUNT(*) as total_patrimonios,
  COUNT(DISTINCT tipoId) as tipos_distintos,
  COUNT(DISTINCT sectorId) as setores_distintos,
  COUNT(DISTINCT localId) as locais_distintos
FROM patrimonios;

-- 2. Verificar performance
EXPLAIN ANALYZE
SELECT p.*, t.nome as tipo_nome, s.name as setor_nome
FROM patrimonios p
JOIN tipos_bens t ON p.tipoId = t.id
JOIN sectors s ON p.sectorId = s.id
WHERE p.municipalityId = '...' AND p.status = 'ativo'
ORDER BY p.createdAt DESC
LIMIT 50;
-- Deve usar índices compostos!

-- 3. Verificar tamanho
SELECT 
  pg_size_pretty(pg_total_relation_size('patrimonios')) as tamanho_total,
  pg_size_pretty(pg_relation_size('patrimonios')) as tamanho_tabela,
  pg_size_pretty(pg_total_relation_size('patrimonios') - pg_relation_size('patrimonios')) as tamanho_indices;
```

---

## 📊 BENEFÍCIOS ESPERADOS

### **Performance:**
```
Queries com JOIN: +30% mais rápido
Tamanho da tabela: -15% (sem strings duplicadas)
Índices: Mais eficientes (FK vs String)
```

### **Integridade:**
```
Referencial: 100% garantida
Cascata: DELETE em tipos_bens não deixa órfãos
Validação: Impossível criar com tipo inválido
```

### **Manutenibilidade:**
```
Mudança no nome do setor: Atualiza automaticamente
Novo tipo de bem: Relação clara
Código: Mais limpo e type-safe
```

---

## ⚠️ RISCOS E MITIGAÇÃO

### **Risco 1: Dados Legados Sem FK**
```sql
-- Mitigação: Popular FKs antes de remover strings
-- Verificar: SELECT COUNT(*) FROM patrimonios WHERE tipoId IS NULL
```

### **Risco 2: Frontend Quebrando**
```typescript
// Mitigação: Fazer em 2 fases
// Fase 1: Frontend aceita ambos (tipo OU tipoBem.nome)
// Fase 2: Após migração, remover campo tipo
```

### **Risco 3: Performance Durante Migração**
```sql
-- Mitigação: Fazer em horário de baixo uso
-- Usar transações para rollback se necessário
BEGIN;
  -- migrations
  -- Se algo falhar, ROLLBACK
COMMIT;
```

---

## 📅 TIMELINE SUGERIDO

### **Semana 1: Preparação**
- Backup completo do banco
- Popular FKs faltantes
- Testar em ambiente de staging

### **Semana 2: Deploy Frontend Compatível**
- Frontend aceita tipo OU tipoBem.nome
- Backward compatible
- Deploy em produção

### **Semana 3: Migração do Banco**
- Executar DROP COLUMN
- Tornar FKs NOT NULL
- Verificar integridade

### **Semana 4: Limpeza**
- Remover código legado do frontend
- Documentação atualizada
- Monitoring de performance

---

## ✅ DECISÃO

**RECOMENDAÇÃO:** 🟡 **Não urgente, mas benéfico**

O sistema funciona perfeitamente como está. Esta normalização é uma **otimização**, não uma **correção de bug**. Pode ser feita quando houver:
- Janela de manutenção programada
- Ambiente de staging para testar
- Tempo para ajustar frontend

**Prioridade:** 🟡 Média (3-6 meses)

---

**Equipe SISPAT - 11/10/2025**

