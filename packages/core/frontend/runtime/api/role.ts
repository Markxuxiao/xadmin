// Role API
import client, { ApiResponse } from './client'

export interface Role {
  id: string
  name: string
  code: string
  description: string | null
  permissions: string[]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export async function getRoles(): Promise<ApiResponse<Role[]>> {
  const res = await client.get<ApiResponse<Role[]>>('/role')
  return res.data
}

export async function getRole(id: string): Promise<ApiResponse<Role>> {
  const res = await client.get<ApiResponse<Role>>(`/role/${id}`)
  return res.data
}

export async function createRole(data: Partial<Role>): Promise<ApiResponse<Role>> {
  const res = await client.post<ApiResponse<Role>>('/role', data)
  return res.data
}

export async function updateRole(id: string, data: Partial<Role>): Promise<ApiResponse<Role>> {
  const res = await client.put<ApiResponse<Role>>(`/role/${id}`, data)
  return res.data
}

export async function deleteRole(id: string): Promise<ApiResponse<void>> {
  const res = await client.delete<ApiResponse<void>>(`/role/${id}`)
  return res.data
}
