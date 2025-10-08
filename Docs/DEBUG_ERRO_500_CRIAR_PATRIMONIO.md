# 🔍 Debug - Erro 500 ao Criar Patrimônio - SISPAT 2.0

## 📋 Problema Relatado

Ao tentar salvar/criar um patrimônio, ocorre erro 500:
```
POST http://localhost:3000/api/patrimonios 500 (Internal Server Error)
[HTTP] ❌ 500 /patrimonios {error: 'Erro ao criar patrimônio'}
```

## 🔧 **Logs de Debug Adicionados**

Para identificar a causa exata do erro, foram adicionados logs detalhados no backend:

### **1. Log do Request Body**
```typescript
console.log('[CREATE PATRIMONIO] Request body:', JSON.stringify(req.body, null, 2));
```
Este log mostrará TODOS os dados que o frontend está enviando.

### **2. Log de Validação**
```typescript
console.log('[CREATE PATRIMONIO] Validação falhou:', {
  numero_patrimonio: !!numero_patrimonio,
  descricao_bem: !!descricao_bem,
  data_aquisicao: !!data_aquisicao,
  valor_aquisicao: !!valor_aquisicao,
  sectorId: !!sectorId,
});
```
Este log mostrará quais campos obrigatórios estão faltando (se houver).

### **3. Log de Erro Completo**
```typescript
console.error('[CREATE PATRIMONIO] Erro completo:', error);
console.error('[CREATE PATRIMONIO] Stack trace:', error instanceof Error ? error.stack : 'N/A');
console.error('[CREATE PATRIMONIO] Mensagem:', error instanceof Error ? error.message : String(error));
```
Este log mostrará o erro COMPLETO com stack trace.

### **4. Detalhes do Erro na Resposta**
```typescript
res.status(500).json({ 
  error: 'Erro ao criar patrimônio',
  details: error instanceof Error ? error.message : String(error)
});
```
Agora o frontend também receberá os detalhes do erro.

## 🔍 **Causas Possíveis do Erro 500**

### **1. Campos com Valores Inválidos**
- **Data:** `data_aquisicao` pode estar em formato inválido
- **Números:** `valor_aquisicao`, `quantidade`, `vida_util_anos` podem não ser parseáveis
- **Enum:** `situacao_bem` pode ter valor não esperado (ex: 'ÓTIMO' com acento)

### **2. Campos Obrigatórios Faltando**
- `numero_patrimonio` - Gerado automaticamente, mas pode estar vazio
- `descricao_bem` - Descrição do bem
- `data_aquisicao` - Data de aquisição
- `valor_aquisicao` - Valor de aquisição
- `sectorId` - ID do setor (UUID)

### **3. Problemas com Relacionamentos**
- `sectorId` pode estar inválido ou não existir no banco
- `localId`, `tipoId`, `acquisitionFormId` podem estar inválidos
- Dados inconsistentes nos relacionamentos

### **4. Problema no Prisma**
- Erro ao criar entrada no histórico
- Erro ao criar log de atividade
- Constraint violation no banco de dados

## 🚀 **Como Testar e Debug**

### **Passo 1: Testar Novamente**
1. Acesse: `http://localhost:8080/bens-cadastrados/novo`
2. Preencha todos os campos
3. Clique em "Salvar"
4. **Observe os logs no terminal do backend**

### **Passo 2: Analisar os Logs**
No terminal do backend, você verá:

**Se for erro de validação:**
```
[CREATE PATRIMONIO] Request body: { ... }
[CREATE PATRIMONIO] Validação falhou: {
  numero_patrimonio: false,
  ...
}
```

**Se for erro no Prisma:**
```
[CREATE PATRIMONIO] Request body: { ... }
[CREATE PATRIMONIO] Erro completo: [PrismaClientKnownRequestError]
[CREATE PATRIMONIO] Stack trace: ...
[CREATE PATRIMONIO] Mensagem: Foreign key constraint failed on the field: ...
```

