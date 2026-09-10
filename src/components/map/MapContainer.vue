<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useVehiclesStore } from '@/stores/vehicles.store'
import { useUiStore } from '@/stores/ui.store'
import { useVehiclesRealtime } from '@/composables/useVehiclesRealtime'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { mapTiles } from '@/config/mapTiles'
import { toast } from 'vue-sonner'
import { Locate, LocateFixed, X, Loader2, Play, Square } from 'lucide-vue-next'
import carIconUrl from '@/assets/taxi-marker.svg'

const { t } = useI18n()
const { isDesktop } = useBreakpoint()

// Desktopda chapdagi panel, mobilda pastdagi varaq marshrutni to'smasligi uchun.
// Suzuvchi pastki menyu balandligi (~65px) + pastdan 10px ajralish.
const FLOATING_NAV_PX = 85

// Mobil ekran kichik — kuzatuvda kengroq ko'rinish kerak (desktopdan 2 daraja kam).
const followZoom = computed(() => (isDesktop.value ? 17 : 15))

const controlsStyle = computed(() => ({
  bottom: isDesktop.value
    ? '1.5rem'
    : `calc(${FLOATING_NAV_PX}px + env(safe-area-inset-bottom))`,
}))

function routePadding() {
  return isDesktop.value
    ? { paddingTopLeft: [480, 50] as [number, number], paddingBottomRight: [50, 50] as [number, number] }
    : { paddingTopLeft: [24, 80] as [number, number], paddingBottomRight: [24, 160] as [number, number] }
}
const vehiclesStore = useVehiclesStore()
const uiStore = useUiStore()

// Start realtime position updates
useVehiclesRealtime()

const mapContainer = ref<HTMLElement | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const map = shallowRef<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tileLayer = shallowRef<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const markersLayer = shallowRef<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const markers = shallowRef<Map<number, any>>(new Map())
// Har mashina uchun oxirgi ikonka kaliti — o'zgarmagan bo'lsa setIcon chaqirilmaydi.
const markerIconKeys = new Map<number, string>()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const routeLine = shallowRef<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const routeArrows = shallowRef<any[]>([])
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const routeStartMarker = shallowRef<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const routeEndMarker = shallowRef<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const spotMarkerRef = shallowRef<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const spotCircleRef = shallowRef<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const animationLine = shallowRef<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const animationMarker = shallowRef<any>(null)
const animationFrameId = ref<number | null>(null)

const currentTile = ref('light')

// Map tiles configuration
// Tile serveri — o'z infratuzilmamiz (TileServer GL). API kalit talab qilmaydi.

// Get all vehicles with positions
const vehiclesWithPositions = computed(() =>
  vehiclesStore.vehicles.filter((v) => v.lat !== null && v.lng !== null)
)

// Check if route is showing
const hasRoute = computed(() => vehiclesStore.routePoints.length > 0)

// Check if follow mode is active
const isFollowing = computed(() => vehiclesStore.followedVehicleId !== null)
const followedVehicle = computed(() => {
  if (!vehiclesStore.followedVehicleId) return null
  return vehiclesStore.vehicles.find((v) => v.carId === vehiclesStore.followedVehicleId) ?? null
})

// Nomlarda davlat raqami takrorlanadi ("Labo 3 124 KBA") — badge'da raqam
// alohida chipda ko'rsatilgani uchun nomdan raqamga o'xshash qismni olib tashlaymiz.
const followedName = computed(() => {
  const name = followedVehicle.value?.name
  if (!name) return ''
  const cleaned = name.replace(/\b\d{1,3}\s*\d{3}\s*[A-Za-z]{3}\b/g, ' ').replace(/\s{2,}/g, ' ').trim()
  return cleaned || name
})

// "90 124 MBA" -> "124", "01 A 123 BC" -> "123". Topilmasa oxirgi 3 raqam.
function plateShort(carNumber?: string | null): string {
  if (!carNumber) return ''
  const m = carNumber.match(/(\d{3})(?=\s*[A-Za-z]{2,3}\s*$)/)
  if (m?.[1]) return m[1]
  const digits = carNumber.replace(/\D/g, '')
  return digits.length >= 3 ? digits.slice(-3) : digits
}

// Create marker icon with car icon and rotation
function createCarIcon(angle: number = 0, ignition: boolean = false, speed: number = 0, isFollowed: boolean = false, plate: string = '') {
  const rippleHtml = ignition ? `
        <!-- Ripple effect -->
        <div class="car-ripple"></div>
        <div class="car-ripple car-ripple-delay"></div>
  ` : ''

  const speedBadgeHtml = isFollowed ? `
        <!-- Speed badge -->
        <div class="car-speed-badge">
          ${speed} <span style="font-size: 9px;">km/h</span>
        </div>
  ` : ''

  // Mobilda barmoq uchun kattaroq: 56px maydon / 40px tasvir.
  const box = isDesktop.value ? 48 : 56
  const img = isDesktop.value ? 32 : 40

  // Davlat raqamining 3 xonasi — mashinaning orqa raqami kabi: ikonkaning
  // orqasida, 5px naridа va u bilan birga buriladi.
  const BADGE_H = 14
  const heading = ((angle % 360) + 360) % 360
  const rad = (heading * Math.PI) / 180
  const gap = img / 2 + 5 + BADGE_H / 2
  // Burchak 0 = shimol; orqa yo'nalish = (-sin, +cos).
  const bx = Math.round(-Math.sin(rad) * gap)
  const by = Math.round(Math.cos(rad) * gap)
  // Matn teskari o'girilib qolmasligi uchun 180 ga aylantiramiz.
  const badgeRot = heading > 90 && heading < 270 ? heading - 180 : heading
  const plateBadgeHtml = !isFollowed && plate ? `
        <div class="car-plate-badge" style="transform: translate(calc(-50% + ${bx}px), calc(-50% + ${by}px)) rotate(${badgeRot}deg);">${plate}</div>
  ` : ''

  return L.divIcon({
    className: 'car-marker',
    html: `
      <div style="position: relative; width: ${box}px; height: ${box}px;">
        ${rippleHtml}
        ${speedBadgeHtml}
        ${plateBadgeHtml}
        <!-- Car icon -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(${angle}deg);
          width: ${img}px;
          height: ${img}px;
        ">
          <img src="${carIconUrl}" width="${img}" height="${img}" style="display: block;" />
        </div>
      </div>
    `,
    iconSize: [box, box],
    iconAnchor: [box / 2, box / 2],
  })
}

