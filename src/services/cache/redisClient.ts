import Redis from 'ioredis';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  ttl: {
    default: number;
    short: number;
    medium: number;
    long: number;
  };
  keyPrefix: string;
}

const DEFAULT_CONFIG: CacheConfig = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB ?? '0'),
  ttl: {
    default: 5 * 60, // 5 minutos
    short: 1 * 60,   // 1 minuto
    medium: 15 * 60, // 15 minutos
    long: 60 * 60    // 1 hora
  },
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'sispat:'
};

class RedisClient {
  private client: Redis;
  private config: CacheConfig;
  private isConnected: boolean = false;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      keyPrefix: this.config.keyPrefix,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('🔌 Conectado ao Redis');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      console.log('✅ Redis pronto para uso');
    });

    this.client.on('error', (error) => {
      console.error('❌ Erro no Redis:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('🔌 Conexão com Redis fechada');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Reconectando ao Redis...');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      console.error('Falha ao conectar com Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  // Métodos básicos de cache
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) return null;
      
      const value = await this.client.get(key);
      if (!value) return null;
      
      return JSON.parse(value);
    } catch (error) {
      console.error('Erro ao buscar cache:', error);
      return null;
    }
  }

  async set<T>(
    key: string, 
    value: T, 
    ttl: number = this.config.ttl.default
  ): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      
      const serialized = JSON.stringify(value);
      const result = await this.client.setex(key, ttl, serialized);
      return result === 'OK';
    } catch (error) {
      console.error('Erro ao definir cache:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error('Erro ao deletar cache:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      console.error('Erro ao verificar existência:', error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      if (!this.isConnected) return -1;
      
      return await this.client.ttl(key);
    } catch (error) {
      console.error('Erro ao obter TTL:', error);
      return -1;
    }
  }

  // Métodos avançados
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (!this.isConnected || keys.length === 0) return [];
      
      const values = await this.client.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error('Erro ao buscar múltiplos caches:', error);
      return keys.map(() => null);
    }
  }

  async mset(data: Record<string, any>, ttl: number = this.config.ttl.default): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      
      const pipeline = this.client.pipeline();
      
      Object.entries(data).forEach(([key, value]) => {
        const serialized = JSON.stringify(value);
        pipeline.setex(key, ttl, serialized);
      });
      
      const results = await pipeline.exec();
      return results?.every(([err, result]) => err === null && result === 'OK') || false;
    } catch (error) {
      console.error('Erro ao definir múltiplos caches:', error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.isConnected) return [];
      
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('Erro ao buscar chaves:', error);
      return [];
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    try {
      if (!this.isConnected) return 0;
      
      const keys = await this.keys(pattern);
      if (keys.length === 0) return 0;
      
      return await this.client.del(...keys);
    } catch (error) {
      console.error('Erro ao deletar por padrão:', error);
      return 0;
    }
  }

  // Hash operations para dados estruturados
  async hget(key: string, field: string): Promise<string | null> {
    try {
      if (!this.isConnected) return null;
      
      return await this.client.hget(key, field);
    } catch (error) {
      console.error('Erro ao buscar hash:', error);
      return null;
    }
  }

  async hset(key: string, field: string, value: any, ttl?: number): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      const result = await this.client.hset(key, field, serialized);
      
      if (ttl && result) {
        await this.client.expire(key, ttl);
      }
      
      return result >= 0;
    } catch (error) {
      console.error('Erro ao definir hash:', error);
      return false;
    }
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    try {
      if (!this.isConnected) return null;
      
      const result = await this.client.hgetall(key);
      return Object.keys(result).length > 0 ? result : null;
    } catch (error) {
      console.error('Erro ao buscar todos os campos do hash:', error);
      return null;
    }
  }

  // Métodos de monitoramento
  async info(): Promise<string | null> {
    try {
      if (!this.isConnected) return null;
      
      return await this.client.info();
    } catch (error) {
      console.error('Erro ao obter informações:', error);
      return null;
    }
  }

  async flushdb(): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      
      const result = await this.client.flushdb();
      return result === 'OK';
    } catch (error) {
      console.error('Erro ao limpar banco:', error);
      return false;
    }
  }

  getClient(): Redis {
    return this.client;
  }

  getConfig(): CacheConfig {
    return this.config;
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

// Instância singleton
export const redisClient = new RedisClient();
export default RedisClient;
