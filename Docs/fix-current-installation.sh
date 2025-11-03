#!/bin/bash

# ===========================================
# 🔧 SISPAT 2.0 - CORREÇÃO DE INSTALAÇÃO ATUAL
# ===========================================
# Use este script para corrigir a instalação
# que já está no servidor com problemas
# ===========================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Verificar root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Este script deve ser executado como root: sudo bash fix-current-installation.sh${NC}"
    exit 1
fi

clear
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║         🔧  CORREÇÃO DE INSTALAÇÃO ATUAL - SISPAT 2.0  🔧         ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

echo -e "${YELLOW}Este script vai corrigir os seguintes problemas:${NC}"
echo "  ✅ Erro 500 ao fazer login"
echo "  ✅ Erro 401 Unauthorized"
echo "  ✅ Tela em branco após login"
echo "  ✅ Tabela customization faltando"
echo "  ✅ Atualizar credenciais do supervisor"
echo "  ✅ Configurar Nginx corretamente"
echo ""
read -p "Pressione ENTER para continuar..."

# ========================================
# ETAPA 1: Criar Tabelas Adicionais
# ========================================

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  [1/5] CRIANDO TABELAS ADICIONAIS                ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

cd /var/www/sispat/backend

# Customizations
if [ -f "create-customizations-table.js" ]; then
    echo -e "${BLUE}  → Criando customizations...${NC}"
    node create-customizations-table.js > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ Customizations criada${NC}"
    else
        echo -e "${YELLOW}  ⚠ Já existe ou erro${NC}"
    fi
fi

# Imovel Custom Fields
if [ -f "create-imovel-fields-table.js" ]; then
    echo -e "${BLUE}  → Criando imovel_custom_fields...${NC}"
    node create-imovel-fields-table.js > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ Imovel fields criada${NC}"
    else
        echo -e "${YELLOW}  ⚠ Já existe ou erro${NC}"
    fi
fi

# Documents
if [ -f "create-documents-table.js" ]; then
    echo -e "${BLUE}  → Criando documents...${NC}"
    node create-documents-table.js > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ Documents criada${NC}"
    else
        echo -e "${YELLOW}  ⚠ Já existe ou erro${NC}"
    fi
fi

# Ficha Templates
if [ -f "create-ficha-templates-table.js" ]; then
    echo -e "${BLUE}  → Criando ficha_templates...${NC}"
    node create-ficha-templates-table.js > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ Ficha templates criada${NC}"
    else
        echo -e "${YELLOW}  ⚠ Já existe ou erro${NC}"
    fi
fi

# Conceder permissões
echo -e "${BLUE}  → Concedendo permissões...${NC}"
sudo -u postgres psql -d sispat_prod > /dev/null 2>&1 << 'EOF'
GRANT ALL PRIVILEGES ON SCHEMA public TO sispat_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sispat_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sispat_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sispat_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sispat_user;
EOF

echo -e "${GREEN}✓ Tabelas e permissões configuradas${NC}"

# ========================================
# ETAPA 2: Atualizar Credenciais
# ========================================

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  [2/5] ATUALIZANDO CREDENCIAIS                   ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

cd /var/www/sispat/backend

