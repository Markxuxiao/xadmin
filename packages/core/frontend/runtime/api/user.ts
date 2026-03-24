// User API
import client, { ApiResponse } from './client'

export interface UserProfile {
  id: string
  username: string
  nickname: string
  permissions: string[]
  roles: string[]
}

export async function getCurrentUser(): Promise<ApiResponse<UserProfile>> {
  const res = await client.get<ApiResponse<UserProfile>>('/user/me')
  return res.data
}
