# 🔍 Guia Completo: Imagens Não Aparecem

## 📋 Problema

Após aplicar as correções, as imagens ainda não aparecem na visualização do bem e no PDF.

## 🔍 Diagnóstico Passo a Passo

### **1. Executar Diagnóstico Completo**

```bash
cd /var/www/sispat
git pull origin main
chmod +x scripts/diagnostico-completo-imagens.sh
./scripts/diagnostico-completo-imagens.sh
```

Este script verifica:
- ✅ Estrutura de diretórios
- ✅ Arquivos recentes
- ✅ Permissões
- ✅ Backend rodando
- ✅ Código compilado
- ✅ Logs do backend
- ✅ Acesso HTTP aos arquivos
- ✅ Configuração Nginx

### **2. Verificar Fotos no Banco de Dados**

Para verificar um patrimônio específico (ex: #202501000004):

```bash
cd /var/www/sispat
chmod +x scripts/verificar-fotos-banco.sh
./scripts/verificar-fotos-banco.sh 202501000004
```

Este script mostra:
- ✅ Formato das fotos no banco (string, objeto JSON, etc.)
- ✅ Se os arquivos existem no servidor
- ✅ Permissões dos arquivos
- ✅ URLs das fotos

### **3. Verificar um Arquivo Específico**

Se você souber o nome do arquivo (ex: `blob-1763333276086-619336306.png`):

```bash
cd /var/www/sispat
chmod +x scripts/diagnostico-imagem-especifica.sh
./scripts/diagnostico-imagem-especifica.sh blob-1763333276086-619336306.png
```

## 🔧 Correções Possíveis

### **Problema 1: Fotos Estão como Objetos JSON no Banco**

**Sintoma:** O script `verificar-fotos-banco.sh` mostra que as fotos são objetos JSON.

**Solução:**
```bash
cd /var/www/sispat
chmod +x scripts/corrigir-fotos-banco.sh
./scripts/corrigir-fotos-banco.sh
```

Este script:
- ✅ Busca todos os patrimônios com fotos
- ✅ Converte objetos JSON para strings (URLs)
- ✅ Atualiza o banco de dados

### **Problema 2: Arquivos Não Existem no Servidor**

**Sintoma:** O diagnóstico mostra que os arquivos não existem.

**Solução:**
1. Verificar se o upload está funcionando:
   - Tente fazer upload de uma nova imagem
   - Verifique se o arquivo é criado em `/var/www/sispat/backend/uploads/`

2. Se novos uploads não funcionam:
   ```bash
   # Verificar permissões do diretório
   ls -la /var/www/sispat/backend/uploads/
   
   # Corrigir permissões
   sudo chown -R www-data:www-data /var/www/sispat/backend/uploads/
   sudo find /var/www/sispat/backend/uploads -type f -exec chmod 644 {} \;
   sudo find /var/www/sispat/backend/uploads -type d -exec chmod 755 {} \;
   ```

### **Problema 3: Arquivos Existem mas Não São Acessíveis via HTTP**

**Sintoma:** Arquivo existe no servidor mas retorna 404 via HTTP.

**Solução:**
1. Verificar permissões:
   ```bash
   sudo chown -R www-data:www-data /var/www/sispat/backend/uploads/
   sudo find /var/www/sispat/backend/uploads -type f -exec chmod 644 {} \;
   ```

2. Verificar configuração Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. Verificar se a configuração `/uploads` está correta:
   ```bash
   grep -A 5 "location /uploads" /etc/nginx/sites-enabled/*
   ```

### **Problema 4: Backend Não Está Normalizando Fotos**

**Sintoma:** Backend retorna fotos como objetos, não como strings.

**Solução:**
1. Verificar se o código foi compilado:
   ```bash
   cd /var/www/sispat/backend
   grep -r "Normalizar fotos" dist/index.js
   ```

2. Se não encontrar, recompilar:
   ```bash
   cd /var/www/sispat/backend
   npm run build
   pm2 restart sispat-backend
   ```

3. Verificar logs:
   ```bash
   pm2 logs sispat-backend --lines 50
   ```

### **Problema 5: URLs Estão Incorretas**

**Sintoma:** URLs são construídas incorretamente (ex: `http://localhost:3000/uploads/...` em produção).

**Solução:**
1. Verificar variável de ambiente no frontend:
   ```bash
   # Verificar arquivo .env ou variáveis de build
   grep -r "VITE_API_URL" /var/www/sispat/.env* 2>/dev/null || echo "Não encontrado"
   ```

2. Se necessário, recompilar frontend:
   ```bash
   cd /var/www/sispat
   npm run build
   sudo systemctl reload nginx
   ```

## 🚀 Solução Completa (Passo a Passo)

Execute estes comandos na ordem:

```bash
# 1. Atualizar código
cd /var/www/sispat
git pull origin main

# 2. Resolver conflitos (se houver)
git checkout -- scripts/*.sh 2>/dev/null || true
git pull origin main

# 3. Executar diagnóstico completo
chmod +x scripts/diagnostico-completo-imagens.sh
./scripts/diagnostico-completo-imagens.sh

# 4. Verificar fotos no banco (substitua pelo número do patrimônio)
chmod +x scripts/verificar-fotos-banco.sh
./scripts/verificar-fotos-banco.sh 202501000004

# 5. Se fotos estão como JSON, corrigir
chmod +x scripts/corrigir-fotos-banco.sh
./scripts/corrigir-fotos-banco.sh

# 6. Corrigir permissões
sudo chown -R www-data:www-data /var/www/sispat/backend/uploads/
sudo find /var/www/sispat/backend/uploads -type f -exec chmod 644 {} \;
sudo find /var/www/sispat/backend/uploads -type d -exec chmod 755 {} \;

# 7. Recompilar backend
cd /var/www/sispat/backend
npm run build

# 8. Reiniciar backend
pm2 restart sispat-backend

# 9. Recompilar frontend
cd /var/www/sispat
npm run build

# 10. Recarregar Nginx
sudo systemctl reload nginx

# 11. Verificar status
pm2 status
pm2 logs sispat-backend --lines 20
```

## 🔍 Verificação Final

Após executar as correções:

1. **Acesse um bem com imagens:**
   - Abra o console do navegador (F12)
   - Verifique se há erros 404
   - Verifique as URLs das imagens

2. **Teste upload de nova imagem:**
   - Faça upload de uma nova imagem
   - Verifique se aparece imediatamente
   - Verifique se o arquivo foi criado no servidor

3. **Gere um PDF:**
   - Gere a ficha PDF de um bem com imagens
   - Verifique se a imagem aparece no PDF

## 📝 Logs Úteis

### Ver logs do backend em tempo real:
```bash
pm2 logs sispat-backend
```

### Ver logs do Nginx:
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Verificar se arquivo existe e é acessível:
```bash
# Verificar arquivo
ls -lh /var/www/sispat/backend/uploads/NOME_DO_ARQUIVO

# Testar acesso HTTP
curl -I https://sispat.vps-kinghost.net/uploads/NOME_DO_ARQUIVO
```

## 🆘 Se Nada Funcionar

1. **Verificar se backend está rodando:**
   ```bash
   pm2 status
   pm2 logs sispat-backend --lines 100
   ```

2. **Verificar se frontend foi compilado:**
   ```bash
   ls -la /var/www/sispat/dist/
   ```

3. **Verificar configuração Nginx:**
   ```bash
   sudo nginx -t
   cat /etc/nginx/sites-enabled/sispat | grep -A 10 "location /uploads"
   ```

4. **Fazer upload de teste:**
   - Faça upload de uma nova imagem
   - Verifique imediatamente se o arquivo foi criado
   - Verifique as permissões do arquivo criado

---

**Última atualização:** 19/11/2025

