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
  // Ilova yuklanganda /auth/me bir marta chaqirilgani belgisi.
  const bootstrapped = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const currentUser = computed(() => user.value)
  const permissions = computed<string[]>(() => user.value?.role?.permissions ?? [])
  const isSuperAdmin = computed(() => user.value?.isSuperAdmin === true)
  const roleName = computed(() => user.value?.role?.name ?? '')

  // Ruxsat tekshiruvi — faqat UI uchun, haqiqiy himoya backendda.
  function can(permission: string): boolean {
    if (isSuperAdmin.value) return true
    return permissions.value.includes(permission)
  }

  function canAny(...list: string[]): boolean {
    return list.some((p) => can(p))
  }

  function persist(u: User): void {
    user.value = u
    localStorage.setItem('user', JSON.stringify(u))
  }

  // Actions
  async function login(credentials: LoginCredentials): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.login(credentials)

      // Store token and user in localStorage
      token.value = response.token
      localStorage.setItem('access_token', response.token)
      persist(response.user)
      bootstrapped.value = true

      router.push({ name: landingRoute() })

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

  // Rol serverda o'zgargan bo'lishi mumkin — yangilanishda qayta o'qiladi.
  async function fetchMe(): Promise<boolean> {
    if (!token.value) return false
    try {
      persist(await authApi.me())
      bootstrapped.value = true
      return true
    } catch {
      return false
    }
  }

  // Foydalanuvchi kira oladigan birinchi sahifa.
  function landingRoute(): string {
    if (can('map:read')) return 'map'
    if (can('history:read')) return 'history'
    if (can('vehicles:read')) return 'vehicles'
    if (can('users:read')) return 'users'
    return 'no-access'
  }

  function logout(): void {
    // Clear state and localStorage
    token.value = null
    user.value = null
    bootstrapped.value = false

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
    bootstrapped,
    // Getters
    isAuthenticated,
    currentUser,
    permissions,
    isSuperAdmin,
    roleName,
    // Actions
    can,
    canAny,
    landingRoute,
    login,
    fetchMe,
    logout,
    clearError,
  }
})
