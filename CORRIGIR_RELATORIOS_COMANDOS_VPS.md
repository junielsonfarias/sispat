# Correção Rápida: Erro na Página de Relatórios (VPS)

## Problema

Ao executar o script, ocorreram dois erros:
1. `cd: frontend: No such file or directory` - O frontend está na raiz, não em `frontend/`
2. `sh: 1: vite: Permission denied` - Vite precisa de permissão de execução

## Solução Rápida

Execute estes comandos no servidor VPS:

```bash
cd /var/www/sispat

# 1. Atualizar código
git pull origin main

# 2. Corrigir permissões do vite
chmod +x node_modules/.bin/vite

# 3. Recompilar frontend (na raiz, não em frontend/)
npm run build

# 4. Recarregar Nginx
sudo systemctl reload nginx
```

## Ou Use o Script Corrigido

O script foi corrigido. Execute:

```bash
cd /var/www/sispat
bash CORRIGIR_ERRO_RELATORIOS_PAGINA.sh
```

## Verificação

Após executar:

1. **Limpe o cache do navegador:**
   - `Ctrl+Shift+R` (Windows/Linux)
   - `Cmd+Shift+R` (Mac)

2. **Acesse:**
   - https://sispat.vps-kinghost.net/relatorios

3. **Se ainda houver erro:**
   - Abra DevTools (F12) > Console
   - Verifique logs: `pm2 logs sispat-backend --lines 50`

## Comandos Úteis

```bash
# Verificar se dist foi criado
ls -la /var/www/sispat/dist/

# Verificar permissões do vite
ls -la /var/www/sispat/node_modules/.bin/vite

# Ver logs do build
tail -50 /tmp/frontend-build-relatorios.log
```

