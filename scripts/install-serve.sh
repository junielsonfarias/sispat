#!/bin/bash

# ========================================
# SCRIPT RÁPIDO PARA INSTALAR SERVE
# Resolve o problema "serve: not found"
# ========================================

set -e

echo "🔧 Instalando pacote 'serve' para resolver problema do frontend..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório raiz da aplicação SISPAT"
    exit 1
fi

# Parar o frontend se estiver rodando
echo "🛑 Parando frontend..."
pm2 stop sispat-frontend 2>/dev/null || true

# Método 1: Tentar instalar globalmente com npm
echo "📦 Tentando instalar serve globalmente com npm..."
if npm install -g serve; then
    echo "✅ Serve instalado globalmente com npm"
    SERVE_AVAILABLE=true
else
    echo "❌ Falha ao instalar serve globalmente"
    SERVE_AVAILABLE=false
fi

# Método 2: Se falhou, tentar com pnpm
if [ "$SERVE_AVAILABLE" = false ]; then
    echo "📦 Tentando instalar serve globalmente com pnpm..."
    if pnpm add -g serve; then
        echo "✅ Serve instalado globalmente com pnpm"
        SERVE_AVAILABLE=true
    else
        echo "❌ Falha ao instalar serve com pnpm"
    fi
fi

# Método 3: Se falhou, instalar localmente
if [ "$SERVE_AVAILABLE" = false ]; then
    echo "📦 Instalando serve localmente no projeto..."
    if npm install serve; then
        echo "✅ Serve instalado localmente"
        SERVE_AVAILABLE=true
    else
        echo "❌ Falha ao instalar serve localmente"
    fi
fi

# Método 4: Se falhou, usar npx
if [ "$SERVE_AVAILABLE" = false ]; then
    echo "📦 Verificando se npx serve está disponível..."
    if npx serve --version &> /dev/null; then
        echo "✅ npx serve está disponível"
        SERVE_AVAILABLE=true
    else
        echo "❌ npx serve não está disponível"
    fi
fi

# Método 5: Se falhou, criar script alternativo
if [ "$SERVE_AVAILABLE" = false ]; then
    echo "📦 Criando script alternativo para servir arquivos estáticos..."
    
    cat > serve-simple.js << 'EOF'
#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DIST_DIR = path.join(__dirname, 'dist');

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    let filePath = path.join(DIST_DIR, req.url === '/' ? '/index.html' : req.url);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
        filePath = path.join(DIST_DIR, '/index.html');
    }
    
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Arquivo não encontrado, servir index.html (SPA)
                fs.readFile(path.join(DIST_DIR, '/index.html'), (err2, content2) => {
                    if (err2) {
                        res.writeHead(404);
                        res.end('Arquivo não encontrado');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content2, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Erro interno do servidor');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor alternativo rodando na porta ${PORT}`);
    console.log(`📁 Servindo arquivos de: ${DIST_DIR}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
});

// Capturar sinais de encerramento
process.on('SIGTERM', () => {
    console.log('📴 Recebido SIGTERM, finalizando servidor...');
    server.close(() => {
        console.log('🔚 Servidor finalizado');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 Recebido SIGINT, finalizando servidor...');
    server.close(() => {
        console.log('🔚 Servidor finalizado');
        process.exit(0);
    });
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
    console.error('❌ Erro não capturado:', err);
    server.close(() => {
        console.log('🔚 Servidor finalizado devido a erro');
        process.exit(1);
    });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada:', reason);
    server.close(() => {
        console.log('🔚 Servidor finalizado devido a erro');
        process.exit(1);
    });
});
EOF

    chmod +x serve-simple.js
    echo "✅ Script alternativo criado: serve-simple.js"
    
    # Atualizar ecosystem.config.cjs para usar o script alternativo
    echo "🔧 Atualizando ecosystem.config.cjs para usar script alternativo..."
    sed -i 's|script: .start-frontend.js.|script: .serve-simple.js.|' ecosystem.config.cjs
    echo "✅ ecosystem.config.cjs atualizado"
fi

# Verificar se o build do frontend existe
echo "📋 Verificando build do frontend..."
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "❌ Build do frontend não encontrado - executando build..."
    
    # Verificar se as dependências estão instaladas
    if [ ! -d "node_modules" ]; then
        echo "📦 Instalando dependências..."
        npm install
    fi
    
    # Executar build
    echo "🔨 Executando build do frontend..."
    npm run build
    
    if [ -d "dist" ] && [ -f "dist/index.html" ]; then
        echo "✅ Build do frontend executado com sucesso"
    else
        echo "❌ Falha ao executar build do frontend"
        exit 1
    fi
else
    echo "✅ Build do frontend encontrado"
fi

# Iniciar frontend
echo "🚀 Iniciando frontend..."

if [ "$SERVE_AVAILABLE" = true ]; then
    echo "✅ Usando serve instalado"
    pm2 start ecosystem.config.cjs --env production --only sispat-frontend
elif [ -f "serve-simple.js" ]; then
    echo "✅ Usando script alternativo serve-simple.js"
    pm2 start serve-simple.js --name "sispat-frontend"
else
    echo "❌ Nenhum método disponível"
    exit 1
fi

# Aguardar inicialização
echo "⏳ Aguardando frontend inicializar..."
sleep 5

# Verificar status
echo "🔍 Verificando status do frontend..."
pm2 status sispat-frontend

# Testar conectividade
echo "🌐 Testando conectividade do frontend..."
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Frontend funcionando em http://localhost:8080"
else
    echo "❌ Frontend não está respondendo"
    echo "📋 Logs do frontend:"
    pm2 logs sispat-frontend --lines 10
fi

echo ""
echo "🎉 Instalação do serve concluída!"
echo "📋 Status:"
echo "  - Serve disponível: $SERVE_AVAILABLE"
echo "  - Script alternativo: $(if [ -f "serve-simple.js" ]; then echo "SIM"; else echo "NÃO"; fi)"
echo "  - Frontend rodando: $(if pm2 list | grep -q "sispat-frontend.*online"; then echo "SIM"; else echo "NÃO"; fi)"
echo ""
echo "🔧 Comandos úteis:"
echo "  - Status: pm2 status"
echo "  - Logs: pm2 logs sispat-frontend"
echo "  - Reiniciar: pm2 restart sispat-frontend"
