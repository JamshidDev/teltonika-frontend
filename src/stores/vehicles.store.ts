import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { carsApi } from '@/api/cars'
import { toast } from 'vue-sonner'
import type { VehicleWithPosition, PaginationMeta, RoutePoint, CarMotionEvent, RawPositionPoint, HourlyGroup } from '@/types'

export const useVehiclesStore = defineStore('vehicles', () => {
  // State
  const vehicles = ref<VehicleWithPosition[]>([])
  const meta = ref<PaginationMeta | null>(null)
  const selectedVehicleId = ref<number | null>(null)
  const followedVehicleId = ref<number | null>(null)
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
  const routeSource = ref<'live' | 'scheduled' | null>(null)

  // Spot marker state (for parking/stop)
  const spotMarker = ref<{ lat: number; lng: number; type: 'parking' | 'stop'; startAt: string; endAt: string } | null>(null)

  // Route animation state
  const routeAnimating = ref(false)

  // Hide all car markers on map (e.g. when on Scheduled/History tab)
  const markersHidden = ref(false)

  // Raw positions state (for history analysis)
  const rawPositions = ref<RawPositionPoint[]>([])
  const rawPositionsHourly = ref<HourlyGroup[]>([])
  const rawPositionsTotalPoints = ref(0)
  const rawPositionsLoading = ref(false)
  const selectedHour = ref<number | null>(null)

  // Getters
  const selectedVehicle = computed(() => {
    if (!selectedVehicleId.value) return null
    return vehicles.value.find((v) => v.carId === selectedVehicleId.value) || null
  })

  const followedVehicle = computed(() => {
    if (!followedVehicleId.value) return null
    return vehicles.value.find((v) => v.carId === followedVehicleId.value) || null
  })

  const filteredVehicles = computed(() => {
    if (!searchQuery.value.trim()) return vehicles.value

    const query = searchQuery.value.toLowerCase().trim()
    return vehicles.value.filter(
      (v) =>
        v.name?.toLowerCase().includes(query) ||
        v.deviceImei?.toLowerCase().includes(query)
    )
  })

  const onlineVehicles = computed(() =>
    vehicles.value.filter((v) => v.recordedAt && isOnline(v.recordedAt))
  )

  const offlineVehicles = computed(() =>
    vehicles.value.filter((v) => !v.recordedAt || !isOnline(v.recordedAt))
  )

  const movingVehicles = computed(() =>
    vehicles.value.filter((v) => v.status === 'moving' || v.status === 'stop_candidate')
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
    // Use API status field if available
    if (vehicle.status) {
      if (vehicle.status === 'moving' || vehicle.status === 'stop_candidate') return 'moving'
      if (vehicle.status === 'stopped' || vehicle.status === 'parking_candidate') return 'stopped'
      if (vehicle.status === 'parking') return 'stopped'
    }
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

  function followVehicle(vehicleId: number): void {
    followedVehicleId.value = vehicleId
  }

  function unfollowVehicle(): void {
    followedVehicleId.value = null
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

  // Fetch route for drawing on map (from Live tab)
  async function fetchRoute(carId: number, from: string, to: string): Promise<void> {
    routeLoading.value = true
    routeCarId.value = carId
    routeFrom.value = from
    routeTo.value = to
    routeSource.value = 'live'

    try {
      const points = await carsApi.getHistoryRoute({ carId, from, to })
      if (points.length === 0) {
        toast.warning('Bu vaqt oralig\'ida ma\'lumot topilmadi')
        routeCarId.value = null
        routeFrom.value = null
        routeTo.value = null
        routeSource.value = null
      }
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
    routeSource.value = null
    routeAnimating.value = false
  }

  // Set route points directly (for timeline routes from Scheduled tab)
  function setRoutePoints(points: RoutePoint[], carId?: number): void {
    routePoints.value = points
    routeCarId.value = carId || null
    routeFrom.value = points.length > 0 ? points[0]!.recordedAt : null
    routeTo.value = points.length > 0 ? points[points.length - 1]!.recordedAt : null
    routeSource.value = 'scheduled'
    // Clear spot marker when showing route
    spotMarker.value = null
  }

  // Show spot marker (for parking/stop)
  function showSpotMarker(data: { lat: number; lng: number; type: 'parking' | 'stop'; startAt: string; endAt: string }): void {
    spotMarker.value = data
    // Clear route when showing spot marker
    routePoints.value = []
    routeCarId.value = null
    routeFrom.value = null
    routeTo.value = null
    routeSource.value = null
  }

  // Clear spot marker
  function clearSpotMarker(): void {
    spotMarker.value = null
  }

  // Update car motion status from socket — directly update vehicle in list
  function updateCarMotion(data: CarMotionEvent): void {
    const vehicle = vehicles.value.find((v) => v.carId === data.carId)
    if (vehicle) {
      vehicle.status = data.status
      vehicle.statusSince = data.since
    }
  }

  // Fetch raw positions for analysis (hourly grouped)
  async function fetchRawPositions(carId: number, from: string, to: string): Promise<void> {
    rawPositionsLoading.value = true
    selectedHour.value = null
    try {
      const response = await carsApi.getRawPositions({ carId, from, to })
      rawPositionsHourly.value = response.hourly
      rawPositionsTotalPoints.value = response.totalPoints
      // Default — map bo'sh, soat tanlanganda ko'rsatiladi
      rawPositions.value = []
    } catch (err) {
      console.error('Failed to fetch raw positions:', err)
      rawPositions.value = []
      rawPositionsHourly.value = []
      rawPositionsTotalPoints.value = 0
    } finally {
      rawPositionsLoading.value = false
    }
  }

  function selectHour(hour: number | null): void {
    selectedHour.value = hour
    rawPositionsLoading.value = true
    rawPositions.value = []
    setTimeout(() => {
      if (hour === null) {
        // Soat tanlanmagan — map bo'sh, faqat list ko'rsatilmaydi
        rawPositions.value = []
      } else {
        const group = rawPositionsHourly.value.find(h => h.hour === hour)
        rawPositions.value = group ? group.points : []
      }
      rawPositionsLoading.value = false
    }, 100)
  }

  function clearRawPositions(): void {
    rawPositions.value = []
    rawPositionsHourly.value = []
    rawPositionsTotalPoints.value = 0
    selectedHour.value = null
  }

  // Start route animation
  function startRouteAnimation(): void {
    if (routePoints.value.length < 2) return
    routeAnimating.value = true
  }

  // Stop route animation
  function stopRouteAnimation(): void {
    routeAnimating.value = false
  }

  return {
    // State
    vehicles,
    meta,
    selectedVehicleId,
    followedVehicleId,
    loading,
    loadingMore,
    error,
    searchQuery,
    routePoints,
    routeLoading,
    routeCarId,
    routeFrom,
    routeTo,
    routeSource,
    routeVehicleName,
    spotMarker,
    routeAnimating,
    markersHidden,
    rawPositions,
    rawPositionsHourly,
    rawPositionsTotalPoints,
    rawPositionsLoading,
    selectedHour,
    // Getters
    selectedVehicle,
    followedVehicle,
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
    followVehicle,
    unfollowVehicle,
    setSearchQuery,
    updateVehiclePosition,
    updateCarMotion,
    fetchRoute,
    clearRoute,
    setRoutePoints,
    showSpotMarker,
    clearSpotMarker,
    startRouteAnimation,
    stopRouteAnimation,
    fetchRawPositions,
    clearRawPositions,
    selectHour,
  }
})