**Se for erro de parsing:**
```
[CREATE PATRIMONIO] Request body: { ... }
[CREATE PATRIMONIO] Erro completo: [Error]
[CREATE PATRIMONIO] Mensagem: Invalid time value
```

### **Passo 3: Verificar o Console do Frontend**
No console do navegador, agora você verá:
```
[HTTP] ❌ 500 /patrimonios {
  error: 'Erro ao criar patrimônio',
  details: 'Mensagem detalhada do erro'
}
```

## 🛠️ **Possíveis Soluções**

### **Solução 1: Problema com Data**
```typescript
// Se o erro for "Invalid time value"
// Verificar formato da data no frontend
data_aquisicao: "2025-10-07" // Correto
data_aquisicao: "07/10/2025" // Incorreto
```

### **Solução 2: Problema com SectorId**
```typescript
// Se o erro for "Foreign key constraint failed"
// Verificar se o sectorId existe no banco
SELECT id, name FROM sectors WHERE id = 'sector-1';
```

### **Solução 3: Problema com Campos Numéricos**
```typescript
// Se o erro for "NaN" ou "parseFloat"
// Verificar se os valores são números válidos
valor_aquisicao: 1500 // Correto
valor_aquisicao: "1500" // Será parseado
valor_aquisicao: "mil e quinhentos" // Incorreto
```

### **Solução 4: Problema com Situação do Bem**
```typescript
// Se o erro for relacionado a "situacao_bem"
// Verificar valores aceitos
situacao_bem: "ÓTIMO" // Pode ter problema com acento
situacao_bem: "OTIMO" // Sem acento
situacao_bem: "BOM" // OK
```

## 📋 **Checklist de Verificação**

Após obter os logs do backend, verificar:

- [ ] Request body está completo?
- [ ] Todos os campos obrigatórios estão presentes?
- [ ] `sectorId` é um UUID válido?
- [ ] `data_aquisicao` está em formato ISO (YYYY-MM-DD)?
- [ ] `valor_aquisicao` é um número válido?
- [ ] Relacionamentos existem no banco?
- [ ] Há constraint violation?
- [ ] Erro específico do Prisma?

## 🔴 **PRÓXIMO PASSO CRÍTICO**

**FAVOR EXECUTAR O TESTE NOVAMENTE E COPIAR OS LOGS DO TERMINAL DO BACKEND**

Os logs adicionados mostrarão exatamente:
1. O que o frontend está enviando
2. Se a validação está falhando
3. O erro EXATO que está ocorrendo no Prisma/banco

Com esses logs, poderei identificar e corrigir o problema rapidamente.

## 📝 **Exemplo de Log Esperado**

```
[CREATE PATRIMONIO] Request body: {
  "numero_patrimonio": "2025001000001",
  "descricao_bem": "teste",
  "tipo": "Equipamentos de Informática",
  "marca": "Flexform",
  "modelo": "Basic",
  "cor": "Preto",
  "numero_serie": "SN123456",
  "data_aquisicao": "2025-10-01",
  "valor_aquisicao": 1500,
  "quantidade": 1,
  "numero_nota_fiscal": "NF-001",
  "forma_aquisicao": "Compra",
  "setor_responsavel": "Secretaria de Administração",
  "local_objeto": "Sala 01",
  "status": "ativo",
  "situacao_bem": "ÓTIMO",
  "sectorId": "sector-1",
  "localId": "fb3b5769-62b9-4a48-9af9-7f5651a8e6e6",
  "tipoId": "tipo-2",
  "acquisitionFormId": "forma-1",
  "metodo_depreciacao": "Linear",
  "vida_util_anos": 5,
  "valor_residual": 1500
}
[CREATE PATRIMONIO] Erro completo: [PrismaClientKnownRequestError: ...]
[CREATE PATRIMONIO] Mensagem: ...
```

**COM ESSES LOGS, PODEREI IDENTIFICAR E CORRIGIR O PROBLEMA IMEDIATAMENTE!**

