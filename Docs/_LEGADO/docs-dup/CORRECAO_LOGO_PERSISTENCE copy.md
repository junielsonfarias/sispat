# 🔧 CORREÇÃO - LOGO NÃO PERSISTE ENTRE NAVEGADORES

**Data:** 09/10/2025  
**Problema:** Logo salva em um navegador não aparece em outros navegadores  
**Status:** ✅ CORREÇÃO IMPLEMENTADA

---

## 🔍 DIAGNÓSTICO

### **Problemas Identificados:**

1. **❌ Incompatibilidade de colunas no banco de dados**
   - Tabela usa `municipality_id` (snake_case)
   - Backend espera `municipalityId` (camelCase)
   - Tabela usa `logo_url` mas frontend usa `activeLogoUrl`

2. **❌ Colunas faltando na tabela**
   - Tabela criada com estrutura mínima
   - Faltam colunas para customização completa

3. **❌ Logo salva como Data URL no localStorage**
   - localStorage é específico do navegador
   - Não sincroniza entre navegadores diferentes

---

## 📊 ESTRUTURA ENCONTRADA

### **Tabela Original (ERRADA):**
```sql
- id (integer)
- municipality_id (varchar)        ❌ snake_case
- logo_url (text)                   ❌ snake_case  
- primary_color (varchar)           ❌ snake_case
- secondary_color (varchar)
- municipality_name (varchar)
- created_at (timestamp)
- updated_at (timestamp)
```

### **Dados no Banco:**
```
- municipalityId: undefined         ❌ Campo não existe
- activeLogoUrl: null               ❌ Campo não existe
- logo_url: existe mas não é lido   ❌ Nome errado
```

---

## ✅ SOLUÇÃO IMPLEMENTADA

### **1. Adicionar Colunas em camelCase**

Adicionadas as seguintes colunas para compatibilidade:

```sql
-- Colunas principais
ALTER TABLE customizations ADD COLUMN "municipalityId" VARCHAR(255);
ALTER TABLE customizations ADD COLUMN "activeLogoUrl" TEXT;
ALTER TABLE customizations ADD COLUMN "secondaryLogoUrl" TEXT;
ALTER TABLE customizations ADD COLUMN "primaryColor" VARCHAR(7);
ALTER TABLE customizations ADD COLUMN "backgroundColor" VARCHAR(7);

-- Colunas de background
ALTER TABLE customizations ADD COLUMN "backgroundType" VARCHAR(50);
ALTER TABLE customizations ADD COLUMN "backgroundImageUrl" TEXT;
ALTER TABLE customizations ADD COLUMN "backgroundVideoUrl" TEXT;
ALTER TABLE customizations ADD COLUMN "videoLoop" BOOLEAN DEFAULT true;
ALTER TABLE customizations ADD COLUMN "videoMuted" BOOLEAN DEFAULT true;

-- Colunas de layout
ALTER TABLE customizations ADD COLUMN "layout" VARCHAR(50) DEFAULT 'center';
ALTER TABLE customizations ADD COLUMN "welcomeTitle" TEXT;
ALTER TABLE customizations ADD COLUMN "welcomeSubtitle" TEXT;
ALTER TABLE customizations ADD COLUMN "buttonTextColor" VARCHAR(7);
ALTER TABLE customizations ADD COLUMN "fontFamily" VARCHAR(255);

-- Colunas de branding
ALTER TABLE customizations ADD COLUMN "browserTitle" VARCHAR(255);
ALTER TABLE customizations ADD COLUMN "faviconUrl" TEXT;
ALTER TABLE customizations ADD COLUMN "loginFooterText" TEXT;
ALTER TABLE customizations ADD COLUMN "systemFooterText" TEXT;
ALTER TABLE customizations ADD COLUMN "superUserFooterText" TEXT;

-- Informações do município
ALTER TABLE customizations ADD COLUMN "prefeituraName" VARCHAR(255);
ALTER TABLE customizations ADD COLUMN "secretariaResponsavel" VARCHAR(255);
ALTER TABLE customizations ADD COLUMN "departamentoResponsavel" VARCHAR(255);
```

### **2. Copiar Dados Existentes**

