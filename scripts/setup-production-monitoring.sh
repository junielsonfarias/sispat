#!/bin/bash

# SISPAT - Script de Configuração de Monitoramento em Produção
# Este script configura monitoramento completo em produção

set -e

echo "📊 Configurando Monitoramento em Produção do SISPAT..."

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
PRODUCTION_DIR="/opt/sispat"
SERVICE_USER="sispat"
MONITORING_PORT=${1:-3002}
DASHBOARD_PORT=${2:-3003}
ALERT_EMAIL="admin@sispat.com"

# 1. Instalar dependências de monitoramento
log "Instalando dependências de monitoramento..."

# Instalar ferramentas de monitoramento
apt-get update
apt-get install -y \
    htop \
    iotop \
    nethogs \
    iftop \
    nload \
    sysstat \
    dstat \
    collectd \
    telegraf \
    grafana-server \
    prometheus \
    node-exporter

# Instalar Node.js para monitoramento customizado
if ! command -v node &> /dev/null; then
    log "Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
fi

log "✅ Dependências instaladas"

# 2. Configurar Prometheus
log "Configurando Prometheus..."

# Criar usuário para Prometheus
useradd --no-create-home --shell /bin/false prometheus

# Criar diretórios
mkdir -p /etc/prometheus
mkdir -p /var/lib/prometheus
chown prometheus:prometheus /etc/prometheus
chown prometheus:prometheus /var/lib/prometheus

# Configurar Prometheus
cat > /etc/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "sispat_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'sispat-backend'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'sispat-monitoring'
    static_configs:
      - targets: ['localhost:3002']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']

  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:9187']
EOF

# Configurar regras de alerta
cat > /etc/prometheus/sispat_rules.yml << 'EOF'
groups:
  - name: sispat_alerts
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% for more than 5 minutes"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 85% for more than 5 minutes"

      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space"
          description: "Disk space is below 10%"

      - alert: SISPATDown
        expr: up{job="sispat-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "SISPAT backend is down"
          description: "SISPAT backend has been down for more than 1 minute"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is above 2 seconds"

      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_numbackends / pg_settings_max_connections * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"
          description: "Database connections are above 80% of maximum"
EOF

chown prometheus:prometheus /etc/prometheus/sispat_rules.yml

# Configurar systemd para Prometheus
cat > /etc/systemd/system/prometheus.service << 'EOF'
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \
    --config.file /etc/prometheus/prometheus.yml \
    --storage.tsdb.path /var/lib/prometheus/ \
    --web.console.templates=/etc/prometheus/consoles \
    --web.console.libraries=/etc/prometheus/console_libraries \
    --web.listen-address=0.0.0.0:9090 \
    --web.enable-lifecycle

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable prometheus
systemctl start prometheus

log "✅ Prometheus configurado"

# 3. Configurar Node Exporter
log "Configurando Node Exporter..."

# Criar usuário para Node Exporter
useradd --no-create-home --shell /bin/false node_exporter

# Configurar systemd para Node Exporter
cat > /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable node_exporter
systemctl start node_exporter

log "✅ Node Exporter configurado"

# 4. Configurar Grafana
log "Configurando Grafana..."

# Configurar Grafana
cat > /etc/grafana/grafana.ini << 'EOF'
[server]
http_port = 3000
domain = localhost
root_url = http://localhost:3000/

[security]
admin_user = admin
admin_password = sispat_admin_2025

[database]
type = sqlite3
path = grafana.db

[users]
allow_sign_up = false
allow_org_create = false
auto_assign_org = true
auto_assign_org_role = Viewer

[log]
mode = console
level = info

[alerting]
enabled = true
execute_alerts = true

[unified_alerting]
enabled = true
EOF

systemctl enable grafana-server
systemctl start grafana-server

# Aguardar Grafana inicializar
sleep 10

# Configurar datasource Prometheus
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "url": "http://localhost:9090",
    "access": "proxy",
    "isDefault": true
  }' \
  http://admin:sispat_admin_2025@localhost:3000/api/datasources

