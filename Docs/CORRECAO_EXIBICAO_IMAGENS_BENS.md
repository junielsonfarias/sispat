# 🔧 Correção: Exibição de Imagens no Cadastro de Bens

## 📋 Problema Identificado

As imagens salvas no cadastro dos bens não estavam sendo visualizadas:
- ❌ Imagens não apareciam na visualização do bem
- ❌ Imagens não apareciam na ficha PDF gerada
- ❌ Mensagem "Imagem indisponível" era exibida

## 🔍 Causa Raiz

1. **Backend não normalizava fotos**: As fotos eram retornadas em formatos mistos (objetos, strings, etc.)
2. **Frontend não tratava todos os formatos**: A função `getCloudImageUrl` não lidava com todos os formatos possíveis
3. **URLs malformadas**: A construção de URLs para produção não estava funcionando corretamente
4. **PDF não normalizava fotos**: O gerador de PDF não normalizava as fotos antes de processar

## ✅ Correções Aplicadas

### 1. **Backend - Normalização de Fotos**

**Arquivo:** `backend/src/controllers/patrimonioController.ts`

- ✅ Normalização de fotos em `getPatrimonio` (busca por ID)
- ✅ Normalização de fotos em `getByNumero` (busca por número)
- ✅ Normalização de fotos em `listPatrimonios` (listagem)
- ✅ Normalização de fotos em `listPublicPatrimonios` (listagem pública)
- ✅ Normalização de documentos também

**Lógica de normalização:**
```typescript
fotos: Array.isArray(fotos) ? fotos.map((foto: any) => {
  if (typeof foto === 'string') return foto;
  if (typeof foto === 'object' && foto !== null) {
    return foto.file_url || foto.url || foto.id || foto.fileName || String(foto);
  }
  return String(foto);
}).filter((foto: string) => foto && foto.trim() !== '') : []
```

### 2. **Frontend - Melhoria da Função getCloudImageUrl**

**Arquivo:** `src/lib/utils.ts`

- ✅ Melhor tratamento de objetos (prioriza `file_url`, `url`, `id`, `fileName`)
- ✅ Busca automática de propriedades string em objetos
- ✅ Melhor construção de URLs para produção
- ✅ Normalização de caminhos (garante `/` no início)

### 3. **Frontend - Melhoria do BensView**

**Arquivo:** `src/pages/bens/BensView.tsx`

- ✅ Melhor tratamento de fotos no carrossel
- ✅ Filtragem de fotos vazias
- ✅ Compatibilidade com diferentes formatos

### 4. **Frontend - Correção do Gerador de PDF**

**Arquivo:** `src/components/bens/PatrimonioPDFGenerator.tsx`

- ✅ Normalização de fotos antes de processar
- ✅ Melhor tratamento de erros ao carregar imagens
- ✅ Garantia de que fotos sejam strings antes de comprimir

## 🚀 Como Aplicar no Servidor

### 1. Atualizar Código

```bash
cd /var/www/sispat
git pull origin main
```

### 2. Recompilar Backend

```bash
cd /var/www/sispat/backend
npm run build
```

### 3. Reiniciar Backend

```bash
pm2 restart sispat-backend
```

### 4. Recompilar Frontend

```bash
cd /var/www/sispat
npm run build
```

### 5. Recarregar Nginx

```bash
sudo systemctl reload nginx
```

## 📝 Comandos Rápidos (Copiar e Colar)

```bash
cd /var/www/sispat && \
git pull origin main && \
cd backend && npm run build && \
pm2 restart sispat-backend && \
cd .. && npm run build && \
sudo systemctl reload nginx && \
echo "✅ Atualização concluída!"
```

## ✅ Resultado Esperado

Após aplicar as correções:

1. ✅ **Imagens aparecem na visualização do bem**
   - Carrossel de imagens funciona corretamente
   - Placeholder só aparece quando imagem realmente não existe

2. ✅ **Imagens aparecem no PDF**
   - Ficha PDF inclui a primeira foto na seção de identificação
   - Seção de fotos mostra até 3 fotos comprimidas

3. ✅ **URLs construídas corretamente**
   - URLs de produção usam o domínio correto
   - URLs relativas são convertidas para absolutas

## 🔍 Verificação

Após aplicar as correções, verifique:

1. **Visualização do bem:**
   - Acesse um bem com imagens cadastradas
   - Verifique se as imagens aparecem no carrossel
   - Abra o console do navegador (F12) e verifique se há erros 404

2. **Geração de PDF:**
   - Gere uma ficha PDF de um bem com imagens
   - Verifique se a imagem aparece na seção de identificação
   - Verifique se a seção de fotos mostra as imagens

3. **Logs do Backend:**
   ```bash
   pm2 logs sispat-backend --lines 50
   ```
   - Verifique se há erros relacionados a fotos
   - Verifique se as fotos estão sendo normalizadas

## 📌 Notas Importantes

- **Fotos antigas**: Fotos salvas antes da correção podem precisar ser recarregadas
- **Cache**: O cache do navegador pode precisar ser limpo (Ctrl+Shift+R)
- **Permissões**: Certifique-se de que as permissões dos arquivos estão corretas (www-data:www-data)

## 🆘 Troubleshooting

### Problema: Imagens ainda não aparecem

**Solução:**
1. Verifique as permissões dos arquivos:
   ```bash
   ls -la /var/www/sispat/backend/uploads/
   sudo chown -R www-data:www-data /var/www/sispat/backend/uploads/
   ```

2. Verifique se o backend está rodando:
   ```bash
   pm2 status
   ```

3. Verifique os logs:
   ```bash
   pm2 logs sispat-backend --lines 100
   ```

### Problema: PDF não mostra imagens

**Solução:**
1. Verifique se as URLs das imagens são acessíveis
2. Abra o console do navegador ao gerar o PDF
3. Verifique se há erros de CORS ou 404

---

**Data da Correção:** 19/11/2025  
**Versão:** 2.0.0

