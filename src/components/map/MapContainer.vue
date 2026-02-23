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
import { Layers, Plus, Minus, Locate, X } from 'lucide-vue-next'

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

// Create marker icon for each marker (ensures proper anchor)
function createCarIcon() {
  return L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
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

  vehiclesWithPositions.value.forEach((vehicle) => {
    if (vehicle.lat === null || vehicle.lng === null) return

    const existingMarker = markers.value.get(vehicle.carId)
    const position: L.LatLngExpression = [vehicle.lat, vehicle.lng]

    if (existingMarker) {
      existingMarker.setLatLng(position)
    } else {
      const marker = L.marker(position, {
        icon: createCarIcon(),
      })

      // Tooltip with vehicle name
      marker.bindTooltip(vehicle.name, {
        permanent: false,
        direction: 'top',
        offset: [0, -16],
      })

      marker.on('click', () => {
        vehiclesStore.selectVehicle(vehicle.carId)
        if (map.value) {
          map.value.setView([vehicle.lat!, vehicle.lng!], 16)
        }
      })

      marker.addTo(markersLayer.value!)
      markers.value.set(vehicle.carId, marker)
    }
  })

  // Remove markers for vehicles that no longer exist
  markers.value.forEach((marker, carId) => {
    if (!vehiclesWithPositions.value.find((v) => v.carId === carId)) {
      marker.remove()
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

// Create start marker icon (green)
function createStartIcon() {
  return L.divIcon({
    className: 'route-marker',
    html: `<div style="width: 32px; height: 32px; background-color: #22c55e; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="white">
        <path d="M8 5v14l11-7z"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

// Create end marker icon (red)
function createEndIcon() {
  return L.divIcon({
    className: 'route-marker',
    html: `<div style="width: 32px; height: 32px; background-color: #ef4444; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="white">
        <path d="M6 6h12v12H6z"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

// Format time for popup
function formatRouteTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString(uiStore.language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// Draw route line on map
function drawRouteLine() {
  if (!map.value) return

  // Remove existing route line
  if (routeLine.value) {
    map.value.removeLayer(routeLine.value )
    routeLine.value = null
  }

  // Remove existing arrows
  routeArrows.value.forEach((arrow) => arrow.remove())
  routeArrows.value = []

  // Remove existing start/end markers
  if (routeStartMarker.value) {
    routeStartMarker.value.closePopup()
    routeStartMarker.value.unbindPopup()
    map.value.removeLayer(routeStartMarker.value )
    routeStartMarker.value = null
  }
  if (routeEndMarker.value) {
    routeEndMarker.value.closePopup()
    routeEndMarker.value.unbindPopup()
    map.value.removeLayer(routeEndMarker.value )
    routeEndMarker.value = null
  }

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

  // Add start marker (green)
  const startPoint = points[0]!
  routeStartMarker.value = L.marker([startPoint.lat, startPoint.lng], {
    icon: createStartIcon(),
  })
    .bindPopup(`<div style="text-align: center;"><strong style="color: #22c55e;">${t('history.start')}</strong><br/>${formatRouteTime(startPoint.recordedAt)}</div>`)
    .addTo(map.value)

  // Add end marker (red)
  const endPoint = points[points.length - 1]!
  routeEndMarker.value = L.marker([endPoint.lat, endPoint.lng], {
    icon: createEndIcon(),
  })
    .bindPopup(`<div style="text-align: center;"><strong style="color: #ef4444;">${t('history.end')}</strong><br/>${formatRouteTime(endPoint.recordedAt)}</div>`)
    .addTo(map.value)

  // Fit map to route bounds
  if (latLngs.length > 0) {
    const bounds = L.latLngBounds(latLngs)
    map.value.fitBounds(bounds, { padding: [50, 50] })
  }
}

// Clear route line from map
function clearRouteLine() {
  if (!map.value) return

  if (routeLine.value) {
    map.value.removeLayer(routeLine.value )
    routeLine.value = null
  }

  // Remove arrows
  routeArrows.value.forEach((arrow) => arrow.remove())
  routeArrows.value = []

  // Remove start/end markers
  if (routeStartMarker.value) {
    routeStartMarker.value.closePopup()
    routeStartMarker.value.unbindPopup()
    map.value.removeLayer(routeStartMarker.value )
    routeStartMarker.value = null
  }
  if (routeEndMarker.value) {
    routeEndMarker.value.closePopup()
    routeEndMarker.value.unbindPopup()
    map.value.removeLayer(routeEndMarker.value )
    routeEndMarker.value = null
  }
}

// Watch for route points changes
watch(
  () => vehiclesStore.routePoints,
  () => {
    drawRouteLine()
  },
  { deep: true }
)

// Center on selected vehicle from sidebar
watch(
  () => vehiclesStore.selectedVehicleId,
  (carId) => {
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
  // Clean up vehicle markers
  markers.value.forEach((marker) => {
    marker.unbindTooltip()
    marker.remove()
  })
  markers.value.clear()

  // Clean up route line
  if (routeLine.value && map.value) {
    map.value.removeLayer(routeLine.value )
    routeLine.value = null
  }

  // Clean up route arrows
  routeArrows.value.forEach((arrow) => arrow.remove())
  routeArrows.value = []

  // Clean up start/end markers
  if (routeStartMarker.value) {
    routeStartMarker.value.unbindPopup()
    routeStartMarker.value.remove()
    routeStartMarker.value = null
  }
  if (routeEndMarker.value) {
    routeEndMarker.value.unbindPopup()
    routeEndMarker.value.remove()
    routeEndMarker.value = null
  }

  // Clean up markers layer
  if (markersLayer.value && map.value) {
    map.value.removeLayer(markersLayer.value )
    markersLayer.value = null
  }

  // Finally remove the map
  if (map.value) {
    map.value.off()
    map.value.remove()
    map.value = null
  }
})
</script>

<template>
  <div class="relative w-full h-full">
    <!-- Map Container -->
    <div ref="mapContainer" class="absolute inset-0 z-0" />

    <!-- Clear Route Button -->
    <div v-if="hasRoute" class="absolute top-4 right-4 z-[1000]">
      <button
        class="flex items-center gap-2 px-3 py-2 bg-background rounded-md shadow-md hover:bg-accent transition-colors"
        @click="vehiclesStore.clearRoute(); clearRouteLine()"
      >
        <X class="h-4 w-4" />
        <span class="text-sm">{{ t('map.clearRoute') }}</span>
      </button>
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

.leaflet-tooltip {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  color: hsl(var(--foreground));
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.leaflet-tooltip-top:before {
  border-top-color: hsl(var(--border));
}

.route-arrow {
  background: transparent;
  border: none;
}

.route-marker {
  background: transparent;
  border: none;
}

.leaflet-popup-content {
  margin: 8px 12px;
  font-size: 13px;
}
</style>