log "✅ Grafana configurado"

# 5. Configurar monitoramento customizado do SISPAT
log "Configurando monitoramento customizado do SISPAT..."

# Criar diretório de monitoramento
mkdir -p $PRODUCTION_DIR/monitoring
cd $PRODUCTION_DIR/monitoring

# Criar package.json para monitoramento
cat > package.json << 'EOF'
{
  "name": "sispat-monitoring",
  "version": "1.0.0",
  "description": "SISPAT Production Monitoring",
  "main": "monitoring-server.js",
  "scripts": {
    "start": "node monitoring-server.js",
    "dev": "nodemon monitoring-server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "prom-client": "^15.0.0",
    "node-cron": "^3.0.3",
    "nodemailer": "^6.9.7",
    "ws": "^8.14.2",
    "systeminformation": "^5.21.15",
    "pg": "^8.11.3"
  }
}
EOF

# Instalar dependências
npm install

# Criar servidor de monitoramento
cat > monitoring-server.js << 'EOF'
const express = require('express');
const promClient = require('prom-client');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const WebSocket = require('ws');
const si = require('systeminformation');
const { Pool } = require('pg');

const app = express();
const port = process.env.MONITORING_PORT || 3002;

// Configuração do banco de dados
const dbPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sispat_production',
  user: process.env.DB_USER || 'sispat_user',
  password: process.env.DB_PASSWORD || 'sispat_password'
});

// Configuração de email
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'localhost',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'admin@sispat.com',
    pass: process.env.SMTP_PASS || 'password'
  }
});

// Métricas Prometheus
const register = new promClient.Registry();

// Métricas do sistema
const cpuUsage = new promClient.Gauge({
  name: 'sispat_cpu_usage_percent',
  help: 'CPU usage percentage',
  registers: [register]
});

const memoryUsage = new promClient.Gauge({
  name: 'sispat_memory_usage_percent',
  help: 'Memory usage percentage',
  registers: [register]
});

const diskUsage = new promClient.Gauge({
  name: 'sispat_disk_usage_percent',
  help: 'Disk usage percentage',
  registers: [register]
});

const loadAverage = new promClient.Gauge({
  name: 'sispat_load_average',
  help: 'System load average',
  labelNames: ['period'],
  registers: [register]
});

// Métricas da aplicação
const activeUsers = new promClient.Gauge({
  name: 'sispat_active_users',
  help: 'Number of active users',
  registers: [register]
});

const totalPatrimonios = new promClient.Gauge({
  name: 'sispat_total_patrimonios',
  help: 'Total number of patrimonios',
  registers: [register]
});

const totalMunicipalities = new promClient.Gauge({
  name: 'sispat_total_municipalities',
  help: 'Total number of municipalities',
  registers: [register]
});

const totalSectors = new promClient.Gauge({
  name: 'sispat_total_sectors',
  help: 'Total number of sectors',
  registers: [register]
});

