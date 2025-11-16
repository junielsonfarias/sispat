# 🚀 Guia Completo - Execução do Script de Atualização

## 📋 Visão Geral

O script `atualizar-producao.sh` automatiza todo o processo de atualização do sistema em produção, incluindo:
- ✅ Backup automático do código atual
- ✅ Atualização via Git
- ✅ Rebuild do frontend e backend
- ✅ Reinicialização de serviços
- ✅ Verificações e validações

---

## 📥 Pré-requisitos

### 1. Acesso ao Servidor
```bash
# Você precisa ter acesso SSH ao servidor de produção
ssh usuario@sispat.vps-kinghost.net
```

### 2. Permissões
```bash
# O script precisa de permissões de leitura/escrita no diretório do projeto
# E permissão para executar comandos PM2 e Nginx (pode precisar de sudo)
```

### 3. Dependências Instaladas
- ✅ Git instalado
- ✅ Node.js e npm instalados
- ✅ PM2 instalado (se usar PM2)
- ✅ Nginx instalado (se usar Nginx)

---

## 🎯 Método 1: Execução Direta (Recomendado)

### Passo 1: Conectar ao Servidor
```bash
ssh usuario@sispat.vps-kinghost.net
```

### Passo 2: Navegar para o Diretório do Projeto
```bash
cd /var/www/sispat
```

### Passo 3: Verificar se o Script Existe
```bash
ls -lh scripts/atualizar-producao.sh
```

### Passo 4: Dar Permissão de Execução (se necessário)
```bash
chmod +x scripts/atualizar-producao.sh
```

### Passo 5: Executar o Script
```bash
./scripts/atualizar-producao.sh
```

**OU com caminho completo:**
```bash
bash /var/www/sispat/scripts/atualizar-producao.sh
```

---

## 🎯 Método 2: Execução com Logs

### Salvar logs da execução:
```bash
cd /var/www/sispat
./scripts/atualizar-producao.sh 2>&1 | tee atualizacao_$(date +%Y%m%d_%H%M%S).log
```

Isso salvará toda a saída do script em um arquivo de log para análise posterior.

---

## 🎯 Método 3: Execução Passo a Passo (Manual)

Se preferir executar manualmente cada etapa:

### 1. Fazer Backup
```bash
cd /var/www/sispat
sudo cp -r frontend frontend.backup.$(date +%Y%m%d_%H%M%S)
```

### 2. Atualizar do Git
```bash
cd /var/www/sispat
git fetch origin
git pull origin main
```

### 3. Rebuild Frontend
```bash
cd /var/www/sispat/frontend
npm install
npm run build
```

### 4. Reiniciar Serviços
```bash
pm2 restart sispat-frontend
pm2 restart sispat-backend
sudo systemctl reload nginx
```

---

## 📋 Comandos Completos (Copy & Paste)

### Opção A: Execução Simples
```bash
ssh usuario@sispat.vps-kinghost.net
cd /var/www/sispat
chmod +x scripts/atualizar-producao.sh
./scripts/atualizar-producao.sh
```

### Opção B: Execução com Logs
```bash
ssh usuario@sispat.vps-kinghost.net
cd /var/www/sispat
chmod +x scripts/atualizar-producao.sh
./scripts/atualizar-producao.sh 2>&1 | tee atualizacao_$(date +%Y%m%d_%H%M%S).log
```

### Opção C: Execução com Verificação Prévia
```bash
ssh usuario@sispat.vps-kinghost.net
cd /var/www/sispat

# Verificar status atual
git status
git log --oneline -5

# Verificar se há alterações locais
git diff

# Executar script
chmod +x scripts/atualizar-producao.sh
./scripts/atualizar-producao.sh
```

---

## 🔍 O Que o Script Faz

### 1. **Verificações Iniciais**
- ✅ Verifica se está no diretório correto
- ✅ Verifica permissões
- ✅ Verifica se é um repositório Git

### 2. **Backup Automático**
- ✅ Cria backup do frontend
- ✅ Cria backup do backend
- ✅ Salva em `/var/www/sispat/backups/`

### 3. **Atualização Git**
- ✅ Verifica alterações não commitadas
- ✅ Faz stash se necessário
- ✅ Busca atualizações do repositório
- ✅ Aplica atualizações (git pull)

### 4. **Rebuild**
- ✅ Instala dependências (se necessário)
- ✅ Rebuild do frontend (`npm run build`)
- ✅ Rebuild do backend (se houver script)

### 5. **Reinicialização**
- ✅ Reinicia serviços PM2
- ✅ Recarrega configuração Nginx

### 6. **Verificações Finais**
- ✅ Verifica se build foi bem-sucedido
- ✅ Mostra commit atual
- ✅ Exibe resumo da atualização

---

## 📊 Saída Esperada do Script

