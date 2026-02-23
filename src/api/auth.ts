import api from './axios'
import type { LoginCredentials, AuthResponse } from '@/types'

// Authentication API endpoints
export const authApi = {
  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials)
    return response.data
  },

  // Logout user (local only)
  async logout(): Promise<void> {
    // Just clear local storage, no API call needed
  },
}