// Métricas de performance
const responseTime = new promClient.Histogram({
  name: 'sispat_response_time_seconds',
  help: 'Response time in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

const requestCount = new promClient.Counter({
  name: 'sispat_requests_total',
  help: 'Total number of requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// Métricas do banco de dados
const dbConnections = new promClient.Gauge({
  name: 'sispat_db_connections',
  help: 'Database connections',
  registers: [register]
});

const dbQueryTime = new promClient.Histogram({
  name: 'sispat_db_query_time_seconds',
  help: 'Database query time in seconds',
  labelNames: ['query_type'],
  buckets: [0.01, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// Middleware para métricas
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    responseTime.observe(
      { method: req.method, route: req.route?.path || req.path, status: res.statusCode },
      duration
    );
    requestCount.inc(
      { method: req.method, route: req.route?.path || req.path, status: res.statusCode }
    );
  });
  
  next();
});

// Endpoint de métricas
app.get('/metrics', async (req, res) => {
  try {
    // Coletar métricas do sistema
    const systemInfo = await si.currentLoad();
    const memoryInfo = await si.mem();
    const diskInfo = await si.fsSize();
    
    cpuUsage.set(systemInfo.currentLoad);
    memoryUsage.set((memoryInfo.used / memoryInfo.total) * 100);
    diskUsage.set((diskInfo[0].used / diskInfo[0].size) * 100);
    
    loadAverage.set({ period: '1m' }, systemInfo.avgLoad);
    loadAverage.set({ period: '5m' }, systemInfo.avgLoad);
    loadAverage.set({ period: '15m' }, systemInfo.avgLoad);
    
    // Coletar métricas da aplicação
    const appStats = await getApplicationStats();
    activeUsers.set(appStats.activeUsers);
    totalPatrimonios.set(appStats.totalPatrimonios);
    totalMunicipalities.set(appStats.totalMunicipalities);
    totalSectors.set(appStats.totalSectors);
    
    // Coletar métricas do banco de dados
    const dbStats = await getDatabaseStats();
    dbConnections.set(dbStats.connections);
    
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error('Erro ao coletar métricas:', error);
    res.status(500).json({ error: 'Erro ao coletar métricas' });
  }
});

// Função para coletar estatísticas da aplicação
async function getApplicationStats() {
  try {
    const client = await dbPool.connect();
    
    const [patrimoniosResult, municipalitiesResult, sectorsResult, usersResult] = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM patrimonios'),
      client.query('SELECT COUNT(*) as count FROM municipalities'),
      client.query('SELECT COUNT(*) as count FROM sectors'),
      client.query('SELECT COUNT(*) as count FROM users WHERE last_login > NOW() - INTERVAL \'1 hour\'')
    ]);
    
    client.release();
    
    return {
      totalPatrimonios: parseInt(patrimoniosResult.rows[0].count),
      totalMunicipalities: parseInt(municipalitiesResult.rows[0].count),
      totalSectors: parseInt(sectorsResult.rows[0].count),
      activeUsers: parseInt(usersResult.rows[0].count)
    };
  } catch (error) {
    console.error('Erro ao coletar estatísticas da aplicação:', error);
    return {
      totalPatrimonios: 0,
      totalMunicipalities: 0,
      totalSectors: 0,
      activeUsers: 0
    };
  }
}

// Função para coletar estatísticas do banco de dados
async function getDatabaseStats() {
  try {
    const client = await dbPool.connect();
    const result = await client.query('SELECT count(*) as connections FROM pg_stat_activity');
    client.release();
    
    return {
      connections: parseInt(result.rows[0].connections)
    };
  } catch (error) {
    console.error('Erro ao coletar estatísticas do banco:', error);
    return { connections: 0 };
  }
}

// Endpoint de saúde
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// Endpoint de status
app.get('/status', async (req, res) => {
  try {
    const systemInfo = await si.currentLoad();
    const memoryInfo = await si.mem();
    const diskInfo = await si.fsSize();
    const appStats = await getApplicationStats();
    const dbStats = await getDatabaseStats();
    
    res.json({
      system: {
        cpu: systemInfo.currentLoad,
        memory: (memoryInfo.used / memoryInfo.total) * 100,
        disk: (diskInfo[0].used / diskInfo[0].size) * 100,
        load: systemInfo.avgLoad
      },
      application: appStats,
      database: dbStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de alertas
app.get('/alerts', (req, res) => {
  res.json({
    alerts: [],
    timestamp: new Date().toISOString()
  });
});

// WebSocket para métricas em tempo real
const wss = new WebSocket.Server({ port: 3004 });

wss.on('connection', (ws) => {
  console.log('Cliente conectado ao WebSocket de monitoramento');
  
  const interval = setInterval(async () => {
    try {
      const systemInfo = await si.currentLoad();
      const memoryInfo = await si.mem();
      const diskInfo = await si.fsSize();
      const appStats = await getApplicationStats();
      
      ws.send(JSON.stringify({
        type: 'metrics',
        data: {
          system: {
            cpu: systemInfo.currentLoad,
            memory: (memoryInfo.used / memoryInfo.total) * 100,
            disk: (diskInfo[0].used / diskInfo[0].size) * 100,
            load: systemInfo.avgLoad
          },
          application: appStats,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error('Erro ao enviar métricas via WebSocket:', error);
    }
  }, 5000);
  
  ws.on('close', () => {
    clearInterval(interval);
    console.log('Cliente desconectado do WebSocket de monitoramento');
  });
});

// Tarefa agendada para verificação de alertas
cron.schedule('*/5 * * * *', async () => {
  try {
    const systemInfo = await si.currentLoad();
    const memoryInfo = await si.mem();
    const diskInfo = await si.fsSize();
    
    // Verificar alertas
    const alerts = [];
    
    if (systemInfo.currentLoad > 80) {
      alerts.push({
        level: 'warning',
        message: 'CPU usage is above 80%',
        value: systemInfo.currentLoad
      });
    }
    
    if ((memoryInfo.used / memoryInfo.total) * 100 > 85) {
      alerts.push({
        level: 'warning',
        message: 'Memory usage is above 85%',
        value: (memoryInfo.used / memoryInfo.total) * 100
      });
    }
    
    if ((diskInfo[0].used / diskInfo[0].size) * 100 > 90) {
      alerts.push({
        level: 'critical',
        message: 'Disk usage is above 90%',
        value: (diskInfo[0].used / diskInfo[0].size) * 100
      });
    }
    
    // Enviar alertas por email se necessário
    if (alerts.length > 0) {
      await sendAlerts(alerts);
    }
  } catch (error) {
    console.error('Erro na verificação de alertas:', error);
  }
});

// Função para enviar alertas por email
async function sendAlerts(alerts) {
  try {
    const criticalAlerts = alerts.filter(alert => alert.level === 'critical');
    
    if (criticalAlerts.length > 0) {
      await transporter.sendMail({
        from: process.env.SMTP_USER || 'admin@sispat.com',
        to: process.env.ALERT_EMAIL || 'admin@sispat.com',
        subject: 'SISPAT - Alertas Críticos',
        html: `
          <h2>Alertas Críticos do SISPAT</h2>
          <ul>
            ${criticalAlerts.map(alert => `<li><strong>${alert.level.toUpperCase()}:</strong> ${alert.message} (${alert.value}%)</li>`).join('')}
          </ul>
          <p>Timestamp: ${new Date().toISOString()}</p>
        `
      });
    }
  } catch (error) {
    console.error('Erro ao enviar alertas por email:', error);
  }
}

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor de monitoramento rodando na porta ${port}`);
  console.log(`Métricas disponíveis em: http://localhost:${port}/metrics`);
  console.log(`Status disponível em: http://localhost:${port}/status`);
  console.log(`WebSocket disponível em: ws://localhost:3004`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejeitada não tratada:', reason);
  process.exit(1);
});
EOF

# Configurar PM2 para monitoramento
cat > ecosystem.monitoring.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'sispat-monitoring',
    script: 'monitoring-server.js',
    cwd: '/opt/sispat/monitoring',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      MONITORING_PORT: 3002,
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_NAME: 'sispat_production',
      DB_USER: 'sispat_user',
      DB_PASSWORD: 'sispat_password',
      SMTP_HOST: 'localhost',
      SMTP_PORT: 587,
      SMTP_USER: 'admin@sispat.com',
      SMTP_PASS: 'password',
      ALERT_EMAIL: 'admin@sispat.com'
    },
    log_file: '/var/log/sispat/monitoring/combined.log',
    out_file: '/var/log/sispat/monitoring/out.log',
    error_file: '/var/log/sispat/monitoring/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# Criar diretório de logs
mkdir -p /var/log/sispat/monitoring
chown -R $SERVICE_USER:$SERVICE_USER /var/log/sispat/monitoring

# Iniciar monitoramento com PM2
pm2 start ecosystem.monitoring.config.js
pm2 save
pm2 startup

log "✅ Monitoramento customizado configurado"

# 6. Configurar dashboard web
log "Configurando dashboard web..."

# Criar dashboard HTML
cat > $PRODUCTION_DIR/monitoring/dashboard.html << 'EOF'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SISPAT - Dashboard de Monitoramento</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            text-align: center;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .metric-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
        }
        .metric-unit {
            font-size: 14px;
            color: #666;
        }
        .chart-container {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-healthy { background-color: #4CAF50; }
        .status-warning { background-color: #FF9800; }
        .status-critical { background-color: #F44336; }
        .alerts-container {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .alert-item {
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            border-left: 4px solid;
        }
        .alert-warning {
            background-color: #FFF3CD;
            border-left-color: #FF9800;
        }
        .alert-critical {
            background-color: #F8D7DA;
            border-left-color: #F44336;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 SISPAT - Dashboard de Monitoramento</h1>
            <p>Monitoramento em tempo real do sistema de patrimônio</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-title">CPU Usage</div>
                <div class="metric-value" id="cpu-usage">0</div>
                <div class="metric-unit">%</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Memory Usage</div>
                <div class="metric-value" id="memory-usage">0</div>
                <div class="metric-unit">%</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Disk Usage</div>
                <div class="metric-value" id="disk-usage">0</div>
                <div class="metric-unit">%</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Active Users</div>
                <div class="metric-value" id="active-users">0</div>
                <div class="metric-unit">users</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Total Patrimonios</div>
                <div class="metric-value" id="total-patrimonios">0</div>
                <div class="metric-unit">items</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Database Connections</div>
                <div class="metric-value" id="db-connections">0</div>
                <div class="metric-unit">connections</div>
            </div>
        </div>

        <div class="chart-container">
            <div class="metric-title">System Performance Over Time</div>
            <canvas id="performanceChart" width="400" height="200"></canvas>
        </div>

        <div class="alerts-container">
            <div class="metric-title">Active Alerts</div>
            <div id="alerts-list">
                <p>No active alerts</p>
            </div>
        </div>
    </div>

    <script>
        // Configurar WebSocket
        const ws = new WebSocket('ws://localhost:3004');
        
        // Configurar gráfico
        const ctx = document.getElementById('performanceChart').getContext('2d');
        const performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'CPU Usage (%)',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }, {
                    label: 'Memory Usage (%)',
                    data: [],
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                }, {
                    label: 'Disk Usage (%)',
                    data: [],
                    borderColor: 'rgb(255, 205, 86)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        // Atualizar métricas
        function updateMetrics(data) {
            document.getElementById('cpu-usage').textContent = data.system.cpu.toFixed(1);
            document.getElementById('memory-usage').textContent = data.system.memory.toFixed(1);
            document.getElementById('disk-usage').textContent = data.system.disk.toFixed(1);
            document.getElementById('active-users').textContent = data.application.activeUsers;
            document.getElementById('total-patrimonios').textContent = data.application.totalPatrimonios;
            document.getElementById('db-connections').textContent = data.database.connections;

            // Atualizar gráfico
            const now = new Date().toLocaleTimeString();
            performanceChart.data.labels.push(now);
            performanceChart.data.datasets[0].data.push(data.system.cpu);
            performanceChart.data.datasets[1].data.push(data.system.memory);
            performanceChart.data.datasets[2].data.push(data.system.disk);

            // Manter apenas os últimos 20 pontos
            if (performanceChart.data.labels.length > 20) {
                performanceChart.data.labels.shift();
                performanceChart.data.datasets[0].data.shift();
                performanceChart.data.datasets[1].data.shift();
                performanceChart.data.datasets[2].data.shift();
            }

            performanceChart.update();
        }

        // WebSocket events
        ws.onopen = function() {
            console.log('Conectado ao WebSocket de monitoramento');
        };

        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            if (data.type === 'metrics') {
                updateMetrics(data.data);
            }
        };

        ws.onclose = function() {
            console.log('Conexão WebSocket fechada');
        };

        ws.onerror = function(error) {
            console.error('Erro no WebSocket:', error);
        };

        // Carregar dados iniciais
        fetch('http://localhost:3002/status')
            .then(response => response.json())
            .then(data => {
                updateMetrics(data);
            })
            .catch(error => {
                console.error('Erro ao carregar dados iniciais:', error);
            });

        // Atualizar alertas
        function updateAlerts() {
            fetch('http://localhost:3002/alerts')
                .then(response => response.json())
                .then(data => {
                    const alertsList = document.getElementById('alerts-list');
                    if (data.alerts.length === 0) {
                        alertsList.innerHTML = '<p>No active alerts</p>';
                    } else {
                        alertsList.innerHTML = data.alerts.map(alert => `
                            <div class="alert-item alert-${alert.level}">
                                <strong>${alert.level.toUpperCase()}:</strong> ${alert.message}
                            </div>
                        `).join('');
                    }
                })
                .catch(error => {
                    console.error('Erro ao carregar alertas:', error);
                });
        }

        // Atualizar alertas a cada 30 segundos
        setInterval(updateAlerts, 30000);
        updateAlerts();
    </script>
</body>
</html>
EOF

# Configurar Nginx para dashboard
cat > /etc/nginx/sites-available/sispat-monitoring << 'EOF'
server {
    listen 3003;
    server_name localhost;

    location / {
        root /opt/sispat/monitoring;
        index dashboard.html;
        try_files $uri $uri/ =404;
    }

    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/sispat-monitoring /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

log "✅ Dashboard web configurado"

# 7. Configurar alertas por email
log "Configurando alertas por email..."

# Instalar Postfix
apt-get install -y postfix mailutils

# Configurar Postfix
cat > /etc/postfix/main.cf << 'EOF'
myhostname = sispat.local
mydomain = local
myorigin = $mydomain
inet_interfaces = loopback-only
mydestination = $myhostname, localhost.$mydomain, localhost
relayhost = 
mynetworks = 127.0.0.0/8
mailbox_size_limit = 0
recipient_delimiter = +
inet_protocols = all
EOF

systemctl restart postfix

log "✅ Alertas por email configurados"

# 8. Configurar logrotate para logs de monitoramento
log "Configurando logrotate..."

cat > /etc/logrotate.d/sispat-monitoring << 'EOF'
/var/log/sispat/monitoring/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 sispat sispat
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

log "✅ Logrotate configurado"

# 9. Configurar firewall para portas de monitoramento
log "Configurando firewall..."

ufw allow 9090/tcp comment 'Prometheus'
ufw allow 3000/tcp comment 'Grafana'
ufw allow 3002/tcp comment 'SISPAT Monitoring'
ufw allow 3003/tcp comment 'SISPAT Dashboard'
ufw allow 3004/tcp comment 'SISPAT WebSocket'

log "✅ Firewall configurado"

# 10. Exibir resumo final
log "🎉 Monitoramento em produção configurado com sucesso!"
log ""
log "📋 Resumo da configuração:"
log "   • Prometheus: http://localhost:9090"
log "   • Grafana: http://localhost:3000 (admin/sispat_admin_2025)"
log "   • SISPAT Monitoring: http://localhost:3002"
log "   • SISPAT Dashboard: http://localhost:3003"
log "   • WebSocket: ws://localhost:3004"
log ""
log "🔧 Serviços configurados:"
log "   • Prometheus (métricas)"
log "   • Node Exporter (métricas do sistema)"
log "   • Grafana (visualização)"
log "   • SISPAT Monitoring (métricas customizadas)"
log "   • Dashboard Web (interface visual)"
log "   • Alertas por email"
log ""
log "📊 Métricas disponíveis:"
log "   • CPU, Memory, Disk usage"
log "   • Load average"
log "   • Active users"
log "   • Total patrimonios"
log "   • Database connections"
log "   • Response times"
log "   • Request counts"
log ""
log "⚠️  Próximos passos:"
log "   1. Configurar datasources no Grafana"
log "   2. Importar dashboards"
log "   3. Configurar alertas"
log "   4. Testar notificações"
log "   5. Monitorar logs"
log ""
log "✅ Monitoramento em produção pronto para uso!"
