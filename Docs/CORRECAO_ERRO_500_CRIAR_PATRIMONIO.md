# 🔧 Correção Erro 500 ao Criar Patrimônio - SISPAT 2.0

## 📋 Problema Identificado

Ao tentar criar um patrimônio, o sistema retornava erro 500:
```
POST http://localhost:3000/api/patrimonios 500 (Internal Server Error)
[HTTP] ❌ 500 /patrimonios {error: 'Erro ao criar patrimônio'}
```

## 🔍 **Causa do Problema**

O problema estava no `backend/src/controllers/patrimonioController.ts` na função `createPatrimonio`:

### **Problema 1: Validação Incompleta**
```typescript
// ❌ PROBLEMA - sectorId não estava sendo validado
if (!numero_patrimonio || !descricao_bem || !data_aquisicao || !valor_aquisicao) {
  res.status(400).json({ error: 'Campos obrigatórios faltando' });
  return;
}
```

O campo `sectorId` é obrigatório no schema do Prisma, mas não estava sendo validado.

### **Problema 2: Tentativa de Usar String como ID**
```typescript
// ❌ PROBLEMA - tentando usar setor_responsavel (string) como sectorId
sectorId: sectorId || setor_responsavel,
```

O código tentava usar `setor_responsavel` (que é uma string descritiva) como fallback para `sectorId` (que deve ser um UUID).

### **Schema do Prisma:**
```prisma
model Patrimonio {
  // ...
  sectorId     String    // Obrigatório (sem ?)
  localId      String?   // Opcional
  tipoId       String?   // Opcional
  
  sector       Sector            @relation(fields: [sectorId], references: [id])
  local        Local?            @relation(fields: [localId], references: [id])
  tipoBem      TipoBem?          @relation(fields: [tipoId], references: [id])
}
```

## ✅ **Correção Implementada**

### **1. Adicionada Validação do sectorId**
```typescript
// ✅ CORRIGIDO - sectorId agora é validado
if (!numero_patrimonio || !descricao_bem || !data_aquisicao || !valor_aquisicao || !sectorId) {
  res.status(400).json({ 
    error: 'Campos obrigatórios faltando (número, descrição, data aquisição, valor e setor)' 
  });
  return;
}
```

### **2. Removida Lógica Incorreta de Fallback**
```typescript
// ✅ CORRIGIDO - sectorId é obrigatório, outros campos opcionais recebem null
municipalityId: req.user.municipalityId,
sectorId,                              // Obrigatório - sem fallback
localId: localId || null,              // Opcional
tipoId: tipoId || null,                // Opcional
acquisitionFormId: acquisitionFormId || null,  // Opcional
```

## 📊 **Campos Obrigatórios vs Opcionais**

### **Campos Obrigatórios:**
- ✅ `numero_patrimonio` (string)
- ✅ `descricao_bem` (string)
- ✅ `data_aquisicao` (DateTime)
- ✅ `valor_aquisicao` (Float)
- ✅ `sectorId` (string UUID)

### **Campos Opcionais:**
- ⚪ `localId` (string UUID | null)
- ⚪ `tipoId` (string UUID | null)
- ⚪ `acquisitionFormId` (string UUID | null)
- ⚪ `marca`, `modelo`, `cor`, `numero_serie`, etc.

## 🧪 **Como Testar**

### **1. Teste com Todos os Campos Obrigatórios:**
```json
POST /api/patrimonios
{
  "numero_patrimonio": "001/2025",
  "descricao_bem": "Computador Desktop",
  "data_aquisicao": "2025-01-15",
  "valor_aquisicao": 2500.00,
  "sectorId": "uuid-do-setor"
}
```
**Resultado Esperado:** ✅ Status 201 - Patrimônio criado

### **2. Teste SEM sectorId:**
```json
POST /api/patrimonios
{
  "numero_patrimonio": "002/2025",
  "descricao_bem": "Notebook",
  "data_aquisicao": "2025-01-15",
  "valor_aquisicao": 3500.00
}
```
**Resultado Esperado:** ❌ Status 400 - "Campos obrigatórios faltando"

### **3. Teste com Campos Opcionais:**
```json
POST /api/patrimonios
{
  "numero_patrimonio": "003/2025",
  "descricao_bem": "Impressora",
  "data_aquisicao": "2025-01-15",
  "valor_aquisicao": 1500.00,
  "sectorId": "uuid-do-setor",
  "localId": "uuid-do-local",
  "tipoId": "uuid-do-tipo",
  "marca": "HP",
  "modelo": "LaserJet Pro"
}
```
**Resultado Esperado:** ✅ Status 201 - Patrimônio criado com campos opcionais

## 🎯 **Status Final**

- ✅ Validação de `sectorId` implementada
- ✅ Lógica de fallback incorreta removida
- ✅ Campos opcionais corretamente configurados
- ✅ Mensagens de erro mais descritivas
- ✅ Backend pronto para receber criação de patrimônios

## 📝 **Frontend - Verificação Necessária**

Certifique-se de que o frontend (`BensCreate.tsx`) está enviando o `sectorId` corretamente:

```typescript
// O formulário deve incluir sectorId nos dados enviados
const data = {
  numero_patrimonio: form.numero_patrimonio,
  descricao_bem: form.descricao_bem,
  data_aquisicao: form.data_aquisicao,
  valor_aquisicao: form.valor_aquisicao,
  sectorId: form.sectorId,  // ✅ Campo obrigatório
  localId: form.localId,    // ⚪ Opcional
  tipoId: form.tipoId,      // ⚪ Opcional
  // ... outros campos
};
```

## 🚀 **Próximos Passos**

1. ✅ **Reinicie o backend** (se necessário)
2. ✅ **Teste criar um patrimônio** no frontend
3. ✅ **Verifique os logs** para confirmar que não há mais erro 500
4. ✅ **Valide que o patrimônio foi criado** no banco de dados

---

**Correção aplicada em:** 07/10/2025  
**Arquivo corrigido:** `backend/src/controllers/patrimonioController.ts`  
**Status:** ✅ **RESOLVIDO**