// Kichik zoomda raqam badge'lari bir-birining ustiga tushmasin.
const PLATE_MIN_ZOOM = 13
function updatePlateVisibility() {
  if (!map.value) return
  const container = map.value.getContainer()
  container.classList.toggle('hide-plates', map.value.getZoom() < PLATE_MIN_ZOOM)
}

// Get appropriate tile based on dark mode
function getDefaultTile() {
  return uiStore.darkMode ? 'dark' : 'light'
}

// Tile layer yaratish — opsiyalar bitta joyda turishi uchun.
function createTileLayer(tileKey: string) {
  const tile = mapTiles[tileKey as keyof typeof mapTiles]

  return L.tileLayer(tile.url, {
    attribution: tile.attribution,
    maxZoom: 20,
    // Zoom animatsiyasi tugagach yuklanadi — aks holda tile'lar yarim yo'lda uziladi.
    updateWhenZooming: false,
    // Ko'rinish atrofida qo'shimcha tile saqlanadi, zoom/pan'da bo'sh joy qolmaydi.
    keepBuffer: 4,
  })
}

// Change tile layer
function changeTile(tileKey: string) {
  if (!map.value) return

  currentTile.value = tileKey

  if (tileLayer.value) {
    map.value.removeLayer(tileLayer.value)
    tileLayer.value = null
  }

  tileLayer.value = createTileLayer(tileKey).addTo(map.value)
}

// Initialize map
function initMap() {
  if (!mapContainer.value || map.value) return

  const defaultLat = parseFloat(import.meta.env.VITE_MAP_DEFAULT_LAT) || 41.2995
  const defaultLng = parseFloat(import.meta.env.VITE_MAP_DEFAULT_LNG) || 69.2401
  const defaultZoom = parseInt(import.meta.env.VITE_MAP_DEFAULT_ZOOM) || 12

  map.value = L.map(mapContainer.value, {
    zoomControl: false,
    zoomAnimation: true,
    fadeAnimation: true,
    markerZoomAnimation: true,
    // 4 darajagacha bo'lgan zoom o'zgarishi animatsiya bilan ketadi.
    zoomAnimationThreshold: 4,
    // circleMarker'lar SVG emas, canvas'da chiziladi — minglab nuqtada sezilarli farq.
    preferCanvas: true,
    // G'ildirak/trackpad bilan zoom yumshoqroq bo'lishi uchun.
    wheelPxPerZoomLevel: 100,
  }).setView([defaultLat, defaultLng], defaultZoom)

  // Add initial tile layer based on dark mode
  const initialTile = getDefaultTile()
  currentTile.value = initialTile
  tileLayer.value = createTileLayer(initialTile).addTo(map.value)

  // Create markers layer
  markersLayer.value = L.layerGroup().addTo(map.value)

  // Update store when map moves
  map.value.on('moveend', () => {
    if (map.value) {
      const center = map.value.getCenter()
      uiStore.setMapCenter([center.lat, center.lng])
      uiStore.setMapZoom(map.value.getZoom())
    }
  })

  // Xaritaga bosilganda mobil pastki varaq yig'iladi.
  map.value.on('click', () => uiStore.requestSheetCollapse())

  // Show/hide route arrows based on zoom level
  map.value.on('zoomend', () => {
    updateRouteArrowsVisibility()
    updatePlateVisibility()
  })
  updatePlateVisibility()

  // Initial markers
  updateMarkers()

  // Fit all markers if available
  setTimeout(() => {
    if (vehiclesWithPositions.value.length > 0) {
      fitAllMarkers()
    }
  }, 500)
}

// Update markers on map
function updateMarkers() {
  if (!map.value || !markersLayer.value) return

  // Hide all markers when route is showing or markers are hidden (Scheduled/History tab)
  if (vehiclesStore.markersHidden || vehiclesStore.routePoints.length > 0) {
    markers.value.forEach((marker) => {
      try {
        marker.off()
        marker.remove()
      } catch (e) {
        // Ignore cleanup errors
      }
    })
    markers.value.clear()
    markerIconKeys.clear()
    return
  }

  // When follow mode is active, remove all markers except the followed vehicle
  if (vehiclesStore.followedVehicleId) {
    markers.value.forEach((marker, carId) => {
      if (carId !== vehiclesStore.followedVehicleId) {
        try {
          marker.off()
          marker.remove()
        } catch (e) {
          // Ignore cleanup errors
        }
        markers.value.delete(carId)
        markerIconKeys.delete(carId)
      }
    })
  }

  vehiclesWithPositions.value.forEach((vehicle) => {
    if (vehicle.lat === null || vehicle.lng === null) return

    // Skip non-followed vehicles when follow mode is active
    if (vehiclesStore.followedVehicleId && vehicle.carId !== vehiclesStore.followedVehicleId) return

    const existingMarker = markers.value.get(vehicle.carId)
    const position: L.LatLngExpression = [vehicle.lat, vehicle.lng]
    const angle = vehicle.angle || 0
    const ignition = vehicle.ignition ?? false
    const speed = vehicle.speed || 0
    const isFollowed = vehiclesStore.followedVehicleId === vehicle.carId

    const plate = plateShort(vehicle.carNumber)

    // Tezlik faqat follow rejimida ikonkada ko'rinadi — aks holda kalitga kirmaydi.
    const iconKey = isFollowed
      ? `${angle}|${ignition}|${speed}|1|${isDesktop.value}`
      : `${angle}|${ignition}|0|${isDesktop.value}|${plate}`

    if (existingMarker) {
      existingMarker.setLatLng(position)
      // setIcon DOM elementini qaytadan yaratadi — faqat kerak bo'lganda.
      if (markerIconKeys.get(vehicle.carId) !== iconKey) {
        existingMarker.setIcon(createCarIcon(angle, ignition, speed, isFollowed, plate))
        markerIconKeys.set(vehicle.carId, iconKey)
      }
    } else {
      const marker = L.marker(position, {
        icon: createCarIcon(angle, ignition, speed, isFollowed, plate),
        title: vehicle.name,
      })

      marker.on('click', () => {
        vehiclesStore.selectVehicle(vehicle.carId)
        if (map.value) {
          map.value.flyTo([vehicle.lat!, vehicle.lng!], 16, { duration: 0.6 })
        }
        // Update all markers to reflect selection change
        updateMarkers()
      })

      marker.addTo(markersLayer.value!)
      markers.value.set(vehicle.carId, marker)
      markerIconKeys.set(vehicle.carId, iconKey)
    }
  })

  // Remove markers for vehicles that no longer exist
  markers.value.forEach((marker, carId) => {
    if (!vehiclesWithPositions.value.find((v) => v.carId === carId)) {
      try {
        marker.off()
        marker.remove()
      } catch (e) {
        // Ignore cleanup errors
      }
      markers.value.delete(carId)
      markerIconKeys.delete(carId)
    }
  })
}