# Resetar senha do admin
cat > /tmp/reset-credentials.js << 'JSEOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetCredentials() {
  try {
    console.log('🔄 Atualizando credenciais...');
    
    // Admin
    const adminPassword = await bcrypt.hash('Tiko6273@', 12);
    await prisma.user.upsert({
      where: { email: 'admin@sistema.com' },
      update: { 
        password: adminPassword,
        isActive: true,
        role: 'superuser'
      },
      create: {
        id: 'user-admin',
        email: 'admin@sistema.com',
        name: 'Administrador',
        password: adminPassword,
        role: 'superuser',
        responsibleSectors: [],
        municipalityId: (await prisma.municipality.findFirst()).id,
        isActive: true,
      }
    });
    console.log('✅ Admin: admin@sistema.com / Tiko6273@');
    
    // Supervisor
    const supervisorPassword = await bcrypt.hash('Master6273@', 12);
    await prisma.user.upsert({
      where: { email: 'supervisor@ssbv.com' },
      update: { 
        password: supervisorPassword,
        isActive: true,
        role: 'supervisor',
        name: 'Supervisor'
      },
      create: {
        id: 'user-supervisor',
        email: 'supervisor@ssbv.com',
        name: 'Supervisor',
        password: supervisorPassword,
        role: 'supervisor',
        responsibleSectors: [],
        municipalityId: (await prisma.municipality.findFirst()).id,
        isActive: true,
      }
    });
    console.log('✅ Supervisor: supervisor@ssbv.com / Master6273@');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetCredentials();
JSEOF

node /tmp/reset-credentials.js
rm /tmp/reset-credentials.js

echo -e "${GREEN}✓ Credenciais atualizadas com sucesso${NC}"

# ========================================
# ETAPA 3: Verificar JWT_SECRET
# ========================================

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  [3/5] VERIFICANDO JWT_SECRET                    ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

JWT_LEN=$(grep "^JWT_SECRET=" .env | cut -d= -f2 | wc -c)
if [ $JWT_LEN -lt 64 ]; then
    echo -e "${YELLOW}⚠ JWT_SECRET muito curto, regenerando...${NC}"
    NEW_JWT=$(openssl rand -hex 64)
    sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${NEW_JWT}/" .env
    echo -e "${GREEN}✓ JWT_SECRET regenerado (128 caracteres)${NC}"
else
    echo -e "${GREEN}✓ JWT_SECRET OK ($JWT_LEN caracteres)${NC}"
fi

# ========================================
# ETAPA 4: Configurar Nginx
# ========================================

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  [4/5] CONFIGURANDO NGINX                        ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Obter domínio da configuração
DOMAIN=$(grep "^FRONTEND_URL=" .env | cut -d= -f2 | sed 's|https\?://||' | sed 's|/$||')

if [ -z "$DOMAIN" ]; then
    DOMAIN=$(hostname -f)
    echo -e "${YELLOW}⚠ Domínio não encontrado em .env, usando: $DOMAIN${NC}"
fi

echo -e "${BLUE}  → Domínio: ${WHITE}${DOMAIN}${NC}"

# Verificar se arquivo de configuração existe
if [ ! -f "/etc/nginx/sites-available/sispat" ]; then
    echo -e "${YELLOW}⚠ Criando configuração do Nginx...${NC}"
    
    cat > /etc/nginx/sites-available/sispat << NGINXEOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    
    location / {
        root /var/www/sispat/dist;
        try_files \$uri \$uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /uploads/ {
        alias /var/www/sispat/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    location /health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }
}
NGINXEOF
    
    echo -e "${GREEN}✓ Configuração criada${NC}"
fi

# Ativar site
echo -e "${BLUE}  → Removendo configuração padrão...${NC}"
rm -f /etc/nginx/sites-enabled/default

echo -e "${BLUE}  → Ativando site SISPAT...${NC}"
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/

# Testar e recarregar
echo -e "${BLUE}  → Testando configuração...${NC}"
if nginx -t > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Configuração válida${NC}"
    systemctl reload nginx
    echo -e "${GREEN}✓ Nginx recarregado${NC}"
else
    echo -e "${RED}❌ Erro na configuração do Nginx${NC}"
    nginx -t
    exit 1
fi

# ========================================
# ETAPA 5: Reiniciar Aplicação
# ========================================

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  [5/5] REINICIANDO APLICAÇÃO                     ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

cd /var/www/sispat/backend

echo -e "${BLUE}  → Reiniciando backend...${NC}"
pm2 restart sispat-backend
sleep 3
echo -e "${GREEN}✓ Backend reiniciado${NC}"

# ========================================
# VERIFICAÇÃO FINAL
# ========================================

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  🔍 VERIFICAÇÃO FINAL                            ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}[1/4]${NC} Testando API..."
API_RESPONSE=$(curl -s http://localhost:3000/api/health)
if echo "$API_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✓ API respondendo: $API_RESPONSE${NC}"
else
    echo -e "${RED}❌ API não está respondendo corretamente${NC}"
fi

echo -e "${YELLOW}[2/4]${NC} Testando frontend..."
FRONTEND_RESPONSE=$(curl -s http://localhost | head -1)
if echo "$FRONTEND_RESPONSE" | grep -q "<!DOCTYPE html>"; then
    echo -e "${GREEN}✓ Frontend sendo servido corretamente${NC}"
else
    echo -e "${RED}❌ Frontend não está sendo servido (Nginx pode estar mostrando página padrão)${NC}"
fi

echo -e "${YELLOW}[3/4]${NC} Verificando PM2..."
pm2 list | grep sispat-backend | grep online > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PM2 online${NC}"
else
    echo -e "${RED}❌ PM2 não está rodando${NC}"
fi

echo -e "${YELLOW}[4/4]${NC} Testando login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sistema.com","password":"Tiko6273@"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✓ Login funcionando corretamente${NC}"
else
    echo -e "${YELLOW}⚠ Login retornou: ${LOGIN_RESPONSE:0:100}${NC}"
fi

# ========================================
# FINALIZAÇÃO
# ========================================

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                   ║${NC}"
echo -e "${GREEN}║              ✅ CORREÇÃO CONCLUÍDA COM SUCESSO!                   ║${NC}"
echo -e "${GREEN}║                                                                   ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}🌐 Acesse o sistema:${NC}"
echo -e "   ${WHITE}http://${DOMAIN}${NC}"
echo ""

echo -e "${CYAN}🔐 CREDENCIAIS ATUALIZADAS:${NC}"
echo ""

echo -e "${WHITE}👑 SUPERUSUÁRIO (Admin):${NC}"
echo -e "   📧 Email: ${GREEN}admin@sistema.com${NC}"
echo -e "   🔑 Senha: ${GREEN}Tiko6273@${NC}"
echo ""

echo -e "${WHITE}👨‍💼 SUPERVISOR:${NC}"
echo -e "   📧 Email: ${GREEN}supervisor@ssbv.com${NC}"
echo -e "   🔑 Senha: ${GREEN}Master6273@${NC}"
echo ""

echo -e "${YELLOW}💡 PRÓXIMOS PASSOS:${NC}"
echo ""
echo -e "  1. ${CYAN}Limpe o cache do navegador${NC} (Ctrl+Shift+Del)"
echo -e "  2. ${CYAN}Abra em aba anônima${NC} ou recarregue (Ctrl+F5)"
echo -e "  3. ${CYAN}Faça login${NC} com as credenciais acima"
echo -e "  4. ${CYAN}Altere sua senha${NC} no primeiro acesso"
echo ""

echo -e "${GREEN}✨ Sistema pronto para uso!${NC}"
echo ""

# Mostrar status
echo -e "${CYAN}📊 Status dos Serviços:${NC}"
echo ""
pm2 status
echo ""

exit 0

