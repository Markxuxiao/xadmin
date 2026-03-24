// AuditLog API
import client, { ApiResponse } from './client'

export interface AuditLog {
  id: string
  action: string
  entity: string
  entityId: string | null
  operatorId: string
  operatorName: string
  path: string
  method: string
  requestBody: any | null
  statusCode: number
  responseBody: string | null
  ip: string | null
  userAgent: string | null
  error: string | null
  description: string | null
  createdAt: string
}

export async function getAuditLogs(params: {
  action?: string
  entity?: string
  operatorId?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}): Promise<ApiResponse<{ data: AuditLog[]; total: number; page: number; pageSize: number }>> {
  const res = await client.get('/audit-log', { params })
  return res.data
}

export async function getAuditLog(id: string): Promise<ApiResponse<AuditLog>> {
  const res = await client.get<ApiResponse<AuditLog>>(`/audit-log/${id}`)
  return res.data
}

export async function deleteAuditLog(id: string): Promise<ApiResponse<void>> {
  const res = await client.delete<ApiResponse<void>>(`/audit-log/${id}`)
  return res.data
}
