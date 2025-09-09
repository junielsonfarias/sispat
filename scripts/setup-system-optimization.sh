#!/bin/bash

# SISPAT - Script de Otimização do Sistema para Produção
# Este script otimiza o sistema operacional para produção

set -e

echo "🚀 Otimizando Sistema para Produção..."

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

# 1. Otimizar sistema de arquivos
log "Otimizando sistema de arquivos..."

# Configurar limites de arquivos
sudo tee -a /etc/security/limits.conf > /dev/null << EOF
# SISPAT - Limites de sistema
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
root soft nofile 65536
root hard nofile 65536
root soft nproc 32768
root hard nproc 32768
EOF

# Configurar limites do sistema
sudo tee /etc/systemd/system.conf > /dev/null << EOF
[Manager]
DefaultLimitNOFILE=65536
DefaultLimitNPROC=32768
EOF

log "Limites de sistema configurados"

# 2. Otimizar kernel
log "Otimizando parâmetros do kernel..."

# Backup da configuração original
sudo cp /etc/sysctl.conf /etc/sysctl.conf.backup.$(date +%Y%m%d_%H%M%S)

# Configurações de rede
sudo tee -a /etc/sysctl.conf > /dev/null << EOF

# SISPAT - Otimizações de kernel para produção
# Configurações de rede
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216
net.core.netdev_max_backlog = 5000
net.core.somaxconn = 65535
net.ipv4.tcp_rmem = 4096 65536 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_max_tw_buckets = 2000000
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_sack = 1
net.ipv4.tcp_no_metrics_save = 1
net.ipv4.tcp_moderate_rcvbuf = 1
net.ipv4.tcp_mtu_probing = 1
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_available_congestion_control = bbr cubic reno
net.ipv4.tcp_allowed_congestion_control = bbr cubic reno

# Configurações de memória
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.dirty_expire_centisecs = 3000
vm.dirty_writeback_centisecs = 500
vm.overcommit_memory = 1
vm.overcommit_ratio = 50
vm.max_map_count = 262144
vm.min_free_kbytes = 65536

# Configurações de I/O
fs.file-max = 2097152
fs.nr_open = 1048576
fs.inotify.max_user_watches = 1048576
fs.inotify.max_user_instances = 8192
fs.inotify.max_queued_events = 32768

# Configurações de segurança
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0
EOF

# Aplicar configurações
sudo sysctl -p

log "Parâmetros do kernel otimizados"

# 3. Otimizar PostgreSQL
log "Otimizando PostgreSQL..."

# Configurar shared_preload_libraries
sudo -u postgres psql -c "ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';"
sudo -u postgres psql -c "ALTER SYSTEM SET max_connections = 200;"
sudo -u postgres psql -c "ALTER SYSTEM SET shared_buffers = '256MB';"
sudo -u postgres psql -c "ALTER SYSTEM SET effective_cache_size = '1GB';"
sudo -u postgres psql -c "ALTER SYSTEM SET maintenance_work_mem = '64MB';"
sudo -u postgres psql -c "ALTER SYSTEM SET checkpoint_completion_target = 0.9;"
sudo -u postgres psql -c "ALTER SYSTEM SET wal_buffers = '16MB';"
sudo -u postgres psql -c "ALTER SYSTEM SET default_statistics_target = 100;"
sudo -u postgres psql -c "ALTER SYSTEM SET random_page_cost = 1.1;"
sudo -u postgres psql -c "ALTER SYSTEM SET effective_io_concurrency = 200;"
sudo -u postgres psql -c "ALTER SYSTEM SET work_mem = '4MB';"
sudo -u postgres psql -c "ALTER SYSTEM SET min_wal_size = '1GB';"
sudo -u postgres psql -c "ALTER SYSTEM SET max_wal_size = '4GB';"
sudo -u postgres psql -c "ALTER SYSTEM SET max_worker_processes = 8;"
sudo -u postgres psql -c "ALTER SYSTEM SET max_parallel_workers_per_gather = 4;"
sudo -u postgres psql -c "ALTER SYSTEM SET max_parallel_workers = 8;"
sudo -u postgres psql -c "ALTER SYSTEM SET max_parallel_maintenance_workers = 4;"

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

log "PostgreSQL otimizado"

# 4. Configurar swap
log "Configurando swap..."

