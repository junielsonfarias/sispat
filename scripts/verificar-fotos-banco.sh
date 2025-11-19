#!/bin/bash

# Script para verificar fotos no banco de dados
# Uso: ./scripts/verificar-fotos-banco.sh [numero_patrimonio]

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NUMERO_PATRIMONIO="${1:-202501000004}"

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔍 Verificação de Fotos no Banco${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "Patrimônio: ${YELLOW}$NUMERO_PATRIMONIO${NC}"
echo ""

cd /var/www/sispat/backend

# Verificar fotos no banco
echo -e "${BLUE}1. Verificando fotos no banco de dados...${NC}"
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.patrimonio.findUnique({
  where: { numero_patrimonio: '$NUMERO_PATRIMONIO' },
  select: { 
    id: true, 
    numero_patrimonio: true, 
    descricao_bem: true,
    fotos: true 
  }
}).then(p => {
  if (!p) {
    console.log('❌ Patrimônio não encontrado');
    prisma.\$disconnect();
    return;
  }
  
  console.log('✅ Patrimônio encontrado:');
  console.log('   ID:', p.id);
  console.log('   Número:', p.numero_patrimonio);
  console.log('   Descrição:', p.descricao_bem);
  console.log('');
  console.log('📸 Fotos no banco:');
  console.log('   Total:', p.fotos?.length || 0);
  
  if (p.fotos && p.fotos.length > 0) {
    p.fotos.forEach((foto, index) => {
      console.log('');
      console.log('   Foto', index + 1, ':');
      console.log('     Tipo:', typeof foto);
      console.log('     Valor:', foto);
      console.log('     Tamanho:', foto?.length || 0, 'caracteres');
      
      // Verificar se é objeto (JSON string)
      if (typeof foto === 'string' && (foto.startsWith('{') || foto.startsWith('['))) {
        try {
          const parsed = JSON.parse(foto);
          console.log('     ⚠️  É JSON! Objeto parseado:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          // Não é JSON válido
        }
      }
      
      // Verificar se é URL válida
      if (typeof foto === 'string' && (foto.startsWith('/uploads/') || foto.startsWith('uploads/'))) {
        const filename = foto.split('/').pop();
        console.log('     📁 Nome do arquivo:', filename);
        
        // Verificar se arquivo existe
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(__dirname, 'uploads');
        const filePath = path.join(uploadsDir, filename);
        
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          console.log('     ✅ Arquivo existe no servidor');
          console.log('     Tamanho:', (stats.size / 1024).toFixed(2), 'KB');
          console.log('     Permissões:', fs.statSync(filePath).mode.toString(8));
        } else {
          console.log('     ❌ Arquivo NÃO existe no servidor!');
        }
      }
    });
  } else {
    console.log('   ⚠️  Nenhuma foto cadastrada');
  }
  
  prisma.\$disconnect();
}).catch(e => {
  console.error('❌ Erro:', e.message);
  prisma.\$disconnect();
  process.exit(1);
});
"

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  💡 Próximos Passos${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo "Se as fotos estão como objetos JSON no banco:"
echo "  1. Execute o script de correção: scripts/corrigir-fotos-banco.sh"
echo ""
echo "Se os arquivos não existem:"
echo "  1. Verifique permissões: sudo chown -R www-data:www-data /var/www/sispat/backend/uploads/"
echo "  2. Faça upload de uma nova imagem para testar"
echo ""
echo "Se as URLs estão incorretas:"
echo "  1. Verifique a configuração do Nginx"
echo "  2. Verifique a variável VITE_API_URL no frontend"

