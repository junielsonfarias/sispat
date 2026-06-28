import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReactNode } from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'
import { AcquisitionFormProvider, useAcquisitionForms } from '@/contexts/AcquisitionFormContext'

vi.mock('@/services/api-adapter', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'admin', municipalityId: 'mun-A' } }),
}))
vi.mock('@/contexts/ActivityLogContext', () => ({
  useActivityLog: () => ({ logActivity: vi.fn() }),
}))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))

const mockApi = api as unknown as Record<'get' | 'post' | 'put' | 'delete' | 'patch', ReturnType<typeof vi.fn>>

const formasFixture = [
  { id: 'f1', nome: 'Compra', ativo: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: 'f2', nome: 'Doação', ativo: false, createdAt: '2025-01-02T00:00:00.000Z', updatedAt: '2025-01-02T00:00:00.000Z' },
]

const makeWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnMount: false, refetchOnWindowFocus: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <AcquisitionFormProvider>{children}</AcquisitionFormProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.get.mockResolvedValue(formasFixture)
})

describe('AcquisitionFormContext (React Query)', () => {
  it('carrega formas, converte datas e deriva activeAcquisitionForms', async () => {
    const { result } = renderHook(() => useAcquisitionForms(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.acquisitionForms).toHaveLength(2))
    // Datas viram Date
    expect(result.current.acquisitionForms[0].createdAt).toBeInstanceOf(Date)
    // activeAcquisitionForms = só os ativos
    expect(result.current.activeAcquisitionForms).toHaveLength(1)
    expect(result.current.activeAcquisitionForms[0].id).toBe('f1')
  })

  it('addAcquisitionForm posta, invalida e retorna form com datas', async () => {
    mockApi.post.mockResolvedValue({ id: 'f3', nome: 'Permuta', ativo: true, createdAt: '2025-02-01T00:00:00.000Z', updatedAt: '2025-02-01T00:00:00.000Z' })
    const { result } = renderHook(() => useAcquisitionForms(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.acquisitionForms).toHaveLength(2))

    let created: { id: string; createdAt: Date } | undefined
    await act(async () => {
      created = await result.current.addAcquisitionForm({ nome: 'Permuta', ativo: true })
    })

    expect(mockApi.post).toHaveBeenCalledWith('/formas-aquisicao', expect.objectContaining({ nome: 'Permuta' }))
    expect(created?.id).toBe('f3')
    expect(created?.createdAt).toBeInstanceOf(Date)
    await waitFor(() => expect(mockApi.get.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('toggleAcquisitionFormStatus usa PUT com ativo invertido e retorna true', async () => {
    mockApi.put.mockResolvedValue({ id: 'f2', nome: 'Doação', ativo: true, createdAt: '2025-01-02T00:00:00.000Z', updatedAt: '2025-01-02T00:00:00.000Z' })
    const { result } = renderHook(() => useAcquisitionForms(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.acquisitionForms).toHaveLength(2))

    let ok = false
    await act(async () => {
      ok = await result.current.toggleAcquisitionFormStatus('f2', false)
    })

    // currentStatus=false → envia ativo:true via PUT (rota /toggle-status não existe)
    expect(mockApi.put).toHaveBeenCalledWith('/formas-aquisicao/f2', { ativo: true })
    expect(ok).toBe(true)
  })

  it('addAcquisitionForm retorna undefined em erro', async () => {
    mockApi.post.mockRejectedValue({ response: { status: 400, data: { error: 'duplicado' } } })
    const { result } = renderHook(() => useAcquisitionForms(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.acquisitionForms).toHaveLength(2))

    let created: unknown = 'sentinel'
    await act(async () => {
      created = await result.current.addAcquisitionForm({ nome: 'X', ativo: true })
    })
    expect(created).toBeUndefined()
  })
})
