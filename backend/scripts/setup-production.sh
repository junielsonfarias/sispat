#!/bin/bash

# Script de setup completo para produção
# Aplica todas as correções necessárias para o SISPAT funcionar corretamente

set -e  # Parar em caso de erro

echo "🚀 Iniciando setup completo do SISPAT para produção..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script no diretório raiz do projeto"
    exit 1
fi

# 1. Instalar dependências do backend
echo ""
echo "1️⃣ Instalando dependências do backend..."
cd backend
npm install
echo "✅ Dependências do backend instaladas"

# 2. Gerar cliente Prisma
echo ""
echo "2️⃣ Gerando cliente Prisma..."
npx prisma generate
echo "✅ Cliente Prisma gerado"

# 3. Aplicar migrações do banco
echo ""
echo "3️⃣ Aplicando migrações do banco de dados..."
npx prisma db push
echo "✅ Migrações aplicadas"

# 4. Executar script de correção da tabela customizations
echo ""
echo "4️⃣ Corrigindo tabela customizations..."
if [ -f "scripts/fix-customization-table.js" ]; then
    node scripts/fix-customization-table.js
    echo "✅ Tabela customizations corrigida"
else
    echo "⚠️ Script de correção não encontrado, pulando..."
fi

# 5. Voltar para o diretório raiz e instalar dependências do frontend
echo ""
echo "5️⃣ Instalando dependências do frontend..."
cd ..
npm install
echo "✅ Dependências do frontend instaladas"

# 6. Copiar logo para public
echo ""
echo "6️⃣ Copiando logo para pasta public..."
if [ -f "src/assets/images/logo-government.svg" ]; then
    cp src/assets/images/logo-government.svg public/
    echo "✅ Logo copiado para public/"
else
    echo "⚠️ Logo não encontrado, pulando..."
fi

# 7. Construir frontend
echo ""
echo "7️⃣ Construindo frontend..."
npm run build
echo "✅ Frontend construído"

# 8. Verificar se PM2 está instalado
echo ""
echo "8️⃣ Verificando PM2..."
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 encontrado"
    
    # Reiniciar backend se estiver rodando
    if pm2 list | grep -q "sispat-backend"; then
        echo "🔄 Reiniciando backend..."
        pm2 restart sispat-backend
    else
        echo "⚠️ Backend não está rodando com PM2"
    fi
else
    echo "⚠️ PM2 não encontrado. Instale com: npm install -g pm2"
fi

# 9. Aguardar backend inicializar
echo ""
echo "9️⃣ Aguardando backend inicializar..."
sleep 3

# 10. Testar API
echo ""
echo "🔟 Testando API..."
if curl -s http://localhost:3000/api/health | grep -q '"status":"ok"'; then
    echo "✅ API funcionando corretamente"
    
    # Testar endpoint de customização
    echo "🧪 Testando endpoint de customização..."
    if curl -s http://localhost:3000/api/customization/public | grep -q '"customization"'; then
        echo "✅ Endpoint de customização funcionando"
    else
        echo "⚠️ Endpoint de customização com problemas"
    fi
else
    echo "❌ API não está respondendo corretamente"
    echo "Verifique os logs: pm2 logs sispat-backend"
fi

echo ""
echo "🎉 Setup completo concluído!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure as variáveis de ambiente em .env"
echo "2. Acesse o sistema no navegador"
echo "3. Teste o upload de logo em Configurações > Personalização"
echo "4. Verifique se a logo persiste entre navegadores"
echo ""
echo "🔧 Comandos úteis:"
echo "- Ver logs: pm2 logs sispat-backend"
echo "- Reiniciar backend: pm2 restart sispat-backend"
echo "- Status: pm2 status"
echo "- Parar: pm2 stop sispat-backend"
echo "- Iniciar: pm2 start backend/src/server.js --name sispat-backend"