# Verificar se há swap
if ! swapon --show | grep -q "/"; then
    log "Criando arquivo de swap..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    
    # Tornar permanente
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    
    # Configurar swappiness
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
    
    log "Swap configurado (2GB)"
else
    log "Swap já configurado"
fi

# 5. Otimizar cron
log "Otimizando cron..."

# Configurar anacron para tarefas importantes
sudo tee /etc/anacrontab > /dev/null << EOF
# /etc/anacrontab: configuration file for anacron

# See anacron(8) and anacrontab(5) for details.

SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# These replace cron's entries
1       5       cron.daily      run-parts --report /etc/cron.daily
7       10      cron.weekly     run-parts --report /etc/cron.weekly
@monthly        15      cron.monthly    run-parts --report /etc/cron.monthly
EOF

log "Cron otimizado"

# 6. Configurar logrotate
log "Configurando logrotate..."

# Configurar logrotate para logs do sistema
sudo tee /etc/logrotate.d/sispat-system > /dev/null << EOF
# SISPAT - Logrotate para logs do sistema
/var/log/sispat/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    sharedscripts
    postrotate
        systemctl reload nginx
        pm2 reloadLogs
    endscript
}

/var/log/pm2/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}

/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 nginx adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi \
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1
    endscript
}
EOF

log "Logrotate configurado"

# 7. Configurar monitoramento de sistema
log "Configurando monitoramento de sistema..."

# Instalar htop se não estiver instalado
if ! command -v htop &> /dev/null; then
    sudo apt install -y htop
fi

# Instalar iotop se não estiver instalado
if ! command -v iotop &> /dev/null; then
    sudo apt install -y iotop
fi

# Instalar nethogs se não estiver instalado
if ! command -v nethogs &> /dev/null; then
    sudo apt install -y nethogs
fi

# Criar script de monitoramento de sistema
sudo tee /usr/local/bin/monitor-system.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Monitoramento de Sistema
# Monitora recursos do sistema

LOG_FILE="/var/log/sispat/system-monitor.log"

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

log "Iniciando monitoramento de sistema..."

# Verificar uso de CPU
CPU_USAGE=\$(top -bn1 | grep "Cpu(s)" | awk '{print \$2}' | awk -F'%' '{print \$1}')
if [ \$(echo "\$CPU_USAGE > 80" | bc -l) -eq 1 ]; then
    log "⚠️ ALERTA: Uso de CPU alto: \$CPU_USAGE%"
fi

# Verificar uso de memória
MEMORY_USAGE=\$(free | grep Mem | awk '{printf "%.0f", \$3/\$2 * 100.0}')
if [ \$MEMORY_USAGE -gt 80 ]; then
    log "⚠️ ALERTA: Uso de memória alto: \$MEMORY_USAGE%"
fi

# Verificar uso de disco
DISK_USAGE=\$(df -h / | tail -1 | awk '{print \$5}' | sed 's/%//')
if [ \$DISK_USAGE -gt 80 ]; then
    log "⚠️ ALERTA: Uso de disco alto: \$DISK_USAGE%"
fi

# Verificar uso de swap
SWAP_USAGE=\$(free | grep Swap | awk '{printf "%.0f", \$3/\$2 * 100.0}')
if [ \$SWAP_USAGE -gt 50 ]; then
    log "⚠️ ALERTA: Uso de swap alto: \$SWAP_USAGE%"
fi

# Verificar carga do sistema
LOAD_AVG=\$(uptime | awk -F'load average:' '{print \$2}' | awk '{print \$1}' | sed 's/,//')
if [ \$(echo "\$LOAD_AVG > 4" | bc -l) -eq 1 ]; then
    log "⚠️ ALERTA: Carga do sistema alta: \$LOAD_AVG"
fi

# Verificar processos com alto uso de CPU
HIGH_CPU_PROCESSES=\$(ps aux --sort=-%cpu | head -6 | tail -5 | awk '{print \$2, \$3, \$11}' | grep -v "PID")
if [ -n "\$HIGH_CPU_PROCESSES" ]; then
    log "🔍 Processos com alto uso de CPU:"
    echo "\$HIGH_CPU_PROCESSES" | while read line; do
        log "   \$line"
    done
fi

# Verificar processos com alto uso de memória
HIGH_MEMORY_PROCESSES=\$(ps aux --sort=-%mem | head -6 | tail -5 | awk '{print \$2, \$4, \$11}' | grep -v "PID")
if [ -n "\$HIGH_MEMORY_PROCESSES" ]; then
    log "🔍 Processos com alto uso de memória:"
    echo "\$HIGH_MEMORY_PROCESSES" | while read line; do
        log "   \$line"
    done
