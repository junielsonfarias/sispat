#!/bin/bash

# Script para limpar fotos inválidas do banco de dados
# Remove URLs blob- e arquivos que não existem no servidor
# Uso: ./scripts/limpar-fotos-invalidas.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🧹 Limpeza de Fotos Inválidas${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⚠️  Este script irá:${NC}"
echo "  1. Buscar todos os patrimônios com fotos"
echo "  2. Identificar fotos inválidas (blob- URLs ou arquivos inexistentes)"
echo "  3. Remover fotos inválidas do banco de dados"
echo ""
read -p "Continuar? (s/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}Operação cancelada${NC}"
    exit 0
fi

cd /var/www/sispat/backend
UPLOADS_DIR="/var/www/sispat/backend/uploads"

echo ""
echo -e "${BLUE}1. Buscando patrimônios com fotos...${NC}"
node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function limparFotosInvalidas() {
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
    
    let patrimoniosCorrigidos = 0;
    let fotosRemovidas = 0;
    let fotosValidasCount = 0;
    
    function extrairNomeArquivo(url) {
      if (!url || typeof url !== 'string') return null;
      
      // Remover protocolo e domínio se existir
      let filename = url;
      if (filename.includes('://')) {
        filename = filename.split('://')[1].split('/').slice(1).join('/');
      }
      
      // Remover /uploads/ ou /api/uploads/ do início
      filename = filename.replace(/^\/?(api\/)?uploads\//, '');
      
      // Pegar apenas o nome do arquivo (última parte)
      filename = filename.split('/').pop() || filename;
      
      // Remover query strings
      filename = filename.split('?')[0];
      
      return filename;
    }
    
    function arquivoExiste(filename) {
      if (!filename) return false;
      const filepath = path.join('${UPLOADS_DIR}', filename);
      return fs.existsSync(filepath);
    }
    
    function isUrlInvalida(url) {
      if (!url || typeof url !== 'string') return true;
      
      // URLs blob- são sempre inválidas
      if (url.startsWith('blob:')) return true;
      
      // URLs data: são válidas (imagens inline)
      if (url.startsWith('data:image')) return false;
      
      // URLs http/https externas são válidas
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // Mas se contém blob- no nome, é inválida
        if (url.includes('blob-')) return true;
        return false;
      }
      
      // URLs relativas (/uploads/...)
      if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
        const filename = extrairNomeArquivo(url);
        if (filename && filename.startsWith('blob-')) return true;
        if (filename && !arquivoExiste(filename)) return true;
      }
      
      return false;
    }
    
    for (const patrimonio of patrimonios) {
      const fotosValidas = [];
      const fotosInvalidas = [];
      
      for (let i = 0; i < patrimonio.fotos.length; i++) {
        const foto = patrimonio.fotos[i];
        let url = foto;
        
        // Se for objeto, extrair URL
        if (typeof foto === 'object' && foto !== null) {
          url = foto.file_url || foto.url || foto.id || foto.fileName || String(foto);
        }
        
        // Se for string JSON, tentar parsear
        if (typeof foto === 'string' && (foto.startsWith('{') || foto.startsWith('['))) {
          try {
            const parsed = JSON.parse(foto);
            url = parsed.file_url || parsed.url || parsed.id || parsed.fileName || String(parsed);
          } catch (e) {
            url = foto;
          }
        }
        
        if (isUrlInvalida(url)) {
          fotosInvalidas.push(url);
          const filename = extrairNomeArquivo(url);
          console.log(\`  ❌ Patrimônio \${patrimonio.numero_patrimonio} - Foto inválida: \${filename || url.substring(0, 50)}\`);
        } else {
          fotosValidas.push(url);
          fotosValidasCount++;
        }
      }
      
      if (fotosInvalidas.length > 0) {
        await prisma.patrimonio.update({
          where: { id: patrimonio.id },
          data: { fotos: fotosValidas }
        });
        patrimoniosCorrigidos++;
        fotosRemovidas += fotosInvalidas.length;
        console.log(\`  ✅ Patrimônio \${patrimonio.numero_patrimonio}: \${fotosInvalidas.length} foto(s) removida(s), \${fotosValidas.length} mantida(s)\`);
      }
    }
    
    // Processar imóveis também
    const imoveis = await prisma.imovel.findMany({
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
    
    console.log('');
    console.log(\`Encontrados \${imoveis.length} imóveis com fotos\`);
    
    let imoveisCorrigidos = 0;
    let fotosImoveisRemovidas = 0;
    
    for (const imovel of imoveis) {
      const fotosValidas = [];
      const fotosInvalidas = [];
      
      for (let i = 0; i < imovel.fotos.length; i++) {
        const foto = imovel.fotos[i];
        let url = foto;
        
        if (typeof foto === 'object' && foto !== null) {
          url = foto.file_url || foto.url || foto.id || foto.fileName || String(foto);
        }
        
        if (typeof foto === 'string' && (foto.startsWith('{') || foto.startsWith('['))) {
          try {
            const parsed = JSON.parse(foto);
            url = parsed.file_url || parsed.url || parsed.id || parsed.fileName || String(parsed);
          } catch (e) {
            url = foto;
          }
        }
        
        if (isUrlInvalida(url)) {
          fotosInvalidas.push(url);
        } else {
          fotosValidas.push(url);
        }
      }
      
      if (fotosInvalidas.length > 0) {
        await prisma.imovel.update({
          where: { id: imovel.id },
          data: { fotos: fotosValidas }
        });
        imoveisCorrigidos++;
        fotosImoveisRemovidas += fotosInvalidas.length;
        console.log(\`  ✅ Imóvel \${imovel.numero_patrimonio}: \${fotosInvalidas.length} foto(s) removida(s), \${fotosValidas.length} mantida(s)\`);
      }
    }
    
    console.log('');
    console.log(\`✅ Limpeza concluída!\`);
    console.log(\`   Patrimônios corrigidos: \${patrimoniosCorrigidos}\`);
    console.log(\`   Fotos removidas de patrimônios: \${fotosRemovidas}\`);
    console.log(\`   Imóveis corrigidos: \${imoveisCorrigidos}\`);
    console.log(\`   Fotos removidas de imóveis: \${fotosImoveisRemovidas}\`);
    console.log(\`   Total de fotos removidas: \${fotosRemovidas + fotosImoveisRemovidas}\`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}

limparFotosInvalidas();
"

echo ""
echo -e "${GREEN}✅ Limpeza concluída!${NC}"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo "  1. As fotos inválidas foram removidas do banco de dados"
echo "  2. Você pode agora fazer upload de novas imagens para os patrimônios afetados"
echo "  3. Reiniciar backend (opcional): pm2 restart sispat-backend"
echo "  4. Limpar cache do navegador (Ctrl+Shift+R)"

