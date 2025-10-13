# 🛠️ SISPAT 2.0 - COMANDOS ÚTEIS

**Guia rápido de comandos para desenvolvimento e produção**

---

## 🚀 INICIAR O SISTEMA

### **Backend**

```bash
# Método 1: Script automático (Windows)
.\iniciar-backend.bat

# Método 2: Script de reinício rápido (Windows)
.\reiniciar-backend.bat

# Método 3: Manual
cd backend
pnpm install
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm dev

# Método 4: Com PM2 (Produção)
cd backend
pm2 start ecosystem.config.js
pm2 logs
```

### **Frontend**

```bash
# Desenvolvimento
pnpm dev

# Build para produção
pnpm build

# Preview da build
pnpm preview
```

---

## 🔍 VERIFICAR STATUS

### **Backend Health Check**

```bash
curl http://localhost:3000/api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-09T...",
  "uptime": 123,
  "environment": "development",
  "database": "connected",
  "version": "2.0.0"
}
```

### **PM2 Status**

```bash
pm2 status
pm2 logs sispat-backend
pm2 monit
```

### **Verificar Porta em Uso**

```bash
# Windows PowerShell
netstat -ano | findstr :3000

# Matar processo na porta 3000
taskkill /F /PID <PID>
```

---

## 🗄️ BANCO DE DADOS

### **Prisma Commands**

```bash
cd backend

# Gerar Prisma Client
pnpm exec prisma generate

# Criar nova migration
pnpm exec prisma migrate dev --name descricao_da_migration

# Aplicar migrations (produção)
pnpm exec prisma migrate deploy

# Abrir Prisma Studio (GUI)
pnpm exec prisma studio

# Reset completo (CUIDADO! Apaga dados)
pnpm exec prisma migrate reset --force

# Ver status das migrations
pnpm exec prisma migrate status
```

### **Backup e Restore**

```bash
# Backup (PostgreSQL)
pg_dump -U postgres -d sispat > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres -d sispat < backup_20251009.sql
```

---

## 🧪 TESTES

### **Unit Tests (Vitest)**

```bash
# Rodar todos os testes
pnpm test

# Rodar em modo watch
pnpm test:watch

# Gerar relatório de cobertura
pnpm test:coverage

# Rodar teste específico
pnpm test -- ImageUpload
```

### **E2E Tests (Playwright)**

```bash
# Rodar todos os E2E tests
pnpm test:e2e

# Rodar com interface gráfica
pnpm test:e2e:ui

# Rodar em browser específico
pnpm exec playwright test --project=chromium

# Debug mode
pnpm exec playwright test --debug

# Gerar relatório
pnpm exec playwright show-report
```

---

## 🔧 DESENVOLVIMENTO

### **Lint e Format**

```bash
# Rodar ESLint
pnpm lint

# Rodar ESLint e corrigir automaticamente
pnpm lint:fix

# Verificar tipos TypeScript
pnpm type-check
```

### **Git**

```bash
# Status
git status

# Adicionar arquivos
git add .

# Commit
git commit -m "feat: adicionar nova funcionalidade"

# Push
git push origin main

# Pull
git pull origin main

# Ver histórico
git log --oneline -10

# Desfazer último commit (mantém alterações)
git reset --soft HEAD~1
```

---

## 📊 LOGS E DEBUG

### **Ver Logs do Backend**

```bash
# Logs estruturados
cd backend

# Ver todos os logs
Get-Content logs/combined.log -Tail 50

# Ver apenas erros
Get-Content logs/error.log -Tail 50

# Ver HTTP requests
Get-Content logs/http.log -Tail 50

# Monitorar em tempo real
Get-Content logs/combined.log -Wait -Tail 20
```

### **Limpar Logs**

```bash
cd backend/logs
Remove-Item *.log
```

---

## 🐳 DOCKER

### **Docker Compose**

```bash
# Subir todos os serviços
docker-compose up -d

# Ver status
docker-compose ps

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down

# Rebuild
docker-compose up -d --build

# Limpar tudo
docker-compose down -v
```

### **PostgreSQL no Docker**

```bash
# Acessar PostgreSQL
docker exec -it sispat-postgres psql -U postgres -d sispat

# Backup do container
docker exec sispat-postgres pg_dump -U postgres sispat > backup.sql

# Restore no container
docker exec -i sispat-postgres psql -U postgres sispat < backup.sql
```

---

## 📦 DEPENDÊNCIAS

### **Instalar Dependências**

