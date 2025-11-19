# 🔍 Análise de Segurança - Upload de Imagens

**Data:** 19/11/2025  
**Status:** ✅ CORRIGIDO (com uma melhoria necessária)

---

## 📊 Análise Completa do Fluxo

### ✅ **1. Frontend - Upload de Arquivo**

**Arquivo:** `src/services/fileService.ts`

```typescript
// ✅ CORRETO: Envia arquivo via FormData
formData.append('file', file)
const response = await axios.post(`${BACKEND_URL}/api/upload/single`, formData)
// ✅ CORRETO: Retorna file_url do backend
return response.data // { id, file_url: "/uploads/image-123456.png", file_name, ... }
```

**Status:** ✅ **CORRETO** - Sempre envia arquivo real, nunca URL blob-

---

### ✅ **2. Backend - Recepção e Salvamento**

**Arquivo:** `backend/src/middlewares/uploadMiddleware.ts`

```typescript
// ✅ CORREÇÃO: Detecta e substitui nomes blob-
if (nameWithoutExt.startsWith('blob-') || nameWithoutExt.length < 3) {
  nameWithoutExt = 'image'; // Substitui por nome genérico
}
// ✅ CORRETO: Gera nome final: image-timestamp-random.ext
const finalName = `${nameWithoutExt}-${uniqueSuffix}${ext}`;
```

**Status:** ✅ **CORRETO** - Nunca salva arquivo com nome blob-

---

### ✅ **3. Backend - Retorno da URL**

**Arquivo:** `backend/src/controllers/uploadController.ts`

```typescript
// ✅ CORRETO: Retorna URL relativa válida
const fileUrl = `/uploads/${req.file.filename}`; // Ex: /uploads/image-123456.png
res.json({ file_url: fileUrl, ... });
```

**Status:** ✅ **CORRETO** - Sempre retorna URL válida `/uploads/image-...`

---

### ✅ **4. Frontend - Salvamento no Estado**

**Arquivo:** `src/components/bens/ImageUpload.tsx`

```typescript
// ✅ CORRETO: Adiciona objeto com file_url do backend
const fileMetadata = {
  id: newFile.id,
  file_url: newFile.file_url, // "/uploads/image-123456.png"
  file_name: newFile.file_name,
}
onChange(updatedFiles) // Passa array de objetos
```

**Status:** ✅ **CORRETO** - Usa file_url do backend

---

### ⚠️ **5. Backend - Salvamento no Banco (CREATE)**

**Arquivo:** `backend/src/controllers/patrimonioController.ts` - `createPatrimonio`

```typescript
// ✅ CORRETO: Converte objetos para strings (URLs)
fotos: Array.isArray(fotos) 
  ? fotos.map(foto => 
      typeof foto === 'string' 
        ? foto 
        : foto.file_url || foto.fileName || String(foto)
    ) 
  : [],
```

**Status:** ✅ **CORRETO** - Converte objetos para strings antes de salvar

---

### ❌ **6. Backend - Salvamento no Banco (UPDATE)**

**Arquivo:** `backend/src/controllers/patrimonioController.ts` - `updatePatrimonio`

```typescript
// ❌ PROBLEMA: Não processa fotos antes de salvar!
// Apenas passa dataToUpdate diretamente para Prisma
const updatedPatrimonio = await tx.patrimonio.update({
  where: { id },
  data: dataToUpdate, // ❌ Pode conter objetos em fotos!
});
```

**Status:** ❌ **PROBLEMA ENCONTRADO** - Não processa fotos no update

---

### ✅ **7. Backend - Leitura e Normalização**

**Arquivos:** `listPatrimonios`, `getPatrimonio`, `getByNumero`

```typescript
// ✅ CORRETO: Normaliza fotos ao ler do banco
patrimonio.fotos = patrimonio.fotos.map((foto: any) => {
  if (typeof foto === 'string') return foto;
  if (typeof foto === 'object') {
    return foto.file_url || foto.url || foto.id || foto.fileName || String(foto);
  }
  return String(foto);
}).filter((foto: string) => foto && foto.trim() !== '');
```

**Status:** ✅ **CORRETO** - Normaliza ao ler

---

## 🐛 **PROBLEMA IDENTIFICADO**

### **Risco no UPDATE:**

Quando um patrimônio é **atualizado**, se o frontend enviar objetos em `fotos` (ao invés de strings), eles podem ser salvos diretamente no banco sem conversão.

**Cenário de risco:**
1. Frontend envia: `fotos: [{ id: "...", file_url: "/uploads/image.png" }]`
2. `updatePatrimonio` não processa
3. Prisma pode salvar objeto JSON como string ou causar erro

---

## ✅ **CORREÇÕES NECESSÁRIAS**

### **1. Adicionar processamento de fotos no UPDATE**

```typescript
// No updatePatrimonio, antes de salvar:
if (dataToUpdate.fotos !== undefined) {
  dataToUpdate.fotos = Array.isArray(dataToUpdate.fotos)
    ? dataToUpdate.fotos.map(foto => 
        typeof foto === 'string' 
          ? foto 
          : foto.file_url || foto.fileName || String(foto)
      )
    : [];
}
```

### **2. Adicionar validação para bloquear URLs blob-**

```typescript
// Validar e remover URLs blob- antes de salvar
if (dataToUpdate.fotos !== undefined) {
  dataToUpdate.fotos = Array.isArray(dataToUpdate.fotos)
    ? dataToUpdate.fotos
        .map(foto => typeof foto === 'string' ? foto : foto.file_url || String(foto))
        .filter(foto => foto && !foto.startsWith('blob:')) // ❌ Bloquear blob-
    : [];
}
```

---

## 🛡️ **PROTEÇÕES ATUAIS**

### ✅ **Já Implementadas:**

1. **UploadMiddleware:** Substitui nomes blob- por `image-`
2. **UploadController:** Retorna apenas URLs válidas `/uploads/...`
3. **CreatePatrimonio:** Converte objetos para strings
4. **Leitura:** Normaliza fotos ao ler do banco
5. **Frontend:** Sempre usa `file_url` do backend

### ⚠️ **Faltando:**

1. **UpdatePatrimonio:** Processar fotos antes de salvar
2. **Validação:** Bloquear URLs blob- explicitamente

---

## 📝 **CONCLUSÃO**

### **Pode ocorrer novamente?**

**Risco BAIXO** para novos uploads:
- ✅ Upload sempre gera arquivo com nome correto
- ✅ Backend sempre retorna URL válida
- ✅ Create sempre converte objetos para strings

**Risco MÉDIO** para atualizações:
- ⚠️ Update não processa fotos (pode salvar objetos)
- ⚠️ Não valida URLs blob- explicitamente

### **Recomendação:**

✅ **Corrigir `updatePatrimonio`** para processar fotos igual ao `createPatrimonio`  
✅ **Adicionar validação** para bloquear URLs blob- em ambos (create e update)

---

## 🔧 **PRÓXIMOS PASSOS**

1. ✅ Corrigir `updatePatrimonio` para processar fotos
2. ✅ Adicionar validação para bloquear URLs blob-
3. ✅ Testar fluxo completo de upload e atualização
4. ✅ Executar script de limpeza para remover fotos antigas inválidas

