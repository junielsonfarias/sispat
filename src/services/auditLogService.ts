import { api } from '@/services/api-adapter'
import { ActivityLogAction } from '@/types'

interface FetchLogsParams {
  page: number
  pageSize: number
  filters: {
    userId?: string
    action?: ActivityLogAction
    startDate?: string
    endDate?: string
  }
}

export const fetchAuditLogs = async ({
  page,
  pageSize,
  filters,
}: FetchLogsParams) => {
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(pageSize), // Backend usa 'limit' em vez de 'pageSize'
    ...filters,
  }).toString()

  const response = await api.get<{
    logs: any[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }>(`/audit-logs?${queryParams}`)
  
  // ✅ CORREÇÃO: Mapear resposta do backend corretamente
  return { 
    data: response.logs || [], 
    count: response.pagination?.total || 0 
  }
}

export const logAction = async (
  action: ActivityLogAction,
  details: {
    details?: string
    table_name?: string
    record_id?: string
    old_value?: unknown
    new_value?: unknown
  },
) => {
  await api.post('/audit-logs', { action, ...details })
}
