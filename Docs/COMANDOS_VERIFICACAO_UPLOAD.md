# 🔍 Comandos de Verificação de Upload

## Problema Atual

Novos uploads ainda estão sendo salvos como `blob-...` mesmo após a correção.

## Comandos para Executar no Servidor

### 1. Verificar se arquivo existe

```bash
# Verificar se o arquivo específico existe
ls -lh /var/www/sispat/backend/uploads/blob-1763333082202-480876480.png

# Verificar arquivos mais recentes
ls -lht /var/www/sispat/backend/uploads/ | head -10
```

### 2. Executar script de verificação

```bash
cd /var/www/sispat
git pull origin main
chmod +x scripts/verificar-upload-novo.sh
./scripts/verificar-upload-novo.sh
```

### 3. Verificar código compilado

```bash
cd /var/www/sispat/backend

# Verificar se tem a correção
grep -A 5 "nameWithoutExt = 'image'" dist/middlewares/uploadMiddleware.js

# Se não encontrar, fazer rebuild completo
npm run build

# Verificar se o arquivo foi atualizado
ls -lh dist/middlewares/uploadMiddleware.js
stat dist/middlewares/uploadMiddleware.js
```

### 4. Reiniciar backend corretamente

```bash
# Parar completamente
pm2 stop sispat-backend

# Aguardar alguns segundos
sleep 3

# Iniciar novamente
pm2 start sispat-backend

# Verificar status
pm2 status
pm2 logs sispat-backend --lines 20
```

### 5. Verificar logs durante upload

```bash
# Em um terminal, monitorar logs em tempo real
pm2 logs sispat-backend --lines 0

# Em outro terminal, fazer upload de teste
# Procurar por mensagens como:
# - "✅ Arquivo salvo"
# - "filename:"
# - "url:"
```

### 6. Verificar se arquivo foi criado com nome correto

```bash
# Após fazer upload, verificar arquivos mais recentes
ls -lht /var/www/sispat/backend/uploads/ | head -5

# Deve mostrar algo como:
# image-{timestamp}-{random}.jpg
# NÃO blob-...
```

## Diagnóstico do Erro 405 (DELETE)

O erro `DELETE https://sispat.vps-kinghost.net/api/upload/blob-1763332759682-136346627.png 405` indica que:

1. A rota DELETE pode não estar configurada corretamente
2. Ou há um problema com CORS/OPTIONS

### Verificar rota DELETE

```bash
# Verificar se a rota existe no código
grep -r "router.delete" /var/www/sispat/backend/src/routes/

# Verificar logs do backend ao tentar deletar
pm2 logs sispat-backend --lines 50 | grep -i delete
```

## Solução Completa

Execute todos os comandos nesta ordem:

```bash
# 1. Atualizar código
cd /var/www/sispat
git pull origin main

# 2. Rebuild backend
cd backend
npm run build

# 3. Parar backend completamente
pm2 stop sispat-backend
sleep 3

# 4. Iniciar backend
pm2 start sispat-backend

# 5. Verificar logs
pm2 logs sispat-backend --lines 30

# 6. Executar verificação
cd ..
chmod +x scripts/verificar-upload-novo.sh
./scripts/verificar-upload-novo.sh

# 7. Testar upload de nova imagem
# Verificar se arquivo foi criado como image-...
ls -lht /var/www/sispat/backend/uploads/ | head -3
```

## Resultado Esperado

Após executar todos os comandos:

1. ✅ Novos uploads devem ter nome `image-{timestamp}-{random}.jpg`
2. ✅ Arquivos devem ter permissões `www-data:www-data`
3. ✅ Imagens devem aparecer no navegador
4. ✅ DELETE deve funcionar (sem erro 405)

## Se Ainda Não Funcionar

1. Verificar se há múltiplas instâncias do backend rodando:
   ```bash
   pm2 list
   ps aux | grep node
   ```

2. Verificar se há cache do Node.js:
   ```bash
   # Limpar cache e rebuild
   cd /var/www/sispat/backend
   rm -rf dist node_modules/.cache
   npm run build
   pm2 restart sispat-backend
   ```

3. Verificar logs detalhados:
   ```bash
   pm2 logs sispat-backend --err --lines 100
   ```

