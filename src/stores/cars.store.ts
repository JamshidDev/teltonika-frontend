import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { carsApi, type CarsQueryParams } from '@/api/cars'
import type { Car, CreateCarDto, UpdateCarDto, PaginationMeta } from '@/types'

export const useCarsStore = defineStore('cars', () => {
  // State
  const cars = ref<Car[]>([])
  const meta = ref<PaginationMeta | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')

  // Getters
  const filteredCars = computed(() => {
    if (!searchQuery.value) return cars.value

    const query = searchQuery.value.toLowerCase()
    return cars.value.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.deviceImei.includes(query) ||
        c.deviceModel?.toLowerCase().includes(query)
    )
  })

  const totalCars = computed(() => meta.value?.total ?? 0)
  const currentPage = computed(() => meta.value?.page ?? 1)
  const totalPages = computed(() => meta.value?.totalPages ?? 1)
  const hasNextPage = computed(() => meta.value?.hasNext ?? false)
  const hasPrevPage = computed(() => meta.value?.hasPrev ?? false)

  // Actions
  async function fetchCars(params?: CarsQueryParams): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const response = await carsApi.getAll(params)
      cars.value = response.data
      meta.value = response.meta
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load cars'
    } finally {
      loading.value = false
    }
  }

  async function createCar(data: CreateCarDto): Promise<Car> {
    const newCar = await carsApi.create(data)
    cars.value.push(newCar)
    if (meta.value) {
      meta.value.total++
    }
    return newCar
  }

  async function updateCar(id: number, data: UpdateCarDto): Promise<Car> {
    const updatedCar = await carsApi.update(id, data)
    const index = cars.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      cars.value[index] = updatedCar
    }
    return updatedCar
  }

  async function deleteCar(id: number): Promise<void> {
    await carsApi.delete(id)
    cars.value = cars.value.filter((c) => c.id !== id)
    if (meta.value) {
      meta.value.total--
    }
  }

  async function getCarById(id: number): Promise<Car> {
    return await carsApi.getById(id)
  }

  function setSearchQuery(query: string): void {
    searchQuery.value = query
  }

  return {
    // State
    cars,
    meta,
    loading,
    error,
    searchQuery,
    // Getters
    filteredCars,
    totalCars,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    // Actions
    fetchCars,
    createCar,
    updateCar,
    deleteCar,
    getCarById,
    setSearchQuery,
  }
})
