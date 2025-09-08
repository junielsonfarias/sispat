#!/usr/bin/env node

import authRoutes from '../server/routes/auth.js';

console.log('🔍 TESTE DE CARREGAMENTO DE ROTAS');
console.log('='.repeat(40));

try {
  console.log('📋 Testando importação de auth.js...');
  console.log('✅ auth.js importado com sucesso');
  console.log('📋 Tipo do export:', typeof authRoutes);
  console.log('📋 Router disponível:', authRoutes ? 'Sim' : 'Não');

  if (authRoutes && authRoutes.stack) {
    console.log('📋 Número de rotas registradas:', authRoutes.stack.length);
    console.log('📋 Rotas disponíveis:');
    authRoutes.stack.forEach((layer, index) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods)
          .join(', ')
          .toUpperCase();
        const path = layer.route.path;
        console.log(`   ${index + 1}. ${methods} ${path}`);
      }
    });
  } else {
    console.log('❌ Router não tem stack ou não está configurado corretamente');
  }
} catch (error) {
  console.error('❌ Erro ao carregar auth.js:', error.message);
  console.error('❌ Stack:', error.stack);
}

console.log('\n🎯 TESTE CONCLUÍDO');
