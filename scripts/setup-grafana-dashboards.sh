#!/bin/bash

# SISPAT - Script de Configuração de Dashboards do Grafana
# Este script configura dashboards personalizados para o SISPAT

set -e

echo "📊 Configurando Dashboards do Grafana para SISPAT..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Configurações
GRAFANA_URL="http://localhost:3000"
GRAFANA_USER="admin"
GRAFANA_PASS="sispat_admin_2025"
PROMETHEUS_URL="http://localhost:9090"

# 1. Aguardar Grafana estar disponível
log "Aguardando Grafana estar disponível..."
for i in {1..30}; do
    if curl -s -f "$GRAFANA_URL/api/health" > /dev/null 2>&1; then
        log "✅ Grafana está disponível"
        break
    fi
    if [ $i -eq 30 ]; then
        error "Grafana não está disponível após 30 tentativas"
        exit 1
    fi
    sleep 2
done

# 2. Configurar datasource Prometheus
log "Configurando datasource Prometheus..."

# Verificar se datasource já existe
if curl -s -u "$GRAFANA_USER:$GRAFANA_PASS" "$GRAFANA_URL/api/datasources" | grep -q "Prometheus"; then
    log "Datasource Prometheus já existe"
else
    curl -X POST \
        -H "Content-Type: application/json" \
        -u "$GRAFANA_USER:$GRAFANA_PASS" \
        -d "{
            \"name\": \"Prometheus\",
            \"type\": \"prometheus\",
            \"url\": \"$PROMETHEUS_URL\",
            \"access\": \"proxy\",
            \"isDefault\": true,
            \"jsonData\": {
                \"httpMethod\": \"POST\"
            }
        }" \
        "$GRAFANA_URL/api/datasources"
    
    log "✅ Datasource Prometheus configurado"
fi

# 3. Criar dashboard do sistema
log "Criando dashboard do sistema..."

cat > /tmp/sispat-system-dashboard.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "SISPAT - Sistema",
    "tags": ["sispat", "system"],
    "style": "dark",
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "CPU Usage",
        "type": "stat",
        "targets": [
          {
            "expr": "sispat_cpu_usage_percent",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100,
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 70},
                {"color": "red", "value": 90}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Memory Usage",
        "type": "stat",
        "targets": [
          {
            "expr": "sispat_memory_usage_percent",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100,
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 70},
                {"color": "red", "value": 85}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 6, "y": 0}
      },
      {
        "id": 3,
        "title": "Disk Usage",
        "type": "stat",
        "targets": [
          {
            "expr": "sispat_disk_usage_percent",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100,
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 70},
                {"color": "red", "value": 90}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 12, "y": 0}
      },
      {
        "id": 4,
        "title": "Load Average",
        "type": "stat",
        "targets": [
          {
            "expr": "sispat_load_average{period=\"1m\"}",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 1},
                {"color": "red", "value": 2}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 18, "y": 0}
      },
      {
        "id": 5,
        "title": "System Performance Over Time",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sispat_cpu_usage_percent",
            "refId": "A",
            "legendFormat": "CPU Usage"
          },
          {
            "expr": "sispat_memory_usage_percent",
            "refId": "B",
            "legendFormat": "Memory Usage"
          },
          {
            "expr": "sispat_disk_usage_percent",
            "refId": "C",
            "legendFormat": "Disk Usage"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100
          }
        },
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
EOF

curl -X POST \
    -H "Content-Type: application/json" \
    -u "$GRAFANA_USER:$GRAFANA_PASS" \
    -d @/tmp/sispat-system-dashboard.json \
    "$GRAFANA_URL/api/dashboards/db"

log "✅ Dashboard do sistema criado"

# 4. Criar dashboard da aplicação
log "Criando dashboard da aplicação..."

cat > /tmp/sispat-application-dashboard.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "SISPAT - Aplicação",
    "tags": ["sispat", "application"],
    "style": "dark",
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "sispat_active_users",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 50},
                {"color": "red", "value": 100}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Total Patrimonios",
        "type": "stat",
        "targets": [
          {
            "expr": "sispat_total_patrimonios",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 6, "y": 0}
      },
      {
        "id": 3,
        "title": "Total Municipalities",
        "type": "stat",
        "targets": [
          {
            "expr": "sispat_total_municipalities",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 12, "y": 0}
      },
      {
        "id": 4,
        "title": "Total Sectors",
        "type": "stat",
        "targets": [
          {
            "expr": "sispat_total_sectors",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 18, "y": 0}
      },
      {
        "id": 5,
        "title": "Response Time",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(sispat_response_time_seconds_bucket[5m]))",
            "refId": "A",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(sispat_response_time_seconds_bucket[5m]))",
            "refId": "B",
            "legendFormat": "50th percentile"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "min": 0
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 6,
        "title": "Request Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(sispat_requests_total[5m])",
            "refId": "A",
            "legendFormat": "{{method}} {{route}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps",
            "min": 0
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
EOF

curl -X POST \
    -H "Content-Type: application/json" \
    -u "$GRAFANA_USER:$GRAFANA_PASS" \
    -d @/tmp/sispat-application-dashboard.json \
    "$GRAFANA_URL/api/dashboards/db"

log "✅ Dashboard da aplicação criado"

# 5. Criar dashboard do banco de dados
log "Criando dashboard do banco de dados..."

cat > /tmp/sispat-database-dashboard.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "SISPAT - Banco de Dados",
    "tags": ["sispat", "database"],
    "style": "dark",
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Database Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "sispat_db_connections",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 50},
                {"color": "red", "value": 80}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Query Time",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(sispat_db_query_time_seconds_bucket[5m]))",
            "refId": "A",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(sispat_db_query_time_seconds_bucket[5m]))",
            "refId": "B",
            "legendFormat": "50th percentile"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "min": 0
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
EOF

curl -X POST \
    -H "Content-Type: application/json" \
    -u "$GRAFANA_USER:$GRAFANA_PASS" \
    -d @/tmp/sispat-database-dashboard.json \
    "$GRAFANA_URL/api/dashboards/db"

log "✅ Dashboard do banco de dados criado"

# 6. Configurar alertas
log "Configurando alertas..."

# Criar canal de notificação
cat > /tmp/notification-channel.json << 'EOF'
{
  "name": "SISPAT Alerts",
  "type": "email",
  "settings": {
    "addresses": "admin@sispat.com",
    "subject": "SISPAT Alert: {{ .GroupLabels.alertname }}",
    "message": "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"
  }
}
EOF

curl -X POST \
    -H "Content-Type: application/json" \
    -u "$GRAFANA_USER:$GRAFANA_PASS" \
    -d @/tmp/notification-channel.json \
    "$GRAFANA_URL/api/alert-notifications"

log "✅ Alertas configurados"

# 7. Limpar arquivos temporários
rm -f /tmp/sispat-*-dashboard.json /tmp/notification-channel.json

log "✅ Dashboards do Grafana configurados com sucesso!"
log ""
log "📋 Dashboards criados:"
log "   • SISPAT - Sistema"
log "   • SISPAT - Aplicação"
log "   • SISPAT - Banco de Dados"
log ""
log "🔗 Acesse o Grafana em: http://localhost:3000"
log "   Usuário: admin"
log "   Senha: sispat_admin_2025"
log ""
log "✅ Configuração concluída!"
