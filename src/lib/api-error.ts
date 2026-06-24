/**
 * Helpers para extrair mensagens úteis de erros de API (axios).
 *
 * O backend retorna `{ error: 'mensagem' }` ou `{ message: '...', details?: ... }`
 * — o frontend costumava ignorar isso e mostrar toasts genéricos
 * tipo "Erro ao processar". Esses helpers permitem dar feedback real ao usuário.
 *
 * Exemplo:
 *   try { await api.post(...) }
 *   catch (err) {
 *     const { message, status } = extractApiError(err)
 *     toast({ variant: 'destructive', title: 'Erro', description: message })
 *   }
 */

export interface ParsedApiError {
  /** Mensagem legível para exibir ao usuário (já tratada e em pt-BR quando possível). */
  message: string
  /** Status HTTP. Null se o erro nem chegou ao servidor (network/timeout). */
  status: number | null
  /** Categoria amigável — útil para decidir UX (ex: 401 → redirect login, 400 → focus no campo). */
  kind: 'validation' | 'auth' | 'forbidden' | 'notFound' | 'conflict' | 'rateLimit' | 'server' | 'network' | 'unknown'
  /** Erro original — preserve para logging com Sentry */
  original: unknown
}

const KIND_BY_STATUS: Record<number, ParsedApiError['kind']> = {
  400: 'validation',
  401: 'auth',
  403: 'forbidden',
  404: 'notFound',
  409: 'conflict',
  422: 'validation',
  429: 'rateLimit',
}

/**
 * `true` quando o erro é de conexão recusada / rede fora (backend inacessível),
 * cobrindo exatamente os códigos `ERR_NETWORK` e `ERR_CONNECTION_REFUSED` do axios.
 * Não inclui timeout — use `extractApiError(e).kind === 'network'` se quiser o
 * comportamento mais amplo. Tipa o `catch (e: unknown)` sem espalhar casts pelos
 * contexts (vários faziam `e?.code === ...` em variável `unknown`).
 */
export const isConnectionDownError = (error: unknown): boolean => {
  const code = (error as { code?: string } | null | undefined)?.code
  return code === 'ERR_NETWORK' || code === 'ERR_CONNECTION_REFUSED'
}

export const extractApiError = (error: unknown): ParsedApiError => {
  // Network / timeout / sem resposta
  const err = error as {
    code?: string
    message?: string
    response?: {
      status?: number
      data?: { error?: string; message?: string; details?: unknown }
    }
  }

  if (err?.code === 'ERR_NETWORK' || err?.code === 'ERR_CONNECTION_REFUSED') {
    return {
      message: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
      status: null,
      kind: 'network',
      original: error,
    }
  }
  if (err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message ?? '')) {
    return {
      message: 'A operação demorou demais. Tente novamente.',
      status: null,
      kind: 'network',
      original: error,
    }
  }

  const status = err?.response?.status ?? null
  const data = err?.response?.data ?? {}
  const backendMsg = data.error || data.message

  if (status === null) {
    return {
      message: err?.message || 'Erro desconhecido.',
      status: null,
      kind: 'unknown',
      original: error,
    }
  }

  const kind = KIND_BY_STATUS[status] ?? (status >= 500 ? 'server' : 'unknown')

  const defaultByKind: Record<ParsedApiError['kind'], string> = {
    validation: 'Dados inválidos. Verifique o formulário e tente de novo.',
    auth: 'Sessão expirada. Faça login novamente.',
    forbidden: 'Você não tem permissão para esta ação.',
    notFound: 'Recurso não encontrado.',
    conflict: 'Conflito com dados existentes (verifique duplicidades).',
    rateLimit: 'Muitas requisições. Aguarde alguns segundos e tente de novo.',
    server: 'Erro interno do servidor. Se persistir, contate o suporte.',
    network: 'Sem conexão com o servidor.',
    unknown: 'Não foi possível completar a operação.',
  }

  return {
    message: backendMsg || defaultByKind[kind],
    status,
    kind,
    original: error,
  }
}
