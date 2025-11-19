# 🔍 Investigação: Imagens Não Aparecem

## 📋 Problema

Imagens salvas no cadastro de bens não estão sendo exibidas. Erro no console:

```
GET https://sispat.vps-kinghost.net/uploads/blob-1763333276086-619336306.png 404 (Not Found)
```

## 🔍 Análise do Fluxo

### 1. **Upload da Imagem**

**Frontend (`ImageUpload.tsx`):**
- Usuário seleciona imagem
- `uploadFile()` envia para `/api/upload/single`
- Backend retorna: `{ id, file_url: "/uploads/filename.jpg", file_name }`
- Frontend salva no form: `{ id, file_url, file_name }`

**Backend (`uploadController.ts`):**
- Recebe arquivo via Multer
- Multer salva com nome gerado por `uploadMiddleware.ts`
- Retorna: `file_url: "/uploads/${req.file.filename}"`

### 2. **Salvamento no Banco**

**Frontend (`BensCreate.tsx`):**
```typescript
const fotosProcessadas = (data.fotos || []).map((foto: any) => {
  if (typeof foto === 'object' && foto?.file_url) {
    return foto.file_url  // ← Salva "/uploads/blob-..."
  }
  return foto
})
```

**Backend (`patrimonioController.ts`):**
```typescript
fotos: Array.isArray(fotos) ? fotos.map(foto => 
  typeof foto === 'string' ? foto : foto.file_url || foto.fileName || String(foto)
) : [],
```

**Banco de Dados:**
- Campo `fotos` é `String[]`
- Armazena: `["/uploads/blob-1763333276086-619336306.png"]`

### 3. **Exibição da Imagem**

**Frontend (`BensView.tsx`):**
```typescript
const fotos = patrimonio.fotos || patrimonio.photos
fotos.map((foto: any) => {
  if (typeof foto === 'object' && foto?.file_url) {
    return foto.file_url
  }
  return foto  // ← Retorna "/uploads/blob-..."
})

<img src={getCloudImageUrl(String(fotoId))} />
```

**`getCloudImageUrl()` (`utils.ts`):**
- Recebe: `/uploads/blob-1763333276086-619336306.png`
- Constrói URL: `https://sispat.vps-kinghost.net/uploads/blob-1763333276086-619336306.png`
- Nginx tenta servir arquivo → **404 (não existe)**

## ❌ Problemas Identificados

### **Problema 1: Arquivo não existe no servidor**

O arquivo `blob-1763333276086-619336306.png` não existe porque:

1. **Backend ainda está salvando como `blob-...`**
   - Mesmo após correção no `uploadMiddleware.ts`
   - Código compilado tem correção, mas não está sendo usado
   - Ou arquivo foi salvo antes do rebuild

2. **Arquivo pode ter sido deletado**
   - Permissões incorretas
   - Limpeza automática
   - Erro durante upload

### **Problema 2: URL salva no banco está incorreta**

A URL `/uploads/blob-1763333276086-619336306.png` está sendo salva no banco, mas:
- Arquivo não existe fisicamente
- Ou arquivo existe com nome diferente

## ✅ Soluções

### **Solução 1: Verificar se arquivo existe**

```bash
# No servidor
ls -lh /var/www/sispat/backend/uploads/blob-1763333276086-619336306.png

# Verificar todos os arquivos recentes
ls -lht /var/www/sispat/backend/uploads/ | head -10
```

### **Solução 2: Verificar logs do backend durante upload**

```bash
# Monitorar logs em tempo real
pm2 logs sispat-backend --lines 0

# Fazer upload de teste
# Procurar por: "✅ Arquivo salvo" e verificar "filename:"
```

### **Solução 3: Verificar dados no banco**

```sql
-- Verificar URLs salvas no banco
SELECT id, numero_patrimonio, fotos 
FROM patrimonios 
WHERE array_length(fotos, 1) > 0 
LIMIT 10;
```

### **Solução 4: Corrigir backend para usar código novo**

```bash
# Forçar rebuild completo
cd /var/www/sispat/backend
rm -rf dist node_modules/.cache
npm run build
pm2 stop sispat-backend
pm2 start sispat-backend

# Verificar código compilado
grep -A 2 "nameWithoutExt = 'image'" dist/middlewares/uploadMiddleware.js
```

## 🎯 Próximos Passos

1. **Verificar se arquivo existe no servidor**
2. **Verificar logs do backend durante upload**
3. **Verificar dados no banco de dados**
4. **Fazer upload de teste e verificar nome do arquivo**
5. **Se arquivo não existir, investigar por que foi deletado ou não foi criado**

## 📝 Comandos de Diagnóstico

```bash
# 1. Verificar arquivo específico
ls -lh /var/www/sispat/backend/uploads/blob-1763333276086-619336306.png

# 2. Verificar arquivos recentes
ls -lht /var/www/sispat/backend/uploads/ | head -10

# 3. Verificar permissões
ls -ld /var/www/sispat/backend/uploads/

# 4. Verificar logs do backend
pm2 logs sispat-backend --lines 50 | grep -i upload

# 5. Verificar código compilado
grep -A 5 "nameWithoutExt" /var/www/sispat/backend/dist/middlewares/uploadMiddleware.js

# 6. Testar acesso via Nginx
curl -I https://sispat.vps-kinghost.net/uploads/blob-1763333276086-619336306.png
```


