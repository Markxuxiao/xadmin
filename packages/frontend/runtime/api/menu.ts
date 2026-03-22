// Menu API
import client, { ApiResponse } from './client'
import type { MenuItem } from '../types'

export async function getMenuTree(): Promise<ApiResponse<MenuItem[]>> {
  const res = await client.get<ApiResponse<MenuItem[]>>('/menu/tree')
  return res.data
}
