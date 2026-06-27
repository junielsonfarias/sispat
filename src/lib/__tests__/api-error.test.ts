import { describe, it, expect } from 'vitest'
import { extractApiError, isConnectionDownError } from '@/lib/api-error'

// Helper para montar um "erro axios" mínimo.
const axiosError = (status: number, data?: unknown) => ({
  response: { status, data },
})

describe('extractApiError', () => {
  it('rede fora (ERR_NETWORK) → status null, kind network', () => {
    const r = extractApiError({ code: 'ERR_NETWORK' })
    expect(r.status).toBeNull()
    expect(r.kind).toBe('network')
    expect(r.message).toMatch(/conex/i)
  })

  it('timeout (ECONNABORTED) → kind network', () => {
    expect(extractApiError({ code: 'ECONNABORTED' }).kind).toBe('network')
  })

  it('timeout pela mensagem → kind network', () => {
    expect(extractApiError({ message: 'timeout of 30000ms exceeded' }).kind).toBe('network')
  })

  it('400 usa a mensagem do backend (error) e kind validation', () => {
    const r = extractApiError(axiosError(400, { error: 'Campo X inválido' }))
    expect(r.status).toBe(400)
    expect(r.kind).toBe('validation')
    expect(r.message).toBe('Campo X inválido')
  })

  it('mapeia status → kind (401 auth, 403 forbidden, 404 notFound, 409 conflict, 429 rateLimit)', () => {
    expect(extractApiError(axiosError(401)).kind).toBe('auth')
    expect(extractApiError(axiosError(403)).kind).toBe('forbidden')
    expect(extractApiError(axiosError(404)).kind).toBe('notFound')
    expect(extractApiError(axiosError(409)).kind).toBe('conflict')
    expect(extractApiError(axiosError(429)).kind).toBe('rateLimit')
  })

  it('5xx → kind server com mensagem padrão quando o backend não manda', () => {
    const r = extractApiError(axiosError(500))
    expect(r.kind).toBe('server')
    expect(r.message).toMatch(/servidor/i)
  })

  it('prefere data.error, depois data.message', () => {
    expect(extractApiError(axiosError(400, { message: 'via message' })).message).toBe('via message')
    expect(extractApiError(axiosError(400, { error: 'via error', message: 'via message' })).message).toBe('via error')
  })

  it('sem response mas com message → status null, kind unknown', () => {
    const r = extractApiError({ message: 'algo quebrou' })
    expect(r.status).toBeNull()
    expect(r.kind).toBe('unknown')
    expect(r.message).toBe('algo quebrou')
  })

  it('preserva o erro original', () => {
    const original = axiosError(404)
    expect(extractApiError(original).original).toBe(original)
  })
})

describe('isConnectionDownError', () => {
  it('true para ERR_NETWORK e ERR_CONNECTION_REFUSED', () => {
    expect(isConnectionDownError({ code: 'ERR_NETWORK' })).toBe(true)
    expect(isConnectionDownError({ code: 'ERR_CONNECTION_REFUSED' })).toBe(true)
  })

  it('false para outros códigos / null / undefined', () => {
    expect(isConnectionDownError({ code: 'ECONNABORTED' })).toBe(false)
    expect(isConnectionDownError(null)).toBe(false)
    expect(isConnectionDownError(undefined)).toBe(false)
    expect(isConnectionDownError(axiosError(500))).toBe(false)
  })
})
