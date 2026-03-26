<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useVehiclesStore } from '@/stores/vehicles.store'
import { useUiStore } from '@/stores/ui.store'
import { useVehiclesRealtime } from '@/composables/useVehiclesRealtime'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Layers, Plus, Minus, Locate, X, Loader2, Navigation, XCircle } from 'lucide-vue-next'
import carIconUrl from '@/assets/car-icon.svg'

const { t } = useI18n()
const vehiclesStore = useVehiclesStore()
const uiStore = useUiStore()

// Start realtime position updates
useVehiclesRealtime()

const mapContainer = ref<HTMLElement | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const map = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tileLayer = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const markersLayer = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const markers = ref<Map<number, any>>(new Map())
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const routeLine = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const routeArrows = ref<any[]>([])
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const routeStartMarker = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const routeEndMarker = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const spotMarkerRef = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const spotCircleRef = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const animationLine = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const animationMarker = ref<any>(null)
const animationFrameId = ref<number | null>(null)

const currentTile = ref('osm')

// Map tiles configuration
const mapTiles = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  osm_dark: {
    name: 'OSM Dark',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    attribution: '&copy; Stadia Maps &copy; OpenMapTiles &copy; OSM contributors',
  },
  carto_light: {
    name: 'CartoDB Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OSM &copy; CARTO',
  },
  carto_dark: {
    name: 'CartoDB Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OSM &copy; CARTO',
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
}

// Get all vehicles with positions
const vehiclesWithPositions = computed(() =>
  vehiclesStore.vehicles.filter((v) => v.lat !== null && v.lng !== null)
)

// Check if route is showing
const hasRoute = computed(() => vehiclesStore.routePoints.length > 0)

// Check if follow mode is active
const isFollowing = computed(() => vehiclesStore.followedVehicleId !== null)
const followedVehicleName = computed(() => {
  if (!vehiclesStore.followedVehicleId) return null
  const vehicle = vehiclesStore.vehicles.find(v => v.carId === vehiclesStore.followedVehicleId)
  return vehicle?.name || null
})

// Create marker icon with car icon and rotation
function createCarIcon(angle: number = 0, ignition: boolean = false, speed: number = 0, isFollowed: boolean = false) {
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

  return L.divIcon({
    className: 'car-marker',
    html: `
      <div style="position: relative; width: 48px; height: 48px;">
        ${rippleHtml}
        ${speedBadgeHtml}
        <!-- Car icon -->
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
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  })
}

// Get appropriate tile based on dark mode
function getDefaultTile() {
  return uiStore.darkMode ? 'carto_dark' : 'osm'
}

// Change tile layer
function changeTile(tileKey: string) {
  if (!map.value) return

  currentTile.value = tileKey
  const tile = mapTiles[tileKey as keyof typeof mapTiles]

  if (tileLayer.value) {
    map.value.removeLayer(tileLayer.value )
  }

  tileLayer.value = L.tileLayer(tile.url, {
    attribution: tile.attribution,
    maxZoom: 19,
  }).addTo(map.value)
}

// Initialize map
function initMap() {
  if (!mapContainer.value || map.value) return

  const defaultLat = parseFloat(import.meta.env.VITE_MAP_DEFAULT_LAT) || 41.2995
  const defaultLng = parseFloat(import.meta.env.VITE_MAP_DEFAULT_LNG) || 69.2401
  const defaultZoom = parseInt(import.meta.env.VITE_MAP_DEFAULT_ZOOM) || 12

  map.value = L.map(mapContainer.value, {
    zoomControl: false,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
  }).setView([defaultLat, defaultLng], defaultZoom)

  // Add initial tile layer based on dark mode
  const initialTile = getDefaultTile()
  currentTile.value = initialTile
  const tile = mapTiles[initialTile as keyof typeof mapTiles]

  tileLayer.value = L.tileLayer(tile.url, {
    attribution: tile.attribution,
    maxZoom: 19,
  }).addTo(map.value)

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

  // Show/hide route arrows based on zoom level
  map.value.on('zoomend', () => {
    updateRouteArrowsVisibility()
  })

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

    if (existingMarker) {
      existingMarker.setLatLng(position)
      // Update icon with new angle, ignition status, speed and follow state
      existingMarker.setIcon(createCarIcon(angle, ignition, speed, isFollowed))
    } else {
      const marker = L.marker(position, {
        icon: createCarIcon(angle, ignition, speed, isFollowed),
        title: vehicle.name,
      })

      marker.on('click', () => {
        vehiclesStore.selectVehicle(vehicle.carId)
        if (map.value) {
          map.value.setView([vehicle.lat!, vehicle.lng!], 16)
        }
        // Update all markers to reflect selection change
        updateMarkers()
      })

      marker.addTo(markersLayer.value!)
      markers.value.set(vehicle.carId, marker)
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
    }
  })
}

// Fit all markers in view
function fitAllMarkers() {
  if (!map.value || vehiclesWithPositions.value.length === 0) return

  const bounds = L.latLngBounds(
    vehiclesWithPositions.value
      .filter((v) => v.lat !== null && v.lng !== null)
      .map((v) => [v.lat!, v.lng!] as L.LatLngTuple)
  )

  map.value.fitBounds(bounds, { padding: [50, 50] })
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
  map.value.setView([spot.lat, spot.lng], 17, {
    animate: true,
    duration: 0.5,
  })
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
      color: '#3b82f6',
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
    map.value.fitBounds(bounds, { padding: [50, 50] })
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
const rawPositionMarkers = ref<any[]>([])
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawPositionLine = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawStartMarker = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawEndMarker = ref<any>(null)

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

    const time = new Date(p.recordedAt).toLocaleTimeString()
    const sat = (p as any).satellites ?? '?'
    const angle = (p as any).angle ?? '?'
    marker.bindPopup(
      `<b>#${num} ${time}</b><br>Speed: ${p.speed} km/h<br>Ignition: ${p.ignition ? 'ON' : 'OFF'}<br>Sat: ${sat} | Angle: ${angle}<br>${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`,
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
    map.value.fitBounds(bounds, { paddingTopLeft: [480, 50], paddingBottomRight: [50, 50] })
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
  { deep: true }
)

// Watch for route points changes
watch(
  () => vehiclesStore.routePoints,
  () => {
    drawRouteLine()
    // Update markers to hide/show the route vehicle marker
    updateMarkers()
  },
  { deep: true }
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
        map.value.setView([vehicle.lat, vehicle.lng], 16)
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
        map.value.setView([vehicle.lat, vehicle.lng], 17, {
          animate: true,
          duration: 0.5,
        })
      }
    }
  }
)