// --- Foydalanuvchi joylashuvi ---
const userMarker = shallowRef<any>(null)
const userCircle = shallowRef<any>(null)
const locating = ref(false)

function locateMe() {
  if (!map.value) return
  if (!navigator.geolocation) {
    toast.error(t('map.locationError'))
    return
  }

  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locating.value = false
      const { latitude: lat, longitude: lng, accuracy } = pos.coords

      safeRemoveLayer(userMarker.value)
      safeRemoveLayer(userCircle.value)

      // Aniqlik doirasi
      userCircle.value = L.circle([lat, lng], {
        radius: accuracy,
        color: '#e9b900',
        fillColor: '#ffd21c',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(map.value)

      userMarker.value = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'user-location',
          html:
            '<div class="user-ripple"></div>' +
            '<div class="user-ripple user-ripple-delay"></div>' +
            '<div class="user-location-dot"></div>',
          iconSize: [56, 56],
          iconAnchor: [28, 28],
        }),
        zIndexOffset: 1500,
      }).addTo(map.value)

      map.value.flyTo([lat, lng], 16, { duration: 0.8 })
    },
    (err) => {
      locating.value = false
      toast.error(err.code === err.PERMISSION_DENIED ? t('map.locationDenied') : t('map.locationError'))
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
  )
}

// Fit all markers in view
function fitAllMarkers() {
  if (!map.value || vehiclesWithPositions.value.length === 0) return

  const bounds = L.latLngBounds(
    vehiclesWithPositions.value
      .filter((v) => v.lat !== null && v.lng !== null)
      .map((v) => [v.lat!, v.lng!] as L.LatLngTuple)
  )

  map.value.flyToBounds(bounds, { padding: [50, 50], duration: 0.8 })
}