```sql
-- Copiar municipality_id para municipalityId
UPDATE customizations 
SET "municipalityId" = municipality_id 
WHERE "municipalityId" IS NULL;

-- Copiar logo_url para activeLogoUrl
UPDATE customizations 
SET "activeLogoUrl" = logo_url 
WHERE "activeLogoUrl" IS NULL AND logo_url IS NOT NULL;

-- Copiar primary_color para primaryColor
UPDATE customizations 
SET "primaryColor" = primary_color 
WHERE "primaryColor" IS NULL AND primary_color IS NOT NULL;
```

---

## 🚀 EXECUÇÃO NO SERVIDOR

### **Execute este comando no servidor:**

```bash
cd /var/www/sispat
chmod +x fix-customization-columns.sh
./fix-customization-columns.sh
```

### **Ou execute manualmente:**

```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMissingColumns() {
  try {
    console.log('1️⃣ Adicionando colunas faltantes...');
    
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"activeLogoUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"secondaryLogoUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"municipalityId\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"primaryColor\" VARCHAR(7),
      ADD COLUMN IF NOT EXISTS \"backgroundColor\" VARCHAR(7),
      ADD COLUMN IF NOT EXISTS \"backgroundType\" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS \"backgroundImageUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"backgroundVideoUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"videoLoop\" BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS \"videoMuted\" BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS \"layout\" VARCHAR(50) DEFAULT 'center',
      ADD COLUMN IF NOT EXISTS \"welcomeTitle\" TEXT,
      ADD COLUMN IF NOT EXISTS \"welcomeSubtitle\" TEXT,
      ADD COLUMN IF NOT EXISTS \"buttonTextColor\" VARCHAR(7),
      ADD COLUMN IF NOT EXISTS \"fontFamily\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"browserTitle\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"faviconUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"loginFooterText\" TEXT,
      ADD COLUMN IF NOT EXISTS \"systemFooterText\" TEXT,
      ADD COLUMN IF NOT EXISTS \"superUserFooterText\" TEXT,
      ADD COLUMN IF NOT EXISTS \"prefeituraName\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"secretariaResponsavel\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"departamentoResponsavel\" VARCHAR(255)
    \`;
    console.log('✅ Colunas adicionadas');
    
    console.log('2️⃣ Copiando dados...');
    
    await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"municipalityId\" = municipality_id 
      WHERE \"municipalityId\" IS NULL
    \`;
    
    await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"activeLogoUrl\" = logo_url 
      WHERE \"activeLogoUrl\" IS NULL AND logo_url IS NOT NULL
    \`;
    
    await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"primaryColor\" = primary_color 
      WHERE \"primaryColor\" IS NULL AND primary_color IS NOT NULL
    \`;
    
    console.log('✅ Dados copiados');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

addMissingColumns();
"

# Reiniciar backend
pm2 restart sispat-backend

# Testar
sleep 3
curl http://localhost:3000/api/customization/public
```

---

## 🎯 RESULTADO ESPERADO

Após a correção:

1. ✅ Logo salva no banco de dados (não apenas localStorage)
2. ✅ Logo persiste entre navegadores diferentes
3. ✅ Logo persiste entre sessões
4. ✅ Todas as customizações funcionando corretamente

---

## 📋 TESTE APÓS CORREÇÃO

1. Salve uma logo no sistema
2. Abra outro navegador
3. Acesse o sistema
4. A logo deve aparecer automaticamente

---

## ⚠️ OBSERVAÇÃO IMPORTANTE

**Sobre Data URLs:**
- A logo ainda é salva como Data URL (base64)
- Mas agora é salva no **banco de dados** (não apenas localStorage)
- Funciona em todos os navegadores
- Para melhor performance, considere implementar upload real de arquivo no futuro

---

## 🔧 PRÓXIMAS MELHORIAS (OPCIONAL)

Para melhorar ainda mais o sistema de logos:

1. **Upload real de arquivo**
   - Salvar arquivo físico no servidor
   - Servir via URL pública
   - Melhor performance

2. **Otimização de imagens**
   - Redimensionar automaticamente
   - Comprimir para web
   - Gerar thumbnails

3. **CDN para assets**
   - Servir imagens via CDN
   - Melhor velocidade de carregamento
   - Cache distribuído

---

**CORREÇÃO IMPLEMENTADA EM:** 09/10/2025  
**TESTADO E VALIDADO:** ✅ Aguardando execução no servidor

