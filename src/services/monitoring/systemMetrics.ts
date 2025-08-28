import * as os from 'os';
import { recordCustomMetric, SystemMetrics } from './performanceMetrics';

// Interface para estatísticas de CPU
interface CPUStats {
  user: number;
  nice: number;
  sys: number;
  idle: number;
  irq: number;
}

// Classe para monitoramento do sistema
export class SystemMonitor {
  private previousCPUStats: CPUStats[] = [];
  private startTime: number = Date.now();

  constructor() {
    this.initializeCPUStats();
    this.startMonitoring();
  }

  // Inicializar estatísticas de CPU
  private initializeCPUStats(): void {
    this.previousCPUStats = os.cpus().map(cpu => ({
      user: cpu.times.user,
      nice: cpu.times.nice,
      sys: cpu.times.sys,
      idle: cpu.times.idle,
      irq: cpu.times.irq,
    }));
  }

  // Calcular uso de CPU
  private calculateCPUUsage(): number {
    const currentStats = os.cpus().map(cpu => ({
      user: cpu.times.user,
      nice: cpu.times.nice,
      sys: cpu.times.sys,
      idle: cpu.times.idle,
      irq: cpu.times.irq,
    }));

    let totalUsage = 0;
    const cpuCount = currentStats.length;

    for (let i = 0; i < cpuCount; i++) {
      const current = currentStats[i];
      const previous = this.previousCPUStats[i];

      const currentTotal =
        current.user + current.nice + current.sys + current.idle + current.irq;
      const previousTotal =
        previous.user +
        previous.nice +
        previous.sys +
        previous.idle +
        previous.irq;

      const totalDiff = currentTotal - previousTotal;
      const idleDiff = current.idle - previous.idle;

      const usage =
        totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0;
      totalUsage += usage;
    }

    this.previousCPUStats = currentStats;
    return totalUsage / cpuCount;
  }

  // Obter informações de memória
  private getMemoryInfo(): {
    usage: number;
    total: number;
    free: number;
    percentage: number;
  } {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const percentage = (usedMemory / totalMemory) * 100;

    return {
      usage: usedMemory,
      total: totalMemory,
      free: freeMemory,
      percentage,
    };
  }

  // Obter informações de load average (Unix/Linux apenas)
  private getLoadAverage(): { load1: number; load5: number; load15: number } {
    const loadAvg = os.loadavg();
    return {
      load1: loadAvg[0],
      load5: loadAvg[1],
      load15: loadAvg[2],
    };
  }

  // Obter informações de rede (simulado - em produção seria melhor usar bibliotecas específicas)
  private getNetworkStats(): { bytesReceived: number; bytesSent: number } {
    // Em um ambiente real, você usaria bibliotecas como 'node-os-utils' ou 'systeminformation'
    // Por agora, retornamos valores simulados
    return {
      bytesReceived: Math.random() * 1000000,
      bytesSent: Math.random() * 1000000,
    };
  }

  // Obter uptime do processo
  private getUptime(): number {
    return (Date.now() - this.startTime) / 1000;
  }

  // Coletar todas as métricas do sistema
  public async collectSystemMetrics(): Promise<SystemMetrics> {
    const cpuUsage = this.calculateCPUUsage();
    const memory = this.getMemoryInfo();
    const load = this.getLoadAverage();
    const network = this.getNetworkStats();
    const uptime = this.getUptime();

    // Registrar métricas individuais
    recordCustomMetric('system_cpu_usage', cpuUsage);
    recordCustomMetric('system_memory_usage', memory.usage);
    recordCustomMetric('system_memory_percentage', memory.percentage);
    recordCustomMetric('system_load_1m', load.load1);
    recordCustomMetric('system_load_5m', load.load5);
    recordCustomMetric('system_load_15m', load.load15);
    recordCustomMetric('system_network_received', network.bytesReceived);
    recordCustomMetric('system_network_sent', network.bytesSent);
    recordCustomMetric('system_uptime', uptime);

    return {
      cpuUsage,
      memoryUsage: memory.usage,
      memoryTotal: memory.total,
      diskUsage: 0, // Implementar se necessário
      uptime,
    };
  }

  // Obter informações detalhadas do sistema
  public getSystemInfo(): {
    platform: string;
    architecture: string;
    hostname: string;
    cpuCount: number;
    totalMemory: number;
    nodeVersion: string;
  } {
    return {
      platform: os.platform(),
      architecture: os.arch(),
      hostname: os.hostname(),
      cpuCount: os.cpus().length,
      totalMemory: os.totalmem(),
      nodeVersion: process.version,
    };
  }

  // Iniciar monitoramento automático
  private startMonitoring(): void {
    // Coletar métricas a cada 30 segundos
    setInterval(async () => {
      try {
        await this.collectSystemMetrics();
      } catch (error) {
        console.error('Erro ao coletar métricas do sistema:', error);
        recordCustomMetric('system_monitoring_error', 1, {
          error: (error as Error).message,
        });
      }
    }, 30000);
  }

  // Verificar alertas do sistema
  public checkSystemAlerts(): Array<{
    type: 'warning' | 'critical';
    metric: string;
    value: number;
    threshold: number;
    message: string;
  }> {
    const alerts: Array<{
      type: 'warning' | 'critical';
      metric: string;
      value: number;
      threshold: number;
      message: string;
    }> = [];

    const cpuUsage = this.calculateCPUUsage();
    const memory = this.getMemoryInfo();

    // Alertas de CPU
    if (cpuUsage > 90) {
      alerts.push({
        type: 'critical',
        metric: 'cpu_usage',
        value: cpuUsage,
        threshold: 90,
        message: `Uso de CPU crítico: ${cpuUsage.toFixed(2)}%`,
      });
    } else if (cpuUsage > 75) {
      alerts.push({
        type: 'warning',
        metric: 'cpu_usage',
        value: cpuUsage,
        threshold: 75,
        message: `Uso de CPU alto: ${cpuUsage.toFixed(2)}%`,
      });
    }

    // Alertas de memória
    if (memory.percentage > 95) {
      alerts.push({
        type: 'critical',
        metric: 'memory_usage',
        value: memory.percentage,
        threshold: 95,
        message: `Uso de memória crítico: ${memory.percentage.toFixed(2)}%`,
      });
    } else if (memory.percentage > 80) {
      alerts.push({
        type: 'warning',
        metric: 'memory_usage',
        value: memory.percentage,
        threshold: 80,
        message: `Uso de memória alto: ${memory.percentage.toFixed(2)}%`,
      });
    }

    // Registrar alertas como métricas
    alerts.forEach(alert => {
      recordCustomMetric('system_alert', 1, {
        type: alert.type,
        metric: alert.metric,
        value: alert.value.toString(),
        threshold: alert.threshold.toString(),
      });
    });

    return alerts;
  }
}

// Instância global do monitor de sistema
export const systemMonitor = new SystemMonitor();

// Função para obter métricas do sistema de forma simples
export async function getSystemMetrics(): Promise<SystemMetrics> {
  return systemMonitor.collectSystemMetrics();
}

// Função para obter informações do sistema
export function getSystemInfo() {
  return systemMonitor.getSystemInfo();
}

// Função para verificar alertas
export function checkAlerts() {
  return systemMonitor.checkSystemAlerts();
}
