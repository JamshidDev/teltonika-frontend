<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Dialog from '@/components/ui/Dialog.vue'
import { useUiStore } from '@/stores/ui.store'

const props = withDefaults(defineProps<{
  open: boolean
  latitude: number
  longitude: number
  title?: string
  markerLabel?: string
}>(), {
  markerLabel: 'P'
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const uiStore = useUiStore()
const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let marker: L.Marker | null = null

const mapTiles = {
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OSM &copy; CARTO',
  },
}

function createMarkerIcon() {
  const label = props.markerLabel
  const fontSize = label.length > 2 ? 9 : label.length > 1 ? 11 : 14

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-container">
        <svg width="32" height="44" viewBox="0 0 32 44">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 28 16 28s16-19.163 16-28C32 7.163 24.837 0 16 0z" fill="#3b82f6"/>
          <circle cx="16" cy="16" r="10" fill="white" fill-opacity="0.25"/>
          <text x="16" y="20" text-anchor="middle" fill="white" font-size="${fontSize}" font-weight="bold" font-family="system-ui, sans-serif">${label}</text>
        </svg>
      </div>
    `,
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -44],
  })
}

function initMap() {
  if (!mapContainer.value || map) return

  map = L.map(mapContainer.value, {
    zoomControl: true,
  }).setView([props.latitude, props.longitude], 15)

  const tile = uiStore.darkMode ? mapTiles.dark : mapTiles.light
  L.tileLayer(tile.url, {
    attribution: tile.attribution,
    maxZoom: 19,
  }).addTo(map)

  // Add marker with custom icon
  marker = L.marker([props.latitude, props.longitude], {
    icon: createMarkerIcon()
  }).addTo(map)
  marker.bindPopup(`${props.latitude.toFixed(6)}, ${props.longitude.toFixed(6)}`).openPopup()
}

function destroyMap() {
  if (marker) {
    marker.remove()
    marker = null
  }
  if (map) {
    map.remove()
    map = null
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    setTimeout(() => {
      initMap()
    }, 100)
  } else {
    destroyMap()
  }
})

onUnmounted(() => {
  destroyMap()
})
</script>

<template>
  <Dialog :open="open" :title="title || 'Joylashuv'" @update:open="emit('update:open', $event)">
    <div ref="mapContainer" class="w-full h-[400px] rounded-lg overflow-hidden" />
    <div class="mt-3 text-sm text-muted-foreground text-center">
      {{ latitude.toFixed(6) }}, {{ longitude.toFixed(6) }}
    </div>
  </Dialog>
</template>

<style>
.leaflet-control-attribution {
  font-size: 10px;
  opacity: 0.7;
}

.custom-marker {
  background: transparent !important;
  border: none !important;
}

.marker-container {
  filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.3));
}
</style>
