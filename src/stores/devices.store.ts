import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'

export interface Device {
  id: number
  imei: string
  model: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface DeviceMeta {
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface CreateDeviceDto {
  imei: string
  model: string
}

export interface UpdateDeviceDto {
  imei?: string
  model?: string
}

export const useDevicesStore = defineStore('devices', () => {
  const devices = ref<Device[]>([])
  const meta = ref<DeviceMeta>({
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
  const totalDevices = computed(() => meta.value.total)

  async function fetchDevices(page = 1, pageSize = 10) {
    loading.value = true
    error.value = null

    try {
      const response = await api.get('/device', {
        params: { page, pageSize },
      })

      devices.value = response.data.data
      meta.value = response.data.meta
    } catch (err) {
      error.value = 'Failed to fetch devices'
      console.error('Error fetching devices:', err)
    } finally {
      loading.value = false
    }
  }

  async function createDevice(data: CreateDeviceDto) {
    loading.value = true
    error.value = null

    try {
      await api.post('/device', data)
      await fetchDevices(meta.value.page, meta.value.pageSize)
      return true
    } catch (err) {
      error.value = 'Failed to create device'
      console.error('Error creating device:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function updateDevice(id: number, data: UpdateDeviceDto) {
    loading.value = true
    error.value = null

    try {
      await api.put(`/device/${id}`, data)
      await fetchDevices(meta.value.page, meta.value.pageSize)
      return true
    } catch (err) {
      error.value = 'Failed to update device'
      console.error('Error updating device:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteDevice(id: number) {
    loading.value = true
    error.value = null

    try {
      await api.delete(`/device/${id}`)
      await fetchDevices(meta.value.page, meta.value.pageSize)
      return true
    } catch (err) {
      error.value = 'Failed to delete device'
      console.error('Error deleting device:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  function setPage(page: number) {
    fetchDevices(page, meta.value.pageSize)
  }

  function setPageSize(pageSize: number) {
    fetchDevices(1, pageSize)
  }

  return {
    devices,
    meta,
    loading,
    error,
    currentPage,
    totalPages,
    totalDevices,
    fetchDevices,
    createDevice,
    updateDevice,
    deleteDevice,
    setPage,
    setPageSize,
  }
})
