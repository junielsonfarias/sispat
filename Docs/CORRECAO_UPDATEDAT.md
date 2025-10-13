# ✅ CORREÇÃO - COLUNA updatedAt

**Problema:** Column "updatedAt" does not exist  
**Solução:** Adicionar coluna updatedAt em camelCase

---

## 🚀 EXECUTE ESTE COMANDO:

```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addUpdatedAt() {
  try {
    console.log('🔧 Adicionando coluna updatedAt...');
    
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"updatedAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    \`;
    
    console.log('✅ Coluna updatedAt adicionada!');
    
    // Copiar dados de updated_at para updatedAt
    await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"updatedAt\" = updated_at 
      WHERE \"updatedAt\" IS NULL AND updated_at IS NOT NULL
    \`;
    
    console.log('✅ Dados copiados de updated_at para updatedAt');
    
    // Verificar resultado
    const result = await prisma.\$queryRaw\`
      SELECT \"updatedAt\", updated_at FROM customizations LIMIT 1
    \`;
    
    console.log('📊 Resultado:');
    console.log('- updatedAt:', result[0].updatedAt);
    console.log('- updated_at:', result[0].updated_at);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

addUpdatedAt();
"
```

### **Reiniciar backend:**
```bash
cd /var/www/sispat/backend
pm2 restart sispat-backend
```

### **Testar:**
```bash
sleep 3
curl http://localhost:3000/api/customization/public
```

---

## 🎯 **APÓS EXECUTAR:**

1. ✅ A coluna `updatedAt` será criada
2. ✅ O controller funcionará corretamente
3. ✅ Você poderá salvar a logo sem erro 500

---

**Execute o comando e teste salvar a logo novamente! 🚀**
