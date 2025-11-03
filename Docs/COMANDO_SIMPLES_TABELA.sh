#!/bin/bash

# Script simples para criar tabela label_templates

echo "════════════════════════════════════════════════════════════"
echo "  🔍 DESCOBRINDO CONFIGURAÇÃO DO BANCO"
echo "════════════════════════════════════════════════════════════"
echo ""

# Descobrir DATABASE_URL
if [ -f "/var/www/sispat/backend/.env" ]; then
    DATABASE_URL=$(grep DATABASE_URL /var/www/sispat/backend/.env | cut -d '=' -f 2- | tr -d '"' | tr -d "'")
    echo "DATABASE_URL encontrado"
    
    # Extrair nome do banco da URL
    # Formato: postgresql://user:pass@host:port/DATABASE_NAME
    DB_NAME=$(echo $DATABASE_URL | sed 's/.*\///')
    echo "Nome do banco: $DB_NAME"
else
    echo "❌ Arquivo .env não encontrado"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  🔧 CRIANDO TABELA label_templates"
echo "════════════════════════════════════════════════════════════"
echo ""

# Criar tabela
sudo -u postgres psql $DB_NAME << 'EOSQL'

-- Criar tabela label_templates
CREATE TABLE IF NOT EXISTS label_templates (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  "isDefault" BOOLEAN DEFAULT false,
  "isActive" BOOLEAN DEFAULT true,
  elements JSONB NOT NULL,
  "municipalityId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_label_template_municipality 
    FOREIGN KEY ("municipalityId") 
    REFERENCES municipalities(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_label_template_creator 
    FOREIGN KEY ("createdBy") 
    REFERENCES users(id)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_label_templates_municipality 
  ON label_templates("municipalityId");

CREATE INDEX IF NOT EXISTS idx_label_templates_default 
  ON label_templates("isDefault");

CREATE INDEX IF NOT EXISTS idx_label_templates_active 
  ON label_templates("isActive");

EOSQL

if [ $? -eq 0 ]; then
    echo "✅ Tabela criada com sucesso"
else
    echo "❌ Erro ao criar tabela"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  📊 INSERINDO TEMPLATE PADRÃO"
echo "════════════════════════════════════════════════════════════"
echo ""

# Buscar Municipality e User IDs
MUNICIPALITY_ID=$(sudo -u postgres psql -t $DB_NAME -c "SELECT id FROM municipalities LIMIT 1;" | xargs)
USER_ID=$(sudo -u postgres psql -t $DB_NAME -c "SELECT id FROM users WHERE role IN ('admin', 'supervisor') ORDER BY role LIMIT 1;" | xargs)

echo "Municipality ID: $MUNICIPALITY_ID"
echo "User ID (creator): $USER_ID"

if [ -z "$MUNICIPALITY_ID" ] || [ -z "$USER_ID" ]; then
    echo "⚠️  Não foi possível encontrar Municipality ou User"
    echo "    Tabela criada, mas sem template padrão"
    exit 0
fi

# Inserir template padrão
sudo -u postgres psql $DB_NAME << EOSQL

INSERT INTO label_templates 
  (id, name, width, height, "isDefault", "isActive", elements, "municipalityId", "createdBy", "createdAt", "updatedAt")
VALUES 
  (
    'default-60x40',
    'Padrão 60x40mm',
    60,
    40,
    true,
    true,
    '[
      {
        "id": "logo",
        "type": "LOGO",
        "x": 5,
        "y": 5,
        "width": 25,
        "height": 20,
        "content": "logo",
        "fontSize": 12,
        "fontWeight": "normal",
        "textAlign": "left"
      },
      {
        "id": "patrimonio",
        "type": "PATRIMONIO_FIELD",
        "content": "numero_patrimonio",
        "x": 5,
        "y": 70,
        "width": 55,
        "height": 25,
        "fontSize": 16,
        "fontWeight": "bold",
        "textAlign": "left"
      }
    ]'::jsonb,
    '$MUNICIPALITY_ID',
    '$USER_ID',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO NOTHING;

EOSQL

if [ $? -eq 0 ]; then
    echo "✅ Template padrão inserido"
else
    echo "⚠️  Template padrão pode já existir ou houve erro"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ VERIFICAÇÃO"
echo "════════════════════════════════════════════════════════════"
echo ""

# Verificar templates
sudo -u postgres psql $DB_NAME -c "SELECT id, name, width, height, \"isDefault\" FROM label_templates;"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  🎉 PROCESSO CONCLUÍDO!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Próximo passo:"
echo "1. Abrir sistema no navegador"
echo "2. Login como supervisor"
echo "3. Ferramentas > Gerenciar Etiquetas"
echo "4. ✅ Deve ver template 'Padrão 60x40mm'"
echo ""

