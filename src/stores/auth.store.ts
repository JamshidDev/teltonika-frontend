import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import type { User, LoginCredentials } from '@/types'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string | null>(localStorage.getItem('access_token'))
  const user = ref<User | null>(
    localStorage.getItem('user')
      ? JSON.parse(localStorage.getItem('user')!)
      : null
  )
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const currentUser = computed(() => user.value)

  // Actions
  async function login(credentials: LoginCredentials): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.login(credentials)

      // Store token and user in localStorage
      token.value = response.token
      user.value = response.user

      localStorage.setItem('access_token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))

      // Redirect to dashboard
      router.push({ name: 'dashboard' })

      return true
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Login xatosi'
      error.value = errorMessage
      return false
    } finally {
      loading.value = false
    }
  }

  function logout(): void {
    // Clear state and localStorage
    token.value = null
    user.value = null

    localStorage.removeItem('access_token')
    localStorage.removeItem('user')

    // Redirect to login
    router.push({ name: 'login' })
  }

  function clearError(): void {
    error.value = null
  }

  return {
    // State
    token,
    user,
    loading,
    error,
    // Getters
    isAuthenticated,
    currentUser,
    // Actions
    login,
    logout,
    clearError,
  }
})