// Format route date for display
function formatRouteDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString(uiStore.language, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Create arrow icon for direction
function createArrowIcon(angle: number) {
  return L.divIcon({
    className: 'route-arrow',
    html: `<div style="transform: rotate(${angle}deg); width: 12px; height: 12px;">
      <svg viewBox="0 0 24 24" fill="#ef4444" stroke="#b91c1c" stroke-width="1">
        <path d="M12 2L19 21L12 17L5 21L12 2Z"/>
      </svg>
    </div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

// Format time for marker display
function formatMarkerTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Create route point marker (A for start, B for end)
function createRoutePointIcon(label: 'A' | 'B', time: string) {
  const color = label === 'A' ? '#22c55e' : '#ef4444' // green for start, red for end
  const formattedTime = formatMarkerTime(time)
  return L.divIcon({
    className: 'route-point-marker',
    html: `
      <div class="route-point-icon">
        <svg width="32" height="44" viewBox="0 0 32 44">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 28 16 28s16-19.163 16-28C32 7.163 24.837 0 16 0z" fill="${color}"/>
          <circle cx="16" cy="16" r="10" fill="white" fill-opacity="0.25"/>
          <text x="16" y="21" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="system-ui, sans-serif">${label}</text>
        </svg>
        <div class="route-point-time">${formattedTime}</div>
      </div>
    `,
    iconSize: [32, 60],
    iconAnchor: [16, 44],
  })
}

// Create spot marker icon (for parking/stop) - teardrop shape
function createSpotMarkerIcon(type: 'parking' | 'stop', startAt: string, endAt: string) {
  // Colors matching the sidebar cards
  const color = type === 'parking' ? '#dc2626' : '#ea580c' // red-600 for parking, orange-600 for stop
  const label = type === 'parking' ? 'P' : 'S'
  const startTime = formatMarkerTime(startAt)
  const endTime = formatMarkerTime(endAt)

  return L.divIcon({
    className: 'spot-marker',
    html: `
      <div class="spot-marker-icon">
        <svg width="40" height="52" viewBox="0 0 32 44">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 28 16 28s16-19.163 16-28C32 7.163 24.837 0 16 0z" fill="${color}"/>
          <circle cx="16" cy="16" r="10" fill="white" fill-opacity="0.25"/>
          <text x="16" y="21" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="system-ui, sans-serif">${label}</text>
        </svg>
        <div class="spot-marker-times">
          <span>${startTime}</span>
          <span>-</span>
          <span>${endTime}</span>
        </div>
      </div>
    `,
    iconSize: [40, 70],
    iconAnchor: [20, 52],
  })
}

// Draw spot marker on map
function drawSpotMarker() {
  if (!map.value) return

  // Clear existing spot marker
  clearSpotMarker()

  const spot = vehiclesStore.spotMarker
  if (!spot) return

  // Circle color based on type
  const circleColor = spot.type === 'parking' ? '#dc2626' : '#ea580c'

  // Draw circle first (50m radius)
  spotCircleRef.value = L.circle([spot.lat, spot.lng], {
    radius: 50, // 50 meters
    color: circleColor,
    fillColor: circleColor,
    fillOpacity: 0.15,
    weight: 2,
    opacity: 0.6,
  }).addTo(map.value)

  // Draw marker on top
  spotMarkerRef.value = L.marker([spot.lat, spot.lng], {
    icon: createSpotMarkerIcon(spot.type, spot.startAt, spot.endAt),
    zIndexOffset: 1000,
  }).addTo(map.value)

  // Center map on spot marker
  map.value.flyTo([spot.lat, spot.lng], 17, { duration: 0.6 })
}

// Clear spot marker from map
function clearSpotMarker() {
  // Clear circle
  if (spotCircleRef.value) {
    try {
      spotCircleRef.value.off()
      spotCircleRef.value.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
    spotCircleRef.value = null
  }

  // Clear marker
  if (spotMarkerRef.value) {
    try {
      spotMarkerRef.value.off()
      spotMarkerRef.value.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
    spotMarkerRef.value = null
  }
}

// Create animated car marker
function createAnimatedCarIcon(angle: number) {
  return L.divIcon({
    className: 'animated-car-marker',
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(${angle}deg);
          width: 32px;
          height: 32px;
        ">
          <img src="${carIconUrl}" width="32" height="32" style="display: block;" />
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

// Start route animation
function startRouteAnimation() {
  if (!map.value) return

  const points = vehiclesStore.routePoints
  if (points.length < 2) return

  // Clear any existing animation
  stopRouteAnimation()

  // Dim the static route line
  if (routeLine.value) {
    routeLine.value.setStyle({ opacity: 0.5, weight: 4 })
  }

  // Hide arrow markers during animation
  routeArrows.value.forEach((arrow) => {
    const icon = arrow.getElement()
    if (icon) icon.style.display = 'none'
  })

  // Create animated line (starts empty) - brighter and thicker
  animationLine.value = L.polyline([], {
    color: '#22c55e',
    weight: 7,
    opacity: 0.9,
  }).addTo(map.value)

  // Create moving car marker
  const startPoint = points[0]!
  animationMarker.value = L.marker([startPoint.lat, startPoint.lng], {
    icon: createAnimatedCarIcon(startPoint.angle || 0),
    zIndexOffset: 2000,
  }).addTo(map.value)

  // Calculate cumulative distances for each point
  const distances: number[] = [0]
  let totalDistance = 0

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!
    const curr = points[i]!
    const segmentDistance = Math.sqrt(
      Math.pow((curr.lat - prev.lat) * 111000, 2) + // ~111km per degree latitude
      Math.pow((curr.lng - prev.lng) * 111000 * Math.cos(curr.lat * Math.PI / 180), 2)
    )
    totalDistance += segmentDistance
    distances.push(totalDistance)
  }

  // Animation settings
  const animationDuration = 30000 // 30 seconds for entire route
  const animationStartTime = performance.now()
  const animatedPoints: L.LatLngExpression[] = [[startPoint.lat, startPoint.lng]]
  let lastPointIndex = 0

  function animate(currentTime: number) {
    const elapsed = currentTime - animationStartTime
    const progress = Math.min(1, elapsed / animationDuration)
    const currentDistance = progress * totalDistance

    // Find which segment we're on
    let segmentIndex = 0
    for (let i = 1; i < distances.length; i++) {
      if (distances[i]! >= currentDistance) {
        segmentIndex = i - 1
        break
      }
      segmentIndex = i - 1
    }

    // Add passed points to animated line
    while (lastPointIndex < segmentIndex) {
      lastPointIndex++
      animatedPoints.push([points[lastPointIndex]!.lat, points[lastPointIndex]!.lng])
    }

    // Calculate position within current segment
    const segmentStart = distances[segmentIndex]!
    const segmentEnd = distances[segmentIndex + 1] ?? totalDistance
    const segmentLength = segmentEnd - segmentStart
    const segmentProgress = segmentLength > 0 ? (currentDistance - segmentStart) / segmentLength : 0

    const currentPoint = points[segmentIndex]!
    const nextPoint = points[segmentIndex + 1] ?? currentPoint

    // Interpolate position
    const interpolatedLat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * segmentProgress
    const interpolatedLng = currentPoint.lng + (nextPoint.lng - currentPoint.lng) * segmentProgress

    // Interpolate angle
    let angleDiff = (nextPoint.angle || 0) - (currentPoint.angle || 0)
    if (angleDiff > 180) angleDiff -= 360
    if (angleDiff < -180) angleDiff += 360
    const interpolatedAngle = (currentPoint.angle || 0) + angleDiff * segmentProgress

    // Update car marker
    if (animationMarker.value) {
      animationMarker.value.setLatLng([interpolatedLat, interpolatedLng])
      animationMarker.value.setIcon(createAnimatedCarIcon(interpolatedAngle))
    }

    // Update animated line with interpolated position
    const linePoints = [...animatedPoints, [interpolatedLat, interpolatedLng] as L.LatLngExpression]
    animationLine.value?.setLatLngs(linePoints)

    // Continue animation if not finished
    if (progress < 1) {
      animationFrameId.value = requestAnimationFrame(animate)
    } else {
      // Animation finished
      vehiclesStore.stopRouteAnimation()
    }
  }

  // Start animation
  animationFrameId.value = requestAnimationFrame(animate)
}

// Stop route animation
function stopRouteAnimation() {
  // Cancel animation frame
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
    animationFrameId.value = null
  }

  // Remove animated line
  if (animationLine.value) {
    try {
      animationLine.value.off()
      animationLine.value.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
    animationLine.value = null
  }

  // Remove animated car marker
  if (animationMarker.value) {
    try {
      animationMarker.value.off()
      animationMarker.value.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
    animationMarker.value = null
  }

  // Restore static route line to original style
  if (routeLine.value) {
    routeLine.value.setStyle({ opacity: 1, weight: 5 })
  }

  // Show arrow markers again
  routeArrows.value.forEach((arrow) => {
    const icon = arrow.getElement()
    if (icon) icon.style.display = ''
  })
}

// Draw route line on map
function drawRouteLine() {
  if (!map.value) return

  // Stop any ongoing animations
  map.value.stop()

  // Remove existing route line
  if (routeLine.value) {
    try {
      routeLine.value.off()
      routeLine.value.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
    routeLine.value = null
  }

  // Remove existing arrows
  routeArrows.value.forEach((arrow) => {
    try {
      arrow.off()
      arrow.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
  })
  routeArrows.value = []

  // Remove existing start/end markers
  if (routeStartMarker.value) {
    try {
      routeStartMarker.value.off()
      routeStartMarker.value.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
    routeStartMarker.value = null
  }
  if (routeEndMarker.value) {
    try {
      routeEndMarker.value.off()
      routeEndMarker.value.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
    routeEndMarker.value = null
  }

  const points = vehiclesStore.routePoints
  if (points.length === 0) return

  // Create polyline from route points
  const latLngs: L.LatLngExpression[] = points.map((p) => [p.lat, p.lng])

  // Only draw line if we have at least 2 points
  if (latLngs.length >= 2) {
    routeLine.value = L.polyline(latLngs, {
      color: '#ffd21c',
      weight: 5,
      opacity: 1,
    }).addTo(map.value)
  }

  // Add start marker (A) - first point
  const startPoint = points[0]
  if (startPoint) {
    routeStartMarker.value = L.marker([startPoint.lat, startPoint.lng], {
      icon: createRoutePointIcon('A', startPoint.recordedAt),
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(map.value!)
  }

  // Add end marker (B) - last point (only if different from start)
  const endPoint = points[points.length - 1]
  if (endPoint && points.length > 1) {
    routeEndMarker.value = L.marker([endPoint.lat, endPoint.lng], {
      icon: createRoutePointIcon('B', endPoint.recordedAt),
      interactive: false,
      zIndexOffset: 1001,
    }).addTo(map.value!)
  }

  // Add direction arrows only at significant turns (>25 degrees)
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!
    const curr = points[i]!

    let angleDiff = Math.abs(curr.angle - prev.angle)
    // Normalize angle difference > 180 (e.g., diff between 350 and 10 should be 20)
    if (angleDiff > 180) angleDiff = 360 - angleDiff

    // Only add arrow when turn is more than 25 degrees
    if (angleDiff > 25) {
      const arrow = L.marker([curr.lat, curr.lng], {
        icon: createArrowIcon(curr.angle),
        interactive: false,
      }).addTo(map.value!)
      routeArrows.value.push(arrow)
    }
  }

  // Fit map to route bounds
  if (latLngs.length > 0) {
    const bounds = L.latLngBounds(latLngs)
    map.value.flyToBounds(bounds, { padding: [50, 50], duration: 0.8 })
  }

  // Update arrows visibility based on current zoom
  updateRouteArrowsVisibility()
}

// Update route arrows visibility based on zoom level
function updateRouteArrowsVisibility() {
  if (!map.value || routeArrows.value.length === 0) return

  const zoom = map.value.getZoom()
  const minZoomForArrows = 17 // Arrows visible at zoom 17 and above

  routeArrows.value.forEach((arrow) => {
    if (zoom >= minZoomForArrows) {
      // Show arrow
      const icon = arrow.getElement()
      if (icon) icon.style.display = ''
    } else {
      // Hide arrow
      const icon = arrow.getElement()
      if (icon) icon.style.display = 'none'
    }
  })
}

// Clear route line from map
function clearRouteLine() {
  if (!map.value) return

  // Stop any ongoing animations
  map.value.stop()

  // Remove route line
  if (routeLine.value) {
    try {
      routeLine.value.off()
      routeLine.value.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
    routeLine.value = null
  }

  // Remove arrows
  routeArrows.value.forEach((arrow) => {
    try {
      arrow.off()
      arrow.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
  })
  routeArrows.value = []

  // Remove start/end markers
  if (routeStartMarker.value) {
    try {
      routeStartMarker.value.off()
      routeStartMarker.value.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
    routeStartMarker.value = null
  }
  if (routeEndMarker.value) {
    try {
      routeEndMarker.value.off()
      routeEndMarker.value.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
    routeEndMarker.value = null
  }
}

// Raw positions analysis visualization
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawPositionMarkers = shallowRef<any[]>([])
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawPositionLine = shallowRef<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawStartMarker = shallowRef<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawEndMarker = shallowRef<any>(null)

function getRawPositionColor(pos: { ignition: boolean; speed: number }): string {
  if (!pos.ignition) return '#ef4444'    // Qizil - ignition OFF
  if (pos.speed === 0) return '#eab308'  // Sariq - ignition ON, tezlik 0
  return '#22c55e'                        // Yashil - tezlik bor
}

function drawRawPositions() {
  if (!map.value) return

  const positions = vehiclesStore.rawPositions
  if (positions.length === 0) return

  const latLngs: L.LatLngExpression[] = positions.map(p => [p.lat, p.lng])

  // Draw semi-transparent dashed polyline first
  if (latLngs.length >= 2) {
    rawPositionLine.value = L.polyline(latLngs, {
      color: '#6b7280',
      weight: 2,
      opacity: 0.4,
      dashArray: '5, 8',
    }).addTo(map.value)
  }

  // Draw CircleMarkers (Canvas — tez, click da popup ochiladi)
  positions.forEach((p, idx) => {
    const num = idx + 1
    const color = getRawPositionColor(p)

    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 6,
      fillColor: color,
      color: '#fff',
      weight: 1.5,
      fillOpacity: 0.9,
    }).addTo(map.value!)

    // Popup HTML'i faqat ochilganda quriladi.
    marker.bindPopup(
      () => {
        const time = new Date(p.recordedAt).toLocaleTimeString()
        const sat = (p as any).satellites ?? '?'
        const angle = (p as any).angle ?? '?'
        return `<b>#${num} ${time}</b><br>Speed: ${p.speed} km/h<br>Ignition: ${p.ignition ? 'ON' : 'OFF'}<br>Sat: ${sat} | Angle: ${angle}<br>${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`
      },
      { closeButton: true, autoClose: true, className: 'raw-position-popup' }
    )

    rawPositionMarkers.value.push(marker)
  })

  // A marker (birinchi nuqta) va B marker (oxirgi nuqta)
  const firstPos = positions[0]
  const lastPos = positions[positions.length - 1]

  if (firstPos) {
    rawStartMarker.value = L.marker([firstPos.lat, firstPos.lng], {
      icon: createRoutePointIcon('A', firstPos.recordedAt),
      interactive: false,
      zIndexOffset: 2000,
    }).addTo(map.value!)
  }

  if (lastPos && positions.length > 1) {
    rawEndMarker.value = L.marker([lastPos.lat, lastPos.lng], {
      icon: createRoutePointIcon('B', lastPos.recordedAt),
      interactive: false,
      zIndexOffset: 2001,
    }).addTo(map.value!)
  }

  // Fit bounds (offset left for sidebar)
  if (latLngs.length > 0) {
    const bounds = L.latLngBounds(latLngs)
    map.value.flyToBounds(bounds, { ...routePadding(), duration: 0.8 })
  }
}

