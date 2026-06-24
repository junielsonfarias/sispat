/**
 * Helpers de normalização de resposta para call sites do api client.
 *
 * Endpoints de lista do SISPAT às vezes devolvem `{ chave: T[] }`, às vezes
 * `T[]` cru. Normaliza para `T[]` e tipa o retorno — o api client é genérico,
 * mas estes call sites não passavam <T> e caíam em `unknown`.
 */
export function unwrapList<T = unknown>(response: unknown, key: string): T[] {
  if (Array.isArray(response)) return response as T[]
  const val = (response as Record<string, unknown> | null | undefined)?.[key]
  return Array.isArray(val) ? (val as T[]) : []
}

/**
 * Normaliza um objeto único: `{ chave: T }` ou `T` cru. Retorna `T` (cast).
 */
export function unwrapItem<T>(response: unknown, key: string): T {
  const obj = response as Record<string, unknown> | null | undefined
  return (obj?.[key] ?? response) as T
}