```bash
# Frontend e Backend
pnpm install

# Apenas produção
pnpm install --prod

# Limpar node_modules e reinstalar
Remove-Item -Recurse -Force node_modules
pnpm install
```

### **Atualizar Dependências**

```bash
# Ver dependências desatualizadas
pnpm outdated

# Atualizar todas (patch e minor)
pnpm update

# Atualizar dependência específica
pnpm update react

# Atualizar para última versão (breaking changes)
pnpm update --latest
```

---

## 🚀 DEPLOY

### **Build de Produção**

```bash
# Frontend
pnpm build
# Output: dist/

# Backend
cd backend
pnpm build
# Output: dist/

# Testar build localmente
pnpm preview
```

### **PM2 - Produção**

```bash
# Iniciar aplicação
pm2 start ecosystem.config.js

# Parar aplicação
pm2 stop sispat-backend

# Reiniciar aplicação
pm2 restart sispat-backend

# Deletar do PM2
pm2 delete sispat-backend

# Salvar configuração atual
pm2 save

# Configurar para iniciar com o sistema
pm2 startup

# Ver logs em tempo real
pm2 logs sispat-backend --lines 100
```

---

## 🔐 SEGURANÇA

### **Gerar JWT Secret**

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

### **Verificar Variáveis de Ambiente**

```bash
cd backend
Get-Content .env
```

---

## 📈 MONITORAMENTO

### **Verificar Uso de Recursos**

```bash
# PM2
pm2 monit

# Processos Node
Get-Process | Where-Object {$_.ProcessName -eq "node"}

# Memória do PostgreSQL
docker stats sispat-postgres
```

### **Verificar Conexões Ativas**

```bash
# Backend
curl http://localhost:3000/api/health

# PostgreSQL (dentro do container)
docker exec sispat-postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 🆘 TROUBLESHOOTING

### **Backend Não Inicia**

```bash
# 1. Verificar se a porta está ocupada
netstat -ano | findstr :3000

# 2. Matar processos Node
taskkill /F /IM node.exe

# 3. Verificar variáveis de ambiente
cd backend
Get-Content .env

# 4. Verificar PostgreSQL
docker-compose ps

# 5. Regenerar Prisma Client
cd backend
pnpm exec prisma generate

# 6. Aplicar migrations
pnpm exec prisma migrate deploy

# 7. Iniciar com logs detalhados
$env:DEBUG="*"; pnpm dev
```

### **Erro de Conexão com Banco**

```bash
# Verificar se PostgreSQL está rodando
docker-compose ps

# Reiniciar PostgreSQL
docker-compose restart postgres

# Verificar logs do PostgreSQL
docker-compose logs postgres

# Testar conexão manualmente
docker exec -it sispat-postgres psql -U postgres -c "SELECT 1;"
```

### **Frontend Não Conecta ao Backend**

```bash
# 1. Verificar se backend está rodando
curl http://localhost:3000/api/health

# 2. Verificar VITE_API_URL no .env
Get-Content .env | Select-String "VITE_API_URL"

# 3. Limpar cache do Vite
Remove-Item -Recurse -Force node_modules/.vite

# 4. Reiniciar dev server
pnpm dev
```

---

## 📝 COMANDOS RÁPIDOS DE MANUTENÇÃO

```bash
# Limpeza completa
Remove-Item -Recurse -Force node_modules, dist, backend/node_modules, backend/dist
pnpm install

# Reset do banco de desenvolvimento
cd backend
pnpm exec prisma migrate reset --force

# Rebuild completo
pnpm install
cd backend
pnpm exec prisma generate
pnpm exec prisma migrate deploy
cd ..
pnpm build

# Verificar tudo
pnpm lint
pnpm type-check
pnpm test
pnpm test:e2e
```

---

## 🎯 COMANDOS MAIS USADOS NO DIA A DIA

```bash
# 1. Iniciar desenvolvimento
.\iniciar-backend.bat        # Em um terminal
pnpm dev                     # Em outro terminal

# 2. Verificar se está funcionando
curl http://localhost:3000/api/health

# 3. Ver logs do backend
cd backend
Get-Content logs/combined.log -Wait -Tail 20

# 4. Rodar testes antes de commit
pnpm lint
pnpm test

# 5. Git commit e push
git add .
git commit -m "feat: minha alteração"
git push origin main
```

---

**💡 Dica:** Adicione esses comandos aos seus aliases ou crie scripts personalizados!

---

**Última Atualização:** 09/10/2025  
**Versão:** 2.0.0

