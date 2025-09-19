#!/bin/bash

echo "🐘 Instalando PostgreSQL..."

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Iniciar e habilitar PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configurar usuário e banco
sudo -u postgres psql << EOF
CREATE USER sispat_user WITH PASSWORD 'sispat123456';
CREATE DATABASE sispat_production OWNER sispat_user;
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
ALTER USER sispat_user CREATEDB;
\q
EOF

# Habilitar extensões necessárias
sudo -u postgres psql -d sispat_production << EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
\q
EOF

echo "✅ PostgreSQL instalado e configurado com sucesso!"
echo "📋 Credenciais:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: sispat_production"
echo "   User: sispat_user"
echo "   Password: sispat123456"