# 🐛 DEBUG: Adicionar Fotos na Edição de Bem

**Data**: 08 de Outubro de 2025  
**Problema**: Ao adicionar nova foto e clicar em "Salvar Alterações", nada acontece

---

## 🔍 LOGS DE DEBUG ADICIONADOS

### **Logs Implementados:**

#### 1. **BensEdit.tsx - onSubmit**
```typescript
console.log('📝 DEBUG - Dados do formulário recebidos:', {
  ...data,
  fotos: data.fotos,
  fotosLength: data.fotos?.length,
  fotosType: typeof data.fotos,
})

console.log('🔍 DEBUG - Informações do patrimônio:', {
  id: patrimonio.id,
  fotosAtuais: patrimonio.fotos,
})

console.log('📤 DEBUG - Dados que serão enviados:', {
  fotos: updatedPatrimonio.fotos,
  fotosLength: updatedPatrimonio.fotos?.length,
  fotosDetalhes: updatedPatrimonio.fotos?.map(...)
})

console.log('🚀 DEBUG - Chamando updatePatrimonio...')
// await updatePatrimonio(...)
console.log('✅ DEBUG - updatePatrimonio concluído!')
```

#### 2. **PatrimonioContext.tsx - updatePatrimonio**
```typescript
console.log('🔄 PatrimonioContext - updatePatrimonio chamado com:', {
  id: updatedPatrimonio.id,
  fotos: updatedPatrimonio.fotos,
  fotosLength: updatedPatrimonio.fotos?.length,
})

// await api.put(...)

console.log('✅ PatrimonioContext - Resposta do backend:', response)
```

---

## 🧪 COMO TESTAR E IDENTIFICAR O PROBLEMA

### **Passo 1: Preparar o Teste**
```
1. Abrir o navegador
2. Pressionar F12 (abrir DevTools)
3. Ir para a aba "Console"
4. Limpar o console (ícone 🚫)
```

### **Passo 2: Editar Bem e Adicionar Foto**
```
1. Ir para: Bens → Ver Detalhes → Editar
2. Clicar em "Anexar Foto"
3. Selecionar uma imagem
4. Aguardar upload
5. Verificar se a foto aparece na lista
```

### **Passo 3: Salvar e Observar Logs**
```
1. Clicar em "Salvar Alterações"
2. Observar o console
3. Procurar pelos logs com emojis:
   📝 Dados do formulário recebidos
   🔍 Informações do patrimônio
   📤 Dados que serão enviados
   🚀 Chamando updatePatrimonio
   🔄 PatrimonioContext - updatePatrimonio
   ✅ updatePatrimonio concluído
```

---

## 🔍 O QUE PROCURAR NOS LOGS

### **Cenário 1: Fotos não estão no formulário**
```javascript
📝 DEBUG - Dados do formulário recebidos: {
  fotos: undefined  // ❌ PROBLEMA AQUI!
  // ou
  fotos: []         // ❌ PROBLEMA AQUI!
}
```
**Diagnóstico**: ImageUpload não está atualizando o form
**Solução**: Verificar integração ImageUpload ↔ react-hook-form

### **Cenário 2: Fotos estão no formulário mas não são enviadas**
```javascript
📝 DEBUG - Dados do formulário: {
  fotos: [{ id: '...', file_url: '...' }]  // ✅ OK
}

📤 DEBUG - Dados enviados: {
  fotos: []  // ❌ PROBLEMA AQUI!
}
```
**Diagnóstico**: Fotos perdidas na preparação dos dados
**Solução**: Verificar linha 218 do BensEdit.tsx

### **Cenário 3: Requisição não é enviada**
```javascript
📝 DEBUG - Dados do formulário: { ... }
🔍 DEBUG - Informações: { ... }
📤 DEBUG - Dados enviados: { ... }
🚀 DEBUG - Chamando updatePatrimonio...
// ❌ Não aparece "✅ concluído"
```
**Diagnóstico**: Erro na requisição HTTP
**Solução**: Verificar erro no catch block

### **Cenário 4: Backend retorna erro**
```javascript
✅ DEBUG - updatePatrimonio concluído!
// Mas aparece erro 400/500 no Network
```
**Diagnóstico**: Backend rejeita os dados
**Solução**: Verificar controller no backend

---

## 🎯 POSSÍVEIS CAUSAS

### **1. ImageUpload não atualiza o form** 🖼️
```typescript
// Verificar se onChange está sendo chamado
const handleFileChange = (event) => {
  const files = Array.from(event.target.files || [])
  processFiles(files)  // ← Chama onChange?
}
```

### **2. Formato das fotos incorreto** 📋
```typescript
// Backend espera:
fotos: string[]  // Array de URLs

// Mas pode estar recebendo:
fotos: [{ id: '...', file_url: '...', file_name: '...' }]  // Objetos
```

### **3. Validação Zod falhando** ✅
```typescript
// patrimonioEditSchema pode estar rejeitando
fotos: z.array(z.string()).optional()
// vs
fotos: [{ id, file_url, file_name }]  // Objetos não passam
```

### **4. Backend filtrando fotos** ⚙️
```typescript
// patrimonioController.ts pode estar removendo
const readonlyFields = ['fotos', ...]  // ← Fotos removidas?
```

---

## 🔧 SOLUÇÕES POTENCIAIS

### **Solução 1: Converter fotos para array de strings**
```typescript
// Em BensEdit.tsx, linha 218
fotos: (data.fotos || data.photos || []).map((f: any) => 
  typeof f === 'string' ? f : f.file_url
),
```

### **Solução 2: Verificar schema de validação**
```typescript
// patrimonioSchema.ts
fotos: z.union([
  z.array(z.string()),
  z.array(z.object({
    id: z.string(),
    file_url: z.string(),
    file_name: z.string(),
  }))
]).optional()
```

### **Solução 3: Backend aceitar objetos de foto**
```typescript
// patrimonioController.ts
if (updateData.fotos && Array.isArray(updateData.fotos)) {
  // Converter objetos para strings se necessário
  dataToUpdate.fotos = updateData.fotos.map(f => 
    typeof f === 'string' ? f : f.file_url
  )
}
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

Após adicionar foto e clicar em "Salvar Alterações", verificar:

- [ ] Log "📝 Dados do formulário" aparece?
- [ ] `fotos` está presente nos dados?
- [ ] `fotosLength` é > 0?
- [ ] Log "🚀 Chamando updatePatrimonio" aparece?
- [ ] Log "🔄 PatrimonioContext" aparece?
- [ ] Log "✅ concluído" aparece?
- [ ] Requisição PUT aparece no Network?
- [ ] Resposta é 200 OK?
- [ ] Toast de sucesso aparece?
- [ ] Navegação para /bens-cadastrados acontece?

---

## 🧪 PRÓXIMOS PASSOS

1. **Executar o teste** conforme instruções acima
2. **Copiar os logs** do console
3. **Verificar** qual cenário se aplica
4. **Aplicar** a solução correspondente

---

**Status**: 🔍 Investigação em andamento  
**Logs**: ✅ Adicionados  
**Próximo passo**: Testar e analisar logs
