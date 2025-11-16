# 🔧 Comandos para Atualizar Backend em Produção

## 📋 Problema Corrigido

Arquivos estavam sendo salvos sem extensão (ex: `blob-1763331522839-257528823`).  
**Correção:** Backend agora detecta extensão pelo mimetype quando o nome não tem extensão.

## 🚀 Comandos para Aplicar

### Atualização Completa (Backend + Frontend)

```bash
# 1. Conectar ao servidor
ssh usuario@sispat.vps-kinghost.net

# 2. Navegar para o projeto
cd /var/www/sispat

# 3. Atualizar código
git pull origin main

# 4. Rebuild do backend
cd backend
npm run build

# 5. Verificar se build foi bem-sucedido
ls -lh dist/ | head -5

# 6. Reiniciar backend
pm2 restart sispat-backend

# 7. Verificar status
pm2 status
pm2 logs sispat-backend --lines 20

# 8. Rebuild do frontend (se necessário)
cd ..
npm run build

# 9. Recarregar Nginx
sudo systemctl reload nginx
```

### Apenas Backend (Rápido)

```bash
cd /var/www/sispat
git pull origin main
cd backend
npm run build
pm2 restart sispat-backend
pm2 logs sispat-backend --lines 20
```

## ✅ Verificações

### 1. Verificar se o código foi atualizado

```bash
cd /var/www/sispat/backend
git log --oneline -1
# Deve mostrar: 477ae34 fix: Corrigir geração de nomes de arquivo...
```

### 2. Verificar se o build foi bem-sucedido

```bash
ls -lh /var/www/sispat/backend/dist/middlewares/uploadMiddleware.js
```

### 3. Verificar logs após reiniciar

```bash
pm2 logs sispat-backend --lines 50 | grep -i "upload\|error"
```

### 4. Testar upload de nova imagem

1. Acesse o sistema
2. Vá para cadastro de bem
3. Faça upload de uma nova imagem
4. Verifique no servidor se o arquivo tem extensão:
   ```bash
   ls -lht /var/www/sispat/backend/uploads/ | head -3
   # Deve mostrar arquivos como: image-{timestamp}-{random}.jpg
   ```

## 🔍 Verificar Arquivos Antigos

Os arquivos antigos sem extensão continuarão sem extensão, mas novos uploads terão extensão correta.

Para verificar:
```bash
# Ver arquivos sem extensão
ls -lh /var/www/sispat/backend/uploads/ | grep -v "\."

# Ver arquivos com extensão
ls -lh /var/www/sispat/backend/uploads/ | grep "\.jpg\|\.png\|\.jpeg"
```

## 📝 Resultado Esperado

### Antes da Correção:
```
blob-1763331522839-257528823  ❌ Sem extensão
```

### Depois da Correção:
```
image-1763331522839-257528823.jpg  ✅ Com extensão
image-1763331522839-257528823.png  ✅ Com extensão
```

## ⚠️ Importante

- **Arquivos antigos:** Continuarão sem extensão (mas serão detectados como inválidos e mostrarão placeholder)
- **Novos uploads:** Terão extensão correta e funcionarão normalmente
- **Não é necessário:** Corrigir arquivos antigos no servidor (o código trata automaticamente)

---

**Commit:** `477ae34` - fix: Corrigir geração de nomes de arquivo sem extensão no upload  
**Data:** 2025-11-16  
**Status:** ✅ Pronto para Deploy

