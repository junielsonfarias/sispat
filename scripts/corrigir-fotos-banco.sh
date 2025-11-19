#!/bin/bash

# Script para corrigir fotos no banco de dados (converter objetos JSON para strings)
# Uso: ./scripts/corrigir-fotos-banco.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔧 Correção de Fotos no Banco${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⚠️  Este script irá:${NC}"
echo "  1. Buscar todos os patrimônios com fotos"
echo "  2. Converter objetos JSON para strings (URLs)"
echo "  3. Atualizar o banco de dados"
echo ""
read -p "Continuar? (s/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}Operação cancelada${NC}"
    exit 0
fi

cd /var/www/sispat/backend

echo ""
echo -e "${BLUE}1. Buscando patrimônios com fotos...${NC}"
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function corrigirFotos() {
  try {
    // Buscar todos os patrimônios com fotos
    const patrimonios = await prisma.patrimonio.findMany({
      where: {
        fotos: {
          isEmpty: false
        }
      },
      select: {
        id: true,
        numero_patrimonio: true,
        fotos: true
      }
    });
    
    console.log(\`Encontrados \${patrimonios.length} patrimônios com fotos\`);
    console.log('');
    
    let corrigidos = 0;
    let totalFotos = 0;
    
    for (const patrimonio of patrimonios) {
      let precisaCorrigir = false;
      const fotosCorrigidas = patrimonio.fotos.map((foto, index) => {
        // Se for string, verificar se é JSON
        if (typeof foto === 'string') {
          // Tentar parsear como JSON
          if (foto.startsWith('{') || foto.startsWith('[')) {
            try {
              const parsed = JSON.parse(foto);
              precisaCorrigir = true;
              
              // Extrair URL do objeto
              if (typeof parsed === 'object' && parsed !== null) {
                const url = parsed.file_url || parsed.url || parsed.id || parsed.fileName || String(parsed);
                console.log(\`  Patrimônio \${patrimonio.numero_patrimonio} - Foto \${index + 1}: JSON -> \${url}\`);
                return url;
              }
            } catch (e) {
              // Não é JSON válido, manter como está
              return foto;
            }
          }
          // Já é string válida
          return foto;
        }
        
        // Se for objeto (não deveria acontecer, mas vamos tratar)
        if (typeof foto === 'object' && foto !== null) {
          precisaCorrigir = true;
          const url = foto.file_url || foto.url || foto.id || foto.fileName || String(foto);
          console.log(\`  Patrimônio \${patrimonio.numero_patrimonio} - Foto \${index + 1}: Objeto -> \${url}\`);
          return url;
        }
        
        return String(foto);
      }).filter(f => f && f.trim() !== '');
      
      if (precisaCorrigir) {
        await prisma.patrimonio.update({
          where: { id: patrimonio.id },
          data: { fotos: fotosCorrigidas }
        });
        corrigidos++;
        totalFotos += fotosCorrigidas.length;
        console.log(\`  ✅ Patrimônio \${patrimonio.numero_patrimonio} corrigido\`);
      }
    }
    
    console.log('');
    console.log(\`✅ Correção concluída!\`);
    console.log(\`   Patrimônios corrigidos: \${corrigidos}\`);
    console.log(\`   Total de fotos processadas: \${totalFotos}\`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}

corrigirFotos();
"

echo ""
echo -e "${GREEN}✅ Correção concluída!${NC}"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo "  1. Reiniciar backend: pm2 restart sispat-backend"
echo "  2. Limpar cache do navegador (Ctrl+Shift+R)"
echo "  3. Verificar se as imagens aparecem"

