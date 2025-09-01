#!/bin/bash

# ========================================
# SCRIPT DE CORREÇÃO PARA VPS
# Corrige problemas específicos da VPS
# ========================================

set -e

echo "🔧 Iniciando correção de problemas da VPS..."

# ===== 1. CORRIGIR PROBLEMA ES MODULE NO FRONTEND =====
echo "📱 Corrigindo problema ES Module no frontend..."

# Parar o frontend
pm2 stop sispat-frontend

# ===== 1.1 INSTALAR SERVE (PACOTE NECESSÁRIO PARA O FRONTEND) =====
echo "📦 Verificando se o pacote 'serve' está instalado..."
if ! command -v serve &> /dev/null; then
    echo "❌ Pacote 'serve' não encontrado - instalando..."
    
    # Tentar instalar com npm global
    if npm install -g serve; then
        echo "✅ Serve instalado com npm global"
    else
        echo "❌ Falha ao instalar serve com npm - tentando com pnpm..."
        if pnpm add -g serve; then
            echo "✅ Serve instalado com pnpm global"
        else
            echo "❌ Falha ao instalar serve - tentando método alternativo..."
            
            # Instalar localmente no projeto
            if npm install serve; then
                echo "✅ Serve instalado localmente"
                # Criar alias para o serve local
                echo 'alias serve="npx serve"' >> ~/.bashrc
                source ~/.bashrc
            else
                echo "❌ Falha ao instalar serve - usando método alternativo..."
                
                # Usar npx serve diretamente
                if npx serve --version &> /dev/null; then
                    echo "✅ Serve disponível via npx"
                else
                    echo "❌ Serve não disponível - instalando via apt..."
                    # Tentar instalar via apt (Ubuntu/Debian)
                    if apt update && apt install -y node-serve; then
                        echo "✅ Serve instalado via apt"
                    else
                        echo "❌ Falha ao instalar serve - criando script alternativo..."
                        
                        # Criar script alternativo usando Python ou Node.js simples
                        cat > serve-alternative.js << 'EOF'
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
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    let filePath = path.join(DIST_DIR, req.url === '/' ? '/index.html' : req.url);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
        filePath = path.join(DIST_DIR, '/index.html');
    }
    
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end('Erro interno do servidor');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor alternativo rodando na porta ${PORT}`);
    console.log(`📁 Servindo arquivos de: ${DIST_DIR}`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
EOF
                        
                        chmod +x serve-alternative.js
                        echo "✅ Script alternativo criado: serve-alternative.js"
                    fi
                fi
            fi
        fi
    fi
else
    echo "✅ Pacote 'serve' já está instalado"
fi

# Verificar se o start-frontend.js foi atualizado
if grep -q "import.*spawn" start-frontend.js; then
    echo "✅ start-frontend.js já está usando ES modules"
else
    echo "❌ start-frontend.js ainda usa CommonJS - atualizando..."
    # Fazer backup
    cp start-frontend.js start-frontend.js.backup
    
    # Atualizar para ES modules
    cat > start-frontend.js << 'EOF'
#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configurações
const PORT = process.env.PORT || 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST_DIR = join(__dirname, 'dist');

console.log(`🚀 Iniciando frontend SISPAT na porta ${PORT}...`);
console.log(`📁 Servindo arquivos de: ${DIST_DIR}`);

// Comando para executar o serve
const serveProcess = spawn('serve', ['-s', DIST_DIR, '-l', PORT], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

serveProcess.on('error', (error) => {
  console.error('❌ Erro ao iniciar o frontend:', error);
  process.exit(1);
});

serveProcess.on('exit', (code) => {
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
EOF
    echo "✅ start-frontend.js atualizado para ES modules"
fi

# ===== 2. CORRIGIR AUTENTICAÇÃO POSTGRESQL =====
echo "🗄️ Corrigindo autenticação PostgreSQL..."

# Verificar se o usuário existe
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='sispat_user'" | grep -q 1; then
    echo "✅ Usuário sispat_user existe"
else
    echo "❌ Usuário sispat_user não existe - criando..."
    sudo -u postgres psql -c "CREATE USER sispat_user WITH PASSWORD 'sispat123456';"
fi

# Verificar se o banco existe
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw sispat_production; then
    echo "✅ Banco sispat_production existe"
else
    echo "❌ Banco sispat_production não existe - criando..."
    sudo -u postgres psql -c "CREATE DATABASE sispat_production OWNER sispat_user;"
fi

# Conceder privilégios
echo "🔐 Concedendo privilégios ao usuário..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;"
sudo -u postgres psql -c "GRANT ALL ON SCHEMA public TO sispat_user;"
sudo -u postgres psql -c "ALTER USER sispat_user CREATEDB;"

# Testar conexão
echo "🧪 Testando conexão com PostgreSQL..."
if PGPASSWORD=sispat123456 psql -h localhost -U sispat_user -d sispat_production -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Conexão PostgreSQL funcionando"
else
    echo "❌ Conexão PostgreSQL falhou - verificando configuração..."
    
    # Verificar pg_hba.conf
    echo "📋 Verificando pg_hba.conf..."
    sudo grep -n "sispat_user\|sispat_production" /etc/postgresql/*/main/pg_hba.conf || echo "⚠️ Nenhuma entrada específica encontrada"
    
    # Adicionar entrada específica se necessário
    echo "🔧 Adicionando entrada específica no pg_hba.conf..."
    sudo sed -i '/^# IPv4 local connections:/a local   sispat_production    sispat_user                                md5' /etc/postgresql/*/main/pg_hba.conf
    
    # Recarregar PostgreSQL
    echo "🔄 Recarregando configuração PostgreSQL..."
    sudo systemctl reload postgresql
fi

# ===== 3. CORRIGIR CONFIGURAÇÃO CORS =====
echo "🌐 Corrigindo configuração CORS..."

# Verificar se o .env.production tem as configurações corretas
if grep -q "ALLOWED_ORIGINS.*localhost" env.production; then
    echo "✅ .env.production já tem configurações CORS corretas"
else
    echo "❌ .env.production precisa de configurações CORS - atualizando..."
    
    # Fazer backup
    cp env.production env.production.backup
    
    # Atualizar ALLOWED_ORIGINS
    sed -i 's|ALLOWED_ORIGINS=https://sispat.vps-kinghost.net|ALLOWED_ORIGINS=https://sispat.vps-kinghost.net,http://localhost:3000,http://localhost:5173,http://localhost:3001,http://127.0.0.1:3001|' env.production
    
    echo "✅ ALLOWED_ORIGINS atualizado"
fi

# ===== 4. VERIFICAR E CORRIGIR ROTAS DO BACKEND =====
echo "🔗 Verificando rotas do backend..."

# Verificar se o server/index.js tem as rotas corretas
if grep -q "app.use('/api', router)" server/index.js; then
    echo "✅ Rotas do backend configuradas corretamente"
else
    echo "❌ Rotas do backend não configuradas - verificando..."
    
    # Verificar se o arquivo foi atualizado
    if grep -q "registerRoutes(app)" server/index.js; then
        echo "✅ registerRoutes está sendo chamado"
    else
        echo "❌ registerRoutes não está sendo chamado - corrigindo..."
        # Fazer backup
        cp server/index.js server/index.js.backup
        
        # Adicionar chamada para registerRoutes se não existir
        if ! grep -q "registerRoutes(app)" server/index.js; then
            sed -i '/app.use(cors(corsOptions))/a \n// Registrar rotas da API\nregisterRoutes(app);' server/index.js
        fi
    fi
fi

# ===== 5. REINICIAR SERVIÇOS =====
echo "🔄 Reiniciando serviços..."

# Parar todos os serviços
pm2 stop all

# Aguardar um pouco
sleep 2

# Iniciar backend primeiro
echo "🚀 Iniciando backend..."
pm2 start ecosystem.config.cjs --env production --only sispat-backend

# Aguardar backend inicializar
sleep 5

# Verificar se backend está funcionando
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend funcionando"
else
    echo "❌ Backend não está funcionando - verificando logs..."
    pm2 logs sispat-backend --lines 10
fi

# Iniciar frontend
echo "🚀 Iniciando frontend..."

# Verificar qual método de serve está disponível
if command -v serve &> /dev/null; then
    echo "✅ Usando serve global instalado"
    pm2 start ecosystem.config.cjs --env production --only sispat-frontend
elif [ -f "serve-alternative.js" ]; then
    echo "✅ Usando script alternativo serve-alternative.js"
    pm2 start serve-alternative.js --name "sispat-frontend"
elif npx serve --version &> /dev/null; then
    echo "✅ Usando npx serve"
    pm2 start ecosystem.config.cjs --env production --only sispat-frontend
else
    echo "❌ Nenhum método de serve disponível - tentando instalar novamente..."
    
    # Tentar instalar serve novamente
    npm install -g serve
    
    if command -v serve &> /dev/null; then
        echo "✅ Serve instalado com sucesso"
        pm2 start ecosystem.config.cjs --env production --only sispat-frontend
    else
        echo "❌ Falha ao instalar serve - criando processo manual..."
        
        # Criar processo manual para o frontend
        pm2 start ecosystem.config.cjs --env production --only sispat-backend
        
        # Iniciar frontend manualmente
        cd /var/www/sispat
        nohup npx serve -s dist -l 8080 > /var/www/sispat/logs/frontend-manual.log 2>&1 &
        FRONTEND_PID=$!
        echo $FRONTEND_PID > /var/www/sispat/frontend.pid
        
        echo "✅ Frontend iniciado manualmente com PID: $FRONTEND_PID"
    fi
fi

# Aguardar frontend inicializar
sleep 5

# Verificar se frontend está funcionando
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Frontend funcionando"
else
    echo "❌ Frontend não está funcionando - verificando logs..."
    pm2 logs sispat-frontend --lines 10 2>/dev/null || echo "⚠️ Logs PM2 não disponíveis"
    
    # Verificar se há processo manual
    if [ -f "/var/www/sispat/frontend.pid" ]; then
        FRONTEND_PID=$(cat /var/www/sispat/frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null; then
            echo "✅ Frontend manual rodando com PID: $FRONTEND_PID"
        else
            echo "❌ Frontend manual não está rodando"
        fi
    fi
fi

# ===== 6. VERIFICAÇÕES FINAIS =====
echo "🔍 Executando verificações finais..."

echo "📊 Status dos serviços:"
pm2 status

echo "🌐 Testando conectividade:"
echo "Backend /api/health:"
curl -s http://localhost:3001/api/health || echo "❌ Backend não responde"

echo "Frontend:"
curl -s -I http://localhost:8080 | head -1 || echo "❌ Frontend não responde"

echo "Nginx:"
curl -s -I http://localhost:80 | head -1 || echo "❌ Nginx não responde"

# ===== 7. LIMPEZA =====
echo "🧹 Limpando arquivos de backup..."
rm -f start-frontend.js.backup env.production.backup server/index.js.backup

echo "✅ Correção da VPS concluída!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Acesse: http://sispat.vps-kinghost.net"
echo "2. Verifique logs: pm2 logs"
echo "3. Configure SSL: certbot --nginx -d sispat.vps-kinghost.net"
echo ""
echo "🔧 Se ainda houver problemas:"
echo "- pm2 logs (para ver logs detalhados)"
echo "- sudo systemctl status postgresql"
echo "- sudo nginx -t && sudo systemctl status nginx"
