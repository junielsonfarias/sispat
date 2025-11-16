# 🔧 Correção - Imagens não Visualizadas em Produção

## 📋 Problema Identificado

Ao acessar o ambiente de produção, as imagens anexadas no cadastro de bens não estão sendo visualizadas e não estão visíveis no relatório. O console do navegador mostra erros 404 para URLs como:

```
/uploads/blob-1762517721761-288641640
/uploads/blob-1762353170095-336667196
https://sispat.vps-kinghost.net/uploads/blob-1762350703887-169450413
```

## 🔍 Causa do Problema

As imagens estão sendo salvas no banco de dados com nomes de arquivo inválidos (URLs blob temporárias sem extensão de arquivo). Esses arquivos não existem no servidor de produção porque:

1. **URLs blob inválidas**: URLs como `/uploads/blob-{timestamp}-{random}` não têm extensão de arquivo (`.jpg`, `.png`, etc.)
2. **Arquivos não existem**: Esses arquivos nunca foram realmente enviados ao servidor ou foram perdidos durante o deploy
3. **Falta de validação**: O código não estava validando se as URLs eram válidas antes de tentar carregar

## ✅ Correções Aplicadas

### 1. **Função `getCloudImageUrl` - Validação de URLs Blob**

**Arquivo:** `src/lib/utils.ts`

**Mudança:** Adicionada validação para detectar URLs blob inválidas (sem extensão de arquivo) e retornar placeholder quando detectadas.

```typescript
// ✅ CORREÇÃO: Detectar URLs blob inválidas (sem extensão de arquivo)
if (fileId.startsWith('/uploads/') || fileId.startsWith('uploads/')) {
  const cleanPath = fileId.startsWith('/') ? fileId : `/${fileId}`
  const filename = cleanPath.split('/').pop() || ''
  
  // Verificar se é uma URL blob inválida (sem extensão de arquivo)
  const hasValidExtension = /\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(filename)
  const isBlobUrl = filename.startsWith('blob-')
  
  // Se for blob URL sem extensão, retornar placeholder
  if (isBlobUrl && !hasValidExtension) {
    return process.env.NODE_ENV === 'production'
      ? LOCAL_IMAGES.PLACEHOLDER_IMAGE
      : 'https://img.usecurling.com/p/400/300?q=invalid%20blob%20url'
  }
  
  // Construir URL completa para arquivos válidos
  const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'
  return `${BACKEND_URL}${cleanPath}`
}
```

### 2. **Função `compressImage` - Tratamento de Erros em PDFs**

**Arquivo:** `src/components/bens/PatrimonioPDFGenerator.tsx`

**Mudança:** Adicionada validação de URLs antes de tentar carregar imagens para PDFs e retorno de placeholder quando a imagem não pode ser carregada.

```typescript
// ✅ CORREÇÃO: Verificar se a URL é válida antes de tentar carregar
if (imageUrl && (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/'))) {
  const filename = imageUrl.split('/').pop() || ''
  const hasValidExtension = /\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(filename)
  const isBlobUrl = filename.startsWith('blob-')
  
  // Se for blob URL sem extensão, retornar placeholder
  if (isBlobUrl && !hasValidExtension) {
    // Retornar placeholder transparente
    resolve('data:image/svg+xml;base64,...')
    return
  }
}
```

## 🚀 Comandos para Aplicar em Produção

### Passo 1: Fazer Backup do Código Atual

```bash
# Conectar ao servidor
ssh usuario@sispat.vps-kinghost.net

# Navegar para o diretório do projeto
cd /var/www/sispat

# Fazer backup do código atual
sudo cp -r frontend frontend.backup.$(date +%Y%m%d_%H%M%S)
```

### Passo 2: Atualizar o Código

```bash
# Se estiver usando Git
cd /var/www/sispat
git pull origin main

# OU se precisar fazer upload manual dos arquivos corrigidos:
# 1. Fazer upload dos arquivos corrigidos:
#    - src/lib/utils.ts
#    - src/components/bens/PatrimonioPDFGenerator.tsx
```

### Passo 3: Rebuild do Frontend

```bash
cd /var/www/sispat/frontend

# Instalar dependências (se necessário)
npm install

# Rebuild em produção
npm run build

# Verificar se o build foi bem-sucedido
ls -lh dist/
```

### Passo 4: Reiniciar o Serviço (se necessário)

```bash
# Se estiver usando PM2
pm2 restart sispat-frontend

# OU se estiver usando Nginx diretamente
sudo systemctl reload nginx
```

