import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'

export interface Driver {
  id: number
  fullName: string
  phone: string
  licenseNumber: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface DriverMeta {
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface CreateDriverDto {
  fullName: string
  phone: string
  licenseNumber: string
}

export interface UpdateDriverDto {
  fullName?: string
  phone?: string
  licenseNumber?: string
}

export const useDriversStore = defineStore('drivers', () => {
  const drivers = ref<Driver[]>([])
  const meta = ref<DriverMeta>({
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
  const totalDrivers = computed(() => meta.value.total)

  async function fetchDrivers(page = 1, pageSize = 10) {
    loading.value = true
    error.value = null

    try {
      const response = await api.get('/driver', {
        params: { page, pageSize },
      })

      drivers.value = response.data.data
      meta.value = response.data.meta
    } catch (err) {
      error.value = 'Failed to fetch drivers'
      console.error('Error fetching drivers:', err)
    } finally {
      loading.value = false
    }
  }

  async function createDriver(data: CreateDriverDto) {
    loading.value = true
    error.value = null

    try {
      await api.post('/driver', data)
      await fetchDrivers(meta.value.page, meta.value.pageSize)
      return true
    } catch (err) {
      error.value = 'Failed to create driver'
      console.error('Error creating driver:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function updateDriver(id: number, data: UpdateDriverDto) {
    loading.value = true
    error.value = null

    try {
      await api.put(`/driver/${id}`, data)
      await fetchDrivers(meta.value.page, meta.value.pageSize)
      return true
    } catch (err) {
      error.value = 'Failed to update driver'
      console.error('Error updating driver:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteDriver(id: number) {
    loading.value = true
    error.value = null

    try {
      await api.delete(`/driver/${id}`)
      await fetchDrivers(meta.value.page, meta.value.pageSize)
      return true
    } catch (err) {
      error.value = 'Failed to delete driver'
      console.error('Error deleting driver:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  function setPage(page: number) {
    fetchDrivers(page, meta.value.pageSize)
  }

  function setPageSize(pageSize: number) {
    fetchDrivers(1, pageSize)
  }

  return {
    drivers,
    meta,
    loading,
    error,
    currentPage,
    totalPages,
    totalDrivers,
    fetchDrivers,
    createDriver,
    updateDriver,
    deleteDriver,
    setPage,
    setPageSize,
  }
})
