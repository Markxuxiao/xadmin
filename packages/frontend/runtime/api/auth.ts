// Auth API
import client, { ApiResponse } from './client'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  expiresAt: number
  user: {
    id: string
    username: string
    nickname: string
    permissions: string[]
    roles: string[]
  }
}

export async function login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  const res = await client.post<ApiResponse<LoginResponse>>('/auth/login', data)
  return res.data
}
