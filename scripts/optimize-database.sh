#!/bin/bash
# Script de otimização de banco de dados para SISPAT

echo "🗄️ Iniciando otimização do banco de dados..."

# Verificar se PostgreSQL está rodando
if ! systemctl is-active --quiet postgresql; then
  echo "❌ PostgreSQL não está rodando"
  exit 1
fi

echo "📊 Estatísticas do banco antes da otimização:"
sudo -u postgres psql -d sispat_production -c "
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples
FROM pg_stat_user_tables 
ORDER BY n_dead_tup DESC 
LIMIT 10;
"

echo "🧹 Executando VACUUM ANALYZE..."
sudo -u postgres psql -d sispat_production -c "VACUUM ANALYZE;"

echo "📊 Estatísticas do banco após otimização:"
sudo -u postgres psql -d sispat_production -c "
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples
FROM pg_stat_user_tables 
ORDER BY n_dead_tup DESC 
LIMIT 10;
"

echo "✅ Otimização do banco de dados concluída!"
