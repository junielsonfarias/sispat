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
    pageSize: String(pageSize),
    ...filters,
  }).toString()

  const data = await api.get<any[]>(`/audit_logs?${queryParams}`)
  return { data, count: data.length } // Mock count
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
  await api.post('/audit_logs', { action, ...details })
}
