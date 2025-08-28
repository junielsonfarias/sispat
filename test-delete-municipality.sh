#!/bin/bash

echo "🧪 Testando exclusão de municípios..."

# Primeiro, fazer login para obter o token
echo "🔐 Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "junielsonfarias@gmail.com",
    "password": "admin123"
  }')

echo "📡 Resposta do login: $LOGIN_RESPONSE"

# Extrair o token da resposta
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Falha ao obter token de autenticação"
    exit 1
fi

echo "✅ Token obtido: ${TOKEN:0:20}..."

# Buscar municípios
echo "📋 Buscando municípios..."
MUNICIPALITIES_RESPONSE=$(curl -s -X GET http://localhost:3001/api/municipalities \
  -H "Authorization: Bearer $TOKEN")

echo "📡 Resposta dos municípios: $MUNICIPALITIES_RESPONSE"

# Extrair o ID do primeiro município
MUNICIPALITY_ID=$(echo $MUNICIPALITIES_RESPONSE | grep -o '"[0-9a-f]\{8\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{12\}"' | head -1 | tr -d '"')

if [ -z "$MUNICIPALITY_ID" ]; then
    echo "❌ Nenhum município encontrado para testar"
    exit 1
fi

echo "🧪 Testando exclusão do município: $MUNICIPALITY_ID"

# Tentar exclusão normal
echo "🔄 Tentando exclusão normal..."
DELETE_RESPONSE=$(curl -s -X DELETE http://localhost:3001/api/municipalities/$MUNICIPALITY_ID \
  -H "Authorization: Bearer $TOKEN")

echo "📡 Resposta da exclusão normal: $DELETE_RESPONSE"

# Se falhou com 400, tentar exclusão forçada
if [[ $DELETE_RESPONSE == *"400"* ]] || [[ $DELETE_RESPONSE == *"Existem dados vinculados"* ]]; then
    echo "⚠️ Exclusão normal falhou, tentando exclusão forçada..."
    
    FORCE_DELETE_RESPONSE=$(curl -s -X DELETE "http://localhost:3001/api/municipalities/$MUNICIPALITY_ID?force=true" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "📡 Resposta da exclusão forçada: $FORCE_DELETE_RESPONSE"
    
    if [[ $FORCE_DELETE_RESPONSE == *"200"* ]] || [[ $FORCE_DELETE_RESPONSE == *"sucesso"* ]]; then
        echo "✅ Exclusão forçada realizada com sucesso!"
    else
        echo "❌ Exclusão forçada falhou"
    fi
else
    echo "✅ Exclusão normal realizada com sucesso!"
fi