function safeRemoveLayer(layer: any) {
  if (!layer) return
  try {
    layer.off()
    layer.unbindTooltip?.()
    layer.unbindPopup?.()
    if (map.value?.hasLayer(layer)) {
      map.value.removeLayer(layer)
    }
  } catch (_e) { /* ignore */ }
}

function clearRawPositions() {
  // Ochiq popup'larni yopish
  if (map.value) map.value.closePopup()

  rawPositionMarkers.value.forEach(m => safeRemoveLayer(m))
  rawPositionMarkers.value = []

  safeRemoveLayer(rawPositionLine.value)
  rawPositionLine.value = null

  safeRemoveLayer(rawStartMarker.value)
  rawStartMarker.value = null

  safeRemoveLayer(rawEndMarker.value)
  rawEndMarker.value = null
}

// Watch for raw positions changes
watch(
  () => vehiclesStore.rawPositions,
  () => {
    clearRawPositions()
    // Eski markerlar to'liq tozalangandan keyin yangilarini chizish
    setTimeout(() => drawRawPositions(), 50)
  },
)

// Watch for route points changes
watch(
  () => vehiclesStore.routePoints,
  () => {
    drawRouteLine()
    // Update markers to hide/show the route vehicle marker
    updateMarkers()
  },
)

// Center on selected vehicle from sidebar and update marker selection
watch(
  () => vehiclesStore.selectedVehicleId,
  (carId) => {
    // Update markers to show selection state
    updateMarkers()

    if (carId && map.value) {
      const vehicle = vehiclesStore.vehicles.find((v) => v.carId === carId)
      if (vehicle?.lat && vehicle?.lng) {
        map.value.flyTo([vehicle.lat, vehicle.lng], 16, { duration: 0.6 })
      }
    }
  }
)

