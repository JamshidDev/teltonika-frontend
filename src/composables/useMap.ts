import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue'
import { useUiStore } from '@/stores/ui.store'
import { useVehiclesStore } from '@/stores/vehicles.store'
import type { VehiclePosition } from '@/types'

interface MapMarker {
  id: number
  position: [number, number]
  rotation: number
  popup?: string
}

export function useMap(mapContainer: Ref<HTMLElement | null>) {
  const uiStore = useUiStore()
  const vehiclesStore = useVehiclesStore()

  const markers = ref<Map<number, MapMarker>>(new Map())
  const isMapReady = ref(false)

  // Center map on a specific position
  function centerOn(lat: number, lng: number, zoom?: number) {
    uiStore.setMapCenter([lat, lng])
    if (zoom) {
      uiStore.setMapZoom(zoom)
    }
  }

  // Center on selected vehicle
  function centerOnVehicle(vehicleId: number) {
    const position = vehiclesStore.getVehiclePosition(vehicleId)
    if (position) {
      centerOn(position.latitude, position.longitude, 16)
    }
  }

  // Update marker position
  function updateMarker(vehicleId: number, position: VehiclePosition) {
    const marker: MapMarker = {
      id: vehicleId,
      position: [position.latitude, position.longitude],
      rotation: position.course || 0,
    }
    markers.value.set(vehicleId, marker)
  }

  // Remove marker
  function removeMarker(vehicleId: number) {
    markers.value.delete(vehicleId)
  }

  // Get all markers as array
  function getMarkers(): MapMarker[] {
    return Array.from(markers.value.values())
  }

  // Fit map bounds to show all markers
  function fitBounds() {
    if (markers.value.size === 0) return

    const positions = getMarkers().map((m) => m.position)
    const lats = positions.map((p) => p[0])
    const lngs = positions.map((p) => p[1])

    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2

    centerOn(centerLat, centerLng)
  }

  // Watch for position changes
  watch(
    () => vehiclesStore.positions,
    (positions) => {
      for (const [vehicleIdStr, position] of Object.entries(positions)) {
        const vehicleId = parseInt(vehicleIdStr)
        updateMarker(vehicleId, position)
      }
    },
    { deep: true }
  )

  onMounted(() => {
    // Initialize map when component mounts
    if (mapContainer.value) {
      isMapReady.value = true
    }
  })

  onUnmounted(() => {
    markers.value.clear()
    isMapReady.value = false
  })

  return {
    markers,
    isMapReady,
    centerOn,
    centerOnVehicle,
    updateMarker,
    removeMarker,
    getMarkers,
    fitBounds,
  }
}
