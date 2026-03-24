// Axios API client with JWT interceptor
import axios from 'axios'
import { useUserStore } from '../stores/user'

export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
}

const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor: attach JWT token from Pinia store (single source of truth)
client.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    const token = userStore.token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401 by logging out, 403 as unauthorized
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const userStore = useUserStore()
      userStore.logout()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    if (error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        window.location.href = '/403'
      }
    }
    return Promise.reject(error)
  }
)

export default client