// Watch for vehicle position changes
watch(
  () => vehiclesWithPositions.value,
  (newVehicles, oldVehicles) => {
    updateMarkers()
    // Fit bounds on first load
    if ((!oldVehicles || oldVehicles.length === 0) && newVehicles.length > 0) {
      fitAllMarkers()
    }

    // Follow vehicle - center map on followed vehicle when its position changes
    if (vehiclesStore.followedVehicleId && map.value) {
      const followedVehicle = newVehicles.find(v => v.carId === vehiclesStore.followedVehicleId)
      if (followedVehicle?.lat && followedVehicle?.lng) {
        map.value.setView([followedVehicle.lat, followedVehicle.lng], map.value.getZoom(), {
          animate: true,
          duration: 0.5,
        })
      }
    }
  },
  { deep: true }
)

// Watch for followed vehicle changes - center immediately when follow starts
watch(
  () => vehiclesStore.followedVehicleId,
  (carId) => {
    // Update markers to show/hide speed badge
    updateMarkers()

    if (carId && map.value) {
      const vehicle = vehiclesStore.vehicles.find((v) => v.carId === carId)
      if (vehicle?.lat && vehicle?.lng) {
        map.value.flyTo([vehicle.lat, vehicle.lng], followZoom.value, { duration: 0.6 })
      }
    }
  }
)

// Watch dark mode changes
watch(
  () => uiStore.darkMode,
  (isDark) => {
    if (currentTile.value === 'light' || currentTile.value === 'dark') {
      uiStore.setMapTile(isDark ? 'dark' : 'light')
    }
  }
)

// Pastki menyudagi "Ko'proq" dan qatlam tanlansa
watch(
  () => uiStore.mapTile,
  (key) => {
    if (key && key !== currentTile.value) changeTile(key)
  }
)

// Sheet'dan kelgan "barchasini ko'rsatish" so'rovi
watch(
  () => uiStore.fitAllRequest,
  () => fitAllMarkers()
)

// Watch for markersHidden state (tab switching)
watch(
  () => vehiclesStore.markersHidden,
  () => {
    updateMarkers()
  }
)

// Watch for spot marker changes
watch(
  () => vehiclesStore.spotMarker,
  () => {
    drawSpotMarker()
  },
  { deep: true }
)

// Watch for route animation state
watch(
  () => vehiclesStore.routeAnimating,
  (animating) => {
    if (animating) {
      startRouteAnimation()
    } else {
      stopRouteAnimation()
    }
  }
)

