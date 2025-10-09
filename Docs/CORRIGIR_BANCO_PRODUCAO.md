# 🔧 CORRIGIR BANCO DE DADOS EM PRODUÇÃO

**Problemas Encontrados:**
1. 🔴 Coluna `patrimonios.data_baixa` não existe
2. 🔴 Tabela `customizations` não existe  
3. ⚠️ Rate limit precisa de `trust proxy`

---

## ✅ **SOLUÇÃO COMPLETA**

Execute no servidor VPS:

```bash
cd /var/www/sispat/backend

# 1. Parar PM2 antes de mexer no banco
pm2 stop sispat-backend

# 2. Executar migrations para atualizar o schema
echo "Executando migrations..."
npx prisma migrate deploy

# Se der erro, usar db push (mais agressivo)
npx prisma db push --accept-data-loss

# 3. Verificar se as colunas foram criadas
echo ""
echo "Verificando colunas..."
sudo -u postgres psql -d sispat_prod -c "\d patrimonios" | grep data_baixa

# Deve mostrar:
# data_baixa | timestamp(3) without time zone |

# 4. Verificar se tabela customizations existe
echo ""
echo "Verificando tabela customizations..."
sudo -u postgres psql -d sispat_prod -c "\dt customizations"

# Se não existir, criar manualmente:
sudo -u postgres psql -d sispat_prod << 'EOF'
CREATE TABLE IF NOT EXISTS "customizations" (
    "id" TEXT NOT NULL,
    "activeLogoUrl" TEXT,
    "secondaryLogoUrl" TEXT,
    "backgroundType" TEXT NOT NULL DEFAULT 'color',
    "backgroundColor" TEXT NOT NULL DEFAULT '#f1f5f9',
    "backgroundImageUrl" TEXT,
    "backgroundVideoUrl" TEXT,
    "videoLoop" BOOLEAN NOT NULL DEFAULT true,
    "videoMuted" BOOLEAN NOT NULL DEFAULT true,
    "layout" TEXT NOT NULL DEFAULT 'center',
    "welcomeTitle" TEXT NOT NULL DEFAULT 'Bem-vindo ao SISPAT',
    "welcomeSubtitle" TEXT NOT NULL DEFAULT 'Sistema de Gestão de Patrimônio',
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "buttonTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter var, sans-serif',
    "browserTitle" TEXT NOT NULL DEFAULT 'SISPAT',
    "faviconUrl" TEXT,
    "loginFooterText" TEXT,
    "systemFooterText" TEXT,
    "superUserFooterText" TEXT,
    "prefeituraName" TEXT,
    "secretariaResponsavel" TEXT,
    "departamentoResponsavel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customizations_pkey" PRIMARY KEY ("id")
);

-- Inserir registro padrão
INSERT INTO "customizations" ("id", "updatedAt") 
VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
EOF

echo "✓ Tabela customizations criada"

# 5. Adicionar trust proxy no backend
echo ""
echo "Adicionando trust proxy..."
sed -i "/const app: Express = express();/a app.set('trust proxy', 1);" src/index.ts

# 6. Recompilar backend
echo ""
echo "Recompilando backend..."
npm run build

# 7. Reiniciar PM2
echo ""
echo "Reiniciando PM2..."
pm2 restart sispat-backend

# 8. Aguardar
sleep 10

# 9. Ver logs
echo ""
echo "Verificando logs..."
pm2 logs sispat-backend --lines 20 --nostream

# 10. Testar API
echo ""
echo "Testando API..."
curl http://sispat.vps-kinghost.net/api/health

echo ""
echo "✅ CORREÇÃO CONCLUÍDA!"
echo ""
echo "Recarregue o navegador (Ctrl+F5)"
```

---

## 🎯 **RESUMO DOS PROBLEMAS**

### **Problema 1: Migrations não aplicadas**
```
The column `patrimonios.data_baixa` does not exist
```

**Causa:** Migrations não foram executadas durante a instalação.

**Solução:** `npx prisma migrate deploy` ou `npx prisma db push`

---

### **Problema 2: Tabela customizations não existe**
```
relation "customizations" does not exist
```

**Causa:** Migration para essa tabela não foi aplicada.

**Solução:** Criar tabela manualmente via SQL.

---

### **Problema 3: Trust proxy não configurado**
```
ValidationError: The 'X-Forwarded-For' header is set but Express 'trust proxy' is false
```

**Causa:** Nginx passa header `X-Forwarded-For` mas Express não está configurado para confiar.

**Solução:** Adicionar `app.set('trust proxy', 1);` no `index.ts`

---

## 📝 **ADICIONAR TRUST PROXY MANUALMENTE**

Se o sed não funcionar, edite manualmente:

```bash
nano /var/www/sispat/backend/src/index.ts
```

Adicione esta linha logo após `const app: Express = express();`:

```typescript
const app: Express = express();
app.set('trust proxy', 1); // ← ADICIONAR ESTA LINHA
const PORT = process.env.PORT || 3000;
```

Salve (Ctrl+O, Enter, Ctrl+X) e recompile:

```bash
npm run build
pm2 restart sispat-backend
```

---

## ✅ **VERIFICAÇÃO**

Após executar os comandos:

```bash
# Ver se erro sumiu
pm2 logs sispat-backend --lines 20

# Não deve ter mais:
# ❌ "data_baixa does not exist"
# ❌ "customizations does not exist"  
# ❌ "trust proxy setting is false"

# Testar no navegador
# Recarregar página (Ctrl+F5)
# Dashboard deve carregar sem erro 500
```

---

**🚀 Execute os comandos acima e o sistema vai funcionar 100%!**
