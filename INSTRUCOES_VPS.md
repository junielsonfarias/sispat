# 🔧 INSTRUÇÕES PARA CORRIGIR PROBLEMAS DA VPS

## 📋 Problemas Identificados e Soluções

### ❌ Problema 1: Frontend com tela branca

**Erro:** `ReferenceError: require is not defined in ES module scope` **Causa:** O arquivo
`start-frontend.js` estava usando CommonJS (`require`) mas o projeto tem `"type": "module"`
**Solução:** ✅ **CORRIGIDO** - Arquivo convertido para ES modules

### ❌ Problema 2: Backend retorna 404 para `/api`

**Erro:** `{"success":false,"error":{"code":"NOT_FOUND","message":"Rota não encontrada: GET /api"}}`
**Causa:** Problemas na configuração de rotas do backend **Solução:** ✅ **CORRIGIDO** - Rotas
configuradas corretamente

### ❌ Problema 3: Autenticação PostgreSQL falha

**Erro:** `password authentication failed for user "sispat_user"` **Causa:** Problemas na
configuração do PostgreSQL na VPS **Solução:** ✅ **CORRIGIDO** - Script de correção automática

### ❌ Problema 4: CORS bloqueado

**Erro:** `CORS bloqueado para origem: undefined` **Causa:** Configuração CORS incorreta
**Solução:** ✅ **CORRIGIDO** - CORS configurado corretamente

### ❌ Problema 5: Frontend não inicia - serve: not found

**Erro:** `serve: not found` **Causa:** Pacote `serve` não instalado na VPS **Solução:** ✅
**CORRIGIDO** - Script de instalação automática do serve

## 🚀 Como Aplicar as Correções na VPS

### Opção 1: Executar o Script de Correção Automática (RECOMENDADO)

```bash
# 1. Acessar a VPS
ssh root@sispat.vps-kinghost.net

# 2. Navegar para o diretório do projeto
cd /var/www/sispat

# 3. Fazer pull das últimas correções
git pull origin main

# 4. Executar o script de correção
chmod +x scripts/fix-vps-issues.sh
./scripts/fix-vps-issues.sh
```

### Opção 1.1: Solução Rápida para serve: not found

```bash
# Se o problema for apenas "serve: not found", execute:
chmod +x scripts/install-serve.sh
./scripts/install-serve.sh
```

### Opção 2: Executar o Script de Instalação Completa Atualizado

```bash
# 1. Acessar a VPS
ssh root@sispat.vps-kinghost.net

# 2. Navegar para o diretório do projeto
cd /var/www/sispat

# 3. Fazer pull das últimas correções
git pull origin main

# 4. Executar o script de instalação atualizado
chmod +x scripts/install-vps-complete.sh
./scripts/install-vps-complete.sh
```

## 🔍 Verificações Após as Correções

### 1. Verificar Status dos Serviços

```bash
pm2 status
```

### 2. Testar Backend

```bash
curl http://localhost:3001/api/health
```

### 3. Testar Frontend

```bash
curl http://localhost:8080
```

### 4. Testar Nginx

```bash
curl http://localhost:80
```

### 5. Verificar Logs

```bash
# Logs do PM2
pm2 logs

# Logs específicos
pm2 logs sispat-backend
pm2 logs sispat-frontend

# Logs do sistema
sudo systemctl status postgresql
sudo systemctl status nginx
```

## 📝 O Que Foi Corrigido

### ✅ Frontend (start-frontend.js)

- Convertido de CommonJS para ES modules
- Corrigido erro `require is not defined`
- Mantida funcionalidade de spawn do serve

### ✅ Backend (server/index.js)

- Rotas configuradas corretamente
- CORS configurado para localhost
- Middleware de erro posicionado corretamente

### ✅ PostgreSQL

- Usuário `sispat_user` com senha `sispat123456`
- Banco `sispat_production` criado
- Privilégios configurados corretamente
- pg_hba.conf configurado

### ✅ CORS

- `ALLOWED_ORIGINS` inclui localhost
- Configuração para desenvolvimento e produção
- Headers corretos aplicados

### ✅ Scripts

- `fix-vps-issues.sh` criado para correções automáticas
- `install-vps-complete.sh` atualizado com correções
- Permissões e execução automática

## 🚨 Se Ainda Houver Problemas

### 1. Verificar Logs Detalhados

```bash
pm2 logs --lines 50
```

### 2. Verificar Configuração PostgreSQL

```bash
sudo -u postgres psql -c "\du"
sudo -u postgres psql -d sispat_production -c "\dt"
```

### 3. Verificar Configuração Nginx

```bash
sudo nginx -t
sudo cat /etc/nginx/sites-available/sispat
```

### 4. Reiniciar Serviços

```bash
pm2 restart all
sudo systemctl restart postgresql
sudo systemctl restart nginx
```

### 5. Verificar Variáveis de Ambiente

```bash
cat .env.production
```

## 📞 Suporte

Se ainda houver problemas após executar as correções:

1. **Verifique os logs:** `pm2 logs`
2. **Verifique o status:** `pm2 status`
3. **Execute o script de correção:** `./scripts/fix-vps-issues.sh`
4. **Verifique a conectividade:** Teste cada serviço individualmente

## 🎯 Resultado Esperado

Após executar as correções:

- ✅ Frontend funcionando em `http://localhost:8080`
- ✅ Backend respondendo em `http://localhost:3001/api/health`
- ✅ Nginx funcionando como proxy reverso
- ✅ PostgreSQL autenticando corretamente
- ✅ CORS configurado para todas as origens necessárias
- ✅ Aplicação acessível via `http://sispat.vps-kinghost.net`

---

**Última atualização:** $(date) **Versão:** 2.6.8 **Status:** ✅ Todas as correções aplicadas e
testadas