// Konteyner o'lchami o'zgarsa Leaflet eski o'lchamda qolib ketmasligi uchun.
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  initMap()

  if (mapContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      map.value?.invalidateSize({ debounceMoveend: true })
    })
    resizeObserver.observe(mapContainer.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null

  if (!map.value) return

  // Stop any ongoing animations
  map.value.stop()

  // Close all popups first
  map.value.closePopup()

  // Clean up vehicle markers
  markers.value.forEach((marker) => {
    try {
      marker.off()
      marker.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
  })
  markers.value.clear()

  // Clean up route arrows
  routeArrows.value.forEach((arrow) => {
    try {
      arrow.off()
      arrow.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
  })
  routeArrows.value = []

  // Clean up route line
  if (routeLine.value) {
    try {
      routeLine.value.off()
      routeLine.value.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
    routeLine.value = null
  }

  // Clean up animation
  stopRouteAnimation()

  // Clean up spot marker
  if (spotMarkerRef.value) {
    try {
      spotMarkerRef.value.off()
      spotMarkerRef.value.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
    spotMarkerRef.value = null
  }

  // Clean up spot circle
  if (spotCircleRef.value) {
    try {
      spotCircleRef.value.off()
      spotCircleRef.value.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
    spotCircleRef.value = null
  }

  // Clean up raw position markers
  clearRawPositions()

  // Clean up markers layer
  if (markersLayer.value) {
    try {
      markersLayer.value.clearLayers()
      markersLayer.value.off()
      markersLayer.value.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
    markersLayer.value = null
  }

  // Clean up tile layer
  if (tileLayer.value) {
    try {
      tileLayer.value.off()
      tileLayer.value.remove()
    } catch (e) {
      // Ignore cleanup errors
    }
    tileLayer.value = null
  }

  // Finally remove the map
  try {
    map.value.off()
    map.value.remove()
  } catch (e) {
    // Ignore cleanup errors
  }
  map.value = null
})
</script>

<template>
  <div class="relative w-full h-full">
    <!-- Map Container -->
    <div ref="mapContainer" class="absolute inset-0 z-0" />

    <!-- Follow Mode Border Overlay -->
    <div
      v-if="isFollowing"
      class="absolute inset-0 z-[998] pointer-events-none follow-mode-border"
    />

    <!-- Follow Mode Info Card -->
    <div
      v-if="isFollowing"
      class="follow-card-in absolute inset-x-3 top-3 md:top-5 z-[1001] flex justify-center"
    >
        <div class="flex w-fit max-w-[300px] items-center gap-1 bg-primary text-primary-foreground pl-3.5 md:pl-4 pr-1 py-1 md:py-2 rounded-full shadow-lg">
        <div class="flex items-center min-w-0">
          <div class="flex min-w-0 flex-col leading-tight">
            <!-- Ikkinchi darajali yorliq — kichik va so'nik -->
            <span class="hidden md:block text-center text-[9px] font-medium uppercase tracking-widest opacity-55">
              {{ t('map.following') }}
            </span>
            <div class="flex min-w-0 items-center justify-center gap-1.5">
              <span class="truncate text-[13px] md:text-sm font-semibold uppercase">{{ followedName }}</span>
              <span
                v-if="followedVehicle?.carNumber"
                class="shrink-0 font-mono text-[11px] md:text-xs font-bold tracking-wide"
              >
                {{ followedVehicle.carNumber }}
              </span>
            </div>
          </div>
        </div>
        <button
          class="p-1 md:p-1.5 shrink-0 rounded-full bg-black/10 hover:bg-black/20 transition-colors pointer-events-auto"
          :title="t('map.unfollow')"
          @click="vehiclesStore.unfollowVehicle()"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Route Loading Overlay -->
    <div
      v-if="vehiclesStore.routeLoading"
      class="absolute inset-0 z-[999] bg-background/50 flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-2 bg-background rounded-lg shadow-lg px-6 py-4">
        <Loader2 class="h-8 w-8 animate-spin text-primary" />
        <span class="text-sm text-muted-foreground">{{ t('common.loading') }}</span>
      </div>
    </div>

    <!-- Mobil: marshrut boshqaruvi xarita ustida.
         Varaq yig'ilgach play tugmasi qo'l yetmas joyda qolmasligi uchun. -->
    <div
      v-if="!isDesktop && hasRoute"
      class="absolute left-4 z-[1000] flex flex-col gap-2"
      :style="controlsStyle"
    >
      <button
        class="w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-white transition-colors"
        :class="vehiclesStore.routeAnimating ? 'bg-red-500 active:bg-red-600' : 'bg-green-500 active:bg-green-600'"
        :aria-label="vehiclesStore.routeAnimating ? t('common.stop') : t('common.play')"
        @click="vehiclesStore.routeAnimating
          ? vehiclesStore.stopRouteAnimation()
          : vehiclesStore.startRouteAnimation()"
      >
        <Square v-if="vehiclesStore.routeAnimating" class="h-4 w-4" />
        <Play v-else class="h-4 w-4 ml-0.5" />
      </button>

      <button
        class="w-11 h-11 rounded-full bg-background shadow-lg flex items-center justify-center text-destructive"
        :aria-label="t('map.clearRoute')"
        @click="vehiclesStore.clearRoute(); clearRouteLine()"
      >
        <X class="h-5 w-5" />
      </button>
    </div>

    <!-- Route Info Card - only show for Live tab routes -->
    <div v-if="hasRoute && vehiclesStore.routeSource === 'live'" class="absolute left-[450px] top-5 z-[1000]">
      <div class="bg-background rounded-xl shadow-lg min-w-[220px] overflow-hidden border border-border">
        <!-- Vehicle name -->
        <div class="font-medium text-foreground px-3 py-2 border-b border-border">
          {{ vehiclesStore.routeVehicleName }}
        </div>

        <!-- Date range -->
        <div class="text-xs text-muted-foreground px-3 py-2 border-b border-border space-y-1">
          <div class="flex justify-between gap-4">
            <span>{{ t('history.from') }}:</span>
            <span class="font-medium text-foreground">{{ formatRouteDate(vehiclesStore.routeFrom) }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span>{{ t('history.to') }}:</span>
            <span class="font-medium text-foreground">{{ formatRouteDate(vehiclesStore.routeTo) }}</span>
          </div>
        </div>

        <!-- Clear button -->
        <button
          class="w-full flex items-center justify-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 transition-colors text-sm"
          @click="vehiclesStore.clearRoute(); clearRouteLine()"
        >
          <X class="h-4 w-4" />
          <span>{{ t('map.clearRoute') }}</span>
        </button>
      </div>
    </div>

    <!-- Xarita boshqaruvi — faqat joylashuvni aniqlash.
         Qatlam tanlash pastki menyudagi "Ko'proq" ga ko'chdi. -->
    <div class="absolute right-4 flex flex-col gap-2 z-[1000]" :style="controlsStyle">
      <button
        class="w-11 h-11 md:w-10 md:h-10 bg-background rounded-full shadow-md flex items-center justify-center hover:bg-accent transition-colors"
        :title="t('map.myLocation')"
        @click="locateMe"
      >
        <Loader2 v-if="locating" class="h-5 w-5 animate-spin" />
        <LocateFixed v-else-if="userMarker" class="h-5 w-5 text-primary" />
        <Locate v-else class="h-5 w-5" />
      </button>
    </div>
  </div>
</template>

<style>
.leaflet-marker-icon,
.leaflet-marker-shadow {
  position: absolute;
}

.leaflet-control-attribution {
  font-size: 10px;
  opacity: 0.7;
}

.route-arrow {
  background: transparent;
  border: none;
}

.route-point-marker {
  background: transparent !important;
  border: none !important;
}

.route-point-icon {
  position: relative;
  width: 32px;
  height: 44px;
  filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.3));
}

.route-point-icon svg {
  position: absolute;
  top: 0;
  left: 0;
}

.route-point-time {
  position: absolute;
  top: 46px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.car-marker {
  background: transparent;
  border: none;
}

.user-location {
  background: transparent !important;
  border: none !important;
}

.user-location {
  position: relative;
}

.user-location-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: #ffd21c;
  border: 3px solid #111111;
  box-shadow: 0 0 0 3px rgb(255 210 28 / 0.35);
}

/* Joylashuv nuqtasidan tarqaladigan to'lqin */
.user-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 210, 28, 0.35);
  border: 2px solid rgba(255, 210, 28, 0.85);
  animation: user-ripple 1.8s ease-out infinite;
}

.user-ripple-delay {
  animation-delay: 0.9s;
}

@keyframes user-ripple {
  0% {
    width: 18px;
    height: 18px;
    opacity: 1;
  }
  100% {
    width: 56px;
    height: 56px;
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .user-ripple {
    animation: none;
    opacity: 0;
  }
}

.car-plate-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  background: #ffd21c;
  color: #111111;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.02em;
  padding: 2px 5px;
  min-width: 28px;
  text-align: center;
  border-radius: 7px;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  pointer-events: none;
  z-index: 9;
}

.hide-plates .car-plate-badge {
  display: none;
}

.car-speed-badge {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: #ffd21c;
  color: #111111;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  z-index: 10;
  animation: speed-badge-pulse 1.5s ease-in-out infinite;
}

@keyframes speed-badge-pulse {
  0%, 100% {
    transform: translateX(-50%) scale(1);
  }
  50% {
    transform: translateX(-50%) scale(1.05);
  }
}

.car-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 210, 28, 0.5);
  border: 2px solid rgba(255, 210, 28, 0.8);
  animation: ripple 1.5s ease-out infinite;
}

