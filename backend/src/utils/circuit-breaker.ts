import { captureMessage } from '../config/sentry'
import { logInfo, logWarn } from '../config/logger'

/**
 * Estados do Circuit Breaker
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Funcionando normalmente
  OPEN = 'OPEN',         // Falhas demais, bloqueando requests
  HALF_OPEN = 'HALF_OPEN' // Tentando se recuperar
}

/**
 * Configurações do Circuit Breaker
 */
export interface CircuitBreakerOptions {
  failureThreshold: number    // Número de falhas para abrir (padrão: 5)
  successThreshold: number    // Sucessos para fechar novamente (padrão: 2)
  timeout: number             // Timeout de operação em ms (padrão: 10000)
  resetTimeout: number        // Tempo para tentar HALF_OPEN em ms (padrão: 30000)
}

/**
 * Circuit Breaker Pattern
 * 
 * Protege a aplicação de falhas em cascata quando um serviço está com problemas.
 * 
 * Estados:
 * - CLOSED: Funcionando normalmente
 * - OPEN: Muitas falhas, bloqueando novas tentativas
 * - HALF_OPEN: Permitindo tentativas limitadas para verificar recuperação
 */
export class CircuitBreaker {
  private failures = 0
  private successes = 0
  private state: CircuitState = CircuitState.CLOSED
  private nextAttemptTime = Date.now()
  private lastStateChange = Date.now()
  
  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 10000,
      resetTimeout: 30000,
    }
  ) {
    logInfo(`⚡ Circuit Breaker '${name}' inicializado`, { options })
  }
  
  /**
   * Executa operação com proteção de circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Verificar estado atual
    if (this.state === CircuitState.OPEN) {
      // Se ainda não passou o tempo de reset, rejeitar imediatamente
      if (Date.now() < this.nextAttemptTime) {
        const waitTime = Math.ceil((this.nextAttemptTime - Date.now()) / 1000)
        throw new Error(
          `Circuit breaker '${this.name}' está OPEN. Tente novamente em ${waitTime}s`
        )
      }
      
      // Tempo de reset passou, mudar para HALF_OPEN
      this.state = CircuitState.HALF_OPEN
      this.successes = 0
      logInfo(`🔄 Circuit breaker '${this.name}' mudou para HALF_OPEN`)
    }
    
    try {
      // Executar operação com timeout
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timeout após ${this.options.timeout}ms`)),
            this.options.timeout
          )
        ),
      ])
      
      // Operação bem-sucedida
      this.onSuccess()
      return result
      
    } catch (error) {
      // Operação falhou
      this.onFailure(error as Error)
      throw error
    }
  }
  
  /**
   * Handler para sucesso
   */
  private onSuccess() {
    this.failures = 0
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++
      
      // Se atingiu threshold de sucessos, fechar circuit
      if (this.successes >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED
        this.lastStateChange = Date.now()
        logInfo(`✅ Circuit breaker '${this.name}' FECHADO (recuperado)`)
        
        captureMessage(
          `Circuit breaker '${this.name}' recuperado e fechado`,
          'info'
        )
      }
    }
  }
  
  /**
   * Handler para falha
   */
  private onFailure(error: Error) {
    this.failures++
    
    const shouldOpen = this.failures >= this.options.failureThreshold
    
    if (this.state === CircuitState.HALF_OPEN || shouldOpen) {
      this.state = CircuitState.OPEN
      this.nextAttemptTime = Date.now() + this.options.resetTimeout
      this.lastStateChange = Date.now()
      
      logWarn(
        `Circuit breaker '${this.name}' ABERTO após ${this.failures} falhas. ` +
        `Reset em ${this.options.resetTimeout}ms`
      )
      
      // Alertar no Sentry
      captureMessage(
        `Circuit breaker '${this.name}' ABERTO - Serviço com problemas`,
        'error'
      )
    }
  }
  
  /**
   * Obter estado atual do circuit
   */
  getState() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttemptTime: this.nextAttemptTime,
      lastStateChange: this.lastStateChange,
    }
  }
  
  /**
   * Resetar circuit manualmente
   */
  reset() {
    this.failures = 0
    this.successes = 0
    this.state = CircuitState.CLOSED
    logInfo(`🔄 Circuit breaker '${this.name}' resetado manualmente`)
  }
}

// Criar circuit breakers para serviços críticos
export const databaseCircuit = new CircuitBreaker('database', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 5000,
  resetTimeout: 30000,
})

export const externalAPICircuit = new CircuitBreaker('external-api', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 10000,
  resetTimeout: 60000,
})

export const fileSystemCircuit = new CircuitBreaker('filesystem', {
  failureThreshold: 4,
  successThreshold: 1,
  timeout: 5000,
  resetTimeout: 20000,
})

