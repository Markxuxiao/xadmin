// Department API
import client, { ApiResponse } from './client'

export interface Department {
  id: string
  name: string
  code: string
  parentId: string | null
  sort: number
  leader: string | null
  phone: string | null
  email: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
  children?: Department[]
}

export async function getDepartments(): Promise<ApiResponse<Department[]>> {
  const res = await client.get<ApiResponse<Department[]>>('/department')
  return res.data
}

export async function getDepartmentTree(): Promise<ApiResponse<Department[]>> {
  const res = await client.get<ApiResponse<Department[]>>('/department/tree')
  return res.data
}

export async function getDepartment(id: string): Promise<ApiResponse<Department>> {
  const res = await client.get<ApiResponse<Department>>(`/department/${id}`)
  return res.data
}

export async function createDepartment(data: Partial<Department>): Promise<ApiResponse<Department>> {
  const res = await client.post<ApiResponse<Department>>('/department', data)
  return res.data
}

export async function updateDepartment(id: string, data: Partial<Department>): Promise<ApiResponse<Department>> {
  const res = await client.put<ApiResponse<Department>>(`/department/${id}`, data)
  return res.data
}

export async function deleteDepartment(id: string): Promise<ApiResponse<void>> {
  const res = await client.delete<ApiResponse<void>>(`/department/${id}`)
  return res.data
}
