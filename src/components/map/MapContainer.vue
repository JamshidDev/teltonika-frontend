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
import { Layers, Plus, Minus, Locate, X, Loader2 } from 'lucide-vue-next'
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

// Create marker icon with car icon and rotation
function createCarIcon(angle: number = 0) {
  return L.divIcon({
    className: 'car-marker',
    html: `
      <div style="position: relative; width: 48px; height: 48px;">
        <!-- Ripple effect -->
        <div class="car-ripple"></div>
        <div class="car-ripple car-ripple-delay"></div>
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
    zoomAnimationThreshold: 4,
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

  // Check if we're showing a route for a vehicle
  const routeCarId = vehiclesStore.routeCarId

  vehiclesWithPositions.value.forEach((vehicle) => {
    if (vehicle.lat === null || vehicle.lng === null) return

    const existingMarker = markers.value.get(vehicle.carId)
    const position: L.LatLngExpression = [vehicle.lat, vehicle.lng]
    const angle = vehicle.angle || 0

    // Hide marker if this vehicle's route is being shown
    if (routeCarId === vehicle.carId && vehiclesStore.routePoints.length > 0) {
      if (existingMarker) {
        try {
          existingMarker.off()
          existingMarker.remove()
        } catch (e) {
          // Ignore cleanup errors
        }
        markers.value.delete(vehicle.carId)
      }
      return
    }

    if (existingMarker) {
      existingMarker.setLatLng(position)
      // Update icon with new angle
      existingMarker.setIcon(createCarIcon(angle))
    } else {
      const marker = L.marker(position, {
        icon: createCarIcon(angle),
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

  const points = vehiclesStore.routePoints
  if (points.length === 0) return

  // Create polyline from route points
  const latLngs: L.LatLngExpression[] = points.map((p) => [p.lat, p.lng])

  routeLine.value = L.polyline(latLngs, {
    color: '#3b82f6',
    weight: 4,
    opacity: 0.8,
  }).addTo(map.value)

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
}

// Clear route line from map
function clearRouteLine() {
  if (!map.value) return

  // Stop any ongoing animations
  map.value.stop()

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
}

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
  },
  { deep: true }
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

    <!-- Route Info Card -->
    <div v-if="hasRoute" class="absolute right-4 z-[1000]" style="top: 4rem;">
      <div class="bg-background rounded-lg shadow-lg min-w-[220px] overflow-hidden border border-border">
        <!-- Vehicle name -->
        <div class="font-medium text-foreground px-3 py-2 border-b border-border">
          {{ vehiclesStore.routeVehicleName }}
        </div>

        <!-- Date range -->
        <div class="text-xs text-muted-foreground px-3 py-2 border-b border-border space-y-1">
          <div class="flex justify-between">
            <span>{{ t('history.from') }}:</span>
            <span class="font-medium text-foreground">{{ formatRouteDate(vehiclesStore.routeFrom) }}</span>
          </div>
          <div class="flex justify-between">
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

.car-marker {
  background: transparent;
  border: none;
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
</style>
