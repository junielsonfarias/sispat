# 🔄 GUIA DE MIGRAÇÃO v2.0.5 → v2.0.6

**Data:** 11 de Outubro de 2025  
**Versão Atual:** 2.0.5  
**Versão Alvo:** 2.0.6  
**Tempo Estimado:** 2-3 semanas

---

## 🎯 OBJETIVO

Implementar as **5 correções críticas e médias** identificadas na análise de lógica:

1. ✅ ResponsibleSectors → IDs (migration criada)
2. ✅ Normalização de campos duplicados (migration criada)
3. ✅ TransferContext → use-transferencias (exemplo criado)
4. ✅ DocumentContext → use-documentos (exemplo criado)
5. ✅ Reduzir contextos (fase 2)

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Fase 1: Preparação](#fase-1-preparação)
3. [Fase 2: Staging](#fase-2-staging)
4. [Fase 3: Produção](#fase-3-produção)
5. [Fase 4: Limpeza](#fase-4-limpeza)
6. [Rollback](#rollback)
7. [FAQ](#faq)

---

## 🔍 VISÃO GERAL

### **Arquivos Criados (v2.0.5):**

```
backend/scripts/
  └─ apply-migrations-staging.sh          ✅ Script de aplicação

backend/src/controllers/
  └─ patrimonioController.v2.ts           ✅ Controller com IDs

src/pages/transferencias/
  └─ TransferenciasPage.v2.tsx            ✅ Exemplo com React Query

src/components/patrimonio/
  └─ DocumentosTab.v2.tsx                 ✅ Exemplo com React Query

backend/migrations-plan/
  ├─ 02_normalizar_campos_duplicados.sql  ✅ Migration campos
  └─ 03_responsible_sectors_ids.sql       ✅ Migration IDs
```

### **Impacto:**

```
┌────────────────────────────────────────────────┐
│  COMPONENTE           │ IMPACTO │ BREAKING?   │
├────────────────────────────────────────────────┤
│  Database             │  ALTO   │  NÃO*       │
│  Backend Controllers  │  MÉDIO  │  NÃO        │
│  Frontend Contexts    │  MÉDIO  │  NÃO**      │
│  Frontend Components  │  BAIXO  │  NÃO        │
└────────────────────────────────────────────────┘

* Migrations têm fallback
** Contextos antigos coexistem temporariamente
```

---

## 📦 FASE 1: PREPARAÇÃO (Semana 1)

### **1.1. Backup Completo**

```bash
# Backup do banco de dados
pg_dump -U postgres -d sispat_production > backup_pre_migration_$(date +%Y%m%d).sql

# Backup do código
git tag v2.0.5-stable
git push origin v2.0.5-stable

# Backup de uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz /var/www/sispat/backend/uploads/
```

### **1.2. Testar em Desenvolvimento**

```bash
# 1. Aplicar migrations em dev
cd backend/scripts
chmod +x apply-migrations-staging.sh

DB_NAME=sispat_dev \
DB_USER=postgres \
DB_PASSWORD=senha \
./apply-migrations-staging.sh

# 2. Executar testes
cd ../..
npm test

# 3. Testar manualmente
npm run dev
```

### **1.3. Criar Branch de Migração**

```bash
git checkout -b feature/migration-v2.0.6
git add .
git commit -m "feat: preparar migração v2.0.6 - scripts e exemplos"
git push origin feature/migration-v2.0.6
```

---

## 🧪 FASE 2: STAGING (Semana 2)

### **2.1. Aplicar Migrations**

```bash
# SSH no servidor staging
ssh user@staging.sispat.com

cd /var/www/sispat/backend/scripts

# Aplicar migrations
DB_NAME=sispat_staging \
DB_USER=postgres \
DB_PASSWORD=$STAGING_DB_PASSWORD \
./apply-migrations-staging.sh
```

**Output Esperado:**
```
╔════════════════════════════════════════╗
║  SISPAT - Aplicar Migrations Staging  ║
║           Versão 2.0.5                 ║
╚════════════════════════════════════════╝

🔍 Testando conexão com o banco...
✅ Conexão bem-sucedida!

📦 Criando backup completo...
✅ Backup criado: backup_before_migrations_20251011_143022.sql

🔄 Aplicando Migration 1: ResponsibleSectors → IDs
   Arquivo: 03_responsible_sectors_ids.sql

Aplicar Migration 1? (sim/não): sim
⚙️  Executando...
✅ Migration 1 aplicada com sucesso!

🔄 Aplicando Migration 2: Normalização de Campos
   Arquivo: 02_normalizar_campos_duplicados.sql

Aplicar Migration 2? (sim/não): sim
⚙️  Executando...
✅ Migration 2 aplicada com sucesso!

🔍 Verificando integridade do banco...
✅ Verificação concluída!

╔════════════════════════════════════════╗
║         MIGRATIONS APLICADAS!          ║
╚════════════════════════════════════════╝
```

### **2.2. Atualizar Backend**

```bash
# 1. Renomear controller (ativar v2)
cd /var/www/sispat/backend/src/controllers
cp patrimonioController.v2.ts patrimonioController.v2.backup
# Mesclar mudanças manualmente ou usar v2 diretamente

# 2. Recompilar
cd /var/www/sispat/backend
npm run build

# 3. Reiniciar
pm2 restart backend
pm2 logs backend --lines 50
```

### **2.3. Atualizar Frontend**

```bash
cd /var/www/sispat

# 1. Renomear componentes (ativar v2)
cd src/pages/transferencias
cp TransferenciasPage.v2.tsx TransferenciasPage.tsx

cd ../../components/patrimonio
cp DocumentosTab.v2.tsx DocumentosTab.tsx

# 2. Recompilar
cd /var/www/sispat
npm run build

# 3. Reiniciar
pm2 restart frontend
pm2 logs frontend --lines 20
```

### **2.4. Testes em Staging**

**Checklist:**

```
BACKEND:
□ GET /api/patrimonios (com filtro por setor)
□ GET /api/patrimonios/:id (acesso validado)
□ POST /api/transferencias
□ PUT /api/transferencias/:id/aprovar
□ POST /api/documentos
□ DELETE /api/documentos/:id

FRONTEND:
□ Login funciona
□ Dashboard carrega
□ Listar patrimônios (filtro por setor correto)
□ Criar transferência
□ Aprovar transferência
□ Upload de documento
□ Deletar documento

PERMISSÕES:
□ Usuario vê apenas setores atribuídos
□ Supervisor vê todos os setores
□ Admin vê todos os setores

PERFORMANCE:
□ Queries rápidas (< 200ms)
□ Cache funcionando
□ Invalidação correta
```

### **2.5. Monitoramento (1 Semana)**

```bash
# Logs de erro
pm2 logs backend --err

# Métricas
curl http://staging.sispat.com/api/health

# Queries lentas
psql -U postgres -d sispat_staging -c "
SELECT 
  query, 
  mean_exec_time, 
  calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
"
```

---

## 🚀 FASE 3: PRODUÇÃO (Semana 3)

### **3.1. Janela de Manutenção**

**Comunicado aos Usuários:**
```
MANUTENÇÃO PROGRAMADA

Data: [DATA]
Horário: 22:00 às 23:00 (1h)
Impacto: Sistema indisponível

Melhorias:
- Performance otimizada
- Transferências persistentes
- Documentos rastreados

Após a manutenção:
- Testar login
- Reportar problemas
```

### **3.2. Aplicar Migrations em Produção**

```bash
# SSH no servidor produção
ssh root@sispat.com

cd /var/www/sispat/backend/scripts

# Aplicar migrations
DB_NAME=sispat_production \
DB_USER=postgres \
DB_PASSWORD=$PROD_DB_PASSWORD \
./apply-migrations-staging.sh
```

### **3.3. Atualizar Código**

```bash
cd /var/www/sispat

# 1. Pull do código
git checkout main
git pull origin main

# 2. Backend
cd backend
npm install
npm run build
pm2 restart backend

# 3. Frontend
cd ..
npm install
npm run build
pm2 restart frontend

# 4. Verificar
pm2 status
pm2 logs backend --lines 30
pm2 logs frontend --lines 20
```

### **3.4. Smoke Tests**

```bash
# 1. Health check
curl https://sispat.com/api/health

# 2. Login
curl -X POST https://sispat.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sispat.com","password":"senha"}'

# 3. Listar patrimônios
curl https://sispat.com/api/patrimonios \
  -H "Authorization: Bearer $TOKEN"
```

### **3.5. Monitoramento Intensivo (24h)**

```bash
# Terminal 1: Backend logs
pm2 logs backend --lines 100 --timestamp

# Terminal 2: Frontend logs
pm2 logs frontend --lines 50 --timestamp

# Terminal 3: DB queries
watch -n 5 'psql -U postgres -d sispat_production -c "SELECT count(*) FROM pg_stat_activity"'

# Terminal 4: Metrics
watch -n 10 'curl -s https://sispat.com/api/health | jq'
```

---

## 🧹 FASE 4: LIMPEZA (Após 1 Mês)

### **4.1. Remover Código Legado**

```bash
# Remover contextos antigos
rm src/contexts/TransferContext.tsx
rm src/contexts/DocumentContext.tsx

# Remover componentes antigos
rm src/pages/transferencias/TransferenciasPage.old.tsx
rm src/components/patrimonio/DocumentosTab.old.tsx

# Remover fallbacks do controller
# Editar patrimonioController.ts:
# - Remover verificação de responsibleSectors (nomes)
# - Manter apenas responsibleSectorIds
```

### **4.2. Atualizar Testes**

```typescript
// Atualizar testes para usar React Query
import { renderWithQueryClient } from '@/test-utils'
import { useTransferencias } from '@/hooks/queries/use-transferencias'

describe('TransferenciasPage', () => {
  it('deve listar transferências', async () => {
    const { findByText } = renderWithQueryClient(<TransferenciasPage />)
    expect(await findByText('Transferências')).toBeInTheDocument()
  })
})
```

### **4.3. Documentação Final**

```bash
# Criar documentação de lições aprendidas
touch LICOES_APRENDIDAS_v2.0.6.md

# Atualizar README
# Atualizar CHANGELOG
# Criar tag de release
git tag v2.0.6
git push origin v2.0.6
```

---

## ⚠️ ROLLBACK

### **Se algo der errado:**

#### **Rollback de Database (Staging/Produção):**

```bash
# Restaurar backup
cd /var/www/sispat/backend/scripts
BACKUP_FILE="backup_before_migrations_YYYYMMDD_HHMMSS.sql"

PGPASSWORD=$DB_PASSWORD psql \
  -h localhost \
  -U postgres \
  -d sispat_production \
  < $BACKUP_FILE

echo "✅ Database restaurado!"
```

#### **Rollback de Código:**

```bash
cd /var/www/sispat

# Voltar para v2.0.5
git checkout v2.0.5-stable

# Backend
cd backend
npm install
npm run build
pm2 restart backend

# Frontend
cd ..
npm install
npm run build
pm2 restart frontend

echo "✅ Código restaurado para v2.0.5!"
```

#### **Verificar Rollback:**

```bash
# 1. Health check
curl https://sispat.com/api/health

# 2. Login
curl -X POST https://sispat.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sispat.com","password":"senha"}'

# 3. Verificar logs
pm2 logs backend --lines 50
pm2 logs frontend --lines 20
```

---

## ❓ FAQ

### **1. As migrations são reversíveis?**

**Sim, parcialmente.** As migrations criam backups automáticos:
- `users_backup_20251011` (antes de alterar responsibleSectors)
- `patrimonio_backup_20251011` (antes de normalizar campos)

Para reverter manualmente, execute:
```sql
TRUNCATE users CASCADE;
INSERT INTO users SELECT * FROM users_backup_20251011;
```

---

### **2. Posso aplicar apenas 1 migration?**

**Sim!** O script `apply-migrations-staging.sh` pergunta individualmente:
```bash
Aplicar Migration 1? (sim/não): sim
Aplicar Migration 2? (sim/não): não  # Pular esta
```

---

### **3. Como testar migrations localmente?**

```bash
# 1. Criar database de teste
createdb sispat_test

# 2. Restaurar backup de produção
pg_restore -d sispat_test backup_production.sql

# 3. Aplicar migrations
DB_NAME=sispat_test ./apply-migrations-staging.sh

# 4. Testar aplicação
npm run dev
```

---

### **4. Quanto tempo dura a migration?**

**Depende do tamanho do banco:**
- < 10k registros: ~5 segundos
- 10k-100k registros: ~30 segundos
- 100k-500k registros: ~2 minutos
- > 500k registros: ~5 minutos

---

### **5. Preciso parar a aplicação durante a migration?**

**Não, mas é recomendado!**

As migrations usam transações e locks, então:
- ✅ Podem ser aplicadas com app rodando
- ⚠️ Queries podem ficar lentas (locks)
- ⚠️ Users podem ver dados inconsistentes temporariamente

**Recomendação:** Aplicar em horário de baixo tráfego (22h-6h).

---

### **6. Como validar que a migration funcionou?**

```sql
-- 1. Verificar responsibleSectorIds
SELECT 
  id, 
  name, 
  "responsibleSectors", 
  "responsibleSectorIds"
FROM users
WHERE array_length("responsibleSectorIds", 1) > 0;

-- 2. Verificar patrimônios normalizados
SELECT 
  id,
  numero_patrimonio,
  "sectorId",
  setor_responsavel  -- Deve ser NULL após normalização
FROM patrimonios
LIMIT 10;

-- 3. Contar registros
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM patrimonios) as patrimonios,
  (SELECT COUNT(*) FROM transferencias) as transferencias,
  (SELECT COUNT(*) FROM documents) as documents;
```

---

## ✅ CHECKLIST FINAL

```
PREPARAÇÃO:
□ Backup do banco
□ Backup do código
□ Tag v2.0.5-stable criada
□ Branch feature/migration-v2.0.6 criada
□ Testes em desenvolvimento OK

STAGING:
□ Migrations aplicadas
□ Backend atualizado
□ Frontend atualizado
□ Testes manuais OK
□ Monitoramento por 1 semana OK

PRODUÇÃO:
□ Comunicado enviado aos usuários
□ Janela de manutenção agendada
□ Migrations aplicadas
□ Código atualizado
□ Smoke tests OK
□ Monitoramento 24h OK

LIMPEZA:
□ Código legado removido (após 1 mês)
□ Testes atualizados
□ Documentação final
□ Tag v2.0.6 criada
```

---

## 📞 SUPORTE

**Se encontrar problemas:**
1. Consultar este guia (seção Rollback)
2. Verificar logs: `pm2 logs backend --err`
3. Verificar backups disponíveis
4. Executar rollback se necessário

---

**🎉 BOA SORTE COM A MIGRAÇÃO!**

**Equipe SISPAT**  
11 de Outubro de 2025  
Versão 2.0.6 (em preparação)

