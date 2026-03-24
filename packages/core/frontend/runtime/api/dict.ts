// Dict API
import client, { ApiResponse } from './client'

export interface DictItem {
  label: string
  value: string
  sort?: number
  enabled?: boolean
}

export interface Dict {
  id: string
  name: string
  code: string
  type: 'system' | 'dict'
  value: string | null
  items: DictItem[]
  sort: number
  description: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export async function getDicts(type?: string): Promise<ApiResponse<Dict[]>> {
  const params = type ? { type } : {}
  const res = await client.get<ApiResponse<Dict[]>>('/dict', { params })
  return res.data
}

export async function getDict(id: string): Promise<ApiResponse<Dict>> {
  const res = await client.get<ApiResponse<Dict>>(`/dict/${id}`)
  return res.data
}

export async function getDictItems(code: string): Promise<ApiResponse<DictItem[]>> {
  const res = await client.get<ApiResponse<DictItem[]>>(`/dict/items/${code}`)
  return res.data
}

export async function createDict(data: Partial<Dict>): Promise<ApiResponse<Dict>> {
  const res = await client.post<ApiResponse<Dict>>('/dict', data)
  return res.data
}

export async function updateDict(id: string, data: Partial<Dict>): Promise<ApiResponse<Dict>> {
  const res = await client.put<ApiResponse<Dict>>(`/dict/${id}`, data)
  return res.data
}

export async function deleteDict(id: string): Promise<ApiResponse<void>> {
  const res = await client.delete<ApiResponse<void>>(`/dict/${id}`)
  return res.data
}