fi

log "Monitoramento de sistema finalizado"
EOF

sudo chmod +x /usr/local/bin/monitor-system.sh

# Agendar monitoramento a cada 5 minutos
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/monitor-system.sh") | crontab -

log "Monitoramento de sistema configurado"

# 8. Configurar limpeza automática
log "Configurando limpeza automática..."

# Criar script de limpeza
sudo tee /usr/local/bin/cleanup-system.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Limpeza de Sistema
# Limpa arquivos temporários e logs antigos

LOG_FILE="/var/log/sispat/cleanup.log"

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

log "Iniciando limpeza de sistema..."

# Limpar cache do APT
apt-get clean
apt-get autoclean
log "Cache do APT limpo"

# Limpar logs antigos
find /var/log -name "*.log" -mtime +30 -delete
find /var/log -name "*.gz" -mtime +30 -delete
log "Logs antigos removidos"

# Limpar arquivos temporários
find /tmp -type f -mtime +7 -delete
find /var/tmp -type f -mtime +7 -delete
log "Arquivos temporários removidos"

# Limpar cache do sistema
find /var/cache -type f -mtime +7 -delete
log "Cache do sistema limpo"

# Limpar arquivos de swap antigos
find /var/lib/systemd/coredump -name "*.core" -mtime +7 -delete
log "Arquivos de core dump removidos"

# Limpar histórico de comandos antigos
find /home -name ".bash_history" -mtime +30 -exec truncate -s 0 {} \;
log "Histórico de comandos limpo"

log "Limpeza de sistema finalizada"
EOF

sudo chmod +x /usr/local/bin/cleanup-system.sh

# Agendar limpeza diária às 3:00
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/cleanup-system.sh") | crontab -

log "Limpeza automática configurada"

# 9. Configurar backup do sistema
log "Configurando backup do sistema..."

# Criar script de backup
sudo tee /usr/local/bin/backup-system.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Backup do Sistema
# Faz backup de configurações importantes

BACKUP_DIR="/var/backups/system"
DATE=\$(date +%Y%m%d_%H%M%S)

# Criar diretório de backup
mkdir -p \$BACKUP_DIR

# Backup das configurações do sistema
tar -czf \$BACKUP_DIR/system-config_\$DATE.tar.gz /etc/nginx /etc/pm2 /etc/cron.d /etc/logrotate.d /etc/sysctl.conf /etc/security/limits.conf

# Backup das configurações do PostgreSQL
sudo -u postgres pg_dumpall > \$BACKUP_DIR/postgresql-backup_\$DATE.sql

# Limpar backups antigos (mais de 30 dias)
find \$BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find \$BACKUP_DIR -name "*.sql" -mtime +30 -delete

echo "\$(date '+%Y-%m-%d %H:%M:%S') - Backup do sistema concluído"
EOF

sudo chmod +x /usr/local/bin/backup-system.sh

# Agendar backup semanal aos domingos às 2:00
(crontab -l 2>/dev/null; echo "0 2 * * 0 /usr/local/bin/backup-system.sh") | crontab -

log "Backup do sistema configurado"

# 10. Configurar alertas de sistema
log "Configurando alertas de sistema..."

# Criar script de alertas
sudo tee /usr/local/bin/system-alerts.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Alertas de Sistema
# Envia alertas quando há problemas críticos

LOG_FILE="/var/log/sispat/system-alerts.log"

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

# Verificar espaço em disco
DISK_USAGE=\$(df -h / | tail -1 | awk '{print \$5}' | sed 's/%//')
if [ \$DISK_USAGE -gt 90 ]; then
    log "🚨 ALERTA CRÍTICO: Espaço em disco crítico: \$DISK_USAGE%"
elif [ \$DISK_USAGE -gt 80 ]; then
    log "⚠️ ALERTA: Espaço em disco baixo: \$DISK_USAGE%"
fi

# Verificar memória
MEMORY_USAGE=\$(free | grep Mem | awk '{printf "%.0f", \$3/\$2 * 100.0}')
if [ \$MEMORY_USAGE -gt 90 ]; then
    log "🚨 ALERTA CRÍTICO: Uso de memória crítico: \$MEMORY_USAGE%"
