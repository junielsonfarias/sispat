#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const projectRoot = resolve(__dirname, '..');

console.log('🔍 DIAGNÓSTICO DE CSS - SISPAT');
console.log('='.repeat(50));

// 1. Verificar arquivos CSS principais
console.log('\n📁 Verificando arquivos CSS principais:');

const cssFiles = [
  'src/main.css',
  'src/styles/responsive.css',
  'src/components/ui/sonner.css',
  'tailwind.config.ts',
  'postcss.config.js',
];

cssFiles.forEach(file => {
  const filePath = join(projectRoot, file);
  if (existsSync(filePath)) {
    const stats = statSync(filePath);
    console.log(`✅ ${file} - ${(stats.size / 1024).toFixed(2)} KB`);
  } else {
    console.log(`❌ ${file} - ARQUIVO NÃO ENCONTRADO`);
  }
});

// 2. Verificar se Tailwind está configurado corretamente
console.log('\n🎨 Verificando configuração do Tailwind CSS:');

try {
  const tailwindConfig = readFileSync(
    join(projectRoot, 'tailwind.config.ts'),
    'utf8'
  );

  // Verificar se tem content paths
  if (tailwindConfig.includes('content:')) {
    console.log('✅ Content paths configurados');
  } else {
    console.log('❌ Content paths não encontrados');
  }

  // Verificar plugins
  if (tailwindConfig.includes('plugins:')) {
    console.log('✅ Plugins configurados');
  } else {
    console.log('⚠️  Nenhum plugin configurado');
  }
} catch (error) {
  console.log('❌ Erro ao ler tailwind.config.ts:', error.message);
}

// 3. Verificar se PostCSS está configurado
console.log('\n⚙️  Verificando configuração do PostCSS:');

try {
  const postcssConfig = readFileSync(
    join(projectRoot, 'postcss.config.js'),
    'utf8'
  );

  if (postcssConfig.includes('tailwindcss')) {
    console.log('✅ Tailwind CSS configurado no PostCSS');
  } else {
    console.log('❌ Tailwind CSS não encontrado no PostCSS');
  }

  if (postcssConfig.includes('autoprefixer')) {
    console.log('✅ Autoprefixer configurado no PostCSS');
  } else {
    console.log('❌ Autoprefixer não encontrado no PostCSS');
  }
} catch (error) {
  console.log('❌ Erro ao ler postcss.config.js:', error.message);
}

// 4. Verificar importações CSS no main.tsx
console.log('\n📥 Verificando importações CSS no main.tsx:');

try {
  const mainTsx = readFileSync(join(projectRoot, 'src/main.tsx'), 'utf8');

  if (mainTsx.includes("import './main.css'")) {
    console.log('✅ main.css importado');
  } else {
    console.log('❌ main.css NÃO importado');
  }

  if (mainTsx.includes("import './styles/responsive.css'")) {
    console.log('✅ responsive.css importado');
  } else {
    console.log('⚠️  responsive.css não importado');
  }
} catch (error) {
  console.log('❌ Erro ao ler src/main.tsx:', error.message);
}

// 5. Verificar se há directives Tailwind no main.css
console.log('\n🎯 Verificando diretivas Tailwind no main.css:');

try {
  const mainCss = readFileSync(join(projectRoot, 'src/main.css'), 'utf8');

  const directives = [
    '@tailwind base',
    '@tailwind components',
    '@tailwind utilities',
  ];

  directives.forEach(directive => {
    if (mainCss.includes(directive)) {
      console.log(`✅ ${directive} encontrado`);
    } else {
      console.log(`❌ ${directive} NÃO encontrado`);
    }
  });
} catch (error) {
  console.log('❌ Erro ao ler src/main.css:', error.message);
}

// 6. Verificar configuração do Vite para CSS
console.log('\n🔧 Verificando configuração CSS no Vite:');

try {
  const viteConfig = readFileSync(join(projectRoot, 'vite.config.ts'), 'utf8');

  if (viteConfig.includes('css:')) {
    console.log('✅ Seção CSS encontrada no vite.config.ts');
  } else {
    console.log('⚠️  Seção CSS não encontrada no vite.config.ts');
  }

  if (viteConfig.includes('postcss')) {
    console.log('✅ PostCSS configurado no Vite');
  } else {
    console.log('❌ PostCSS não configurado no Vite');
  }
} catch (error) {
  console.log('❌ Erro ao ler vite.config.ts:', error.message);
}

// 7. Verificar se há arquivos CSS gerados no build
console.log('\n📦 Verificando arquivos CSS no build:');

async function checkBuildFiles() {
  const distPath = join(projectRoot, 'dist');
  if (existsSync(distPath)) {
    try {
      const { readdirSync } = await import('fs');
      const distFiles = readdirSync(join(distPath, 'assets'));
      const cssFiles = distFiles.filter(file => file.endsWith('.css'));

      if (cssFiles.length > 0) {
        console.log('✅ Arquivos CSS encontrados no build:');
        cssFiles.forEach(file => {
          const filePath = join(distPath, 'assets', file);
          const stats = statSync(filePath);
          console.log(`   - ${file} - ${(stats.size / 1024).toFixed(2)} KB`);
        });
      } else {
        console.log('❌ Nenhum arquivo CSS encontrado no build');
      }
    } catch (error) {
      console.log('⚠️  Erro ao ler arquivos do build:', error.message);
    }
  } else {
    console.log(
      '⚠️  Diretório dist não encontrado - execute pnpm run build primeiro'
    );
  }
}

// Executar verificação
(async () => {
  await checkBuildFiles();
})();

console.log('\n' + '='.repeat(50));
console.log('🎯 DIAGNÓSTICO CONCLUÍDO');
console.log('='.repeat(50));
