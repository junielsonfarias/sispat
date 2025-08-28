const os = require('os');
const metrics = require('./metrics');

class PerformanceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.uptime = 0;
    this.requestCount = 0;
    this.errorCount = 0;
    this.activeConnections = 0;
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  start() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
    }, 30000); // Atualizar a cada 30 segundos

    console.log('🔍 Monitoramento de performance iniciado');
  }

  stop() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('🔍 Monitoramento de performance parado');
  }

  updateMetrics() {
    try {
      // Métricas do sistema
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      // CPU usage (aproximado)
      const cpus = os.cpus();
      const cpuUsage =
        (cpus.reduce((acc, cpu) => {
          const total = Object.values(cpu.times).reduce((a, b) => a + b);
          const idle = cpu.times.idle;
          return acc + (total - idle) / total;
        }, 0) /
          cpus.length) *
        100;

      // Atualizar métricas
      metrics.setSystemMemoryUsage(usedMemory);
      metrics.setSystemCpuUsage(cpuUsage);

      // Log de métricas
      console.log('📊 Métricas do Sistema:', {
        uptime: this.getUptime(),
        memory: {
          total: this.formatBytes(totalMemory),
          used: this.formatBytes(usedMemory),
          usage: `${memoryUsagePercent.toFixed(2)}%`,
        },
        cpu: `${cpuUsage.toFixed(2)}%`,
        requests: this.requestCount,
        errors: this.errorCount,
        activeConnections: this.activeConnections,
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar métricas:', error);
      metrics.incrementError('metrics_update', 'error');
    }
  }

  incrementRequest() {
    this.requestCount++;
  }

  incrementError() {
    this.errorCount++;
  }

  setActiveConnections(count) {
    this.activeConnections = count;
  }

  getUptime() {
    this.uptime = Date.now() - this.startTime;
    return this.formatUptime(this.uptime);
  }

  getPerformanceStats() {
    const uptime = this.getUptime();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    const cpus = os.cpus();
    const cpuUsage =
      (cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b);
        const idle = cpu.times.idle;
        return acc + (total - idle) / total;
      }, 0) /
        cpus.length) *
      100;

    return {
      uptime,
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        memory: {
          total: this.formatBytes(totalMemory),
          used: this.formatBytes(usedMemory),
          free: this.formatBytes(freeMemory),
          usage: `${memoryUsagePercent.toFixed(2)}%`,
        },
        cpu: {
          cores: cpus.length,
          usage: `${cpuUsage.toFixed(2)}%`,
          model: cpus[0].model,
        },
        loadAverage: os.loadavg(),
      },
      application: {
        requests: this.requestCount,
        errors: this.errorCount,
        activeConnections: this.activeConnections,
        errorRate:
          this.requestCount > 0
            ? ((this.errorCount / this.requestCount) * 100).toFixed(2)
            : 0,
      },
      health: {
        status: this.getHealthStatus(memoryUsagePercent, cpuUsage),
        score: this.calculateHealthScore(memoryUsagePercent, cpuUsage),
      },
    };
  }

  getHealthStatus(memoryUsage, cpuUsage) {
    if (memoryUsage > 90 || cpuUsage > 90) return 'critical';
    if (memoryUsage > 80 || cpuUsage > 80) return 'warning';
    if (memoryUsage > 70 || cpuUsage > 70) return 'degraded';
    return 'healthy';
  }

  calculateHealthScore(memoryUsage, cpuUsage) {
    const memoryScore = Math.max(0, 100 - memoryUsage);
    const cpuScore = Math.max(0, 100 - cpuUsage);
    const errorScore =
      this.requestCount > 0
        ? Math.max(0, 100 - (this.errorCount / this.requestCount) * 100)
        : 100;

    return Math.round((memoryScore + cpuScore + errorScore) / 3);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Middleware para monitorar requisições
  requestMonitorMiddleware(req, res, next) {
    const start = Date.now();

    this.incrementRequest();

    // Monitorar resposta
    res.on('finish', () => {
      const duration = Date.now() - start;

      if (res.statusCode >= 400) {
        this.incrementError();
        metrics.incrementError(
          'http_error',
          res.statusCode >= 500 ? 'critical' : 'warning'
        );
      }

      // Log de requisições lentas
      if (duration > 5000) {
        console.warn(
          `🐌 Requisição lenta: ${req.method} ${req.path} - ${duration}ms`
        );
      }
    });

    next();
  }

  // Middleware para monitorar conexões WebSocket
  websocketMonitorMiddleware(socket, next) {
    this.setActiveConnections(this.activeConnections + 1);

    socket.on('disconnect', () => {
      this.setActiveConnections(Math.max(0, this.activeConnections - 1));
    });

    next();
  }

  // Função para gerar relatório de performance
  generatePerformanceReport() {
    const stats = this.getPerformanceStats();

    return {
      timestamp: new Date().toISOString(),
      ...stats,
      recommendations: this.generateRecommendations(stats),
    };
  }

  generateRecommendations(stats) {
    const recommendations = [];

    if (stats.system.memory.usage > 80) {
      recommendations.push(
        'Considere aumentar a memória do servidor ou otimizar o uso de cache'
      );
    }

    if (stats.system.cpu.usage > 80) {
      recommendations.push(
        'Considere escalar horizontalmente ou otimizar queries do banco de dados'
      );
    }

    if (stats.application.errorRate > 5) {
      recommendations.push(
        'Investigue os erros frequentes e implemente melhor tratamento de exceções'
      );
    }

    if (stats.application.requests > 1000) {
      recommendations.push(
        'Considere implementar rate limiting e cache mais agressivo'
      );
    }

    return recommendations;
  }
}

// Instância singleton
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;
