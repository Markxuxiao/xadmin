// ScheduledTask API
import client, { ApiResponse } from './client'

export interface ScheduledTask {
  id: string
  name: string
  description: string | null
  cron: string
  handler: string
  enabled: boolean
  lastExecutedAt: string | null
  lastExecutedResult: string | null
  consecutiveFailures: number
  isBuiltin: boolean
  taskParams: any | null
  createdAt: string
  updatedAt: string
}

export interface ScheduledTaskListResult {
  data: ScheduledTask[]
  total: number
  page: number
  pageSize: number
}

export async function getScheduledTasks(params?: {
  enabled?: boolean
  page?: number
  pageSize?: number
}): Promise<ApiResponse<ScheduledTaskListResult>> {
  const res = await client.get('/scheduled-task', { params })
  return res.data
}

export async function getScheduledTask(id: string): Promise<ApiResponse<ScheduledTask>> {
  const res = await client.get<ApiResponse<ScheduledTask>>(`/scheduled-task/${id}`)
  return res.data
}

export async function getScheduledTaskStatus(): Promise<ApiResponse<{ runningTaskCount: number }>> {
  const res = await client.get<ApiResponse<{ runningTaskCount: number }>>('/scheduled-task/status')
  return res.data
}

export async function createScheduledTask(data: {
  name: string
  description?: string
  cron: string
  handler: string
  enabled?: boolean
  taskParams?: any
}): Promise<ApiResponse<ScheduledTask>> {
  const res = await client.post<ApiResponse<ScheduledTask>>('/scheduled-task', data)
  return res.data
}

export async function updateScheduledTask(
  id: string,
  data: Partial<{
    name: string
    description: string
    cron: string
    handler: string
    enabled: boolean
    taskParams: any
  }>,
): Promise<ApiResponse<ScheduledTask>> {
  const res = await client.put<ApiResponse<ScheduledTask>>(`/scheduled-task/${id}`, data)
  return res.data
}

export async function deleteScheduledTask(id: string): Promise<ApiResponse<void>> {
  const res = await client.delete<ApiResponse<void>>(`/scheduled-task/${id}`)
  return res.data
}

export async function enableScheduledTask(id: string): Promise<ApiResponse<ScheduledTask>> {
  const res = await client.post<ApiResponse<ScheduledTask>>(`/scheduled-task/${id}/enable`)
  return res.data
}

export async function disableScheduledTask(id: string): Promise<ApiResponse<ScheduledTask>> {
  const res = await client.post<ApiResponse<ScheduledTask>>(`/scheduled-task/${id}/disable`)
  return res.data
}

export async function triggerScheduledTask(id: string): Promise<ApiResponse<void>> {
  const res = await client.post<ApiResponse<void>>(`/scheduled-task/${id}/trigger`)
  return res.data
}
