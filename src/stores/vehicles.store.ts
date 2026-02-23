import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { carsApi } from '@/api/cars'
import type { VehicleWithPosition, PaginationMeta, RoutePoint } from '@/types'

export const useVehiclesStore = defineStore('vehicles', () => {
  // State
  const vehicles = ref<VehicleWithPosition[]>([])
  const meta = ref<PaginationMeta | null>(null)
  const selectedVehicleId = ref<number | null>(null)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')

  // Route line state
  const routePoints = ref<RoutePoint[]>([])
  const routeLoading = ref(false)
  const routeCarId = ref<number | null>(null)
  const routeFrom = ref<string | null>(null)
  const routeTo = ref<string | null>(null)

  // Getters
  const selectedVehicle = computed(() => {
    if (!selectedVehicleId.value) return null
    return vehicles.value.find((v) => v.carId === selectedVehicleId.value) || null
  })

  const filteredVehicles = computed(() => {
    if (!searchQuery.value) return vehicles.value

    const query = searchQuery.value.toLowerCase()
    return vehicles.value.filter(
      (v) =>
        v.name.toLowerCase().includes(query) ||
        v.deviceImei.includes(query)
    )
  })

  const onlineVehicles = computed(() =>
    vehicles.value.filter((v) => v.recordedAt && isOnline(v.recordedAt))
  )

  const offlineVehicles = computed(() =>
    vehicles.value.filter((v) => !v.recordedAt || !isOnline(v.recordedAt))
  )

  const movingVehicles = computed(() =>
    vehicles.value.filter((v) => v.movement === true)
  )

  const vehicleStats = computed(() => ({
    total: meta.value?.total || vehicles.value.length,
    online: onlineVehicles.value.length,
    offline: offlineVehicles.value.length,
    moving: movingVehicles.value.length,
  }))

  const hasMore = computed(() => meta.value?.hasNext ?? false)
  const currentPage = computed(() => meta.value?.page ?? 1)

  // Get route vehicle name
  const routeVehicleName = computed(() => {
    if (!routeCarId.value) return null
    const vehicle = vehicles.value.find((v) => v.carId === routeCarId.value)
    return vehicle?.name || null
  })

  // Helper functions
  function isOnline(recordedAt: string): boolean {
    const lastUpdate = new Date(recordedAt).getTime()
    const now = Date.now()
    const diffMinutes = (now - lastUpdate) / (1000 * 60)
    return diffMinutes < 10
  }

  function getVehicleStatus(vehicle: VehicleWithPosition): 'online' | 'offline' | 'moving' | 'stopped' | 'idle' {
    if (!vehicle.recordedAt || !isOnline(vehicle.recordedAt)) return 'offline'
    if (vehicle.movement) return 'moving'
    if (vehicle.ignition) return 'idle'
    return 'stopped'
  }

  // Actions
  async function fetchVehicles(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const response = await carsApi.getLastPositions({ page: 1, pageSize: 50 })
      vehicles.value = response.data
      meta.value = response.meta
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load vehicles'
    } finally {
      loading.value = false
    }
  }

  async function loadMore(): Promise<void> {
    if (loadingMore.value || !hasMore.value) return

    loadingMore.value = true

    try {
      const nextPage = currentPage.value + 1
      const response = await carsApi.getLastPositions({ page: nextPage, pageSize: 50 })
      vehicles.value = [...vehicles.value, ...response.data]
      meta.value = response.meta
    } catch (err) {
      console.error('Failed to load more vehicles:', err)
    } finally {
      loadingMore.value = false
    }
  }

  function selectVehicle(vehicleId: number | null): void {
    selectedVehicleId.value = vehicleId
  }

  function setSearchQuery(query: string): void {
    searchQuery.value = query
  }

  // Socket orqali kelgan location ma'lumotini yangilash
  function updateVehiclePosition(data: {
    carId: number
    lat: number
    lng: number
    speed: number
    angle: number
    ignition: boolean
    movement: boolean
    recordedAt?: string
  }): void {
    const vehicle = vehicles.value.find((v) => v.carId === data.carId)
    if (vehicle) {
      vehicle.lat = data.lat
      vehicle.lng = data.lng
      vehicle.speed = data.speed
      vehicle.angle = data.angle
      vehicle.ignition = data.ignition
      vehicle.movement = data.movement
      vehicle.recordedAt = data.recordedAt || new Date().toISOString()
    }
  }

  // Fetch route for drawing on map
  async function fetchRoute(carId: number, from: string, to: string): Promise<void> {
    routeLoading.value = true
    routeCarId.value = carId
    routeFrom.value = from
    routeTo.value = to

    try {
      const points = await carsApi.getHistoryRoute({ carId, from, to })
      routePoints.value = points
    } catch (err) {
      console.error('Failed to fetch route:', err)
      routePoints.value = []
    } finally {
      routeLoading.value = false
    }
  }

  // Clear route from map
  function clearRoute(): void {
    routePoints.value = []
    routeCarId.value = null
    routeFrom.value = null
    routeTo.value = null
  }

  return {
    // State
    vehicles,
    meta,
    selectedVehicleId,
    loading,
    loadingMore,
    error,
    searchQuery,
    routePoints,
    routeLoading,
    routeCarId,
    routeFrom,
    routeTo,
    routeVehicleName,
    // Getters
    selectedVehicle,
    filteredVehicles,
    onlineVehicles,
    offlineVehicles,
    movingVehicles,
    vehicleStats,
    hasMore,
    currentPage,
    // Helper
    getVehicleStatus,
    // Actions
    fetchVehicles,
    loadMore,
    selectVehicle,
    setSearchQuery,
    updateVehiclePosition,
    fetchRoute,
    clearRoute,
  }
})
