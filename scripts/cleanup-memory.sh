#!/bin/bash
# Script de limpeza de memória para SISPAT

echo "🧹 Iniciando limpeza de memória..."

# Limpar cache do Node.js
if command -v pm2 &> /dev/null; then
  echo "📊 Status atual do PM2:"
  pm2 list
  
  echo "🔄 Reiniciando aplicação com limpeza de memória..."
  pm2 restart all --update-env
  
  echo "⏳ Aguardando estabilização..."
  sleep 10
  
  echo "📊 Status após limpeza:"
  pm2 list
else
  echo "⚠️ PM2 não encontrado"
fi

# Limpar cache do sistema (Linux)
if command -v sync &> /dev/null; then
  echo "💾 Sincronizando cache do sistema..."
  sync
  echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || echo "⚠️ Não foi possível limpar cache do sistema"
fi

echo "✅ Limpeza de memória concluída!"
