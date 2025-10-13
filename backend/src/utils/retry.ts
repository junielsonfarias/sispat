import { captureMessage } from '../config/sentry'

/**
 * Retry operation with exponential backoff
 * 
 * @param operation - Função assíncrona a ser executada
 * @param maxRetries - Número máximo de tentativas (padrão: 3)
 * @param delayMs - Delay inicial em ms (padrão: 1000)
 * @param backoff - Fator de backoff exponencial (padrão: 2)
 * @returns Resultado da operação
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
  backoff = 2
): Promise<T> => {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation()
      
      // Se teve falhas anteriores mas agora funcionou
      if (attempt > 1) {
        console.log(`✅ Operação bem-sucedida na tentativa ${attempt}`)
        captureMessage(
          `Operação recuperada após ${attempt} tentativas`,
          'info'
        )
      }
      
      return result
    } catch (error) {
      lastError = error as Error
      
      // Log da falha
      console.error(`❌ Tentativa ${attempt}/${maxRetries} falhou:`, error)
      
      // Se não é a última tentativa, aguardar e tentar novamente
      if (attempt < maxRetries) {
        const delay = delayMs * Math.pow(backoff, attempt - 1)
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  // Todas as tentativas falharam
  const errorMessage = `Operação falhou após ${maxRetries} tentativas: ${lastError!.message}`
  console.error(`💥 ${errorMessage}`)
  
  // Capturar erro crítico no Sentry
  captureMessage(errorMessage, 'error')
  
  throw new Error(errorMessage)
}

/**
 * Retry específico para conexão de banco de dados
 */
export const retryDatabaseConnection = async <T>(
  operation: () => Promise<T>
): Promise<T> => {
  return retryOperation(
    operation,
    5,      // 5 tentativas
    2000,   // 2 segundos de delay inicial
    2       // Backoff exponencial (2s, 4s, 8s, 16s)
  )
}

/**
 * Retry específico para APIs externas
 */
export const retryExternalAPI = async <T>(
  operation: () => Promise<T>
): Promise<T> => {
  return retryOperation(
    operation,
    3,      // 3 tentativas
    1000,   // 1 segundo
    2       // Backoff exponencial
  )
}

/**
 * Retry específico para operações de arquivo
 */
export const retryFileOperation = async <T>(
  operation: () => Promise<T>
): Promise<T> => {
  return retryOperation(
    operation,
    4,      // 4 tentativas
    500,    // 500ms
    1.5     // Backoff mais suave
  )
}