```
════════════════════════════════════════
  🚀 Atualização de Produção - SISPAT
════════════════════════════════════════

ℹ️  Iniciando atualização...
ℹ️  Diretório do projeto: /var/www/sispat
ℹ️  Timestamp: 20250115_143022

════════════════════════════════════════
  Verificando Diretório
════════════════════════════════════════

✅ Diretório do projeto encontrado: /var/www/sispat

════════════════════════════════════════
  Fazendo Backup do Código Atual
════════════════════════════════════════

✅ Backup do frontend criado: /var/www/sispat/backups/frontend_20250115_143022

════════════════════════════════════════
  Atualizando Código do Repositório
════════════════════════════════════════

ℹ️  Buscando atualizações do repositório remoto...
ℹ️  Aplicando atualizações...
✅ Código atualizado para commit: fc4ee76

════════════════════════════════════════
  Rebuild do Frontend
════════════════════════════════════════

ℹ️  Executando build de produção...
✅ Build concluído com sucesso (tamanho: 2.5M)

════════════════════════════════════════
  Reiniciando Serviços
════════════════════════════════════════

✅ Serviço frontend reiniciado
✅ Serviço backend reiniciado

════════════════════════════════════════
  Resumo da Atualização
════════════════════════════════════════

✅ Atualização concluída com sucesso!

📋 Próximos passos:
  1. Limpar cache do navegador (Ctrl+Shift+R ou Cmd+Shift+R)
  2. Acessar o sistema e testar funcionalidades
  3. Verificar console do navegador para erros
  4. Testar geração de PDFs e visualização de imagens

📦 Backups salvos em: /var/www/sispat/backups
```

---

## ⚠️ Tratamento de Erros

### Erro: "Diretório do projeto não encontrado"
```bash
# Verificar se o caminho está correto
echo $PROJECT_DIR
# Ajustar no script se necessário
```

### Erro: "Diretório não é um repositório Git"
```bash
# Verificar se é um repositório Git
cd /var/www/sispat
ls -la .git
# Se não existir, inicializar ou clonar o repositório
```

### Erro: "Build falhou"
```bash
# Verificar logs do npm
cd /var/www/sispat/frontend
npm run build 2>&1 | tee build_error.log

# Verificar dependências
npm install

# Limpar cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Erro: "PM2 não encontrado"
```bash
# Instalar PM2
npm install -g pm2

# OU usar systemd diretamente
sudo systemctl restart sispat-frontend
```

---

## 🔄 Reverter Atualização (Se Necessário)

Se algo der errado, você pode reverter usando o backup:

```bash
cd /var/www/sispat

# Listar backups disponíveis
ls -lh backups/

# Restaurar backup do frontend
rm -rf frontend
cp -r backups/frontend_YYYYMMDD_HHMMSS frontend

# Reiniciar serviços
pm2 restart sispat-frontend
```

---

## 📝 Variáveis do Script

O script usa as seguintes variáveis (podem ser ajustadas no início do script):

```bash
PROJECT_DIR="/var/www/sispat"      # Diretório do projeto
FRONTEND_DIR="$PROJECT_DIR/frontend" # Diretório do frontend
BACKEND_DIR="$PROJECT_DIR/backend"   # Diretório do backend
BACKUP_DIR="$PROJECT_DIR/backups"    # Diretório de backups
GIT_BRANCH="main"                    # Branch do Git
GIT_REMOTE="origin"                  # Remote do Git
```

---

## 🎯 Checklist de Execução

Antes de executar:
- [ ] Acesso SSH ao servidor configurado
- [ ] Backup manual feito (opcional, o script faz automaticamente)
- [ ] Horário adequado (baixo tráfego, se possível)
- [ ] Notificação aos usuários (se necessário)

Durante a execução:
- [ ] Script executado com sucesso
- [ ] Nenhum erro crítico reportado
- [ ] Build concluído
- [ ] Serviços reiniciados

Após a execução:
- [ ] Testar acesso ao sistema
- [ ] Verificar funcionalidades principais
- [ ] Verificar console do navegador
- [ ] Testar geração de PDFs
- [ ] Verificar visualização de imagens
- [ ] Monitorar logs por alguns minutos

---

## 📞 Suporte

Se encontrar problemas:

1. **Verificar logs do script:**
   ```bash
   cat atualizacao_*.log
   ```

2. **Verificar logs do PM2:**
   ```bash
   pm2 logs sispat-frontend --lines 50
   pm2 logs sispat-backend --lines 50
   ```

3. **Verificar logs do Nginx:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Reverter para backup:**
   ```bash
   # Seguir instruções na seção "Reverter Atualização"
   ```

---

## ✅ Exemplo Completo de Execução

```bash
# 1. Conectar ao servidor
ssh usuario@sispat.vps-kinghost.net

# 2. Navegar para o projeto
cd /var/www/sispat

# 3. Verificar status atual
git status
git log --oneline -3

# 4. Dar permissão e executar
chmod +x scripts/atualizar-producao.sh
./scripts/atualizar-producao.sh

# 5. Aguardar conclusão e verificar
pm2 status
pm2 logs sispat-frontend --lines 20

# 6. Testar no navegador
# Acessar: https://sispat.vps-kinghost.net
# Limpar cache: Ctrl+Shift+R
# Verificar funcionalidades
```

---

**Última atualização:** $(date +%Y-%m-%d)  
**Versão do Script:** 1.0.0  
**Status:** ✅ Pronto para Uso

