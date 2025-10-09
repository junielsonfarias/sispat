# 🚀 EXECUTAR AGORA - DESENVOLVIMENTO LOCAL

**Objetivo:** Resolver erro 500 ao salvar personalização

---

## ⚡ **OPÇÃO 1: SCRIPT AUTOMÁTICO (RECOMENDADO)**

```bash
# Execute este script:
.\setup-dev-database.bat
```

**O que ele faz:**
- ✅ Reseta banco de dados
- ✅ Aplica migrations
- ✅ Cria tabela customizations
- ✅ Cria usuários de desenvolvimento
- ✅ Mostra credenciais

---

## ⚡ **OPÇÃO 2: MANUAL (SE PREFERIR)**

### **1. Resetar Banco**
```bash
cd backend
npx prisma migrate reset --force --skip-seed
npx prisma migrate dev --name init
npx prisma generate
```

### **2. Criar Tabela Customizations**
```bash
# Via psql:
psql -U postgres -d sispat_dev

# Executar:
CREATE TABLE IF NOT EXISTS customizations (
    id TEXT PRIMARY KEY,
    "municipalityId" TEXT,
    "activeLogoUrl" TEXT,
    "secondaryLogoUrl" TEXT,
    "backgroundType" TEXT DEFAULT 'color',
    "backgroundColor" TEXT DEFAULT '#f1f5f9',
    "primaryColor" TEXT DEFAULT '#2563eb',
    "welcomeTitle" TEXT DEFAULT 'Bem-vindo ao SISPAT',
    "welcomeSubtitle" TEXT DEFAULT 'Sistema de Gestão de Patrimônio',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

\q
```

### **3. Executar Seed**
```bash
cd backend

# Definir variáveis
set SUPERUSER_EMAIL=admin@dev.com
set SUPERUSER_PASSWORD=Admin@123!Dev
set SUPERUSER_NAME=Admin Desenvolvimento
set MUNICIPALITY_NAME=Município de Teste
set STATE=PA
set BCRYPT_ROUNDS=10

# Executar
npm run prisma:seed
```

### **4. Verificar**
```bash
psql -U postgres -d sispat_dev -c "SELECT email, role FROM users;"
psql -U postgres -d sispat_dev -c "SELECT * FROM customizations;"
```

---

## 🎯 **DEPOIS DO SETUP**

### **Terminal 1 - Backend:**
```bash
cd backend
npm run dev

# Deve mostrar:
# 🚀 Servidor rodando em: http://localhost:3000
```

### **Terminal 2 - Frontend:**
```bash
# Na raiz do projeto
npm run dev

# Deve mostrar:
# Local: http://localhost:8080
```

---

## 🧪 **TESTAR PERSONALIZAÇÃO**

1. **Abra:** `http://localhost:8080`

2. **Faça login:**
   ```
   Email: admin@dev.com
   Senha: Admin@123!Dev
   ```

3. **Vá em:** Personalização

4. **Altere:** Cor primária (ex: #ff0000)

5. **Clique:** Salvar

6. **Veja no terminal do backend:**
   ```
   💾 [DEV] Salvando customização para município: ...
   📋 [DEV] Dados recebidos: { primaryColor: '#ff0000', ... }
   📝 [DEV] Campos a salvar: ['primaryColor', 'updatedAt']
   🔄 [DEV] Atualizando customização existente...
   ✅ [DEV] UPDATE executado com sucesso
   ✅ [DEV] Customização salva!
   ```

7. **Recarregue a página (F5)**

8. **Cor deve permanecer!** ✅

---

## 🔍 **SE DER ERRO**

### **Erro: "Tabela customizations não existe"**
```bash
# Criar manualmente
psql -U postgres -d sispat_dev << 'EOF'
CREATE TABLE customizations (
    id TEXT PRIMARY KEY,
    "municipalityId" TEXT,
    "primaryColor" TEXT DEFAULT '#2563eb',
    "backgroundColor" TEXT DEFAULT '#f1f5f9',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF
```

### **Erro 500 ainda aparece**
```bash
# Ver logs detalhados no terminal do backend
# O erro vai aparecer assim:

❌ [DEV] ===== ERRO DETALHADO =====
   Tipo: ...
   Mensagem: ...
   Código: ...
==============================

# Cole o erro aqui para eu analisar!
```

### **Erro: "municipalityId is null"**
```bash
# Inserir municipalityId na customization
psql -U postgres -d sispat_dev << 'EOF'
UPDATE customizations 
SET "municipalityId" = (SELECT id FROM municipalities LIMIT 1)
WHERE "municipalityId" IS NULL;
EOF
```

---

## 📊 **VERIFICAR SE SALVOU NO BANCO**

```bash
# Ver dados na tabela customizations
psql -U postgres -d sispat_dev -c "SELECT * FROM customizations;"

# Deve mostrar:
#  id | municipalityId | primaryColor | backgroundColor | ...
# ----+----------------+--------------+-----------------+-----
#  ... | ...            | #ff0000      | #f1f5f9         | ...
```

---

## ✅ **RESULTADO ESPERADO**

**Console do Backend:**
```
💾 [DEV] Salvando customização para município: 1
📋 [DEV] Dados recebidos: {
  "primaryColor": "#ff0000",
  "backgroundColor": "#f1f5f9"
}
📝 [DEV] Campos a salvar: [ 'primaryColor', 'backgroundColor', 'updatedAt' ]
🔄 [DEV] Atualizando customização existente...
📝 [DEV] Query UPDATE: 
  UPDATE customizations 
  SET "primaryColor" = $1, "backgroundColor" = $2, "updatedAt" = $3
  WHERE "municipalityId" = $4
  RETURNING *
✅ [DEV] UPDATE executado com sucesso
✅ [DEV] Customização salva!
```

**Console do Frontend:**
```
✅ Customização salva com sucesso!
```

**Após F5:**
- Cor vermelha permanece ✅
- Dados vêm do banco, não do localStorage ✅

---

## 🎉 **PRONTO!**

Agora a personalização está salvando **no banco de dados PostgreSQL**!

Cole qualquer erro que aparecer para eu corrigir! 🚀

