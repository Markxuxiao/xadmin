// Axios API client with JWT interceptor
import axios from 'axios'

const STORAGE_KEY_TOKEN = 'xadmin_token'

export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
}

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TOKEN)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.accessToken ?? null
  } catch {
    return null
  }
}

const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor: attach JWT token
client.interceptors.request.use(
  (config) => {
    const token = getStoredToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401 by clearing token
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEY_TOKEN)
      // Optionally redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client
