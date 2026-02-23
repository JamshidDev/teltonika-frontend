<script setup lang="ts">
import { computed } from 'vue'
import { Car } from 'lucide-vue-next'
import type { Vehicle } from '@/types'

const props = defineProps<{
  vehicle: Vehicle
  selected?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

// Calculate marker position (for demo - in real implementation this would be map coordinates)
const markerStyle = computed(() => {
  // This is a placeholder - in real implementation,
  // you would convert lat/lng to pixel coordinates
  const randomX = (props.vehicle.id * 37) % 80 + 10
  const randomY = (props.vehicle.id * 53) % 60 + 20
  return {
    left: `${randomX}%`,
    top: `${randomY}%`,
  }
})

const markerColor = computed(() => {
  switch (props.vehicle.status) {
    case 'moving':
      return 'bg-green-500'
    case 'stopped':
    case 'idle':
      return 'bg-yellow-500'
    case 'offline':
      return 'bg-gray-400'
    default:
      return 'bg-blue-500'
  }
})

// Rotation based on course
const rotation = computed(() => {
  const course = props.vehicle.position?.course || 0
  return `rotate(${course}deg)`
})
</script>

<template>
  <div
    :class="[
      'absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200',
      selected && 'scale-125 z-10',
    ]"
    :style="markerStyle"
    @click="emit('click')"
  >
    <!-- Marker Icon -->
    <div
      :class="[
        'relative w-10 h-10 rounded-full flex items-center justify-center shadow-lg',
        markerColor,
        selected && 'ring-4 ring-primary ring-offset-2',
      ]"
    >
      <Car
        class="h-5 w-5 text-white transition-transform"
        :style="{ transform: rotation }"
      />

      <!-- Speed indicator -->
      <div
        v-if="vehicle.position?.speed && vehicle.position.speed > 0"
        class="absolute -bottom-1 -right-1 bg-background rounded-full px-1.5 py-0.5 text-[10px] font-medium shadow border border-border"
      >
        {{ Math.round(vehicle.position.speed) }}
      </div>
    </div>

    <!-- Vehicle name label -->
    <div
      v-if="selected"
      class="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap bg-background px-2 py-1 rounded text-xs font-medium shadow-md"
    >
      {{ vehicle.name }}
    </div>
  </div>
</template>
