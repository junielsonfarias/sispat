#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configurações
const PORT = process.env.PORT || 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(import.meta.url);
const DIST_DIR = join(__dirname, 'dist');

console.log(`🚀 Iniciando frontend SISPAT na porta ${PORT}...`);
console.log(`📁 Servindo arquivos de: ${DIST_DIR}`);

// Verificar se o diretório dist existe
import { existsSync } from 'fs';
if (!existsSync(DIST_DIR)) {
    console.error('❌ Diretório dist não encontrado. Execute o build primeiro:');
    console.error('   pnpm run build ou npm run build');
    process.exit(1);
}

// Verificar se o arquivo index.html existe
if (!existsSync(join(DIST_DIR, 'index.html'))) {
    console.error('❌ Arquivo index.html não encontrado em dist/');
    console.error('   Execute o build novamente');
    process.exit(1);
}

// Comando para executar o serve
const serveProcess = spawn('serve', ['-s', DIST_DIR, '-l', PORT.toString()], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname,
});

serveProcess.on('error', error => {
    console.error('❌ Erro ao iniciar o frontend:', error);
    console.error('   Verifique se o pacote "serve" está instalado:');
    console.error('   npm install -g serve');
    process.exit(1);
});

serveProcess.on('exit', code => {
    console.log(`🔚 Frontend finalizado com código: ${code}`);
    process.exit(code);
});

// Capturar sinais de encerramento
process.on('SIGTERM', () => {
    console.log('📴 Recebido SIGTERM, finalizando frontend...');
    serveProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
    console.log('📴 Recebido SIGINT, finalizando frontend...');
    serveProcess.kill('SIGINT');
});

// Manter o processo vivo
console.log('✅ Script de frontend iniciado com sucesso!');
console.log(`🌐 Frontend disponível em: http://localhost:${PORT}`);
console.log(`📁 Servindo arquivos de: ${DIST_DIR}`);