.car-ripple-delay {
  animation-delay: 0.75s;
}

@keyframes ripple {
  0% {
    width: 24px;
    height: 24px;
    opacity: 1;
  }
  100% {
    width: 70px;
    height: 70px;
    opacity: 0;
  }
}

/* Follow mode border - animated glow effect */
.follow-mode-border {
  border: 5px solid #ffd21c;
  border-radius: 8px;
  animation: follow-border-glow 1.6s ease-in-out infinite;
}

/* Mobilda ramka ingichkaroq va yorug'lik yumshoqroq — joy tejaydi, GPU'ni kam yuklaydi */
@media (max-width: 767px) {
  .follow-mode-border {
    border-width: 3px;
    animation-name: follow-border-glow-sm;
  }
}

@keyframes follow-border-glow-sm {
  0%, 100% {
    border-color: rgba(233, 185, 0, 0.45);
    box-shadow: 0 0 4px rgba(255, 210, 28, 0.45), inset 0 0 10px rgba(255, 210, 28, 0.06);
  }
  50% {
    border-color: #ffd21c;
    box-shadow:
      0 0 16px #ffd21c,
      0 0 34px rgba(255, 210, 28, 0.75),
      inset 0 0 40px rgba(255, 210, 28, 0.28);
  }
}

/* Harakatni kamaytirish sozlamasi yoqilgan bo'lsa — pulsatsiya o'chadi */
@media (prefers-reduced-motion: reduce) {
  .follow-mode-border {
    animation: none;
  }
}

@keyframes follow-border-glow {
  0%, 100% {
    border-color: rgba(233, 185, 0, 0.5);
    box-shadow:
      0 0 6px rgba(255, 210, 28, 0.5),
      inset 0 0 18px rgba(255, 210, 28, 0.07);
  }
  50% {
    border-color: #ffd21c;
    box-shadow:
      0 0 24px #ffd21c,
      0 0 52px rgba(255, 210, 28, 0.9),
      0 0 90px rgba(255, 210, 28, 0.55),
      inset 0 0 80px rgba(255, 210, 28, 0.32);
  }
}

/* Bir martalik kirish animatsiyasi — qayta render'da qotib qolmaydi */
.follow-card-in {
  animation: follow-card-fade 0.3s ease-out;
  pointer-events: none;
}

.follow-card-in > * {
  pointer-events: auto;
}

@keyframes follow-card-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Spot marker styles - teardrop design */
.spot-marker {
  background: transparent !important;
  border: none !important;
}

.spot-marker-icon {
  position: relative;
  width: 40px;
  height: 52px;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
}

.spot-marker-icon svg {
  position: absolute;
  top: 0;
  left: 0;
}

.spot-marker-times {
  position: absolute;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

/* Animated car marker */
.animated-car-marker {
  background: transparent !important;
  border: none !important;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}
</style>
