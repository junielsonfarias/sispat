import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Hook para debounce de valores
 * Útil para otimizar pesquisas e filtros
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook para debounce de funções
 * Evita múltiplas chamadas de API em pouco tempo
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const callbackRef = useRef(callback)

  // Atualiza a referência do callback quando ele muda
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Limpa o timeout quando as dependências mudam
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, deps)

  const debouncedCallback = useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    }) as T,
    [delay]
  )

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

/**
 * Hook para throttling de funções
 * Útil para scroll events e resize
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const lastRun = useRef<number>(0)
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const throttledCallback = useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now()
      
      if (now - lastRun.current >= delay) {
        lastRun.current = now
        callbackRef.current(...args)
      }
    }) as T,
    [delay, ...deps]
  )

  return throttledCallback
}