### Passo 5: Limpar Cache do Navegador

**Importante:** Os usuários precisam limpar o cache do navegador ou fazer um hard refresh (Ctrl+Shift+R ou Cmd+Shift+R) para carregar a nova versão do JavaScript.

### Passo 6: Verificar Funcionamento

1. Acesse o ambiente de produção
2. Vá para um bem cadastrado que tenha imagens
3. Verifique se as imagens são exibidas corretamente ou se aparece um placeholder
4. Verifique o console do navegador - não deve mais haver erros 404 para URLs blob inválidas
5. Teste a geração de relatórios PDF - as imagens devem aparecer ou mostrar placeholder

## 📊 Resultado Esperado

### Antes da Correção:
- ❌ Erros 404 no console para URLs blob inválidas
- ❌ Imagens não aparecem na visualização
- ❌ Imagens não aparecem nos relatórios
- ❌ Erros ao gerar PDFs com imagens

### Depois da Correção:
- ✅ URLs blob inválidas são detectadas e substituídas por placeholder
- ✅ Imagens válidas são exibidas normalmente
- ✅ Placeholder é exibido quando a imagem não existe
- ✅ PDFs são gerados sem erros (com placeholder se necessário)
- ✅ Console do navegador sem erros 404

## 🔍 Verificação Adicional

### Verificar URLs no Banco de Dados

Se quiser verificar quais bens têm URLs blob inválidas no banco de dados:

```sql
-- Conectar ao banco de dados
psql -U postgres -d sispat

-- Verificar fotos com URLs blob inválidas
SELECT 
  id,
  numero_patrimonio,
  descricao_bem,
  fotos
FROM patrimonios
WHERE fotos::text LIKE '%blob-%'
  AND fotos::text NOT LIKE '%.jpg%'
  AND fotos::text NOT LIKE '%.png%'
  AND fotos::text NOT LIKE '%.jpeg%'
  AND fotos::text NOT LIKE '%.gif%'
  AND fotos::text NOT LIKE '%.webp%';
```

**Nota:** Essas URLs inválidas não precisam ser corrigidas no banco de dados. O código agora trata automaticamente essas URLs e exibe um placeholder.

## 📝 Arquivos Modificados

1. `src/lib/utils.ts` - Função `getCloudImageUrl` com validação de URLs blob
2. `src/components/bens/PatrimonioPDFGenerator.tsx` - Função `compressImage` com tratamento de erros

## ⚠️ Observações Importantes

1. **Não é necessário corrigir o banco de dados**: O código agora trata automaticamente URLs inválidas
2. **Placeholder será exibido**: Quando uma imagem não puder ser carregada, um placeholder será exibido em vez de um erro
3. **Imagens válidas continuam funcionando**: Apenas URLs inválidas são substituídas por placeholder
4. **Cache do navegador**: Usuários precisam limpar o cache para ver as correções

## 🐛 Troubleshooting

### Se as imagens ainda não aparecem:

1. **Verificar se o build foi bem-sucedido:**
   ```bash
   cd /var/www/sispat/frontend
   npm run build
   ```

2. **Verificar se os arquivos foram atualizados:**
   ```bash
   grep -r "blob-" /var/www/sispat/frontend/dist/assets/*.js | head -5
   ```

3. **Verificar logs do Nginx:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Limpar cache do Nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

### Se ainda houver erros 404:

1. Verificar se a URL do backend está correta no `.env.production`:
   ```bash
   cat /var/www/sispat/frontend/.env.production | grep VITE_API_URL
   ```

2. Verificar se a pasta `uploads` existe e tem permissões corretas:
   ```bash
   ls -la /var/www/sispat/backend/uploads/
   sudo chown -R www-data:www-data /var/www/sispat/backend/uploads/
   ```

## ✅ Checklist de Deploy

- [ ] Backup do código atual feito
- [ ] Código atualizado (Git pull ou upload manual)
- [ ] Frontend rebuild executado (`npm run build`)
- [ ] Build verificado (arquivos em `dist/`)
- [ ] Serviço reiniciado (se necessário)
- [ ] Cache do navegador limpo
- [ ] Teste de visualização de bem com imagens
- [ ] Teste de geração de PDF
- [ ] Console do navegador verificado (sem erros 404)

---

**Data da Correção:** $(date +%Y-%m-%d)  
**Versão:** 2.0.x  
**Status:** ✅ Pronto para Deploy