// Watch dark mode changes
watch(
  () => uiStore.darkMode,
  (isDark) => {
    if (currentTile.value === 'osm' || currentTile.value === 'carto_dark' || currentTile.value === 'carto_light' || currentTile.value === 'osm_dark') {
      changeTile(isDark ? 'carto_dark' : 'osm')
    }
  }
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

onMounted(() => {
  initMap()
})

onUnmounted(() => {
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
    <Transition name="follow-card">
      <div
        v-if="isFollowing"
        class="absolute top-5 left-1/2 -translate-x-1/2 z-[1001]"
      >
        <div class="flex items-center gap-3 bg-blue-500 text-white pl-4 pr-2 py-2 rounded-full shadow-lg">
        <div class="flex items-center gap-2">
          <Navigation class="h-4 w-4 animate-pulse" />
          <span class="text-sm font-medium">{{ t('map.following') }}:</span>
          <span class="text-sm font-bold">{{ followedVehicleName }}</span>
        </div>
        <button
          class="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors pointer-events-auto"
          :title="t('map.unfollow')"
          @click="vehiclesStore.unfollowVehicle()"
        >
          <XCircle class="h-4 w-4" />
        </button>
      </div>
    </div>
    </Transition>

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

    <!-- Map Controls -->
    <div class="absolute bottom-6 right-4 flex flex-col gap-2 z-[1000]">
      <!-- Tile Selector -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            class="w-10 h-10 bg-background rounded-md shadow-md flex items-center justify-center hover:bg-accent transition-colors"
            :title="t('map.layers')"
          >
            <Layers class="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="min-w-[140px]">
          <DropdownMenuItem
            v-for="(tile, key) in mapTiles"
            :key="key"
            class="cursor-pointer"
            :class="{ 'bg-accent': currentTile === key }"
            @click="changeTile(key as string)"
          >
            {{ tile.name }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- Fit All -->
      <button
        class="w-10 h-10 bg-background rounded-md shadow-md flex items-center justify-center hover:bg-accent transition-colors"
        :title="t('map.fitAll')"
        @click="fitAllMarkers"
      >
        <Locate class="h-5 w-5" />
      </button>

      <!-- Zoom In -->
      <button
        class="w-10 h-10 bg-background rounded-md shadow-md flex items-center justify-center hover:bg-accent transition-colors"
        :title="t('map.zoomIn')"
        @click="map?.zoomIn()"
      >
        <Plus class="h-5 w-5" />
      </button>

      <!-- Zoom Out -->
      <button
        class="w-10 h-10 bg-background rounded-md shadow-md flex items-center justify-center hover:bg-accent transition-colors"
        :title="t('map.zoomOut')"
        @click="map?.zoomOut()"
      >
        <Minus class="h-5 w-5" />
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

.car-speed-badge {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: #3b82f6;
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
  background: rgba(59, 130, 246, 0.5);
  border: 2px solid rgba(59, 130, 246, 0.8);
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
  border: 5px solid #3b82f6;
  border-radius: 8px;
  animation: follow-border-glow 2s ease-in-out infinite;
}

@keyframes follow-border-glow {
  0%, 100% {
    border-color: #2563eb;
    box-shadow:
      0 0 15px #3b82f6,
      0 0 30px #3b82f6,
      0 0 45px rgba(59, 130, 246, 0.6),
      inset 0 0 40px rgba(59, 130, 246, 0.15);
  }
  50% {
    border-color: #93c5fd;
    box-shadow:
      0 0 25px #60a5fa,
      0 0 50px #3b82f6,
      0 0 70px rgba(59, 130, 246, 0.8),
      inset 0 0 60px rgba(59, 130, 246, 0.25);
  }
}

/* Follow mode card transition */
.follow-card-enter-active {
  transition: all 0.3s ease-out;
}

.follow-card-leave-active {
  transition: all 0.2s ease-in;
}

.follow-card-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.9);
}

.follow-card-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px) scale(0.95);
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
