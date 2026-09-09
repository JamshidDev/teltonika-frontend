import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'

export interface AppUser {
  id: number
  name: string
  email: string
  roleId: number
  roleName: string
  createdAt: string
}

export interface UserMeta {
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface CreateUserDto {
  name: string
  email: string
  password: string
  roleId: number
}

export interface UpdateUserDto {
  name?: string
  email?: string
  password?: string
  roleId?: number
}

export const useUsersStore = defineStore('users', () => {
  const users = ref<AppUser[]>([])
  const meta = ref<UserMeta>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  })
  const loading = ref(false)
  const error = ref<string | null>(null)

  const currentPage = computed(() => meta.value.page)
  const totalPages = computed(() => meta.value.totalPages)
  const totalUsers = computed(() => meta.value.total)

  async function fetchUsers(page = meta.value.page, pageSize = meta.value.pageSize) {
    loading.value = true
    error.value = null

    try {
      const response = await api.get('/user', { params: { page, pageSize } })
      users.value = response.data.data
      meta.value = response.data.meta
    } catch (err) {
      error.value = 'Failed to fetch users'
      console.error('Error fetching users:', err)
    } finally {
      loading.value = false
    }
  }

  async function createUser(dto: CreateUserDto): Promise<boolean> {
    try {
      await api.post('/user', dto)
      await fetchUsers()
      return true
    } catch {
      return false
    }
  }

  async function updateUser(id: number, dto: UpdateUserDto): Promise<boolean> {
    try {
      await api.put(`/user/${id}`, dto)
      await fetchUsers()
      return true
    } catch {
      return false
    }
  }

  async function deleteUser(id: number): Promise<boolean> {
    try {
      await api.delete(`/user/${id}`)
      await fetchUsers()
      return true
    } catch {
      return false
    }
  }

  function setPageSize(size: number) {
    meta.value.pageSize = size
    return fetchUsers(1, size)
  }

  return {
    users,
    meta,
    loading,
    error,
    currentPage,
    totalPages,
    totalUsers,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    setPageSize,
  }
})
