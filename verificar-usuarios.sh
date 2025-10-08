#!/bin/bash

echo "🔍 VERIFICANDO USUÁRIOS NO BANCO DE DADOS"
echo ""

echo "Usuários cadastrados:"
sudo -u postgres psql -d sispat_prod -c "SELECT id, email, name, role, \"isActive\" FROM users ORDER BY role;"

echo ""
echo "Total de usuários:"
sudo -u postgres psql -d sispat_prod -t -c "SELECT COUNT(*) FROM users;" | tr -d ' '

echo ""
echo "✅ Verificação concluída!"
