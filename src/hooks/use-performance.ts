import { useCallback, useMemo, useRef, useEffect } from 'react'

/**
 * Hook para memoização de objetos complexos
 * Evita recriação desnecessária de objetos
 */
export function useStableObject<T extends Record<string, any>>(obj: T): T {
  return useMemo(() => obj, [JSON.stringify(obj)])
}

/**
 * Hook para memoização de arrays
 * Útil para listas que são filtradas/ordenadas frequentemente
 */
export function useStableArray<T>(array: T[], dependencies: React.DependencyList = []): T[] {
  return useMemo(() => array, [JSON.stringify(array), ...dependencies])
}

/**
 * Hook para evitar re-renders desnecessários
 * Compara valores profundamente
 */
export function useDeepMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const ref = useRef<{ deps: React.DependencyList; value: T }>()
  
  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() }
  }
  
  return ref.current.value
}

/**
 * Hook para callback estável
 * Evita re-criação de funções a cada render
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback)
  
  useEffect(() => {
    callbackRef.current = callback
  })
  
  return useCallback(((...args: Parameters<T>) => {
    return callbackRef.current(...args)
  }) as T, [])
}

/**
 * Hook para otimização de listas grandes
 * Calcula apenas os itens visíveis
 */
export function useVisibleItems<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  scrollTop: number
) {
  return useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    )
    
    return {
      visibleItems: items.slice(startIndex, endIndex),
      startIndex,
      endIndex,
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
    }
  }, [items, containerHeight, itemHeight, scrollTop])
}

/**
 * Hook para otimização de filtros
 * Combina múltiplos filtros de forma eficiente
 */
export function useOptimizedFilter<T>(
  items: T[],
  filters: Array<(item: T) => boolean>,
  searchTerm: string = '',
  searchFields: Array<keyof T> = []
) {
  return useMemo(() => {
    if (!items.length) return []
    
    let filtered = items
    
    // Aplicar filtros
    for (const filter of filters) {
      filtered = filtered.filter(filter)
    }
    
    // Aplicar busca
    if (searchTerm && searchFields.length > 0) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(item =>
        searchFields.some(field => {
          const value = item[field]
          return value && String(value).toLowerCase().includes(term)
        })
      )
    }
    
    return filtered
  }, [items, filters, searchTerm, searchFields])
}

/**
 * Função auxiliar para comparação profunda
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((val, index) => deepEqual(val, b[index]))
  }
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    
    if (keysA.length !== keysB.length) return false
    
    return keysA.every(key => deepEqual(a[key], b[key]))
  }
  
  return false
}