elif [ \$MEMORY_USAGE -gt 80 ]; then
    log "⚠️ ALERTA: Uso de memória alto: \$MEMORY_USAGE%"
fi

# Verificar CPU
CPU_USAGE=\$(top -bn1 | grep "Cpu(s)" | awk '{print \$2}' | awk -F'%' '{print \$1}')
if [ \$(echo "\$CPU_USAGE > 90" | bc -l) -eq 1 ]; then
    log "🚨 ALERTA CRÍTICO: Uso de CPU crítico: \$CPU_USAGE%"
elif [ \$(echo "\$CPU_USAGE > 80" | bc -l) -eq 1 ]; then
    log "⚠️ ALERTA: Uso de CPU alto: \$CPU_USAGE%"
fi

# Verificar swap
SWAP_USAGE=\$(free | grep Swap | awk '{printf "%.0f", \$3/\$2 * 100.0}')
if [ \$SWAP_USAGE -gt 80 ]; then
    log "🚨 ALERTA CRÍTICO: Uso de swap crítico: \$SWAP_USAGE%"
elif [ \$SWAP_USAGE -gt 50 ]; then
    log "⚠️ ALERTA: Uso de swap alto: \$SWAP_USAGE%"
fi

# Verificar carga do sistema
LOAD_AVG=\$(uptime | awk -F'load average:' '{print \$2}' | awk '{print \$1}' | sed 's/,//')
if [ \$(echo "\$LOAD_AVG > 8" | bc -l) -eq 1 ]; then
    log "🚨 ALERTA CRÍTICO: Carga do sistema crítica: \$LOAD_AVG"
elif [ \$(echo "\$LOAD_AVG > 4" | bc -l) -eq 1 ]; then
    log "⚠️ ALERTA: Carga do sistema alta: \$LOAD_AVG"
fi

log "Verificação de alertas finalizada"
EOF

sudo chmod +x /usr/local/bin/system-alerts.sh

# Agendar verificação de alertas a cada 15 minutos
(crontab -l 2>/dev/null; echo "*/15 * * * * /usr/local/bin/system-alerts.sh") | crontab -

log "Alertas de sistema configurados"

# 11. Aplicar configurações
log "Aplicando configurações..."

# Recarregar systemd
sudo systemctl daemon-reload

# Aplicar limites
sudo systemctl restart systemd-logind

# Reiniciar serviços
sudo systemctl restart nginx
sudo systemctl restart postgresql

log "Configurações aplicadas"

# 12. Verificar otimizações
log "Verificando otimizações..."

# Verificar limites de arquivos
CURRENT_LIMIT=$(ulimit -n)
log "Limite de arquivos: $CURRENT_LIMIT"

# Verificar swap
SWAP_SIZE=$(free -h | grep Swap | awk '{print $2}')
log "Tamanho do swap: $SWAP_SIZE"

# Verificar parâmetros do kernel
TCP_CONGESTION=$(sysctl net.ipv4.tcp_congestion_control | awk '{print $3}')
log "Controle de congestionamento TCP: $TCP_CONGESTION"

# Verificar PostgreSQL
PG_VERSION=$(sudo -u postgres psql -c "SELECT version();" | head -1)
log "Versão do PostgreSQL: $PG_VERSION"

log "🎉 Otimização do sistema concluída com sucesso!"
log "📋 Configurações aplicadas:"
log "   • Limites de sistema otimizados"
log "   • Parâmetros do kernel otimizados"
log "   • PostgreSQL otimizado"
log "   • Swap configurado"
log "   • Cron otimizado"
log "   • Logrotate configurado"
log "   • Monitoramento de sistema configurado"
log "   • Limpeza automática configurada"
log "   • Backup do sistema configurado"
log "   • Alertas de sistema configurados"
log ""
log "🔧 Comandos úteis:"
log "   • Ver limites: ulimit -a"
log "   • Ver parâmetros: sysctl -a"
log "   • Ver swap: free -h"
log "   • Ver logs: tail -f /var/log/sispat/*.log"
log "   • Monitorar sistema: htop"
log "   • Monitorar I/O: iotop"
log "   • Monitorar rede: nethogs"
log ""
log "📊 Monitoramento:"
log "   • Sistema: a cada 5 minutos"
log "   • Alertas: a cada 15 minutos"
log "   • Limpeza: diária às 3:00"
log "   • Backup: semanal aos domingos às 2:00"
