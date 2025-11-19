# 🔧 Solução: Erro 404 em URLs Blob

## 📋 Problema

Após fazer upload de uma nova imagem, o console do navegador mostra:

```
GET https://sispat.vps-kinghost.net/uploads/blob-1763332759682-136346627.png 404 (Not Found)
```

## 🔍 Causa

O arquivo `blob-1763332759682-136346627.png` pode não existir no servidor porque:

1. **Foi salvo antes da correção**: Arquivos salvos antes da correção do `uploadMiddleware.ts` podem ter nomes diferentes
2. **Arquivo não foi salvo corretamente**: Pode ter ocorrido um erro durante o upload
3. **Cache do navegador**: O navegador pode estar usando uma URL antiga em cache

## ✅ Solução

### 1. Verificar se o arquivo existe no servidor

Execute no servidor:

```bash
# Verificar se o arquivo específico existe
ls -lh /var/www/sispat/backend/uploads/blob-1763332759682-136346627.png

# Verificar arquivos recentes
ls -lht /var/www/sispat/backend/uploads/ | head -10
```

### 2. Executar script de diagnóstico

```bash
cd /var/www/sispat
git pull origin main
chmod +x scripts/diagnostico-upload.sh
./scripts/diagnostico-upload.sh
```

Este script verifica:
- ✅ Diretório de uploads e permissões
- ✅ Arquivos sem extensão
- ✅ Arquivos com "blob-" no nome
- ✅ Arquivos com extensão válida
- ✅ Código do backend compilado
- ✅ Status do PM2
- ✅ Configuração do Nginx

### 3. Verificar logs do backend

```bash
# Ver logs de upload
pm2 logs sispat-backend --lines 50 | grep -i upload

# Ver logs gerais
pm2 logs sispat-backend --lines 100
```

Procure por mensagens como:
- `✅ Arquivo salvo` - indica upload bem-sucedido
- `❌ Erro ao fazer upload` - indica problema

### 4. Testar novo upload

1. **Fazer um novo upload** de imagem no cadastro de bem
2. **Verificar no servidor** se o arquivo foi salvo com extensão:
   ```bash
   ls -lht /var/www/sispat/backend/uploads/ | head -3
   # Deve mostrar: image-{timestamp}-{random}.jpg
   ```
3. **Verificar no console do navegador** se a URL está correta

## 🔄 Correções Aplicadas

### Backend (`uploadMiddleware.ts`)

✅ **Correção aplicada**: Arquivos agora são salvos com extensão correta:
- Antes: `blob-1763332759682-136346627` (sem extensão)
- Depois: `image-1763332759682-136346627.jpg` (com extensão)

### Frontend (`utils.ts`)

✅ **Melhorias aplicadas**:
- Detecta URLs blob inválidas (sem extensão)
- Avisa sobre URLs blob que podem não existir
- Retorna placeholder quando necessário

## 📝 Comandos Rápidos

```bash
# 1. Atualizar código
cd /var/www/sispat
git pull origin main

# 2. Rebuild frontend
npm run build

# 3. Rebuild backend
cd backend
npm run build
pm2 restart sispat-backend

# 4. Verificar arquivos
ls -lht /var/www/sispat/backend/uploads/ | head -5

# 5. Executar diagnóstico
./scripts/diagnostico-upload.sh
```

## 🎯 Resultado Esperado

Após as correções:

1. **Novos uploads** terão nomes como: `image-{timestamp}-{random}.jpg`
2. **Arquivos antigos** sem extensão mostrarão placeholder (correto)
3. **URLs blob** serão detectadas e tratadas adequadamente
4. **Imagens aparecerão** corretamente no sistema

## ⚠️ Importante

- **Arquivos antigos** sem extensão não serão corrigidos automaticamente
- **Novos uploads** terão extensão correta
- **Placeholder** será exibido para arquivos inválidos (comportamento esperado)

## 🆘 Se o problema persistir

1. Verifique os logs do backend: `pm2 logs sispat-backend`
2. Verifique as permissões: `ls -ld /var/www/sispat/backend/uploads/`
3. Verifique a configuração do Nginx: `sudo grep -A 5 "location /uploads" /etc/nginx/sites-available/sispat`
4. Execute o script de diagnóstico: `./scripts/diagnostico-upload.sh`

