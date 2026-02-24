import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import router from '@/router'
import { toast } from 'vue-sonner'

// Base API URL from environment
const BASE_URL = import.meta.env.VITE_API_URL

// Create axios instance with base configuration
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Request interceptor - attach Bearer token to all requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token')

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// API error response type
interface ApiErrorResponse {
  success: boolean
  errors?: string[]
  error?: {
    code: number
    message: string
  }
}

// Response interceptor - handle errors and 401 unauthorized
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError<ApiErrorResponse>) => {
    const data = error.response?.data

    // Extract error message
    const errorMessage = data?.errors?.[0] || data?.error?.message || error.message || 'Xatolik yuz berdi'
    toast.error(errorMessage)

    // Only redirect to login on 401 if not already on login page
    if (error.response?.status === 401) {
      const currentRoute = router.currentRoute.value

      // Don't redirect if already on login page
      if (currentRoute.name !== 'login') {
        // Clear token and redirect to login
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')

        router.push({ name: 'login' })
      }
    }

    return Promise.reject(error)
  }
)

export default api
