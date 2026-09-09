import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/axios'
import type { PermissionGroup } from '@/types'

export interface Role {
  id: number
  name: string
  permissions: string[]
  isSystem: boolean
  userCount?: number
}

export const useRolesStore = defineStore('roles', () => {
  const roles = ref<Role[]>([])
  const catalog = ref<PermissionGroup[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchRoles() {
    loading.value = true
    error.value = null

    try {
      const response = await api.get<Role[]>('/role')
      roles.value = response.data
    } catch (err) {
      error.value = 'Failed to fetch roles'
      console.error('Error fetching roles:', err)
    } finally {
      loading.value = false
    }
  }

  // Permission katalogi tizim tomonidan belgilanadi — bir marta o'qiladi.
  async function fetchCatalog() {
    if (catalog.value.length) return
    try {
      const response = await api.get<PermissionGroup[]>('/role/permissions')
      catalog.value = response.data
    } catch (err) {
      console.error('Error fetching permission catalog:', err)
    }
  }

  // Rolning o'zi o'zgarmaydi — faqat ruxsatlar biriktiriladi/uziladi.
  async function updatePermissions(id: number, permissions: string[]): Promise<boolean> {
    loading.value = true
    try {
      await api.put(`/role/${id}/permissions`, { permissions })
      await fetchRoles()
      return true
    } catch {
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    roles,
    catalog,
    loading,
    error,
    fetchRoles,
    fetchCatalog,
    updatePermissions,
  }
})
