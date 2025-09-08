#!/usr/bin/env node

import express from 'express';
import { registerRoutes } from '../server/routes/index.js';

console.log('🔍 TESTE DE REGISTRO DE ROTAS');
console.log('='.repeat(40));

try {
  console.log('📋 Criando app Express...');
  const app = express();

  console.log('📋 Registrando rotas...');
  registerRoutes(app);
  console.log('✅ Rotas registradas com sucesso!');

  console.log('📋 Verificando rotas registradas...');
  const routes = [];

  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods)
        .join(', ')
        .toUpperCase();
      const path = middleware.route.path;
      routes.push(`${methods} ${path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods)
            .join(', ')
            .toUpperCase();
          const path =
            middleware.regexp.source
              .replace(/\\/g, '')
              .replace(/\^|\$|\?/g, '') + handler.route.path;
          routes.push(`${methods} ${path}`);
        }
      });
    }
  });

  console.log(`📋 Total de rotas encontradas: ${routes.length}`);
  console.log('📋 Rotas registradas:');
  routes.forEach((route, index) => {
    console.log(`   ${index + 1}. ${route}`);
  });

  // Verificar especificamente as rotas de auth
  const authRoutes = routes.filter(route => route.includes('/auth/'));
  console.log(`\n📋 Rotas de autenticação: ${authRoutes.length}`);
  authRoutes.forEach((route, index) => {
    console.log(`   ${index + 1}. ${route}`);
  });
} catch (error) {
  console.error('❌ Erro ao registrar rotas:', error.message);
  console.error('❌ Stack:', error.stack);
}

console.log('\n🎯 TESTE CONCLUÍDO');
