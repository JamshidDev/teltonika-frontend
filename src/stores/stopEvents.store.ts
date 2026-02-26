import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { carsApi, type StopEventsParams } from '@/api/cars'
import type { StopEvent, PaginationMeta } from '@/types'

export const useStopEventsStore = defineStore('stopEvents', () => {
  // State
  const events = ref<StopEvent[]>([])
  const meta = ref<PaginationMeta | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedCarId = ref<number | null>(null)
  const selectedDate = ref<string>(new Date().toISOString().split('T')[0] as string)

  // Getters
  const totalEvents = computed(() => meta.value?.total ?? 0)
  const currentPage = computed(() => meta.value?.page ?? 1)
  const totalPages = computed(() => meta.value?.totalPages ?? 1)
  const hasNextPage = computed(() => meta.value?.hasNext ?? false)
  const hasPrevPage = computed(() => meta.value?.hasPrev ?? false)

  // Actions
  async function fetchEvents(params?: StopEventsParams): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const queryParams: StopEventsParams = {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 10,
        ...(selectedCarId.value && { carId: selectedCarId.value }),
        ...(selectedDate.value && { date: selectedDate.value }),
      }
      const response = await carsApi.getStopEvents(queryParams)
      events.value = response.data
      meta.value = response.meta
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load stop events'
    } finally {
      loading.value = false
    }
  }

  function setCarId(carId: number | null): void {
    selectedCarId.value = carId
  }

  function setDate(date: string): void {
    selectedDate.value = date
  }

  return {
    // State
    events,
    meta,
    loading,
    error,
    selectedCarId,
    selectedDate,
    // Getters
    totalEvents,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    // Actions
    fetchEvents,
    setCarId,
    setDate,
  }
})
